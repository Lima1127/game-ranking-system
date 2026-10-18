package com.gameranking.service.steam;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Busca da loja Steam (IStoreQueryService/Query). Publica: nao usa a chave da API.
 *
 * Usada para sortear jogos da Lista Rotativa: a ordem "sort 2" e por codigo do jogo (estavel),
 * entao pular para uma posicao aleatoria e pegar um bloco de jogos e um sorteio de verdade sobre
 * a loja inteira. Cada jogo ja vem com o numero de avaliacoes, as tags e a data de lancamento.
 */
@Slf4j
@Component
public class SteamStoreQueryClient {

    static final int SORT_BY_APP_ID = 2;
    static final int TAG_COUNT = 20;
    private static final String BASE_URL = "https://api.steampowered.com";

    private final ObjectMapper objectMapper;
    private final RestClient restClient;

    public SteamStoreQueryClient(ObjectMapper objectMapper) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(3));
        requestFactory.setReadTimeout(Duration.ofSeconds(15));
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().baseUrl(BASE_URL).requestFactory(requestFactory).build();
    }

    /** Resultado de uma consulta: o bloco de jogos e quantos jogos a loja tem no total. */
    public record Page(int totalGames, List<SteamQueryGame> games) {
    }

    /** Jogos a partir da posicao `start`, na ordem por codigo do jogo. Vazio se a Steam nao responder. */
    public Optional<Page> fetch(int start, int count) {
        return fetch(SORT_BY_APP_ID, start, count);
    }

    /** Jogos a partir da posicao `start`, na ordem `sort` da loja. Vazio se a Steam nao responder. */
    public Optional<Page> fetch(int sort, int start, int count) {
        Map<String, Object> input = Map.of(
                "query", Map.of(
                        "start", start,
                        "count", count,
                        "sort", sort,
                        "filters", Map.of("type_filters", Map.of("include_games", true))
                ),
                "context", Map.of("language", "brazilian", "country_code", "BR"),
                "data_request", Map.of("include_reviews", true, "include_release", true, "include_tag_count", TAG_COUNT)
        );
        try {
            String body = restClient.get()
                    .uri("/IStoreQueryService/Query/v1/?input_json={input}", objectMapper.writeValueAsString(input))
                    .retrieve()
                    .body(String.class);
            return Optional.of(parse(body));
        } catch (RestClientException | JsonProcessingException ex) {
            log.warn("Busca da loja Steam falhou ({})", ex.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    /** Ignora itens invisiveis, sem nome e ainda nao lancados (nao da para zerar jogo que nao saiu). */
    Page parse(String body) throws JsonProcessingException {
        JsonNode response = objectMapper.readTree(body == null ? "{}" : body).path("response");
        int total = response.path("metadata").path("total_matching_records").asInt(0);

        List<SteamQueryGame> games = new ArrayList<>();
        for (JsonNode item : response.path("store_items")) {
            String name = item.path("name").asText("").trim();
            JsonNode release = item.path("release");
            if (item.path("success").asInt(0) != 1
                    || !item.path("visible").asBoolean(false)
                    || name.isEmpty()
                    || release.path("is_coming_soon").asBoolean(false)) {
                continue;
            }

            Set<Integer> tagIds = new LinkedHashSet<>();
            item.path("tagids").forEach(tag -> tagIds.add(tag.asInt()));
            long releaseEpoch = release.path("steam_release_date").asLong(0);
            Integer releaseYear = releaseEpoch > 0
                    ? Instant.ofEpochSecond(releaseEpoch).atOffset(ZoneOffset.UTC).getYear()
                    : null;

            games.add(new SteamQueryGame(
                    item.path("appid").asInt(),
                    name.length() <= SteamStoreClient.MAX_NAME_LENGTH ? name : name.substring(0, SteamStoreClient.MAX_NAME_LENGTH).trim(),
                    item.path("reviews").path("summary_filtered").path("review_count").asInt(0),
                    releaseYear,
                    Set.copyOf(tagIds)
            ));
        }
        return new Page(total, List.copyOf(games));
    }
}
