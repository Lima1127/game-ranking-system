package com.gameranking.service.steam;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gameranking.domain.enums.SteamCheckStatus;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class SteamWebApiClientTest {

    private static final int ELDEN_RING = 1245620;

    private final SteamWebApiClient client = new SteamWebApiClient("chave-de-teste", new ObjectMapper());

    @Test
    void horasDoJogoNaBiblioteca() {
        String body = """
                {"response": {"game_count": 2, "games": [
                  {"appid": 10, "playtime_forever": 5},
                  {"appid": 1245620, "playtime_forever": 2535}
                ]}}
                """;

        assertThat(client.parseOwnedGames(200, body, ELDEN_RING))
                .isEqualTo(new SteamWebApiClient.Playtime(SteamCheckStatus.OK, 2535));
    }

    @Test
    void jogoForaDaBiblioteca() {
        String body = "{\"response\": {\"game_count\": 1, \"games\": [{\"appid\": 10, \"playtime_forever\": 5}]}}";

        assertThat(client.parseOwnedGames(200, body, ELDEN_RING).status()).isEqualTo(SteamCheckStatus.NOT_OWNED);
    }

    @Test
    void perfilPrivadoDevolveRespostaVazia() {
        assertThat(client.parseOwnedGames(200, "{\"response\": {}}", ELDEN_RING).status())
                .isEqualTo(SteamCheckStatus.PRIVATE_PROFILE);
    }

    @Test
    void chaveRecusadaOuSteamComErro() {
        assertThat(client.parseOwnedGames(403, "<html>Forbidden</html>", ELDEN_RING).status())
                .isEqualTo(SteamCheckStatus.NOT_CONFIGURED);
        assertThat(client.parseOwnedGames(500, "", ELDEN_RING).status()).isEqualTo(SteamCheckStatus.UNAVAILABLE);
        assertThat(client.parseOwnedGames(200, "isso nao e json", ELDEN_RING).status()).isEqualTo(SteamCheckStatus.UNAVAILABLE);
    }

    @Test
    void conquistasContaDesbloqueadasEAUltima() {
        String body = """
                {"playerstats": {"steamID": "76561198000000001", "gameName": "ELDEN RING", "success": true,
                  "achievements": [
                    {"apiname": "A", "achieved": 1, "unlocktime": 1700000000},
                    {"apiname": "B", "achieved": 1, "unlocktime": 1760000000},
                    {"apiname": "C", "achieved": 0, "unlocktime": 0}
                  ]}}
                """;

        SteamWebApiClient.Achievements achievements = client.parseAchievements(body);

        assertThat(achievements.status()).isEqualTo(SteamCheckStatus.OK);
        assertThat(achievements.total()).isEqualTo(3);
        assertThat(achievements.unlocked()).isEqualTo(2);
        assertThat(achievements.lastUnlockAt()).isEqualTo(OffsetDateTime.of(2025, 10, 9, 8, 53, 20, 0, ZoneOffset.UTC));
    }

    @Test
    void jogoSemConquistas() {
        String body = "{\"playerstats\": {\"error\": \"Requested app has no stats\", \"success\": false}}";

        assertThat(client.parseAchievements(body))
                .isEqualTo(new SteamWebApiClient.Achievements(SteamCheckStatus.OK, 0, 0, null));
    }

    @Test
    void conquistasDePerfilPrivado() {
        String body = "{\"playerstats\": {\"error\": \"Profile is not public\", \"success\": false}}";

        assertThat(client.parseAchievements(body).status()).isEqualTo(SteamCheckStatus.PRIVATE_PROFILE);
    }

    @Test
    void semChaveNaoConsultaASteam() {
        SteamWebApiClient semChave = new SteamWebApiClient("  ", new ObjectMapper());

        assertThat(semChave.isConfigured()).isFalse();
        assertThat(semChave.fetch("76561198000000001", ELDEN_RING))
                .isEqualTo(SteamPlayerGameData.of(SteamCheckStatus.NOT_CONFIGURED));
    }
}
