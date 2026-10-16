package com.gameranking.service.steam;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class SteamStoreClientTest {

    private final SteamStoreClient client = new SteamStoreClient(true, "http://localhost:1", new ObjectMapper());

    @Test
    void buscaFicaSoComAppsValidos() throws Exception {
        String body = """
                {"total": 4, "items": [
                  {"type": "app", "name": "ELDEN RING", "id": 1245620, "tiny_image": "https://cdn/elden.jpg"},
                  {"type": "sub", "name": "Pacote ELDEN RING", "id": 999},
                  {"type": "app", "name": "  ", "id": 1},
                  {"type": "app", "name": "ELDEN RING NIGHTREIGN", "id": 2622380}
                ]}
                """;

        List<SteamGameSuggestion> suggestions = client.parseSearch(body);

        assertThat(suggestions).containsExactly(
                new SteamGameSuggestion(1245620, "ELDEN RING", "https://cdn/elden.jpg"),
                new SteamGameSuggestion(2622380, "ELDEN RING NIGHTREIGN", null)
        );
    }

    @Test
    void buscaLimitaQuantidadeDeSugestoes() throws Exception {
        StringBuilder items = new StringBuilder();
        for (int i = 1; i <= 20; i++) {
            items.append(i > 1 ? "," : "").append("{\"type\":\"app\",\"name\":\"Jogo ").append(i).append("\",\"id\":").append(i).append("}");
        }

        assertThat(client.parseSearch("{\"items\":[" + items + "]}")).hasSize(SteamStoreClient.MAX_SUGGESTIONS);
    }

    @Test
    void detalhesTrazemNomeAnoEGeneros() throws Exception {
        String body = """
                {"1245620": {"success": true, "data": {
                  "type": "game", "name": "ELDEN RING",
                  "release_date": {"coming_soon": false, "date": "24\\/fev.\\/2022"},
                  "genres": [{"id": "1", "description": "Ação"}, {"id": "3", "description": "RPG"}]
                }}}
                """;

        assertThat(client.parseAppDetails(1245620, body))
                .contains(new SteamAppDetails(1245620, "ELDEN RING", 2022, List.of("Ação", "RPG")));
    }

    @Test
    void jogoAindaNaoLancadoFicaSemAno() throws Exception {
        String body = """
                {"10": {"success": true, "data": {"name": "Jogo Futuro",
                  "release_date": {"coming_soon": true, "date": "2027"}}}}
                """;

        Optional<SteamAppDetails> details = client.parseAppDetails(10, body);

        assertThat(details).isPresent();
        assertThat(details.get().releaseYear()).isNull();
        assertThat(details.get().genres()).isEmpty();
    }

    @Test
    void appIdDesconhecidoDevolveVazio() throws Exception {
        assertThat(client.parseAppDetails(123, "{\"123\": {\"success\": false}}")).isEmpty();
        assertThat(client.parseAppDetails(123, "{}")).isEmpty();
    }

    @Test
    void steamDesligadaNaoFazConsultas() {
        SteamStoreClient disabled = new SteamStoreClient(false, "http://localhost:1", new ObjectMapper());

        assertThat(disabled.search("elden")).isEmpty();
        assertThat(disabled.fetchAppDetails(1245620)).isEmpty();
    }

    @Test
    void steamForaDoArNaoQuebraABusca() {
        // Porta 1 nao tem nada escutando: simula a Steam fora do ar.
        assertThat(client.search("elden")).isEmpty();
        assertThat(client.fetchAppDetails(1245620)).isEmpty();
    }
}
