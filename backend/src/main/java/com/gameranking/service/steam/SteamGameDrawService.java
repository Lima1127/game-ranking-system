package com.gameranking.service.steam;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.domain.enums.RotativeReviewBand;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

/**
 * Sorteia jogos da loja Steam para as vagas da Lista Rotativa (ver RotativeReviewBand).
 *
 * Vagas TOP, HIGH e MID: cada consulta pula para uma posicao aleatoria da loja (~190 mil jogos)
 * e traz um bloco de jogos; ficam os que servem para alguma vaga. Em media ~3% dos jogos tem 3000+
 * avaliacoes, ~4,5% tem 1400+ e ~0,9% tem entre 1000 e 1399.
 *
 * Vaga CURRENT_YEAR (lancado no ano da edicao, 1400+): no sorteio pela loja inteira so ~0,08% dos
 * jogos servem, entao ela sai da lista de novidades populares da propria loja, que concentra os
 * lancamentos recentes com muitas avaliacoes.
 */
@Service
public class SteamGameDrawService {

    /**
     * Tags da Steam que marcam o jogo em vermelho para os admins (podem sortear outro).
     * Codigos da propria Steam (IStoreService/GetTagList), com o nome em portugues.
     */
    public static final Map<Integer, String> FLAGGED_TAGS = Collections.unmodifiableMap(new LinkedHashMap<>(Map.of(
            6650, "Nudez",
            9130, "Hentai",
            12095, "Conteúdo Sexual",
            44868, "LGBTQIA+"
    )));

    static final int PAGE_SIZE = 100;
    // No maximo 2 jogos de cada vaga por bloco: sem isso, um bloco de uma regiao "cheia" da loja
    // (ex.: jogos antigos e populares) preenchia a lista quase toda e ela vinha toda da mesma epoca.
    static final int MAX_PER_BAND_PER_PAGE = 2;
    // Limite de consultas por sorteio: se a Steam estiver instavel, desiste com uma mensagem clara.
    static final int MAX_PAGES = 60;
    // Consultas feitas ao mesmo tempo (poucas, para nao sobrecarregar a Steam).
    static final int PARALLEL_PAGES = 4;
    // Antes da primeira resposta: um numero menor que a loja (out/2026: ~192 mil jogos), para a posicao existir.
    static final int INITIAL_TOTAL_GUESS = 150_000;
    // Lista de novidades populares da loja ("sort 20") e quantos jogos dela sao lidos.
    static final int NEW_RELEASES_SORT = 20;
    static final int NEW_RELEASES_DEPTH = 400;

    private final SteamStoreQueryClient queryClient;
    private final Random random;
    private volatile int knownTotalGames;

    @Autowired
    public SteamGameDrawService(SteamStoreQueryClient queryClient) {
        this(queryClient, new Random());
    }

    SteamGameDrawService(SteamStoreQueryClient queryClient, Random random) {
        this.queryClient = queryClient;
        this.random = random;
    }

    /**
     * Sorteia `needs` jogos para as vagas TOP, HIGH e MID, sem repetir e sem nenhum de
     * `excluded` (jogos ja zerados na edicao, ou que ja estao na lista).
     * Um jogo que serve para varias vagas vai para a primeira que ainda falta, na ordem TOP, HIGH, MID.
     */
    public Map<RotativeReviewBand, List<SteamQueryGame>> drawRandom(Map<RotativeReviewBand, Integer> needs, Exclusions excluded) {
        if (needs.containsKey(RotativeReviewBand.CURRENT_YEAR)) {
            throw new IllegalArgumentException("Lancamentos do ano saem de drawCurrentYear");
        }
        Map<RotativeReviewBand, List<SteamQueryGame>> picked = new EnumMap<>(RotativeReviewBand.class);
        needs.keySet().forEach(band -> picked.put(band, new ArrayList<>()));
        Exclusions used = excluded.copy();

        // As consultas saem em grupos de PARALLEL_PAGES ao mesmo tempo (cada uma leva ~1s);
        // os resultados sao processados em ordem, entao o sorteio continua o mesmo.
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int pages = 0; pages < MAX_PAGES && !complete(picked, needs); pages += PARALLEL_PAGES) {
                int storeSize = knownTotalGames > 0 ? knownTotalGames : INITIAL_TOTAL_GUESS;
                List<Future<Optional<SteamStoreQueryClient.Page>>> requests = new ArrayList<>();
                for (int i = 0; i < PARALLEL_PAGES; i++) {
                    int start = random.nextInt(Math.max(1, storeSize - PAGE_SIZE));
                    requests.add(executor.submit(() -> queryClient.fetch(start, PAGE_SIZE)));
                }

                for (Future<Optional<SteamStoreQueryClient.Page>> request : requests) {
                    SteamStoreQueryClient.Page result = await(request);
                    if (result != null) {
                        takeFromPage(result, needs, picked, used);
                    }
                }
            }
        }

        if (!complete(picked, needs)) {
            throw new BusinessException("A Steam nao respondeu o suficiente para sortear os jogos. Tente de novo em alguns minutos.");
        }
        return picked;
    }

    /**
     * Ate `amount` jogos lancados em `currentYear` com 1400+ avaliacoes, sorteados entre as
     * novidades populares da loja. Pode devolver menos (ex.: comeco do ano, ou Steam fora do ar):
     * quem chama decide o que fazer com as vagas que faltarem.
     */
    public List<SteamQueryGame> drawCurrentYear(int amount, Exclusions excluded, int currentYear) {
        Map<Integer, SteamQueryGame> pool = new LinkedHashMap<>();
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<Optional<SteamStoreQueryClient.Page>>> requests = new ArrayList<>();
            for (int start = 0; start < NEW_RELEASES_DEPTH; start += 200) {
                int pageStart = start;
                requests.add(executor.submit(() -> queryClient.fetch(NEW_RELEASES_SORT, pageStart, 200)));
            }
            for (Future<Optional<SteamStoreQueryClient.Page>> request : requests) {
                SteamStoreQueryClient.Page result = await(request);
                if (result == null) {
                    continue;
                }
                for (SteamQueryGame game : result.games()) {
                    if (RotativeReviewBand.CURRENT_YEAR.accepts(game.reviewCount(), game.releaseYear(), currentYear)
                            && !excluded.contains(game)) {
                        pool.putIfAbsent(game.appId(), game);
                    }
                }
            }
        }

        List<SteamQueryGame> candidates = new ArrayList<>(pool.values());
        Collections.shuffle(candidates, random);
        // Nomes repetidos na propria lista de novidades (jogos diferentes com o mesmo nome) entram uma vez so.
        Exclusions used = excluded.copy();
        List<SteamQueryGame> chosen = new ArrayList<>();
        for (SteamQueryGame game : candidates) {
            if (chosen.size() < amount && used.add(game)) {
                chosen.add(game);
            }
        }
        return List.copyOf(chosen);
    }

    /** Fica com ate MAX_PER_BAND_PER_PAGE jogos de cada vaga que ainda falta, sem repetir. */
    private void takeFromPage(
            SteamStoreQueryClient.Page result,
            Map<RotativeReviewBand, Integer> needs,
            Map<RotativeReviewBand, List<SteamQueryGame>> picked,
            Exclusions used
    ) {
        // Toda resposta informa quantos jogos a loja tem: as proximas posicoes usam o numero certo.
        if (result.totalGames() > 0) {
            knownTotalGames = result.totalGames();
        }

        List<SteamQueryGame> games = new ArrayList<>(result.games());
        Collections.shuffle(games, random);
        Map<RotativeReviewBand, Integer> pickedInThisPage = new EnumMap<>(RotativeReviewBand.class);
        for (SteamQueryGame game : games) {
            if (used.contains(game)) {
                continue;
            }
            // Ordem do enum: TOP antes de HIGH, para os 3000+ preencherem primeiro a vaga deles.
            for (RotativeReviewBand band : needs.keySet().stream().sorted().toList()) {
                if (picked.get(band).size() < needs.get(band)
                        && pickedInThisPage.getOrDefault(band, 0) < MAX_PER_BAND_PER_PAGE
                        && band.accepts(game.reviewCount(), game.releaseYear(), 0)) {
                    picked.get(band).add(game);
                    pickedInThisPage.merge(band, 1, Integer::sum);
                    used.add(game);
                    break;
                }
            }
        }
    }

    /** Resultado de uma consulta, ou null se ela falhou. */
    private static SteamStoreQueryClient.Page await(Future<Optional<SteamStoreQueryClient.Page>> request) {
        try {
            return request.get().orElse(null);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return null;
        } catch (ExecutionException ex) {
            return null;
        }
    }

    /**
     * Jogos que nao podem sair no sorteio, pelo codigo da Steam e tambem pelo NOME: no catalogo do
     * Reviradao "um nome = um jogo", entao dois jogos da Steam com o mesmo nome (relancamentos,
     * versoes regionais) virariam o mesmo jogo e a lista nao aceita o mesmo jogo duas vezes.
     */
    public static final class Exclusions {
        private final Set<Integer> appIds;
        private final Set<String> names;

        public Exclusions(Set<Integer> appIds, Set<String> names) {
            this.appIds = new HashSet<>(appIds);
            this.names = new HashSet<>();
            names.forEach(name -> this.names.add(normalize(name)));
        }

        public static Exclusions none() {
            return new Exclusions(Set.of(), Set.of());
        }

        public boolean contains(SteamQueryGame game) {
            return appIds.contains(game.appId()) || names.contains(normalize(game.name()));
        }

        /** Registra o jogo; false se ele (ou um jogo com o mesmo nome) ja estava. */
        public boolean add(SteamQueryGame game) {
            if (contains(game)) {
                return false;
            }
            appIds.add(game.appId());
            names.add(normalize(game.name()));
            return true;
        }

        public Exclusions copy() {
            Exclusions copy = new Exclusions(Set.of(), Set.of());
            copy.appIds.addAll(appIds);
            copy.names.addAll(names);
            return copy;
        }

        private static String normalize(String name) {
            return name == null ? "" : name.trim().toLowerCase(java.util.Locale.ROOT);
        }
    }

    /** Nomes das tags marcadas em vermelho que o jogo tem (vazio = nenhuma). */
    public static List<String> flaggedTagNames(Set<Integer> tagIds) {
        return FLAGGED_TAGS.entrySet().stream()
                .filter(entry -> tagIds.contains(entry.getKey()))
                .map(Map.Entry::getValue)
                .toList();
    }

    private static boolean complete(Map<RotativeReviewBand, List<SteamQueryGame>> picked, Map<RotativeReviewBand, Integer> needs) {
        return needs.entrySet().stream().allMatch(entry -> picked.get(entry.getKey()).size() >= entry.getValue());
    }
}
