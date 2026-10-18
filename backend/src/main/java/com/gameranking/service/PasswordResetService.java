package com.gameranking.service;

import com.gameranking.common.UsuarioDeLogin;
import com.gameranking.common.exception.BusinessException;
import com.gameranking.common.exception.NotFoundException;
import com.gameranking.domain.model.PasswordResetRequest;
import com.gameranking.domain.model.PasswordResetRequest.Status;
import com.gameranking.domain.model.User;
import com.gameranking.repository.PasswordResetRequestRepository;
import com.gameranking.repository.UserRepository;
import com.gameranking.web.dto.user.PasswordResetResponses.CodigoGerado;
import com.gameranking.web.dto.user.PasswordResetResponses.PedidoPendente;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

/**
 * "Esqueci minha senha" sem e-mail (decisao do grupo em 15/10/2026):
 * 1. o jogador pede pelo site (so com o e-mail);
 * 2. um admin com cargo acima dele aprova e gera um codigo (ou o admin gera direto);
 * 3. o jogador informa e-mail + codigo + senha nova.
 *
 * O codigo vale 30 minutos e uma unica vez; e guardado como hash; 5 tentativas erradas o cancelam.
 */
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    static final Duration VALIDADE_DO_CODIGO = Duration.ofMinutes(30);
    static final int TENTATIVAS_MAXIMAS = 5;
    static final int PEDIDOS_POR_HORA = 3;
    // Sem caracteres que se confundem (0/O, 1/I/L) para facilitar ditar o codigo.
    private static final String ALFABETO_CODIGO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final int TAMANHO_CODIGO = 8;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final PasswordResetRequestRepository repository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AdminAuditLogService adminAuditLogService;

    /**
     * Pedido do jogador. Nunca informa se o e-mail existe (a resposta e sempre a mesma).
     */
    @Transactional
    public void solicitar(String username) {
        Optional<User> encontrado = userRepository.findByUsername(UsuarioDeLogin.normalizar(username));
        if (encontrado.isEmpty() || !Boolean.TRUE.equals(encontrado.get().getActive())) {
            return;
        }
        User user = encontrado.get();
        OffsetDateTime agora = OffsetDateTime.now();

        if (repository.countByUserIdAndRequestedAtAfter(user.getId(), agora.minusHours(1)) >= PEDIDOS_POR_HORA) {
            return;
        }
        // Ja existe pedido aguardando admin: nao duplica.
        if (!repository.findAllByUserIdAndStatusIn(user.getId(), List.of(Status.PENDING)).isEmpty()) {
            return;
        }

        repository.save(PasswordResetRequest.builder()
                .id(UUID.randomUUID())
                .user(user)
                .status(Status.PENDING)
                .requestedAt(agora)
                .build());
        adminAuditLogService.logAboutUser(user, "PASSWORD_RESET_REQUESTED", user, "Pedido de redefinicao de senha feito pelo site.");
    }

    @Transactional(readOnly = true)
    public List<PedidoPendente> listarPendentes(UUID actorId) {
        User actor = ensureStaff(actorId);
        return repository.findAllByStatusOrderByRequestedAtAsc(Status.PENDING).stream()
                .map(pedido -> new PedidoPendente(
                        pedido.getId(),
                        pedido.getUser().getId(),
                        pedido.getUser().getDisplayName(),
                        pedido.getUser().getUsername(),
                        pedido.getRequestedAt(),
                        UserPermissions.canResetPassword(actor, pedido.getUser())
                ))
                .toList();
    }

    /** Admin aprova um pedido do jogador e recebe o codigo para repassar. */
    @Transactional
    public CodigoGerado aprovar(UUID actorId, UUID pedidoId) {
        User actor = ensureStaff(actorId);
        PasswordResetRequest pedido = repository.findById(pedidoId)
                .orElseThrow(() -> new NotFoundException("Pedido nao encontrado"));
        if (pedido.getStatus() != Status.PENDING) {
            throw new BusinessException("Este pedido nao esta mais pendente");
        }
        return gerarCodigo(actor, pedido.getUser());
    }

    /** Admin gera um codigo por iniciativa propria (sem pedido do jogador). */
    @Transactional
    public CodigoGerado gerarParaUsuario(UUID actorId, UUID userId) {
        User actor = ensureStaff(actorId);
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));
        return gerarCodigo(actor, target);
    }

    @Transactional
    public void recusar(UUID actorId, UUID pedidoId) {
        User actor = ensureStaff(actorId);
        PasswordResetRequest pedido = repository.findById(pedidoId)
                .orElseThrow(() -> new NotFoundException("Pedido nao encontrado"));
        if (!UserPermissions.canResetPassword(actor, pedido.getUser())) {
            throw new BusinessException("Voce nao pode decidir sobre a senha deste usuario");
        }
        if (pedido.getStatus() != Status.PENDING) {
            throw new BusinessException("Este pedido nao esta mais pendente");
        }
        pedido.setStatus(Status.REJECTED);
        pedido.setDecidedBy(actor);
        pedido.setDecidedAt(OffsetDateTime.now());
        adminAuditLogService.logAboutUser(actor, "PASSWORD_RESET_REJECTED", pedido.getUser(), "Pedido de redefinicao de senha recusado.");
    }

    /**
     * Jogador usa o codigo. Qualquer problema (e-mail, codigo, validade) gera a mesma mensagem,
     * para nao dar pistas a quem estiver tentando adivinhar.
     */
    @Transactional(noRollbackFor = BusinessException.class)
    public void redefinir(String username, String codigo, String novaSenha) {
        BusinessException invalido = new BusinessException("Codigo invalido ou expirado. Peca um novo codigo a um admin.");

        User user = userRepository.findByUsername(UsuarioDeLogin.normalizar(username)).orElseThrow(() -> invalido);
        PasswordResetRequest pedido = repository.findAllByUserIdAndStatusIn(user.getId(), List.of(Status.APPROVED)).stream()
                .findFirst()
                .orElseThrow(() -> invalido);

        if (pedido.getCodeExpiresAt() == null || pedido.getCodeExpiresAt().isBefore(OffsetDateTime.now())) {
            pedido.setStatus(Status.CANCELLED);
            throw invalido;
        }
        if (!MessageDigest.isEqual(hash(normalizar(codigo)).getBytes(StandardCharsets.UTF_8),
                pedido.getCodeHash().getBytes(StandardCharsets.UTF_8))) {
            pedido.setFailedAttempts(pedido.getFailedAttempts() + 1);
            if (pedido.getFailedAttempts() >= TENTATIVAS_MAXIMAS) {
                pedido.setStatus(Status.CANCELLED);
            }
            throw invalido;
        }

        user.setPasswordHash(passwordEncoder.encode(novaSenha));
        pedido.setStatus(Status.USED);
        pedido.setUsedAt(OffsetDateTime.now());
        adminAuditLogService.logAboutUser(user, "PASSWORD_RESET_COMPLETED", user, "Senha redefinida com codigo de verificacao.");
    }

    private CodigoGerado gerarCodigo(User actor, User target) {
        if (!UserPermissions.canResetPassword(actor, target)) {
            throw new BusinessException("Voce nao pode redefinir a senha deste usuario");
        }

        OffsetDateTime agora = OffsetDateTime.now();
        // Um codigo novo invalida o anterior; um pedido pendente vira o aprovado.
        List<PasswordResetRequest> abertos = repository.findAllByUserIdAndStatusIn(target.getId(), List.of(Status.PENDING, Status.APPROVED));
        PasswordResetRequest pedido = abertos.stream()
                .filter(item -> item.getStatus() == Status.PENDING)
                .findFirst()
                .orElseGet(() -> PasswordResetRequest.builder()
                        .id(UUID.randomUUID())
                        .user(target)
                        .requestedAt(agora)
                        .build());
        abertos.stream()
                .filter(item -> item != pedido)
                .forEach(item -> item.setStatus(Status.CANCELLED));

        String codigo = gerarCodigoAleatorio();
        pedido.setStatus(Status.APPROVED);
        pedido.setCodeHash(hash(codigo));
        pedido.setCodeExpiresAt(agora.plus(VALIDADE_DO_CODIGO));
        pedido.setFailedAttempts(0);
        pedido.setDecidedBy(actor);
        pedido.setDecidedAt(agora);
        repository.save(pedido);

        adminAuditLogService.logAboutUser(actor, "PASSWORD_RESET_APPROVED", target, "Codigo de redefinicao de senha gerado (vale 30 minutos).");
        return new CodigoGerado(formatar(codigo), pedido.getCodeExpiresAt());
    }

    private User ensureStaff(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));
        if (!user.getRole().isStaff()) {
            throw new BusinessException("Acesso restrito a administradores");
        }
        return user;
    }

    static String gerarCodigoAleatorio() {
        StringBuilder codigo = new StringBuilder(TAMANHO_CODIGO);
        for (int i = 0; i < TAMANHO_CODIGO; i++) {
            codigo.append(ALFABETO_CODIGO.charAt(RANDOM.nextInt(ALFABETO_CODIGO.length())));
        }
        return codigo.toString();
    }

    /** "ABCD2345" -> "ABCD-2345" (mais facil de ler e ditar). */
    static String formatar(String codigo) {
        return codigo.substring(0, 4) + "-" + codigo.substring(4);
    }

    /** Aceita o codigo com ou sem traco, espacos e minusculas. */
    static String normalizar(String codigo) {
        return codigo == null ? "" : codigo.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT);
    }

    static String hash(String valor) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(valor.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 indisponivel", exception);
        }
    }
}
