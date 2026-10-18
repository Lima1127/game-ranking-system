package com.gameranking.service;

import com.gameranking.domain.enums.SteamCheckStatus;
import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.User;
import com.gameranking.repository.UserRepository;
import com.gameranking.service.steam.SteamPlayerGameData;
import com.gameranking.service.steam.SteamWebApiClient;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static com.gameranking.service.SteamPlatinumPreviewService.suggestPlatinum;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SteamPlatinumPreviewServiceTest {

    private static SteamPlayerGameData ok(Integer total, Integer unlocked, String lastUnlock) {
        return new SteamPlayerGameData(SteamCheckStatus.OK, 600, total, unlocked,
                lastUnlock == null ? null : OffsetDateTime.parse(lastUnlock));
    }

    @Test
    void todasAsConquistasMarcaPlatina() {
        assertThat(suggestPlatinum(ok(42, 42, "2026-03-10T20:00:00Z"))).isTrue();
    }

    @Test
    void naoImportaQuandoAsConquistasForamFeitas() {
        assertThat(suggestPlatinum(ok(42, 42, "2019-05-01T20:00:00Z"))).as("platina antiga").isTrue();
        assertThat(suggestPlatinum(ok(42, 42, null))).as("Steam sem data").isTrue();
    }

    @Test
    void faltandoConquistaDesmarca() {
        assertThat(suggestPlatinum(ok(42, 41, "2026-03-10T20:00:00Z"))).isFalse();
    }

    @Test
    void jogoComPoucasConquistasNaoContaComoPlatina() {
        assertThat(suggestPlatinum(ok(5, 5, null))).as("5/5").isFalse();
        assertThat(suggestPlatinum(ok(8, 8, null))).as("8/8").isFalse();
        assertThat(suggestPlatinum(ok(9, 9, null))).as("9/9").isTrue();
        assertThat(suggestPlatinum(ok(9, 8, null))).as("8/9").isFalse();
    }

    @Test
    void semDadosSuficientesNaoAfirmaNada() {
        assertThat(suggestPlatinum(ok(0, 0, null))).as("jogo sem conquistas na Steam").isNull();
        assertThat(suggestPlatinum(ok(null, null, null))).as("conquistas indisponiveis").isNull();
        assertThat(suggestPlatinum(SteamPlayerGameData.of(SteamCheckStatus.PRIVATE_PROFILE))).isNull();
        assertThat(suggestPlatinum(SteamPlayerGameData.of(SteamCheckStatus.NOT_OWNED))).isNull();
    }

    @Test
    void jogadorSemContaSteamNaoConsultaASteam() {
        UserRepository userRepository = mock(UserRepository.class);
        SteamWebApiClient steamWebApiClient = mock(SteamWebApiClient.class);
        User player = User.builder().id(UUID.randomUUID()).role(UserRole.USER).build();
        when(userRepository.findById(player.getId())).thenReturn(Optional.of(player));

        var response = new SteamPlatinumPreviewService(userRepository, steamWebApiClient).preview(player.getId(), 1245620);

        assertThat(response.status()).isEqualTo(SteamCheckStatus.NO_STEAM_ACCOUNT);
        assertThat(response.suggestPlatinum()).isNull();
        assertThat(response.minimumAchievements()).isEqualTo(SteamPlatinumPreviewService.MIN_ACHIEVEMENTS_FOR_PLATINUM);
        verify(steamWebApiClient, never()).fetch(anyString(), anyInt());
    }
}
