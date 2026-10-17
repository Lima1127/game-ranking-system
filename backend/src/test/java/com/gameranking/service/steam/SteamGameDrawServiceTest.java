package com.gameranking.service.steam;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gameranking.common.exception.BusinessException;
import com.gameranking.domain.enums.RotativeReviewBand;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

import static com.gameranking.domain.enums.RotativeReviewBand.CURRENT_YEAR;
import static com.gameranking.domain.enums.RotativeReviewBand.HIGH;
import static com.gameranking.domain.enums.RotativeReviewBand.MID;
import static com.gameranking.domain.enums.RotativeReviewBand.TOP;
import static com.gameranking.service.steam.SteamGameDrawService.Exclusions.none;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SteamGameDrawServiceTest {

    private static final int YEAR = 2026;

    private final SteamStoreQueryClient queryClient = mock(SteamStoreQueryClient.class);
    private final SteamGameDrawService service = new SteamGameDrawService(queryClient, new Random(42));

    /** Bloco com jogos de varias faixas; os codigos comecam em `firstAppId` para nao repetir entre blocos. */
    private static SteamStoreQueryClient.Page page(int firstAppId, int top, int high, int mid, int low) {
        List<SteamQueryGame> games = new ArrayList<>();
        int appId = firstAppId;
        for (int i = 0; i < top; i++) games.add(game(appId++, 8000, 2015));
        for (int i = 0; i < high; i++) games.add(game(appId++, 2000, 2015));
        for (int i = 0; i < mid; i++) games.add(game(appId++, 1200, 2015));
        for (int i = 0; i < low; i++) games.add(game(appId++, 50, 2015));
        return new SteamStoreQueryClient.Page(190_000, games);
    }

    private static SteamQueryGame game(int appId, int reviews, Integer year) {
        return new SteamQueryGame(appId, "Jogo " + appId, reviews, year, Set.of());
    }

    /** Cada consulta pela loja devolve um bloco novo (codigos diferentes), como a loja de verdade. */
    private AtomicInteger blocosNovosACadaConsulta(int top, int high, int mid, int low) {
        AtomicInteger calls = new AtomicInteger();
        when(queryClient.fetch(anyInt(), anyInt()))
                .thenAnswer(call -> Optional.of(page(calls.incrementAndGet() * 1000, top, high, mid, low)));
        return calls;
    }

    @Test
    void vagas() {
        assertThat(TOP.accepts(3000, 2015, YEAR)).isTrue();
        assertThat(TOP.accepts(2999, 2015, YEAR)).isFalse();
        assertThat(HIGH.accepts(1400, 2015, YEAR)).isTrue();
        assertThat(HIGH.accepts(1399, 2015, YEAR)).isFalse();
        assertThat(MID.accepts(1000, 2015, YEAR)).isTrue();
        assertThat(MID.accepts(1400, 2015, YEAR)).isFalse();
        assertThat(CURRENT_YEAR.accepts(1400, 2026, YEAR)).isTrue();
        assertThat(CURRENT_YEAR.accepts(1400, 2025, YEAR)).isFalse();
        assertThat(CURRENT_YEAR.accepts(1399, 2026, YEAR)).isFalse();
        assertThat(CURRENT_YEAR.accepts(5000, null, YEAR)).isFalse();
        // 22 com 1400+ (5 do ano + 10 com 3000+ + 7 livres) e 8 com 1000-1399.
        assertThat(CURRENT_YEAR.gamesPerList() + TOP.gamesPerList() + HIGH.gamesPerList()).isEqualTo(22);
        assertThat(MID.gamesPerList()).isEqualTo(8);
    }

    @Test
    void sorteiaAQuantidadeCertaDeCadaVagaSemRepetir() {
        blocosNovosACadaConsulta(6, 6, 3, 50);

        Map<RotativeReviewBand, List<SteamQueryGame>> drawn = service.drawRandom(Map.of(TOP, 10, HIGH, 7, MID, 8), none());

        assertThat(drawn.get(TOP)).hasSize(10).allMatch(game -> game.reviewCount() >= 3000);
        assertThat(drawn.get(HIGH)).hasSize(7).allMatch(game -> game.reviewCount() >= 1400);
        assertThat(drawn.get(MID)).hasSize(8).allMatch(game -> game.reviewCount() >= 1000 && game.reviewCount() < 1400);
        Set<Integer> appIds = drawn.values().stream().flatMap(List::stream).map(SteamQueryGame::appId).collect(Collectors.toSet());
        assertThat(appIds).hasSize(25);
    }

    @Test
    void jogos3000MaisPreenchemPrimeiroAVagaDeles() {
        // Blocos so com 3000+: eles tambem servem para a vaga 1400+ depois que a deles enche.
        blocosNovosACadaConsulta(10, 0, 0, 0);

        Map<RotativeReviewBand, List<SteamQueryGame>> drawn = service.drawRandom(Map.of(TOP, 4, HIGH, 2), none());

        assertThat(drawn.get(TOP)).hasSize(4);
        assertThat(drawn.get(HIGH)).hasSize(2).allMatch(game -> game.reviewCount() >= 3000);
    }

    @Test
    void umBlocoCheioNaoPreencheAListaSozinho() {
        AtomicInteger calls = blocosNovosACadaConsulta(50, 0, 0, 0);

        Map<RotativeReviewBand, List<SteamQueryGame>> drawn = service.drawRandom(Map.of(TOP, 10), none());

        assertThat(drawn.get(TOP)).hasSize(10);
        assertThat(calls.get()).isGreaterThanOrEqualTo(5);
        Map<Integer, Long> perBlock = drawn.get(TOP).stream()
                .collect(Collectors.groupingBy(game -> game.appId() / 1000, Collectors.counting()));
        assertThat(perBlock.values()).allMatch(count -> count <= SteamGameDrawService.MAX_PER_BAND_PER_PAGE);
    }

    @Test
    void naoSorteiaJogosExcluidos() {
        when(queryClient.fetch(anyInt(), anyInt())).thenReturn(Optional.of(page(1, 0, 5, 0, 0)));

        Map<RotativeReviewBand, List<SteamQueryGame>> drawn = service.drawRandom(Map.of(HIGH, 2), new SteamGameDrawService.Exclusions(Set.of(1, 2, 3), Set.of()));

        assertThat(drawn.get(HIGH)).extracting(SteamQueryGame::appId).containsExactlyInAnyOrder(4, 5);
    }

    @Test
    void naoSorteiaDoisJogosComOMesmoNome() {
        // Dois jogos diferentes da Steam com o mesmo nome virariam o mesmo jogo no catalogo.
        SteamStoreQueryClient.Page repetidos = new SteamStoreQueryClient.Page(190_000, List.of(
                new SteamQueryGame(1, "Doom", 5000, 2016, Set.of()),
                new SteamQueryGame(2, "DOOM ", 5000, 1993, Set.of()),
                new SteamQueryGame(3, "Quake", 5000, 1996, Set.of())
        ));
        when(queryClient.fetch(anyInt(), anyInt())).thenReturn(Optional.of(repetidos));

        Map<RotativeReviewBand, List<SteamQueryGame>> drawn = service.drawRandom(Map.of(HIGH, 2), none());

        assertThat(drawn.get(HIGH)).extracting(game -> game.name().trim().toLowerCase()).containsExactlyInAnyOrder("doom", "quake");
    }

    @Test
    void naoSorteiaJogoComONomeDeUmQueJaEstaNaLista() {
        when(queryClient.fetch(anyInt(), anyInt())).thenReturn(Optional.of(new SteamStoreQueryClient.Page(190_000, List.of(
                new SteamQueryGame(1, "Borderlands 2", 5000, 2012, Set.of()),
                new SteamQueryGame(2, "Quake", 5000, 1996, Set.of())
        ))));

        Map<RotativeReviewBand, List<SteamQueryGame>> drawn =
                service.drawRandom(Map.of(HIGH, 1), new SteamGameDrawService.Exclusions(Set.of(), Set.of("borderlands 2")));

        assertThat(drawn.get(HIGH)).extracting(SteamQueryGame::name).containsExactly("Quake");
    }

    @Test
    void steamFalhandoOuSemJogosSuficientesAvisaSemTravar() {
        when(queryClient.fetch(anyInt(), anyInt())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.drawRandom(Map.of(HIGH, 1), none())).isInstanceOf(BusinessException.class);

        when(queryClient.fetch(anyInt(), anyInt())).thenReturn(Optional.of(page(1, 0, 0, 0, 100)));
        assertThatThrownBy(() -> service.drawRandom(Map.of(MID, 1), none())).isInstanceOf(BusinessException.class);
    }

    @Test
    void lancamentosDoAnoSaemDasNovidadesPopulares() {
        SteamStoreQueryClient.Page novidades = new SteamStoreQueryClient.Page(190_000, List.of(
                game(1, 5000, 2026),
                game(2, 1500, 2026),
                game(3, 1300, 2026),   // poucas avaliacoes
                game(4, 9000, 2025),   // ano passado
                game(5, 2000, null),   // sem data
                game(6, 3000, 2026),
                game(7, 4000, 2026)    // excluido (ja zerado ou na lista)
        ));
        when(queryClient.fetch(eq(SteamGameDrawService.NEW_RELEASES_SORT), anyInt(), anyInt()))
                .thenReturn(Optional.of(novidades));

        List<SteamQueryGame> drawn = service.drawCurrentYear(5, new SteamGameDrawService.Exclusions(Set.of(7), Set.of()), YEAR);

        // So 3 servem: devolve os 3 (quem chama completa as vagas que faltam).
        assertThat(drawn).extracting(SteamQueryGame::appId).containsExactlyInAnyOrder(1, 2, 6);
        assertThat(new HashSet<>(service.drawCurrentYear(2, none(), YEAR))).hasSize(2);
    }

    @Test
    void lancamentosDoAnoComSteamForaDoArDevolveVazio() {
        when(queryClient.fetch(anyInt(), anyInt(), anyInt())).thenReturn(Optional.empty());

        assertThat(service.drawCurrentYear(5, none(), YEAR)).isEmpty();
    }

    @Test
    void marcaSoAsTagsEscolhidas() {
        assertThat(SteamGameDrawService.flaggedTagNames(Set.of(19, 6650, 44868)))
                .containsExactlyInAnyOrder("Nudez", "LGBTQIA+");
        assertThat(SteamGameDrawService.flaggedTagNames(Set.of(19, 122))).isEmpty();
        // "Sexual Themes" (40500) nao foi escolhida pelo grupo.
        assertThat(SteamGameDrawService.flaggedTagNames(Set.of(40500))).isEmpty();
    }

    @Test
    void leituraDaBuscaDaLoja() throws Exception {
        SteamStoreQueryClient client = new SteamStoreQueryClient(new ObjectMapper());
        String body = """
                {"response": {"metadata": {"total_matching_records": 192340}, "store_items": [
                  {"appid": 10, "success": 1, "visible": true, "name": "Counter-Strike",
                   "release": {"steam_release_date": 973036800}, "tagids": [1663, 19],
                   "reviews": {"summary_filtered": {"review_count": 170240}}},
                  {"appid": 20, "success": 1, "visible": true, "name": "Em Breve",
                   "release": {"is_coming_soon": true}, "reviews": {"summary_filtered": {"review_count": 5000}}},
                  {"appid": 30, "success": 1, "visible": false, "name": "Escondido",
                   "reviews": {"summary_filtered": {"review_count": 5000}}},
                  {"appid": 40, "success": 1, "visible": true, "name": "Sem Data", "tagids": [6650]}
                ]}}
                """;

        SteamStoreQueryClient.Page page = client.parse(body);

        assertThat(page.totalGames()).isEqualTo(192340);
        assertThat(page.games()).containsExactly(
                new SteamQueryGame(10, "Counter-Strike", 170240, 2000, Set.of(1663, 19)),
                new SteamQueryGame(40, "Sem Data", 0, null, Set.of(6650))
        );
    }
}
