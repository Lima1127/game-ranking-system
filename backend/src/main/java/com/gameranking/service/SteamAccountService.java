package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.common.exception.NotFoundException;
import com.gameranking.domain.model.SteamLinkRequest;
import com.gameranking.domain.model.User;
import com.gameranking.repository.SteamLinkRequestRepository;
import com.gameranking.repository.UserRepository;
import com.gameranking.service.steam.SteamOpenIdClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Vinculo da conta do Reviradao com um perfil Steam, pelo login OpenID da propria Steam.
 *
 * 1. O jogador logado pede para vincular: criamos um codigo aleatorio de uso unico (10 minutos,
 *    guardado so como hash) e devolvemos o endereco do login da Steam.
 * 2. A pessoa entra NO SITE DA STEAM (o Reviradao nunca ve senha nem codigo do Steam Guard).
 * 3. A Steam devolve a pessoa para o nosso retorno com o SteamID. Antes de aceitar, conferimos
 *    o codigo (prova qual usuario iniciou), o formato da resposta e, direto com a Steam, se a
 *    resposta e verdadeira.
 *
 * O vinculo serve apenas para identificar o perfil Steam; ele NAO permite entrar no Reviradao.
 */
@Slf4j
@Service
public class SteamAccountService {

    /** Resultado do retorno da Steam; o codigo vai no endereco da tela (?steam=...). */
    public enum LinkResult {
        LINKED("vinculado"),
        EXPIRED("expirado"),
        INVALID("invalido"),
        NOT_CONFIRMED("nao-confirmado"),
        IN_USE("em-uso");

        private final String code;

        LinkResult(String code) {
            this.code = code;
        }

        public String code() {
            return code;
        }
    }

    static final Duration LINK_VALIDITY = Duration.ofMinutes(10);
    static final String CALLBACK_PATH = "/api/v1/steam/callback";
    static final String OPENID_NS = "http://specs.openid.net/auth/2.0";
    private static final String IDENTIFIER_SELECT = "http://specs.openid.net/auth/2.0/identifier_select";
    private static final Pattern CLAIMED_ID = Pattern.compile("^https://steamcommunity\\.com/openid/id/(7656119\\d{10})$");
    // Campos que a Steam precisa ter assinado para a resposta valer.
    private static final Set<String> REQUIRED_SIGNED_FIELDS = Set.of("op_endpoint", "claimed_id", "identity", "return_to", "response_nonce");
    private static final SecureRandom RANDOM = new SecureRandom();

    private final SteamLinkRequestRepository linkRequestRepository;
    private final UserRepository userRepository;
    private final SteamOpenIdClient openIdClient;
    private final AdminAuditLogService auditLogService;
    private final String publicUrl;

    public SteamAccountService(
            SteamLinkRequestRepository linkRequestRepository,
            UserRepository userRepository,
            SteamOpenIdClient openIdClient,
            AdminAuditLogService auditLogService,
            @Value("${app.public-url:http://localhost:5173}") String publicUrl
    ) {
        this.linkRequestRepository = linkRequestRepository;
        this.userRepository = userRepository;
        this.openIdClient = openIdClient;
        this.auditLogService = auditLogService;
        this.publicUrl = publicUrl == null ? "" : publicUrl.trim().replaceAll("/+$", "");
    }

    /** Inicia o vinculo e devolve o endereco do login da Steam. Tentativas anteriores deixam de valer. */
    @Transactional
    public String startLink(UUID userId) {
        if (publicUrl.isEmpty()) {
            throw new BusinessException("O vinculo com a Steam nao esta configurado neste servidor (app.public-url).");
        }
        User user = userRepository.findById(userId)
                .filter(User::getActive)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));

        OffsetDateTime now = OffsetDateTime.now();
        linkRequestRepository.findAllByUserIdAndUsedAtIsNull(userId).forEach(old -> old.setUsedAt(now));

        String state = randomState();
        linkRequestRepository.save(SteamLinkRequest.builder()
                .id(UUID.randomUUID())
                .user(user)
                .stateHash(PasswordResetService.hash(state))
                .createdAt(now)
                .expiresAt(now.plus(LINK_VALIDITY))
                .build());

        Map<String, String> params = new LinkedHashMap<>();
        params.put("openid.ns", OPENID_NS);
        params.put("openid.mode", "checkid_setup");
        params.put("openid.return_to", callbackUrl(state));
        params.put("openid.realm", publicUrl);
        params.put("openid.identity", IDENTIFIER_SELECT);
        params.put("openid.claimed_id", IDENTIFIER_SELECT);
        return SteamOpenIdClient.OPENID_ENDPOINT + "?" + params.entrySet().stream()
                .map(entry -> entry.getKey() + "=" + URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8))
                .collect(Collectors.joining("&"));
    }

    /**
     * Retorno da Steam (endereco publico, sem login: o navegador chega aqui vindo da Steam).
     * Quem iniciou o vinculo e descoberto pelo codigo de uso unico, nunca por dados da Steam.
     */
    @Transactional
    public LinkResult completeLink(Map<String, String> params) {
        String state = params.get("state");
        if (state == null || state.isBlank()) {
            return LinkResult.INVALID;
        }

        Optional<SteamLinkRequest> found = linkRequestRepository.findByStateHash(PasswordResetService.hash(state));
        OffsetDateTime now = OffsetDateTime.now();
        if (found.isEmpty() || found.get().getUsedAt() != null || now.isAfter(found.get().getExpiresAt())) {
            return LinkResult.EXPIRED;
        }
        SteamLinkRequest request = found.get();
        // Uso unico: o codigo e gasto agora, mesmo que o resto da conferencia falhe.
        request.setUsedAt(now);

        Optional<String> steamId = extractSteamId(params, state);
        if (steamId.isEmpty()) {
            log.warn("Retorno da Steam recusado: resposta fora do formato esperado");
            return LinkResult.INVALID;
        }
        if (!openIdClient.confirmAssertion(params)) {
            return LinkResult.NOT_CONFIRMED;
        }

        User user = request.getUser();
        if (!Boolean.TRUE.equals(user.getActive())) {
            return LinkResult.INVALID;
        }
        Optional<User> owner = userRepository.findBySteamId(steamId.get());
        if (owner.isPresent() && !owner.get().getId().equals(user.getId())) {
            return LinkResult.IN_USE;
        }

        String previousSteamId = user.getSteamId();
        user.setSteamId(steamId.get());
        user.setSteamLinkedAt(now);
        auditLogService.logAboutUser(user, "STEAM_LINKED", user, previousSteamId == null || previousSteamId.equals(steamId.get())
                ? "Perfil Steam " + steamId.get()
                : "Perfil Steam trocado de " + previousSteamId + " para " + steamId.get());
        return LinkResult.LINKED;
    }

    @Transactional
    public void unlink(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));
        if (user.getSteamId() == null) {
            return;
        }
        String previousSteamId = user.getSteamId();
        user.setSteamId(null);
        user.setSteamLinkedAt(null);
        auditLogService.logAboutUser(user, "STEAM_UNLINKED", user, "Perfil Steam " + previousSteamId);
    }

    /** Para onde o navegador volta depois do retorno da Steam (sempre a tela Menu do proprio site). */
    public String screenUrlFor(LinkResult result) {
        return publicUrl + "/menu?steam=" + result.code();
    }

    /**
     * SteamID da resposta, se ela tiver exatamente o formato que a Steam envia e voltar para o
     * nosso retorno com o mesmo codigo. Qualquer diferenca = resposta recusada.
     */
    Optional<String> extractSteamId(Map<String, String> params, String state) {
        if (!"id_res".equals(params.get("openid.mode"))
                || !OPENID_NS.equals(params.get("openid.ns"))
                || !SteamOpenIdClient.OPENID_ENDPOINT.equals(params.get("openid.op_endpoint"))
                || !callbackUrl(state).equals(params.get("openid.return_to"))) {
            return Optional.empty();
        }

        String claimedId = params.get("openid.claimed_id");
        if (claimedId == null || !claimedId.equals(params.get("openid.identity"))) {
            return Optional.empty();
        }
        List<String> signed = Arrays.asList(params.getOrDefault("openid.signed", "").split(","));
        if (!signed.containsAll(REQUIRED_SIGNED_FIELDS)) {
            return Optional.empty();
        }

        Matcher matcher = CLAIMED_ID.matcher(claimedId);
        return matcher.matches() ? Optional.of(matcher.group(1)) : Optional.empty();
    }

    String callbackUrl(String state) {
        return publicUrl + CALLBACK_PATH + "?state=" + state;
    }

    private static String randomState() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
