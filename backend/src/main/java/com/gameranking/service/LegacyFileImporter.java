package com.gameranking.service;

import com.gameranking.domain.model.PlatinumProof;
import com.gameranking.domain.model.User;
import com.gameranking.repository.PlatinumProofRepository;
import com.gameranking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Copia para o banco (tabela file_blobs) as imagens que ainda estao no disco.
 * Usado uma unica vez, ao levar um banco local para a nuvem:
 *
 *   --app.storage.type=database --app.storage.import-legacy-files=true
 *
 * Roda ao subir o backend, de dentro da pasta backend/ (onde fica storage/).
 * Os arquivos do disco nao sao apagados.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.storage.import-legacy-files", havingValue = "true")
public class LegacyFileImporter implements ApplicationRunner {

    private final FileStorageService fileStorageService;
    private final PlatinumProofRepository platinumProofRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!fileStorageService.storesInDatabase()) {
            log.warn("Importacao ignorada: ative tambem app.storage.type=database");
            return;
        }

        int proofs = 0;
        int avatars = 0;
        int missing = 0;

        for (PlatinumProof proof : platinumProofRepository.findAll()) {
            String key = proof.getStorageKey();
            if (FileStorageService.isDatabaseKey(key)) {
                continue;
            }
            byte[] content = readIfExists(key);
            if (content == null) {
                missing++;
                continue;
            }
            proof.setStorageKey(fileStorageService.save("platinum", proof.getId().toString(), content));
            proofs++;
        }

        for (User user : userRepository.findAll()) {
            String key = user.getAvatarStorageKey();
            if (key == null || FileStorageService.isDatabaseKey(key)) {
                continue;
            }
            byte[] content = readIfExists(key);
            if (content == null) {
                missing++;
                continue;
            }
            user.setAvatarStorageKey(fileStorageService.save("avatars", user.getId().toString(), content));
            avatars++;
        }

        log.info("Importacao de arquivos para o banco: {} comprovantes, {} avatares, {} arquivos nao encontrados no disco",
                proofs, avatars, missing);
    }

    private static byte[] readIfExists(String key) {
        try {
            Path path = Path.of(key);
            if (!Files.isRegularFile(path)) {
                log.warn("Arquivo nao encontrado no disco: {}", key);
                return null;
            }
            return Files.readAllBytes(path);
        } catch (Exception exception) {
            log.warn("Nao foi possivel ler {}", key, exception);
            return null;
        }
    }
}
