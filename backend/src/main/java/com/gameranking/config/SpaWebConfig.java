package com.gameranking.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

/**
 * Na nuvem, o site (build do React em classpath:/static) e servido pelo proprio backend.
 *
 * O React cuida das rotas no navegador (/ranking, /requests...). Se alguem abrir ou
 * recarregar uma dessas paginas, nao existe arquivo com esse nome: devolvemos o index.html
 * e o React mostra a tela certa. Caminhos /api nunca caem aqui.
 *
 * Em desenvolvimento a pasta static fica vazia e o site continua rodando pelo Vite.
 */
@Configuration
public class SpaWebConfig implements WebMvcConfigurer {

    private static final Resource INDEX = new ClassPathResource("/static/index.html");

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        if (resourcePath.startsWith("api/")) {
                            return null;
                        }
                        if (resourcePath.isEmpty()) {
                            return INDEX.exists() ? INDEX : null;
                        }
                        Resource requested = location.createRelative(resourcePath);
                        if (requested.exists() && requested.isReadable()) {
                            return requested;
                        }
                        return INDEX.exists() ? INDEX : null;
                    }
                });
    }
}
