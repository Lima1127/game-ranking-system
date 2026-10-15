package com.gameranking.service;

import com.gameranking.common.exception.NotFoundException;
import com.gameranking.domain.model.FileBlob;
import com.gameranking.repository.FileBlobRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FileStorageServiceTest {

    private final FileBlobRepository repository = mock(FileBlobRepository.class);

    @Test
    void modoBancoGuardaNoBancoEDevolveChaveDb() {
        FileStorageService storage = new FileStorageService(repository, "database", "ignorado");
        byte[] content = {1, 2, 3};

        String key = storage.save("platinum", "x.png", content);

        ArgumentCaptor<FileBlob> saved = ArgumentCaptor.forClass(FileBlob.class);
        verify(repository).save(saved.capture());
        assertThat(key).isEqualTo("db:" + saved.getValue().getId());
        assertThat(saved.getValue().getData()).isEqualTo(content);

        when(repository.findById(saved.getValue().getId())).thenReturn(Optional.of(saved.getValue()));
        assertThat(storage.read(key)).isEqualTo(content);
    }

    @Test
    void modoBancoApagaPeloId() {
        FileStorageService storage = new FileStorageService(repository, "database", "ignorado");
        UUID id = UUID.randomUUID();

        storage.delete("db:" + id);

        verify(repository).deleteById(id);
    }

    @Test
    void modoDiscoGravaNaPastaConfiguradaELe(@TempDir Path root) {
        FileStorageService storage = new FileStorageService(repository, "disk", root.toString());

        String key = storage.save("avatars", "a.png", new byte[]{9, 8});

        assertThat(Path.of(key)).startsWith(root);
        assertThat(storage.read(key)).containsExactly(9, 8);

        storage.delete(key); // sem transacao ativa: apaga na hora
        assertThat(Files.exists(Path.of(key))).isFalse();
    }

    @Test
    void chaveAntigaDeDiscoContinuaLegivelMesmoNoModoBanco(@TempDir Path root) throws Exception {
        Path legacy = Files.write(root.resolve("antigo.png"), new byte[]{7});
        FileStorageService storage = new FileStorageService(repository, "database", "ignorado");

        assertThat(storage.read(legacy.toString())).containsExactly(7);
    }

    @Test
    void arquivoInexistenteViraNaoEncontrado() {
        FileStorageService storage = new FileStorageService(repository, "database", "ignorado");
        when(repository.findById(org.mockito.ArgumentMatchers.any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> storage.read("db:" + UUID.randomUUID())).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> storage.read("nao/existe.png")).isInstanceOf(NotFoundException.class);
    }
}
