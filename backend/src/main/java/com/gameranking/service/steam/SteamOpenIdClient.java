package com.gameranking.service.steam;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.Map;

/**
 * Conversa com o login OpenID da Steam. A Steam so confirma "esta pessoa e dona do SteamID X":
 * nao existe senha, token de acesso nem permissao sobre a conta envolvidos.
 */
@Slf4j
@Component
public class SteamOpenIdClient {

    public static final String OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";

    private final RestClient restClient;

    public SteamOpenIdClient() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(3));
        requestFactory.setReadTimeout(Duration.ofSeconds(8));
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    /**
     * Pergunta direto a Steam se a resposta recebida no retorno do login foi mesmo emitida por ela
     * (modo check_authentication do OpenID 2.0). Sem isso, qualquer um poderia montar uma resposta
     * falsa com o SteamID de outra pessoa. Falha de rede = nao confirmado.
     */
    public boolean confirmAssertion(Map<String, String> openIdParams) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        openIdParams.forEach((key, value) -> {
            if (key.startsWith("openid.")) {
                form.add(key, value);
            }
        });
        form.set("openid.mode", "check_authentication");

        try {
            String body = restClient.post()
                    .uri(OPENID_ENDPOINT)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(String.class);
            return body != null && body.lines().anyMatch(line -> line.trim().equals("is_valid:true"));
        } catch (RestClientException ex) {
            log.warn("Nao foi possivel confirmar o login com a Steam: {}", ex.getMessage());
            return false;
        }
    }
}
