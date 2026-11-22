package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.domain.enums.CompletionStatus;
import com.gameranking.domain.enums.CompletionUpdateStatus;
import com.gameranking.domain.enums.ObligationStatus;
import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.Edition;
import com.gameranking.domain.model.Obligation;
import com.gameranking.domain.model.User;
import com.gameranking.repository.CompletionRepository;
import com.gameranking.repository.CompletionUpdateRequestRepository;
import com.gameranking.repository.EditionRepository;
import com.gameranking.repository.ObligationRepository;
import com.gameranking.repository.UserRepository;
import com.gameranking.web.dto.edition.EditionResponse;
import com.gameranking.web.dto.edition.EditionRolloverPreviewResponse;
import com.gameranking.web.dto.edition.EditionRolloverRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EditionServiceTest {

    private final EditionRepository editionRepository = mock(EditionRepository.class);
    private final CompletionRepository completionRepository = mock(CompletionRepository.class);
    private final CompletionUpdateRequestRepository updateRepository = mock(CompletionUpdateRequestRepository.class);
    private final ObligationRepository obligationRepository = mock(ObligationRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final AdminAuditLogService auditLogService = mock(AdminAuditLogService.class);
    private final EditionService service = new EditionService(
            editionRepository, completionRepository, updateRepository, obligationRepository, userRepository, auditLogService);

    private final User fundador = user(UserRole.FUNDADOR);
    private final User cofundador = user(UserRole.COFUNDADOR);
    private Edition atual;

    @BeforeEach
    void setUp() {
        atual = Edition.builder()
                .id(UUID.randomUUID())
                .name("Reviradao 2026")
                .year(2026)
                .startsAt(LocalDate.of(2026, 1, 1))
                .endsAt(LocalDate.of(2026, 12, 31))
                .active(true)
                .build();
        when(editionRepository.findByActiveTrue()).thenReturn(Optional.of(atual));
        when(editionRepository.lockById(atual.getId())).thenReturn(Optional.of(atual));
        when(editionRepository.saveAndFlush(any(Edition.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void previewSugereOAnoSeguinteESemPendenciasLiberaAVirada() {
        EditionRolloverPreviewResponse preview = service.preview(fundador.getId());

        assertThat(preview.canRollover()).isTrue();
        assertThat(preview.suggestedName()).isEqualTo("Reviradao 2027");
        assertThat(preview.suggestedYear()).isEqualTo(2027);
        assertThat(preview.suggestedStartsAt()).isEqualTo(LocalDate.of(2027, 1, 1));
        assertThat(preview.suggestedEndsAt()).isEqualTo(LocalDate.of(2027, 12, 31));
    }

    @Test
    void soOFundadorPodeVirar() {
        assertThatThrownBy(() -> service.preview(cofundador.getId())).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.rollover(cofundador.getId(), pedido2027())).isInstanceOf(BusinessException.class);
        verify(editionRepository, never()).saveAndFlush(any());
    }

    @Test
    void pedidoPendenteBloqueiaAVirada() {
        when(completionRepository.countByEditionIdAndStatus(atual.getId(), CompletionStatus.PENDING)).thenReturn(2L);

        assertThat(service.preview(fundador.getId()).canRollover()).isFalse();
        assertThatThrownBy(() -> service.rollover(fundador.getId(), pedido2027()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("pendencias");
        assertThat(atual.getActive()).isTrue();
    }

    @Test
    void atualizacaoPendenteOuObrigacaoEmRevisaoTambemBloqueiam() {
        when(updateRepository.countByCompletionEditionIdAndStatus(atual.getId(), CompletionUpdateStatus.PENDING)).thenReturn(1L);
        assertThatThrownBy(() -> service.rollover(fundador.getId(), pedido2027())).isInstanceOf(BusinessException.class);

        when(updateRepository.countByCompletionEditionIdAndStatus(atual.getId(), CompletionUpdateStatus.PENDING)).thenReturn(0L);
        when(obligationRepository.countByEditionIdAndStatusIn(atual.getId(), EditionService.UNDER_REVIEW)).thenReturn(1L);
        assertThatThrownBy(() -> service.rollover(fundador.getId(), pedido2027())).isInstanceOf(BusinessException.class);
    }

    @Test
    void viradaDesativaAAtualCriaANovaEEncerraObrigacoesAbertas() {
        Obligation aceita = Obligation.builder().id(UUID.randomUUID()).status(ObligationStatus.ACCEPTED).penaltyPoints(0).build();
        when(obligationRepository.findAllByEditionIdAndStatusIn(atual.getId(), EditionService.OPEN_TO_CLOSE))
                .thenReturn(List.of(aceita));

        EditionResponse nova = service.rollover(fundador.getId(), pedido2027());

        assertThat(atual.getActive()).isFalse();
        assertThat(nova.active()).isTrue();
        assertThat(nova.name()).isEqualTo("Reviradao 2027");
        assertThat(nova.year()).isEqualTo(2027);
        assertThat(aceita.getStatus()).isEqualTo(ObligationStatus.CANCELLED);
        assertThat(aceita.getPenaltyPoints()).isZero();
        assertThat(aceita.getResolvedAt()).isNotNull();
        verify(auditLogService).log(eq(fundador), eq("EDITION_ROLLOVER"), eq(null), anyString());
    }

    @Test
    void recusaSeAEdicaoMostradaNaTelaJaNaoEstaAtiva() {
        atual.setActive(false);   // outra pessoa ja fez a virada

        assertThatThrownBy(() -> service.rollover(fundador.getId(), pedido2027()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("mudou");
    }

    @Test
    void validaDatasEAnoDaNovaEdicao() {
        // comeca antes do fim da atual
        assertThatThrownBy(() -> service.rollover(fundador.getId(),
                new EditionRolloverRequest(atual.getId(), "Reviradao 2027", 2027, LocalDate.of(2026, 12, 1), LocalDate.of(2027, 12, 31))))
                .isInstanceOf(BusinessException.class);
        // inicio depois do fim
        assertThatThrownBy(() -> service.rollover(fundador.getId(),
                new EditionRolloverRequest(atual.getId(), "Reviradao 2027", 2027, LocalDate.of(2027, 12, 31), LocalDate.of(2027, 1, 1))))
                .isInstanceOf(BusinessException.class);
        // ano repetido
        when(editionRepository.existsByYear(2027)).thenReturn(true);
        assertThatThrownBy(() -> service.rollover(fundador.getId(), pedido2027())).isInstanceOf(BusinessException.class);

        assertThat(atual.getActive()).isTrue();
    }

    private EditionRolloverRequest pedido2027() {
        return new EditionRolloverRequest(atual.getId(), "  Reviradao 2027 ", 2027, LocalDate.of(2027, 1, 1), LocalDate.of(2027, 12, 31));
    }

    private User user(UserRole role) {
        User user = User.builder().id(UUID.randomUUID()).displayName(role.name()).role(role).build();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        return user;
    }
}
