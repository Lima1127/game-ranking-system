package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.common.exception.NotFoundException;
import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.Edition;
import com.gameranking.domain.model.Game;
import com.gameranking.domain.model.RotativeListEntry;
import com.gameranking.domain.model.RotativeSourceGame;
import com.gameranking.domain.model.User;
import com.gameranking.repository.CompletionRepository;
import com.gameranking.repository.EditionRepository;
import com.gameranking.repository.GameRepository;
import com.gameranking.repository.RotativeListEntryRepository;
import com.gameranking.repository.RotativeSourceGameRepository;
import com.gameranking.repository.UserRepository;
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
    private final GameRepository gameRepository;
    private final GameService gameService;

    @Transactional(readOnly = true)
    public List<RotativeListEntryResponse> list(UUID editionId) {
        Edition edition = resolveEdition(editionId);
        return rotativeListEntryRepository.findActiveByEditionId(edition.getId()).stream()
                .map(this::toResponse)
                .toList();
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
            Game game = gameRepository.findFirstByNameIgnoreCase(gameName)
                    .orElseGet(() -> {
                        int technicalYear = java.time.LocalDate.now().getYear();
                        return gameService.getById(
                                gameService.create(new CreateGameRequest(
                                        gameName,
                                        technicalYear,
                                        null,
                                        null,
                                        Set.of("Nao informado")
                                )).id()
                        );
                    });

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
                nextList.size()
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

        if (requester.getRole() != UserRole.ADMIN) {
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

    private RotativeListEntryResponse toResponse(RotativeListEntry entry) {
        return new RotativeListEntryResponse(
                entry.getId(),
                entry.getEdition().getId(),
                entry.getQuarter(),
                entry.getGame().getId(),
                entry.getGame().getName(),
                Boolean.TRUE.equals(entry.getActive())
        );
    }
}

