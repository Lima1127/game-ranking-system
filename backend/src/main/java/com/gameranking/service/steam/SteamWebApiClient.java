package com.gameranking.service.steam;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gameranking.domain.enums.SteamCheckStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

/**
 * Consulta a Steam Web API (api.steampowered.com): horas jogadas e conquistas de um jogador.
 *
 * Exige a chave da API (app.steam.api-key ou variavel de ambiente STEAM_API_KEY). A chave e um
 * segredo do servidor: nunca vai para o site nem para o log. Por isso os erros sao registrados
 * sem a mensagem original, que traria o endereco consultado (com a chave dentro).
 *
 * So le dados publicos: o perfil do jogador precisa estar com "Detalhes dos jogos" publico.
 */
@Slf4j
@Component
public class SteamWebApiClient {

    private static final String BASE_URL = "https://api.steampowered.com";

    private record HttpResult(int status, String body) {
    }

    record Playtime(SteamCheckStatus status, Integer minutes) {
    }

    record Achievements(SteamCheckStatus status, Integer total, Integer unlocked, OffsetDateTime lastUnlockAt) {
    }

    private final String apiKey;
    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public SteamWebApiClient(
            @Value("${app.steam.api-key:${STEAM_API_KEY:}}") String apiKey,
            ObjectMapper objectMapper
    ) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(3));
        requestFactory.setReadTimeout(Duration.ofSeconds(8));

        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().baseUrl(BASE_URL).requestFactory(requestFactory).build();
    }

    public boolean isConfigured() {
        return !apiKey.isEmpty();
    }

    /** Horas e conquistas do jogo `appId` na conta `steamId`. Nunca lanca erro: falhas viram um status. */
    public SteamPlayerGameData fetch(String steamId, int appId) {
        if (!isConfigured()) {
            return SteamPlayerGameData.of(SteamCheckStatus.NOT_CONFIGURED);
        }

        Playtime playtime = get("/IPlayerService/GetOwnedGames/v1/?key={key}&steamid={steamId}&include_played_free_games=1&format=json",
                apiKey, steamId)
                .map(result -> parseOwnedGames(result.status(), result.body(), appId))
                .orElse(new Playtime(SteamCheckStatus.UNAVAILABLE, null));
        if (playtime.status() != SteamCheckStatus.OK) {
            return SteamPlayerGameData.of(playtime.status());
        }

        Achievements achievements = get("/ISteamUserStats/GetPlayerAchievements/v1/?key={key}&steamid={steamId}&appid={appId}",
                apiKey, steamId, appId)
                .map(result -> parseAchievements(result.body()))
                .orElse(new Achievements(SteamCheckStatus.UNAVAILABLE, null, null, null));
        if (achievements.status() != SteamCheckStatus.OK) {
            // As horas ja valem como evidencia; as conquistas ficam sem informacao.
            return new SteamPlayerGameData(SteamCheckStatus.OK, playtime.minutes(), null, null, null);
        }
        return new SteamPlayerGameData(SteamCheckStatus.OK, playtime.minutes(),
                achievements.total(), achievements.unlocked(), achievements.lastUnlockAt());
    }

    /**
     * GetOwnedGames: perfil publico devolve game_count + games; perfil (ou "Detalhes dos jogos")
     * privado devolve {"response": {}}.
     */
    Playtime parseOwnedGames(int httpStatus, String body, int appId) {
        if (httpStatus == 401 || httpStatus == 403) {
            log.warn("A Steam Web API recusou a chave configurada (HTTP {})", httpStatus);
            return new Playtime(SteamCheckStatus.NOT_CONFIGURED, null);
        }
        JsonNode response = httpStatus == 200 ? readTree(body).path("response") : null;
        if (response == null || response.isMissingNode()) {
            return new Playtime(SteamCheckStatus.UNAVAILABLE, null);
        }
        if (!response.has("game_count")) {
            return new Playtime(SteamCheckStatus.PRIVATE_PROFILE, null);
        }
        for (JsonNode game : response.path("games")) {
            if (game.path("appid").asInt(-1) == appId) {
                return new Playtime(SteamCheckStatus.OK, game.path("playtime_forever").asInt(0));
            }
        }
        return new Playtime(SteamCheckStatus.NOT_OWNED, null);
    }

    /**
     * GetPlayerAchievements: devolve a lista de conquistas, ou um erro em playerstats.error
     * (perfil privado, ou jogo sem conquistas: "Requested app has no stats").
     */
    Achievements parseAchievements(String body) {
        JsonNode stats = readTree(body).path("playerstats");
        if (!stats.path("success").asBoolean(false)) {
            String error = stats.path("error").asText("").toLowerCase();
            if (error.contains("not public")) {
                return new Achievements(SteamCheckStatus.PRIVATE_PROFILE, null, null, null);
            }
            if (error.contains("no stats")) {
                return new Achievements(SteamCheckStatus.OK, 0, 0, null);
            }
            return new Achievements(SteamCheckStatus.UNAVAILABLE, null, null, null);
        }

        int total = 0;
        int unlocked = 0;
        long lastUnlock = 0;
        for (JsonNode achievement : stats.path("achievements")) {
            total++;
            if (achievement.path("achieved").asInt(0) == 1) {
                unlocked++;
                lastUnlock = Math.max(lastUnlock, achievement.path("unlocktime").asLong(0));
            }
        }
        OffsetDateTime lastUnlockAt = lastUnlock > 0 ? OffsetDateTime.ofInstant(Instant.ofEpochSecond(lastUnlock), ZoneOffset.UTC) : null;
        return new Achievements(SteamCheckStatus.OK, total, unlocked, lastUnlockAt);
    }

    private Optional<HttpResult> get(String uriTemplate, Object... uriVariables) {
        try {
            return Optional.ofNullable(restClient.get()
                    .uri(uriTemplate, uriVariables)
                    .exchange((request, response) -> new HttpResult(
                            response.getStatusCode().value(),
                            new String(response.getBody().readAllBytes(), StandardCharsets.UTF_8)
                    )));
        } catch (RestClientException ex) {
            // Sem ex.getMessage(): ela traz o endereco consultado, com a chave da API.
            log.warn("A Steam Web API nao respondeu ({})", ex.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    private JsonNode readTree(String body) {
        try {
            return objectMapper.readTree(body == null || body.isBlank() ? "{}" : body);
        } catch (JsonProcessingException ex) {
            return objectMapper.createObjectNode();
        }
    }
}
