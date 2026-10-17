package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.common.exception.NotFoundException;
import com.gameranking.domain.enums.RotativeReviewBand;
import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.Edition;
import com.gameranking.domain.model.Game;
import com.gameranking.domain.model.RotativeListEntry;
import com.gameranking.domain.model.RotativeSourceGame;
import com.gameranking.domain.model.User;
import com.gameranking.repository.CompletionRepository;
import com.gameranking.repository.EditionRepository;
import com.gameranking.repository.RotativeListEntryRepository;
import com.gameranking.repository.RotativeSourceGameRepository;
import com.gameranking.repository.UserRepository;
import com.gameranking.service.steam.SteamGameDrawService;
import com.gameranking.service.steam.SteamQueryGame;
import com.gameranking.web.dto.game.CreateGameRequest;
import com.gameranking.web.dto.rotative.RotativeListEntryResponse;
import com.gameranking.web.dto.rotative.RotativeListGenerationResponse;
import com.gameranking.web.dto.rotative.RotativeListSourceUploadResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RotativeListService {

    private static final int CURRENT_LIST_SIZE = 30;
    private static final int CARRY_OVER_SIZE = 15;

    private final RotativeListEntryRepository rotativeListEntryRepository;
    private final RotativeSourceGameRepository rotativeSourceGameRepository;
    private final CompletionRepository completionRepository;
    private final EditionRepository editionRepository;
    private final UserRepository userRepository;
    private final GameService gameService;
    private final AdminAuditLogService adminAuditLogService;

    @Transactional(readOnly = true)
    public List<RotativeListEntryResponse> list(UUID editionId) {
        Edition edition = resolveEdition(editionId);
        return rotativeListEntryRepository.findActiveByEditionId(edition.getId()).stream()
                .map(entry -> toResponse(entry, false))
                .toList();
    }

    /** Lista ativa; as tags marcadas em vermelho so aparecem para a equipe. */
    @Transactional(readOnly = true)
    public List<RotativeListEntryResponse> list(UUID requesterId, UUID editionId) {
        boolean staff = userRepository.findById(requesterId).map(user -> user.getRole().isStaff()).orElse(false);
        Edition edition = resolveEdition(editionId);
        return rotativeListEntryRepository.findActiveByEditionId(edition.getId()).stream()
                .map(entry -> toResponse(entry, staff))
                .toList();
    }

    /** O que o sorteio da Steam precisa saber antes de consultar a loja (fora de transacao). */
    public record SteamDrawContext(UUID editionId, int editionYear, SteamGameDrawService.Exclusions excluded) {
    }

    /**
     * Antes de sortear uma lista nova: confere se e admin e junta os jogos que nao podem sair no
     * sorteio (ja zerados na edicao e os que estao na lista atual).
     */
    @Transactional(readOnly = true)
    public SteamDrawContext steamDrawContext(UUID requesterId, UUID editionId) {
        ensureAdmin(requesterId);
        Edition edition = resolveEdition(editionId);
        return new SteamDrawContext(edition.getId(), edition.getYear(), drawExclusions(edition.getId()));
    }

    /** Troca a lista ativa inteira pelos jogos sorteados da Steam (nova rodada). */
    @Transactional
    public RotativeListGenerationResponse replaceWithSteamDraw(
            UUID requesterId,
            UUID editionId,
            Map<RotativeReviewBand, List<SteamQueryGame>> drawn,
            String warning
    ) {
        User admin = ensureAdmin(requesterId);
        Edition edition = resolveEdition(editionId);

        List<RotativeListEntry> currentActiveEntries = rotativeListEntryRepository.findActiveByEditionId(edition.getId());
        currentActiveEntries.forEach(entry -> entry.setActive(false));
        rotativeListEntryRepository.saveAll(currentActiveEntries);

        short nextRound = (short) (rotativeListEntryRepository.findMaxQuarterByEditionId(edition.getId()) + 1);
        List<RotativeListEntry> created = new ArrayList<>();
        Set<UUID> gamesInRound = new java.util.HashSet<>();
        drawn.forEach((band, games) -> games.forEach(steamGame -> {
            RotativeListEntry entry = newSteamEntry(edition, nextRound, band, steamGame);
            if (gamesInRound.add(entry.getGame().getId())) {
                created.add(entry);
            }
        }));
        rotativeListEntryRepository.saveAll(created);

        long flagged = created.stream().filter(entry -> entry.getFlaggedTags() != null).count();
        adminAuditLogService.log(admin, "ROTATIVE_LIST_DRAWN", null,
                "Lista #" + nextRound + " sorteada da Steam com " + created.size() + " jogos"
                        + (flagged > 0 ? " (" + flagged + " com tags marcadas)" : "") + "."
                        + (warning != null ? " " + warning : ""));

        return new RotativeListGenerationResponse(nextRound, 0, created.size(), created.size(), warning);
    }

    /** O que "sortear outro" precisa saber antes de consultar a loja. */
    public record RerollContext(UUID editionId, int editionYear, RotativeReviewBand band, SteamGameDrawService.Exclusions excluded) {
    }

    @Transactional(readOnly = true)
    public RerollContext rerollContext(UUID requesterId, UUID entryId) {
        ensureAdmin(requesterId);
        Edition edition = resolveEdition(null);
        RotativeListEntry entry = findActiveEntry(edition, entryId);
        // Item de lista montada por arquivo nao tem vaga: o substituto vem da vaga 1400+.
        RotativeReviewBand band = entry.getReviewBand() != null ? entry.getReviewBand() : RotativeReviewBand.HIGH;
        return new RerollContext(edition.getId(), edition.getYear(), band, drawExclusions(edition.getId()));
    }

    /** Troca um item da lista ativa por outro jogo sorteado (mesma rodada e mesma faixa). */
    @Transactional
    public RotativeListEntryResponse replaceEntry(UUID requesterId, UUID entryId, RotativeReviewBand band, SteamQueryGame steamGame) {
        User admin = ensureAdmin(requesterId);
        Edition edition = resolveEdition(null);
        RotativeListEntry entry = findActiveEntry(edition, entryId);

        RotativeListEntry replacement = newSteamEntry(edition, entry.getQuarter(), band, steamGame);
        if (rotativeListEntryRepository.findByEditionIdAndQuarterAndGameId(edition.getId(), entry.getQuarter(), replacement.getGame().getId()).isPresent()) {
            throw new BusinessException("O jogo sorteado ja esta nesta lista. Tente sortear de novo.");
        }
        String oldName = entry.getGame().getName();
        replacement.setReplacedGameName(oldName);
        replacement.setRerolledAt(java.time.OffsetDateTime.now());
        rotativeListEntryRepository.delete(entry);
        rotativeListEntryRepository.flush();
        rotativeListEntryRepository.save(replacement);

        adminAuditLogService.log(admin, "ROTATIVE_GAME_REROLLED", null,
                "Lista #" + entry.getQuarter() + ": \"" + oldName + "\" trocado por \"" + replacement.getGame().getName() + "\".");
        return toResponse(replacement, true);
    }

    @Transactional
    public RotativeListSourceUploadResponse uploadSourceFile(UUID requesterId, MultipartFile file, UUID editionId) {
        ensureAdmin(requesterId);
        Edition edition = resolveEdition(editionId);
        List<String> parsedNames = parseGameNames(file);

        if (parsedNames.isEmpty()) {
            throw new BusinessException("O arquivo nao possui nomes de jogos validos");
        }

        int imported = 0;
        for (String gameName : parsedNames) {
            // Ano de lancamento fica vazio: o arquivo nao informa e um ano inventado corrompe o catalogo.
            Game game = gameService.findOrCreate(
                    new CreateGameRequest(gameName, null, null, null, Set.of("Nao informado"), null),
                    null
            );

            if (rotativeSourceGameRepository.findByEditionIdAndGameId(edition.getId(), game.getId()).isPresent()) {
                continue;
            }

            rotativeSourceGameRepository.save(RotativeSourceGame.builder()
                    .id(UUID.randomUUID())
                    .edition(edition)
                    .game(game)
                    .createdAt(OffsetDateTime.now())
                    .build());
            imported++;
        }

        int totalInSource = rotativeSourceGameRepository.listGameIdsByEditionId(edition.getId()).size();
        return new RotativeListSourceUploadResponse(imported, totalInSource);
    }

    @Transactional
    public RotativeListGenerationResponse generateNextList(UUID requesterId, UUID editionId) {
        ensureAdmin(requesterId);
        Edition edition = resolveEdition(editionId);

        List<UUID> sourceGameIds = new ArrayList<>(new LinkedHashSet<>(rotativeSourceGameRepository.listGameIdsByEditionId(edition.getId())));
        if (sourceGameIds.isEmpty()) {
            throw new BusinessException("Envie um arquivo com jogos antes de montar a lista rotativa");
        }

        List<RotativeListEntry> currentActiveEntries = rotativeListEntryRepository.findActiveByEditionId(edition.getId());
        Set<UUID> currentActiveGameIds = currentActiveEntries.stream().map(entry -> entry.getGame().getId()).collect(java.util.stream.Collectors.toSet());
        Set<UUID> approvedGameIds = new java.util.HashSet<>(completionRepository.listApprovedGameIdsByEditionId(edition.getId()));

        List<UUID> carryCandidates = currentActiveGameIds.stream()
                .filter(gameId -> !approvedGameIds.contains(gameId))
                .toList();

        List<UUID> carryOver = pickRandom(carryCandidates, Math.min(CARRY_OVER_SIZE, carryCandidates.size()));

        Set<UUID> blockedIds = new java.util.HashSet<>(approvedGameIds);
        blockedIds.addAll(carryOver);

        List<UUID> sourceCandidates = sourceGameIds.stream()
                .filter(gameId -> !blockedIds.contains(gameId))
                .toList();

        int neededFromSource = Math.max(0, CURRENT_LIST_SIZE - carryOver.size());
        List<UUID> additions = pickRandom(sourceCandidates, Math.min(neededFromSource, sourceCandidates.size()));

        List<UUID> nextList = new ArrayList<>(carryOver);
        nextList.addAll(additions);

        if (nextList.isEmpty()) {
            throw new BusinessException("Nao ha jogos suficientes para montar uma nova lista rotativa");
        }

        if (!currentActiveEntries.isEmpty()) {
            currentActiveEntries.forEach(entry -> entry.setActive(false));
            rotativeListEntryRepository.saveAll(currentActiveEntries);
        }

        short nextRound = (short) (rotativeListEntryRepository.findMaxQuarterByEditionId(edition.getId()) + 1);

        List<RotativeListEntry> createdEntries = nextList.stream()
                .map(gameId -> {
                    Game game = gameService.getById(gameId);
                    return RotativeListEntry.builder()
                            .id(UUID.randomUUID())
                            .edition(edition)
                            .quarter(nextRound)
                            .game(game)
                            .active(true)
                            .build();
                })
                .toList();

        rotativeListEntryRepository.saveAll(createdEntries);

        return new RotativeListGenerationResponse(
                nextRound,
                carryOver.size(),
                additions.size(),
                nextList.size(),
                null
        );
    }

    @Transactional
    public boolean consumeIfActive(UUID editionId, UUID gameId) {
        List<RotativeListEntry> entries = rotativeListEntryRepository.findAllByEditionIdAndGameIdAndActiveTrue(editionId, gameId);
        if (entries.isEmpty()) {
            return false;
        }
        entries.forEach(entry -> entry.setActive(false));
        rotativeListEntryRepository.saveAll(entries);
        return true;
    }

    @Transactional(readOnly = true)
    public boolean isGameInActiveList(UUID editionId, UUID gameId) {
        return rotativeListEntryRepository.existsByEditionIdAndGameIdAndActiveTrue(editionId, gameId);
    }

    private List<String> parseGameNames(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Selecione um arquivo .csv ou .txt com a lista de jogos");
        }

        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        if (!(filename.endsWith(".csv") || filename.endsWith(".txt"))) {
            throw new BusinessException("Formato invalido. Envie um arquivo .csv ou .txt");
        }

        Set<String> uniqueNames = new LinkedHashSet<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                String normalized = extractGameName(line);
                if (normalized != null) {
                    uniqueNames.add(normalized);
                }
            }
        } catch (IOException exception) {
            throw new RuntimeException("Falha ao ler arquivo da lista rotativa", exception);
        }

        return new ArrayList<>(uniqueNames);
    }

    private String extractGameName(String rawLine) {
        if (rawLine == null) {
            return null;
        }

        String line = rawLine.trim();
        if (line.isBlank()) {
            return null;
        }

        String[] tokens = line.split("[,;\\t|]");
        String candidate = tokens.length > 0 ? tokens[0].trim() : line;
        candidate = candidate.replaceAll("^\"|\"$", "").trim();

        if (candidate.isBlank()) {
            return null;
        }

        String lowerCandidate = candidate.toLowerCase(Locale.ROOT);
        if ("name".equals(lowerCandidate) || "nome".equals(lowerCandidate) || "jogo".equals(lowerCandidate)) {
            return null;
        }

        return candidate;
    }

    private List<UUID> pickRandom(List<UUID> source, int amount) {
        if (amount <= 0 || source.isEmpty()) {
            return List.of();
        }

        List<UUID> shuffled = new ArrayList<>(source);
        Collections.shuffle(shuffled);
        return shuffled.subList(0, Math.min(amount, shuffled.size()));
    }

    private User ensureAdmin(UUID requesterId) {
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));

        if (!requester.getRole().isStaff()) {
            throw new BusinessException("Acesso restrito a usuarios ADMIN");
        }

        return requester;
    }

    private Edition resolveEdition(UUID editionId) {
        if (editionId != null) {
            return editionRepository.findById(editionId)
                    .orElseThrow(() -> new NotFoundException("Edicao nao encontrada"));
        }

        return editionRepository.findByActiveTrue()
                .orElseThrow(() -> new NotFoundException("Edicao ativa nao encontrada"));
    }

    /**
     * Jogos que o sorteio nao pode trazer: ja zerados (aprovados) na edicao e os da lista atual,
     * pelo codigo da Steam e pelo nome (um jogo do catalogo sem vinculo com a Steam so e achado pelo nome).
     */
    private SteamGameDrawService.Exclusions drawExclusions(UUID editionId) {
        Set<UUID> gameIds = new java.util.HashSet<>(completionRepository.listApprovedGameIdsByEditionId(editionId));
        rotativeListEntryRepository.findActiveByEditionId(editionId).forEach(entry -> gameIds.add(entry.getGame().getId()));
        return new SteamGameDrawService.Exclusions(gameService.steamAppIdsOf(gameIds), gameService.namesOf(gameIds));
    }

    private RotativeListEntry findActiveEntry(Edition edition, UUID entryId) {
        RotativeListEntry entry = rotativeListEntryRepository.findByIdAndEditionId(entryId, edition.getId())
                .orElseThrow(() -> new NotFoundException("Item da lista nao encontrado"));
        if (!Boolean.TRUE.equals(entry.getActive())) {
            throw new BusinessException("Este jogo nao esta mais na lista ativa");
        }
        return entry;
    }

    private RotativeListEntry newSteamEntry(Edition edition, short round, RotativeReviewBand band, SteamQueryGame steamGame) {
        List<String> flagged = SteamGameDrawService.flaggedTagNames(steamGame.tagIds());
        return RotativeListEntry.builder()
                .id(UUID.randomUUID())
                .edition(edition)
                .quarter(round)
                .game(gameService.findOrCreateFromSteam(steamGame.appId(), steamGame.name(), steamGame.releaseYear()))
                .active(true)
                .reviewBand(band)
                .steamReviewCount(steamGame.reviewCount())
                .flaggedTags(flagged.isEmpty() ? null : String.join(",", flagged))
                .build();
    }

    private RotativeListEntryResponse toResponse(RotativeListEntry entry, boolean includeFlaggedTags) {
        return new RotativeListEntryResponse(
                entry.getId(),
                entry.getEdition().getId(),
                entry.getQuarter(),
                entry.getGame().getId(),
                entry.getGame().getName(),
                Boolean.TRUE.equals(entry.getActive()),
                entry.getGame().getSteamAppId(),
                entry.getReviewBand(),
                entry.getSteamReviewCount(),
                includeFlaggedTags && entry.getFlaggedTags() != null ? List.of(entry.getFlaggedTags().split(",")) : List.of(),
                includeFlaggedTags ? entry.getReplacedGameName() : null,
                includeFlaggedTags ? entry.getRerolledAt() : null
        );
    }
}

