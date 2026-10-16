package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.PasswordResetRequest;
import com.gameranking.domain.model.PasswordResetRequest.Status;
import com.gameranking.domain.model.User;
import com.gameranking.repository.PasswordResetRequestRepository;
import com.gameranking.repository.UserRepository;
import com.gameranking.web.dto.user.PasswordResetResponses.CodigoGerado;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Fluxo completo com um "banco" em memória: pedido -> admin gera código -> jogador redefine.
 */
class PasswordResetServiceTest {

    private final List<PasswordResetRequest> pedidos = new ArrayList<>();
    private final PasswordResetRequestRepository repository = mock(PasswordResetRequestRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private final PasswordResetService service =
            new PasswordResetService(repository, userRepository, encoder, mock(AdminAuditLogService.class));

    private final User admin = usuario("admin@teste.com", UserRole.ADMIN);
    private final User jogador = usuario("jogador@teste.com", UserRole.USER);

    private User usuario(String email, UserRole role) {
        return User.builder().id(UUID.randomUUID()).email(email).displayName(email).role(role).active(true)
                .passwordHash(encoder.encode("senhaAntiga")).build();
    }

    @BeforeEach
    void prepararBanco() {
        for (User u : List.of(admin, jogador)) {
            when(userRepository.findById(u.getId())).thenReturn(Optional.of(u));
        }
        // Igual ao banco de verdade: ignora maiúsculas/minúsculas.
        when(userRepository.findByEmailIgnoreCase(any())).thenAnswer(chamada -> List.of(admin, jogador).stream()
                .filter(u -> u.getEmail().equalsIgnoreCase(chamada.getArgument(0)))
                .findFirst());
        when(repository.save(any())).thenAnswer(chamada -> {
            PasswordResetRequest pedido = chamada.getArgument(0);
            if (!pedidos.contains(pedido)) pedidos.add(pedido);
            return pedido;
        });
        when(repository.findById(any())).thenAnswer(chamada ->
                pedidos.stream().filter(p -> p.getId().equals(chamada.getArgument(0))).findFirst());
        when(repository.findAllByUserIdAndStatusIn(any(), anyCollection())).thenAnswer(chamada -> pedidos.stream()
                .filter(p -> p.getUser().getId().equals(chamada.getArgument(0)))
                .filter(p -> ((java.util.Collection<?>) chamada.getArgument(1)).contains(p.getStatus()))
                .toList());
        when(repository.countByUserIdAndRequestedAtAfter(eq(jogador.getId()), any())).thenAnswer(chamada -> pedidos.stream()
                .filter(p -> p.getUser().getId().equals(jogador.getId()))
                .filter(p -> p.getRequestedAt().isAfter(chamada.getArgument(1)))
                .count());
    }

    @Test
    void fluxoCompletoPedidoAprovacaoERedefinicao() {
        service.solicitar("JOGADOR@teste.com ");
        assertThat(pedidos).singleElement().extracting(PasswordResetRequest::getStatus).isEqualTo(Status.PENDING);

        CodigoGerado gerado = service.aprovar(admin.getId(), pedidos.get(0).getId());
        assertThat(gerado.code()).matches("[A-Z2-9]{4}-[A-Z2-9]{4}");
        assertThat(pedidos.get(0).getCodeHash()).isNotEqualTo(gerado.code()); // guardado como hash

        // aceita o código sem traço e em minúsculas
        service.redefinir("jogador@teste.com", gerado.code().replace("-", "").toLowerCase(), "senhaNova123");
        assertThat(encoder.matches("senhaNova123", jogador.getPasswordHash())).isTrue();
        assertThat(pedidos.get(0).getStatus()).isEqualTo(Status.USED);

        // uso único
        assertThatThrownBy(() -> service.redefinir("jogador@teste.com", gerado.code(), "outraSenha1"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void emailInexistenteNaoCriaPedidoNemDenunciaNada() {
        service.solicitar("ninguem@teste.com");
        assertThat(pedidos).isEmpty();
    }

    @Test
    void naoDuplicaPedidoPendenteELimitaPorHora() {
        service.solicitar("jogador@teste.com");
        service.solicitar("jogador@teste.com");
        assertThat(pedidos).hasSize(1);

        pedidos.get(0).setStatus(Status.REJECTED);
        service.solicitar("jogador@teste.com");
        pedidos.get(1).setStatus(Status.REJECTED);
        service.solicitar("jogador@teste.com");
        pedidos.get(2).setStatus(Status.REJECTED);
        service.solicitar("jogador@teste.com"); // 4º na mesma hora: ignorado
        assertThat(pedidos).hasSize(3);
    }

    @Test
    void codigoExpiradoNaoFunciona() {
        CodigoGerado gerado = service.gerarParaUsuario(admin.getId(), jogador.getId());
        pedidos.get(0).setCodeExpiresAt(OffsetDateTime.now().minusMinutes(1));

        assertThatThrownBy(() -> service.redefinir("jogador@teste.com", gerado.code(), "senhaNova123"))
                .isInstanceOf(BusinessException.class);
        assertThat(pedidos.get(0).getStatus()).isEqualTo(Status.CANCELLED);
    }

    @Test
    void cincoTentativasErradasCancelamOCodigo() {
        CodigoGerado gerado = service.gerarParaUsuario(admin.getId(), jogador.getId());
        for (int i = 0; i < PasswordResetService.TENTATIVAS_MAXIMAS; i++) {
            assertThatThrownBy(() -> service.redefinir("jogador@teste.com", "ZZZZ-ZZZZ", "senhaNova123"))
                    .isInstanceOf(BusinessException.class);
        }
        assertThat(pedidos.get(0).getStatus()).isEqualTo(Status.CANCELLED);
        // nem o código certo funciona mais
        assertThatThrownBy(() -> service.redefinir("jogador@teste.com", gerado.code(), "senhaNova123"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void codigoNovoInvalidaOAnterior() {
        CodigoGerado primeiro = service.gerarParaUsuario(admin.getId(), jogador.getId());
        CodigoGerado segundo = service.gerarParaUsuario(admin.getId(), jogador.getId());

        assertThatThrownBy(() -> service.redefinir("jogador@teste.com", primeiro.code(), "senhaNova123"))
                .isInstanceOf(BusinessException.class);
        service.redefinir("jogador@teste.com", segundo.code(), "senhaNova123");
        assertThat(encoder.matches("senhaNova123", jogador.getPasswordHash())).isTrue();
    }

    @Test
    void soQuemTemCargoAcimaPodeGerarCodigo() {
        User outroAdmin = usuario("outro@teste.com", UserRole.ADMIN);
        when(userRepository.findById(outroAdmin.getId())).thenReturn(Optional.of(outroAdmin));

        assertThatThrownBy(() -> service.gerarParaUsuario(admin.getId(), outroAdmin.getId())).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.gerarParaUsuario(jogador.getId(), admin.getId())).isInstanceOf(BusinessException.class);
    }
}
