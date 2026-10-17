package com.gameranking.service;

import com.gameranking.common.exception.NotFoundException;
import com.gameranking.domain.enums.SteamCheckStatus;
import com.gameranking.domain.model.User;
import com.gameranking.repository.UserRepository;
import com.gameranking.service.steam.SteamPlayerGameData;
import com.gameranking.service.steam.SteamWebApiClient;
import com.gameranking.web.dto.completion.SteamPlatinumPreviewResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Antes de enviar o registro: o jogador tem todas as conquistas do jogo na Steam?
 * A tela usa a resposta para ja marcar ou desmarcar o bonus "Platina" (o jogador pode mudar,
 * e a conferencia do pedido mostra ao admin qualquer divergencia).
 *
 * So consulta a conta Steam do PROPRIO jogador logado. Nao grava nada.
 */
@Service
@RequiredArgsConstructor
public class SteamPlatinumPreviewService {

    /**
     * Regra do grupo: so vale como platina jogo com pelo menos 9 conquistas (5/5 nao conta; 9/9 conta).
     * Vai nas respostas para a tela usar o mesmo numero.
     */
    public static final int MIN_ACHIEVEMENTS_FOR_PLATINUM = 9;

    private final UserRepository userRepository;
    private final SteamWebApiClient steamWebApiClient;

    public SteamPlatinumPreviewResponse preview(UUID userId, int steamAppId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));
        SteamPlayerGameData data = user.getSteamId() == null
                ? SteamPlayerGameData.of(SteamCheckStatus.NO_STEAM_ACCOUNT)
                : steamWebApiClient.fetch(user.getSteamId(), steamAppId);

        return new SteamPlatinumPreviewResponse(
                data.status(),
                data.achievementsTotal(),
                data.achievementsUnlocked(),
                data.lastUnlockAt(),
                MIN_ACHIEVEMENTS_FOR_PLATINUM,
                suggestPlatinum(data)
        );
    }

    /**
     * true = todas as conquistas, num jogo com pelo menos MIN_ACHIEVEMENTS_FOR_PLATINUM (nao importa
     * quando foram desbloqueadas); false = falta conquista ou o jogo tem poucas conquistas;
     * null = nao da para afirmar (sem dados, ou jogo sem conquistas na Steam: pode ser platina de
     * console, que a Steam nao conhece).
     */
    static Boolean suggestPlatinum(SteamPlayerGameData data) {
        Integer total = data.achievementsTotal();
        if (data.status() != SteamCheckStatus.OK || total == null || total == 0) {
            return null;
        }
        if (total < MIN_ACHIEVEMENTS_FOR_PLATINUM) {
            return false;
        }
        return data.achievementsUnlocked() != null && data.achievementsUnlocked() >= total;
    }
}
