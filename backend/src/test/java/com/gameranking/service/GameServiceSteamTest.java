package com.gameranking.service;

import com.gameranking.common.exception.NotFoundException;
import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.Game;
import com.gameranking.domain.model.User;
import com.gameranking.repository.GameRepository;
import com.gameranking.repository.GenreRepository;
import com.gameranking.repository.UserRepository;
import com.gameranking.service.steam.SteamAppDetails;
import com.gameranking.service.steam.SteamGameSuggestion;
import com.gameranking.service.steam.SteamStoreClient;
import com.gameranking.web.dto.game.CreateGameRequest;
import com.gameranking.web.dto.game.GameResponse;
import com.gameranking.web.dto.game.SteamGameSuggestionResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GameServiceSteamTest {

    private static final int ELDEN_RING = 1245620;

    private final GameRepository gameRepository = mock(GameRepository.class);
    private final GenreRepository genreRepository = mock(GenreRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final SteamStoreClient steamStoreClient = mock(SteamStoreClient.class);
    private final GameService service = new GameService(gameRepository, genreRepository, userRepository, steamStoreClient);

    private final UUID playerId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        User player = User.builder().id(playerId).role(UserRole.USER).build();
        when(userRepository.findById(playerId)).thenReturn(Optional.of(player));
        when(gameRepository.findBySteamAppId(anyInt())).thenReturn(Optional.empty());
        when(gameRepository.findFirstByNameIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(gameRepository.save(any(Game.class))).thenAnswer(call -> call.getArgument(0));
        when(genreRepository.findByNameIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(genreRepository.save(any())).thenAnswer(call -> call.getArgument(0));
    }

    private static CreateGameRequest request(String typedName, Integer steamAppId) {
        return new CreateGameRequest(typedName, null, null, null, Set.of("Nao informado"), steamAppId);
    }

    @Test
    void jogoDaSteamNasceComNomeOficialEAnoMesmoCadastradoPorJogador() {
        when(steamStoreClient.fetchAppDetails(ELDEN_RING))
                .thenReturn(Optional.of(new SteamAppDetails(ELDEN_RING, "ELDEN RING", 2022, List.of("Ação", "RPG"))));

        GameResponse response = service.create(playerId, request("elden ring", ELDEN_RING));

        assertThat(response.name()).isEqualTo("ELDEN RING");
        assertThat(response.releaseYear()).isEqualTo(2022);
        assertThat(response.steamAppId()).isEqualTo(ELDEN_RING);
        assertThat(response.genres()).containsExactlyInAnyOrder("Ação", "RPG");
    }

    @Test
    void jogoJaVinculadoNaoConsultaASteamDeNovo() {
        Game linked = Game.builder().id(UUID.randomUUID()).name("ELDEN RING").releaseYear(2022).steamAppId(ELDEN_RING).build();
        when(gameRepository.findBySteamAppId(ELDEN_RING)).thenReturn(Optional.of(linked));

        GameResponse response = service.create(playerId, request("ELDEN RING", ELDEN_RING));

        assertThat(response.id()).isEqualTo(linked.getId());
        verify(steamStoreClient, never()).fetchAppDetails(anyInt());
        verify(gameRepository, never()).save(any());
    }

    @Test
    void jogoAntigoPeloNomeGanhaVinculoEAnoQueFaltava() {
        Game legacy = Game.builder().id(UUID.randomUUID()).name("Elden Ring").build();
        when(gameRepository.findFirstByNameIgnoreCase("ELDEN RING")).thenReturn(Optional.of(legacy));
        when(steamStoreClient.fetchAppDetails(ELDEN_RING))
                .thenReturn(Optional.of(new SteamAppDetails(ELDEN_RING, "ELDEN RING", 2022, List.of())));

        GameResponse response = service.create(playerId, request("ELDEN RING", ELDEN_RING));

        assertThat(response.id()).isEqualTo(legacy.getId());
        assertThat(legacy.getSteamAppId()).isEqualTo(ELDEN_RING);
        assertThat(legacy.getReleaseYear()).isEqualTo(2022);
        verify(gameRepository, never()).save(any());
    }

    @Test
    void anoDefinidoPorAdminNaoESobrescritoPelaSteam() {
        Game legacy = Game.builder().id(UUID.randomUUID()).name("ELDEN RING").releaseYear(2021).build();
        when(gameRepository.findFirstByNameIgnoreCase("ELDEN RING")).thenReturn(Optional.of(legacy));
        when(steamStoreClient.fetchAppDetails(ELDEN_RING))
                .thenReturn(Optional.of(new SteamAppDetails(ELDEN_RING, "ELDEN RING", 2022, List.of())));

        service.create(playerId, request("ELDEN RING", ELDEN_RING));

        assertThat(legacy.getSteamAppId()).isEqualTo(ELDEN_RING);
        assertThat(legacy.getReleaseYear()).isEqualTo(2021);
    }

    @Test
    void steamForaDoArSegueCadastroPeloNomeDigitado() {
        when(steamStoreClient.fetchAppDetails(ELDEN_RING)).thenReturn(Optional.empty());

        GameResponse response = service.create(playerId, request("  Elden Ring ", ELDEN_RING));

        assertThat(response.name()).isEqualTo("Elden Ring");
        assertThat(response.releaseYear()).isNull();
        assertThat(response.steamAppId()).isNull();
    }

    @Test
    void semSteamAppIdNadaMuda() {
        GameResponse response = service.create(playerId, request("Hollow Knight", null));

        assertThat(response.name()).isEqualTo("Hollow Knight");
        assertThat(response.steamAppId()).isNull();
        verify(steamStoreClient, never()).fetchAppDetails(anyInt());
    }

    @Test
    void buscaMarcaJogosQueJaEstaoNoCatalogo() {
        UUID existingId = UUID.randomUUID();
        when(gameRepository.findFirstByNameIgnoreCase("ELDEN RING"))
                .thenReturn(Optional.of(Game.builder().id(existingId).name("ELDEN RING").build()));
        when(steamStoreClient.search("elden")).thenReturn(List.of(
                new SteamGameSuggestion(ELDEN_RING, "ELDEN RING", "https://cdn/elden.jpg"),
                new SteamGameSuggestion(2622380, "ELDEN RING NIGHTREIGN", null)
        ));

        List<SteamGameSuggestionResponse> suggestions = service.searchSteam(" elden ");

        assertThat(suggestions).extracting(SteamGameSuggestionResponse::existingGameId)
                .containsExactly(existingId, null);
    }

    @Test
    void anoDeLancamentoDeJogoDaSteamForaDoCatalogo() {
        when(steamStoreClient.fetchAppDetails(ELDEN_RING))
                .thenReturn(Optional.of(new SteamAppDetails(ELDEN_RING, "ELDEN RING", 2022, List.of())));

        assertThat(service.steamAppSummary(ELDEN_RING).releaseYear()).isEqualTo(2022);
    }

    @Test
    void steamSemRespostaParaOAnoDevolveNaoEncontrado() {
        when(steamStoreClient.fetchAppDetails(ELDEN_RING)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.steamAppSummary(ELDEN_RING)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void buscaMuitoCurtaNaoConsultaASteam() {
        assertThat(service.searchSteam("e")).isEmpty();
        assertThat(service.searchSteam(null)).isEmpty();
        verify(steamStoreClient, never()).search(anyString());
    }
}
