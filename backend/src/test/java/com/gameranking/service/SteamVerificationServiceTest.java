package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.domain.enums.CompletionStatus;
import com.gameranking.domain.enums.SteamCheckStatus;
import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.Completion;
import com.gameranking.domain.model.CompletionSteamCheck;
import com.gameranking.domain.model.Edition;
import com.gameranking.domain.model.Game;
import com.gameranking.domain.model.User;
import com.gameranking.repository.CompletionRepository;
import com.gameranking.repository.CompletionSteamCheckRepository;
import com.gameranking.repository.UserRepository;
import com.gameranking.service.steam.SteamPlayerGameData;
import com.gameranking.service.steam.SteamWebApiClient;
import com.gameranking.web.dto.completion.CompletionSteamCheckResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
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

class SteamVerificationServiceTest {

    private static final String STEAM_ID = "76561198000000001";
    private static final int ELDEN_RING = 1245620;

    private final CompletionRepository completionRepository = mock(CompletionRepository.class);
    private final CompletionSteamCheckRepository checkRepository = mock(CompletionSteamCheckRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final SteamWebApiClient steamWebApiClient = mock(SteamWebApiClient.class);
    // Executor que roda na hora: o teste ve o resultado sem esperar outra thread.
    private final SteamVerificationService service = new SteamVerificationService(
            completionRepository, checkRepository, userRepository, steamWebApiClient,
            mock(PlatformTransactionManager.class), Runnable::run);

    private User player;
    private User admin;
    private Game steamGame;
    private Completion completion;

    @BeforeEach
    void setUp() {
        player = User.builder().id(UUID.randomUUID()).role(UserRole.USER).steamId(STEAM_ID).build();
        admin = User.builder().id(UUID.randomUUID()).role(UserRole.ADMIN).build();
        steamGame = Game.builder().id(UUID.randomUUID()).name("ELDEN RING").steamAppId(ELDEN_RING).build();
        Edition edition = Edition.builder().id(UUID.randomUUID()).startsAt(LocalDate.of(2026, 1, 1)).build();
        completion = Completion.builder().id(UUID.randomUUID()).user(player).game(steamGame).edition(edition).build();

        when(completionRepository.findById(completion.getId())).thenReturn(Optional.of(completion));
        when(completionRepository.findAllById(any())).thenReturn(List.of(completion));
        when(userRepository.findById(player.getId())).thenReturn(Optional.of(player));
        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(checkRepository.save(any(CompletionSteamCheck.class))).thenAnswer(call -> call.getArgument(0));
        when(checkRepository.findAllById(any())).thenReturn(List.of());
    }

    @Test
    void guardaHorasEConquistasDaSteam() {
        OffsetDateTime lastUnlock = OffsetDateTime.parse("2026-03-10T20:00:00Z");
        when(steamWebApiClient.fetch(STEAM_ID, ELDEN_RING))
                .thenReturn(new SteamPlayerGameData(SteamCheckStatus.OK, 2535, 42, 42, lastUnlock));

        CompletionSteamCheck check = service.refresh(completion.getId());

        assertThat(check.getCompletionId()).isEqualTo(completion.getId());
        assertThat(check.getStatus()).isEqualTo(SteamCheckStatus.OK);
        assertThat(check.getSteamId()).isEqualTo(STEAM_ID);
        assertThat(check.getSteamAppId()).isEqualTo(ELDEN_RING);
        assertThat(check.getPlaytimeMinutes()).isEqualTo(2535);
        assertThat(check.getAchievementsUnlocked()).isEqualTo(42);
        assertThat(check.getLastUnlockAt()).isEqualTo(lastUnlock);
        assertThat(check.getCheckedAt()).isNotNull();
    }

    @Test
    void jogoSemVinculoComASteamNaoConsulta() {
        steamGame.setSteamAppId(null);

        assertThat(service.refresh(completion.getId()).getStatus()).isEqualTo(SteamCheckStatus.NO_STEAM_GAME);
        verify(steamWebApiClient, never()).fetch(anyString(), anyInt());
    }

    @Test
    void jogadorSemContaSteamNaoConsulta() {
        player.setSteamId(null);

        assertThat(service.refresh(completion.getId()).getStatus()).isEqualTo(SteamCheckStatus.NO_STEAM_ACCOUNT);
        verify(steamWebApiClient, never()).fetch(anyString(), anyInt());
    }

    @Test
    void falhaNaSteamNaoAtrapalhaORegistro() {
        when(steamWebApiClient.fetch(STEAM_ID, ELDEN_RING)).thenThrow(new IllegalStateException("Steam fora do ar"));

        // Sem transacao ativa (teste), roda na hora; a falha e registrada no log e engolida.
        service.verifyAfterCommit(List.of(completion.getId()));

        verify(checkRepository, never()).save(any());
    }

    @Test
    void verificacaoAgendadaGuardaOResultado() {
        when(steamWebApiClient.fetch(STEAM_ID, ELDEN_RING)).thenReturn(SteamPlayerGameData.of(SteamCheckStatus.PRIVATE_PROFILE));

        service.verifyAfterCommit(List.of(completion.getId()));

        verify(checkRepository).save(any(CompletionSteamCheck.class));
    }

    @Test
    void jogadorVeSoOsPropriosRegistros() {
        User outro = User.builder().id(UUID.randomUUID()).role(UserRole.USER).build();
        when(userRepository.findById(outro.getId())).thenReturn(Optional.of(outro));

        assertThat(service.list(player.getId(), List.of(completion.getId()))).hasSize(1);
        assertThat(service.list(admin.getId(), List.of(completion.getId()))).hasSize(1);
        assertThat(service.list(outro.getId(), List.of(completion.getId()))).isEmpty();
        assertThatThrownBy(() -> service.refreshFor(outro.getId(), completion.getId())).isInstanceOf(BusinessException.class);
        verify(steamWebApiClient, never()).fetch(anyString(), anyInt());
    }

    @Test
    void registroAindaNaoConferidoVemSemStatus() {
        List<CompletionSteamCheckResponse> checks = service.list(player.getId(), List.of(completion.getId()));

        assertThat(checks.get(0).status()).isNull();
        assertThat(checks.get(0).editionStartsAt()).isEqualTo(LocalDate.of(2026, 1, 1));
    }

    @Test
    void pedidoPendenteAindaNaoConferidoEConferidoSozinho() {
        completion.setStatus(CompletionStatus.PENDING);
        when(steamWebApiClient.fetch(STEAM_ID, ELDEN_RING))
                .thenReturn(new SteamPlayerGameData(SteamCheckStatus.OK, 600, 10, 10, null));

        List<CompletionSteamCheckResponse> checks = service.list(player.getId(), List.of(completion.getId()));

        assertThat(checks.get(0).status()).isNull();
        verify(steamWebApiClient).fetch(STEAM_ID, ELDEN_RING);
        verify(checkRepository).save(any(CompletionSteamCheck.class));
    }

    @Test
    void conferenciaFeitaSemChaveRepeteQuandoAChaveExiste() {
        completion.setStatus(CompletionStatus.PENDING);
        when(checkRepository.findAllById(any())).thenReturn(List.of(storedCheck(SteamCheckStatus.NOT_CONFIGURED)));
        when(steamWebApiClient.isConfigured()).thenReturn(true);
        when(steamWebApiClient.fetch(STEAM_ID, ELDEN_RING)).thenReturn(SteamPlayerGameData.of(SteamCheckStatus.PRIVATE_PROFILE));

        assertThat(service.list(player.getId(), List.of(completion.getId())).get(0).status()).isNull();
        verify(steamWebApiClient).fetch(STEAM_ID, ELDEN_RING);
    }

    @Test
    void conferenciaFeitaSemContaSteamRepeteDepoisQueOJogadorConecta() {
        completion.setStatus(CompletionStatus.PENDING);
        when(checkRepository.findAllById(any())).thenReturn(List.of(storedCheck(SteamCheckStatus.NO_STEAM_ACCOUNT)));
        when(steamWebApiClient.fetch(STEAM_ID, ELDEN_RING)).thenReturn(SteamPlayerGameData.of(SteamCheckStatus.PRIVATE_PROFILE));

        service.list(player.getId(), List.of(completion.getId()));

        verify(steamWebApiClient).fetch(STEAM_ID, ELDEN_RING);
    }

    @Test
    void conferenciaValidaNaoERepetidaSozinha() {
        completion.setStatus(CompletionStatus.PENDING);
        when(checkRepository.findAllById(any())).thenReturn(List.of(storedCheck(SteamCheckStatus.PRIVATE_PROFILE)));

        assertThat(service.list(player.getId(), List.of(completion.getId())).get(0).status())
                .isEqualTo(SteamCheckStatus.PRIVATE_PROFILE);
        verify(steamWebApiClient, never()).fetch(anyString(), anyInt());
    }

    @Test
    void registroJaAprovadoNaoEConferidoSozinho() {
        completion.setStatus(CompletionStatus.APPROVED);

        service.list(player.getId(), List.of(completion.getId()));

        verify(steamWebApiClient, never()).fetch(anyString(), anyInt());
    }

    private CompletionSteamCheck storedCheck(SteamCheckStatus status) {
        return CompletionSteamCheck.builder()
                .completionId(completion.getId())
                .status(status)
                .checkedAt(OffsetDateTime.now().minusHours(1))
                .build();
    }

    @Test
    void listaVaziaNaoConsultaOBanco() {
        assertThat(service.list(player.getId(), List.of())).isEmpty();
        verify(completionRepository, never()).findAllById(any());
    }
}
