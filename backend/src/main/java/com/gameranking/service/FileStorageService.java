package com.gameranking.service;

import com.gameranking.common.exception.NotFoundException;
import com.gameranking.domain.model.FileBlob;
import com.gameranking.repository.FileBlobRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Onde ficam os arquivos enviados (comprovantes e avatares).
 *
 * <ul>
 *   <li>{@code app.storage.type=disk} (padrao): pasta {@code app.storage.root-path}; a chave e o caminho do arquivo.</li>
 *   <li>{@code app.storage.type=database}: tabela file_blobs; a chave e {@code "db:<id>"}.
 *       Usado na nuvem, onde o disco do servidor e apagado a cada reinicio.</li>
 * </ul>
 *
 * A leitura decide pelo formato da chave, entao arquivos antigos em disco continuam legiveis.
 */
@Slf4j
@Service
public class FileStorageService {

    static final String DATABASE_KEY_PREFIX = "db:";

    private final FileBlobRepository fileBlobRepository;
    private final boolean storeInDatabase;
    private final Path rootPath;

    public FileStorageService(
            FileBlobRepository fileBlobRepository,
            @Value("${app.storage.type:disk}") String storageType,
            @Value("${app.storage.root-path:storage}") String rootPath
    ) {
        this.fileBlobRepository = fileBlobRepository;
        this.storeInDatabase = "database".equalsIgnoreCase(storageType.trim());
        this.rootPath = Path.of(rootPath);
    }

    public boolean storesInDatabase() {
        return storeInDatabase;
    }

    /** Salva o arquivo e devolve a chave a ser gravada na entidade. */
    @Transactional
    public String save(String folder, String fileName, byte[] content) {
        if (storeInDatabase) {
            UUID id = UUID.randomUUID();
            fileBlobRepository.save(FileBlob.builder()
                    .id(id)
                    .data(content)
                    .createdAt(OffsetDateTime.now())
                    .build());
            return DATABASE_KEY_PREFIX + id;
        }

        try {
            Path directory = rootPath.resolve(folder);
            Files.createDirectories(directory);
            Path target = directory.resolve(fileName);
            Files.write(target, content);
            return target.toString();
        } catch (IOException exception) {
            throw new UncheckedIOException("Falha ao salvar arquivo", exception);
        }
    }

    @Transactional(readOnly = true)
    public byte[] read(String key) {
        if (isDatabaseKey(key)) {
            return fileBlobRepository.findById(blobId(key))
                    .map(FileBlob::getData)
                    .orElseThrow(() -> new NotFoundException("Arquivo nao encontrado"));
        }

        try {
            return Files.readAllBytes(Path.of(key));
        } catch (IOException exception) {
            throw new NotFoundException("Arquivo nao encontrado");
        }
    }

    /**
     * Remove o arquivo. No banco, faz parte da transacao (se ela for desfeita, o arquivo volta).
     * No disco, so apaga depois do commit, porque o disco nao participa da transacao.
     */
    @Transactional
    public void delete(String key) {
        if (key == null) {
            return;
        }
        if (isDatabaseKey(key)) {
            fileBlobRepository.deleteById(blobId(key));
            return;
        }

        Path path = Path.of(key);
        Runnable deleteFile = () -> {
            try {
                Files.deleteIfExists(path);
            } catch (IOException exception) {
                log.warn("Nao foi possivel remover o arquivo {} do disco", path, exception);
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    deleteFile.run();
                }
            });
        } else {
            deleteFile.run();
        }
    }

    static boolean isDatabaseKey(String key) {
        return key != null && key.startsWith(DATABASE_KEY_PREFIX);
    }

    private static UUID blobId(String key) {
        return UUID.fromString(key.substring(DATABASE_KEY_PREFIX.length()));
    }
}
