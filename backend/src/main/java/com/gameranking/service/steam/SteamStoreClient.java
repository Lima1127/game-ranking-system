package com.gameranking.service.steam;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Consulta a loja publica da Steam (store.steampowered.com). Essas rotas nao exigem chave de API.
 *
 * A Steam nunca e obrigatoria: se ela estiver fora do ar, lenta ou desligada
 * (app.steam.enabled=false), a busca devolve lista vazia e o detalhe devolve vazio,
 * e o site continua funcionando com o cadastro de jogos pelo nome digitado.
 */
@Slf4j
@Component
public class SteamStoreClient {

    static final int MAX_SUGGESTIONS = 8;
    static final int MAX_NAME_LENGTH = 180;
    static final int MAX_GENRE_LENGTH = 60;
    // Ano em qualquer formato de data da Steam ("24/fev./2022", "Feb 24, 2022", "2022").
    private static final Pattern YEAR = Pattern.compile("\\b(19[7-9]\\d|20\\d{2})\\b");

    private final boolean enabled;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final TtlCache<String, List<SteamGameSuggestion>> searchCache = new TtlCache<>(200, Duration.ofMinutes(10));
    private final TtlCache<Integer, Optional<SteamAppDetails>> detailsCache = new TtlCache<>(500, Duration.ofHours(12));

    public SteamStoreClient(
            @Value("${app.steam.enabled:true}") boolean enabled,
            @Value("${app.steam.store-base-url:https://store.steampowered.com}") String storeBaseUrl,
            ObjectMapper objectMapper
    ) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(3));
        requestFactory.setReadTimeout(Duration.ofSeconds(5));

        this.enabled = enabled;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder()
                .baseUrl(storeBaseUrl)
                .requestFactory(requestFactory)
                .build();
    }

    /** Jogos da loja cujo nome combina com o termo (ate MAX_SUGGESTIONS). */
    public List<SteamGameSuggestion> search(String term) {
        if (!enabled) {
            return List.of();
        }
        String cacheKey = term.trim().toLowerCase(Locale.ROOT);
        List<SteamGameSuggestion> cached = searchCache.get(cacheKey);
        if (cached != null) {
            return cached;
        }

        try {
            String body = restClient.get()
                    .uri("/api/storesearch/?term={term}&l=brazilian&cc=BR", term.trim())
                    .retrieve()
                    .body(String.class);
            List<SteamGameSuggestion> suggestions = parseSearch(body);
            searchCache.put(cacheKey, suggestions);
            return suggestions;
        } catch (RestClientException | JsonProcessingException ex) {
            log.warn("Busca na Steam falhou para '{}': {}", term, ex.getMessage());
            return List.of();
        }
    }

    /** Nome oficial, ano de lancamento e generos do jogo. Vazio se a Steam nao conhece o appId ou nao respondeu. */
    public Optional<SteamAppDetails> fetchAppDetails(int appId) {
        if (!enabled) {
            return Optional.empty();
        }
        Optional<SteamAppDetails> cached = detailsCache.get(appId);
        if (cached != null) {
            return cached;
        }

        try {
            String body = restClient.get()
                    .uri("/api/appdetails?appids={appId}&l=brazilian&cc=BR", appId)
                    .retrieve()
                    .body(String.class);
            Optional<SteamAppDetails> details = parseAppDetails(appId, body);
            // So guarda respostas de verdade; falha de rede fica fora do cache para tentar de novo.
            detailsCache.put(appId, details);
            return details;
        } catch (RestClientException | JsonProcessingException ex) {
            log.warn("Detalhes do appId {} na Steam falharam: {}", appId, ex.getMessage());
            return Optional.empty();
        }
    }

    List<SteamGameSuggestion> parseSearch(String body) throws JsonProcessingException {
        List<SteamGameSuggestion> suggestions = new ArrayList<>();
        for (JsonNode item : readTree(body).path("items")) {
            String name = item.path("name").asText("").trim();
            int appId = item.path("id").asInt(0);
            if (!"app".equals(item.path("type").asText()) || appId <= 0 || name.isEmpty()) {
                continue;
            }
            suggestions.add(new SteamGameSuggestion(appId, limit(name, MAX_NAME_LENGTH), textOrNull(item.path("tiny_image"))));
            if (suggestions.size() == MAX_SUGGESTIONS) {
                break;
            }
        }
        return List.copyOf(suggestions);
    }

    Optional<SteamAppDetails> parseAppDetails(int appId, String body) throws JsonProcessingException {
        JsonNode app = readTree(body).path(String.valueOf(appId));
        JsonNode data = app.path("data");
        String name = data.path("name").asText("").trim();
        if (!app.path("success").asBoolean(false) || name.isEmpty()) {
            return Optional.empty();
        }

        List<String> genres = new ArrayList<>();
        for (JsonNode genre : data.path("genres")) {
            String description = genre.path("description").asText("").trim();
            if (!description.isEmpty()) {
                genres.add(limit(description, MAX_GENRE_LENGTH));
            }
        }

        return Optional.of(new SteamAppDetails(appId, limit(name, MAX_NAME_LENGTH), releaseYear(data.path("release_date")), List.copyOf(genres)));
    }

    /** Ano de lancamento; null se o jogo ainda nao saiu ("Em breve") ou a data nao tem ano. */
    private static Integer releaseYear(JsonNode releaseDate) {
        if (releaseDate.path("coming_soon").asBoolean(false)) {
            return null;
        }
        Matcher matcher = YEAR.matcher(releaseDate.path("date").asText(""));
        return matcher.find() ? Integer.valueOf(matcher.group(1)) : null;
    }

    private JsonNode readTree(String body) throws JsonProcessingException {
        return objectMapper.readTree(body == null ? "{}" : body);
    }

    private static String textOrNull(JsonNode node) {
        String text = node.asText("").trim();
        return text.isEmpty() ? null : text;
    }

    private static String limit(String text, int maxLength) {
        return text.length() <= maxLength ? text : text.substring(0, maxLength).trim();
    }
}
