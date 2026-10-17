package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.domain.enums.RotativeReviewBand;
import com.gameranking.service.steam.SteamGameDrawService;
import com.gameranking.service.steam.SteamQueryGame;
import com.gameranking.web.dto.rotative.RotativeListEntryResponse;
import com.gameranking.web.dto.rotative.RotativeListGenerationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static com.gameranking.domain.enums.RotativeReviewBand.CURRENT_YEAR;
import static com.gameranking.domain.enums.RotativeReviewBand.HIGH;
import static com.gameranking.domain.enums.RotativeReviewBand.MID;
import static com.gameranking.domain.enums.RotativeReviewBand.TOP;

/**
 * Lista Rotativa sorteada da loja Steam (vagas em RotativeReviewBand): 22 jogos com 1400+
 * avaliacoes, sendo 5 lancamentos do ano da edicao e 10 com 3000+, e 8 com 1000 a 1399.
 *
 * Sem @Transactional de proposito: o sorteio consulta a Steam (alguns segundos) e nao deve segurar
 * uma conexao do banco. As leituras e a gravacao ficam no RotativeListService, cada uma na sua
 * transacao; o sorteio acontece entre elas.
 */
@Service
@RequiredArgsConstructor
public class RotativeSteamListService {

    private final RotativeListService rotativeListService;
    private final SteamGameDrawService drawService;

    /** Sorteia uma lista nova inteira e substitui a lista ativa (admin). */
    public RotativeListGenerationResponse drawNewList(UUID requesterId, UUID editionId) {
        RotativeListService.SteamDrawContext context = rotativeListService.steamDrawContext(requesterId, editionId);

        // Primeiro os lancamentos do ano (a vaga mais dificil de preencher).
        List<SteamQueryGame> currentYear = drawService.drawCurrentYear(
                CURRENT_YEAR.gamesPerList(), context.excluded(), context.editionYear());
        SteamGameDrawService.Exclusions excluded = context.excluded().copy();
        currentYear.forEach(excluded::add);

        // Se faltarem lancamentos do ano (ex.: comeco do ano), as vagas viram 1400+ comuns.
        int missingCurrentYear = CURRENT_YEAR.gamesPerList() - currentYear.size();
        Map<RotativeReviewBand, Integer> needs = new EnumMap<>(RotativeReviewBand.class);
        needs.put(TOP, TOP.gamesPerList());
        needs.put(HIGH, HIGH.gamesPerList() + missingCurrentYear);
        needs.put(MID, MID.gamesPerList());

        Map<RotativeReviewBand, List<SteamQueryGame>> drawn = new EnumMap<>(RotativeReviewBand.class);
        if (!currentYear.isEmpty()) {
            drawn.put(CURRENT_YEAR, currentYear);
        }
        drawn.putAll(drawService.drawRandom(needs, excluded));

        String warning = missingCurrentYear == 0 ? null
                : "So havia " + currentYear.size() + " lancamento(s) de " + context.editionYear()
                + " com 1400+ avaliacoes disponivel(is); " + missingCurrentYear
                + " vaga(s) foram preenchidas com outros jogos 1400+.";
        return rotativeListService.replaceWithSteamDraw(requesterId, context.editionId(), drawn, warning);
    }

    /** Troca um jogo da lista ativa por outro da mesma vaga (admin). */
    public RotativeListEntryResponse reroll(UUID requesterId, UUID entryId) {
        RotativeListService.RerollContext context = rotativeListService.rerollContext(requesterId, entryId);

        SteamQueryGame replacement;
        if (context.band() == CURRENT_YEAR) {
            replacement = drawService.drawCurrentYear(1, context.excluded(), context.editionYear()).stream()
                    .findFirst()
                    .orElseThrow(() -> new BusinessException("Nao ha outro lancamento de " + context.editionYear()
                            + " com 1400+ avaliacoes disponivel para trocar."));
        } else {
            replacement = drawService.drawRandom(Map.of(context.band(), 1), context.excluded())
                    .get(context.band()).get(0);
        }
        return rotativeListService.replaceEntry(requesterId, entryId, context.band(), replacement);
    }
}
