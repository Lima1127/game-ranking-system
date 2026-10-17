package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.SteamLinkRequest;
import com.gameranking.domain.model.User;
import com.gameranking.repository.SteamLinkRequestRepository;
import com.gameranking.repository.UserRepository;
import com.gameranking.service.SteamAccountService.LinkResult;
import com.gameranking.service.steam.SteamOpenIdClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SteamAccountServiceTest {

    private static final String SITE = "https://reviradao.example.com";
    private static final String STEAM_ID = "76561198000000001";
    private static final String STATE = "codigo-de-teste";

    private final SteamLinkRequestRepository linkRequestRepository = mock(SteamLinkRequestRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final SteamOpenIdClient openIdClient = mock(SteamOpenIdClient.class);
    private final AdminAuditLogService auditLogService = mock(AdminAuditLogService.class);
    private final SteamAccountService service =
            new SteamAccountService(linkRequestRepository, userRepository, openIdClient, auditLogService, SITE + "/");

    private User player;
    private SteamLinkRequest pendingRequest;

    @BeforeEach
    void setUp() {
        player = User.builder().id(UUID.randomUUID()).displayName("Samy").role(UserRole.USER).active(true).build();
        pendingRequest = SteamLinkRequest.builder()
                .id(UUID.randomUUID())
                .user(player)
                .stateHash(PasswordResetService.hash(STATE))
                .createdAt(OffsetDateTime.now().minusMinutes(1))
                .expiresAt(OffsetDateTime.now().plusMinutes(9))
                .build();

        when(userRepository.findById(player.getId())).thenReturn(Optional.of(player));
        when(userRepository.findBySteamId(anyString())).thenReturn(Optional.empty());
        when(linkRequestRepository.findByStateHash(anyString())).thenReturn(Optional.empty());
        when(linkRequestRepository.findByStateHash(PasswordResetService.hash(STATE))).thenReturn(Optional.of(pendingRequest));
        when(openIdClient.confirmAssertion(anyMap())).thenReturn(true);
    }

    /** Resposta exatamente como a Steam envia no retorno do login. */
    private static Map<String, String> steamResponse() {
        Map<String, String> params = new HashMap<>();
        params.put("state", STATE);
        params.put("openid.ns", "http://specs.openid.net/auth/2.0");
        params.put("openid.mode", "id_res");
        params.put("openid.op_endpoint", "https://steamcommunity.com/openid/login");
        params.put("openid.claimed_id", "https://steamcommunity.com/openid/id/" + STEAM_ID);
        params.put("openid.identity", "https://steamcommunity.com/openid/id/" + STEAM_ID);
        params.put("openid.return_to", SITE + "/api/v1/steam/callback?state=" + STATE);
        params.put("openid.response_nonce", "2026-10-16T12:00:00Zabc");
        params.put("openid.assoc_handle", "1234567890");
        params.put("openid.signed", "signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle");
        params.put("openid.sig", "assinatura");
        return params;
    }

    @Test
    void inicioGuardaSoOHashDoCodigoEApontaParaASteam() {
        String url = service.startLink(player.getId());

        ArgumentCaptor<SteamLinkRequest> saved = ArgumentCaptor.forClass(SteamLinkRequest.class);
        verify(linkRequestRepository).save(saved.capture());
        String decoded = URLDecoder.decode(url, StandardCharsets.UTF_8);
        String state = decoded.substring(decoded.indexOf("?state=") + "?state=".length()).split("&")[0];

        assertThat(url).startsWith("https://steamcommunity.com/openid/login?");
        assertThat(decoded).contains("openid.return_to=" + SITE + "/api/v1/steam/callback?state=")
                .contains("openid.realm=" + SITE)
                .contains("openid.mode=checkid_setup");
        assertThat(state).hasSizeGreaterThanOrEqualTo(40);
        assertThat(saved.getValue().getStateHash()).isEqualTo(PasswordResetService.hash(state)).isNotEqualTo(state);
        assertThat(saved.getValue().getExpiresAt()).isBefore(OffsetDateTime.now().plusMinutes(11));
    }

    @Test
    void novoInicioInvalidaTentativasAnteriores() {
        when(linkRequestRepository.findAllByUserIdAndUsedAtIsNull(player.getId())).thenReturn(List.of(pendingRequest));

        service.startLink(player.getId());

        assertThat(pendingRequest.getUsedAt()).isNotNull();
    }

    @Test
    void semEnderecoDoSiteConfiguradoNaoInicia() {
        SteamAccountService semEndereco =
                new SteamAccountService(linkRequestRepository, userRepository, openIdClient, auditLogService, "");

        assertThatThrownBy(() -> semEndereco.startLink(player.getId())).isInstanceOf(BusinessException.class);
    }

    @Test
    void respostaValidaVinculaORegistraNoLogEGastaOCodigo() {
        assertThat(service.completeLink(steamResponse())).isEqualTo(LinkResult.LINKED);

        assertThat(player.getSteamId()).isEqualTo(STEAM_ID);
        assertThat(player.getSteamLinkedAt()).isNotNull();
        assertThat(pendingRequest.getUsedAt()).isNotNull();
        verify(auditLogService).logAboutUser(eq(player), eq("STEAM_LINKED"), eq(player), anyString());
    }

    @Test
    void codigoSoPodeSerUsadoUmaVez() {
        assertThat(service.completeLink(steamResponse())).isEqualTo(LinkResult.LINKED);
        player.setSteamId(null);

        assertThat(service.completeLink(steamResponse())).isEqualTo(LinkResult.EXPIRED);
        assertThat(player.getSteamId()).isNull();
    }

    @Test
    void codigoVencidoOuDesconhecidoNaoVincula() {
        pendingRequest.setExpiresAt(OffsetDateTime.now().minusSeconds(1));
        assertThat(service.completeLink(steamResponse())).isEqualTo(LinkResult.EXPIRED);

        Map<String, String> outroCodigo = steamResponse();
        outroCodigo.put("state", "codigo-inventado");
        assertThat(service.completeLink(outroCodigo)).isEqualTo(LinkResult.EXPIRED);

        Map<String, String> semCodigo = steamResponse();
        semCodigo.remove("state");
        assertThat(service.completeLink(semCodigo)).isEqualTo(LinkResult.INVALID);

        assertThat(player.getSteamId()).isNull();
        verify(openIdClient, never()).confirmAssertion(anyMap());
    }

    @Test
    void respostaQueNaoVeioDaSteamERecusadaSemConsultar() {
        Map<String, String> outroServidor = steamResponse();
        outroServidor.put("openid.op_endpoint", "https://steamcommunity.com.golpe.example/openid/login");
        assertThat(service.completeLink(outroServidor)).isEqualTo(LinkResult.INVALID);
        verify(openIdClient, never()).confirmAssertion(anyMap());
        assertThat(player.getSteamId()).isNull();
    }

    @Test
    void respostaComFormatoDiferenteERecusada() {
        assertRecusada("openid.claimed_id", "https://steamcommunity.com/openid/id/123");
        assertRecusada("openid.identity", "https://steamcommunity.com/openid/id/76561198000000002");
        assertRecusada("openid.return_to", "https://outro-site.example/api/v1/steam/callback?state=" + STATE);
        assertRecusada("openid.return_to", SITE + "/api/v1/steam/callback?state=outro-codigo");
        assertRecusada("openid.mode", "cancel");
        assertRecusada("openid.signed", "op_endpoint,identity,return_to,response_nonce");
    }

    private void assertRecusada(String field, String value) {
        setUp();
        Map<String, String> params = steamResponse();
        params.put(field, value);

        assertThat(service.completeLink(params)).as(field + "=" + value).isEqualTo(LinkResult.INVALID);
        assertThat(player.getSteamId()).isNull();
    }

    @Test
    void steamNaoConfirmandoARespostaNaoVincula() {
        when(openIdClient.confirmAssertion(anyMap())).thenReturn(false);

        assertThat(service.completeLink(steamResponse())).isEqualTo(LinkResult.NOT_CONFIRMED);
        assertThat(player.getSteamId()).isNull();
        assertThat(pendingRequest.getUsedAt()).isNotNull();
    }

    @Test
    void perfilSteamDeOutroJogadorNaoPodeSerVinculado() {
        User outro = User.builder().id(UUID.randomUUID()).steamId(STEAM_ID).build();
        when(userRepository.findBySteamId(STEAM_ID)).thenReturn(Optional.of(outro));

        assertThat(service.completeLink(steamResponse())).isEqualTo(LinkResult.IN_USE);
        assertThat(player.getSteamId()).isNull();
        verify(auditLogService, never()).logAboutUser(any(), anyString(), any(), anyString());
    }

    @Test
    void desvincularLimpaERegistraNoLog() {
        player.setSteamId(STEAM_ID);
        player.setSteamLinkedAt(OffsetDateTime.now());

        service.unlink(player.getId());

        assertThat(player.getSteamId()).isNull();
        assertThat(player.getSteamLinkedAt()).isNull();
        verify(auditLogService).logAboutUser(player, "STEAM_UNLINKED", player, "Perfil Steam " + STEAM_ID);
    }

    @Test
    void voltaSempreParaATelaMenuDoProprioSite() {
        assertThat(service.screenUrlFor(LinkResult.LINKED)).isEqualTo(SITE + "/menu?steam=vinculado");
        assertThat(service.screenUrlFor(LinkResult.IN_USE)).isEqualTo(SITE + "/menu?steam=em-uso");
    }
}
