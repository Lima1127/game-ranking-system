package com.gameranking.web.dto.completion;

import com.gameranking.domain.enums.SteamCheckStatus;

import java.time.OffsetDateTime;

/**
 * Conquistas do proprio jogador num jogo da Steam, consultadas ANTES de enviar o registro,
 * para a tela ja marcar ou desmarcar o bonus "Platina".
 *
 * suggestPlatinum: true = todas as conquistas (jogo com o minimo de conquistas); false = falta
 * conquista ou o jogo tem poucas conquistas; null = nao da para afirmar (sem conta Steam, perfil
 * privado, jogo sem conquistas na Steam...). O jogador sempre pode mudar; o admin confere.
 */
public record SteamPlatinumPreviewResponse(
        SteamCheckStatus status,
        Integer achievementsTotal,
        Integer achievementsUnlocked,
        OffsetDateTime lastUnlockAt,
        // Minimo de conquistas do jogo para valer como platina (regra do grupo).
        int minimumAchievements,
        Boolean suggestPlatinum
) {
}
