package com.gameranking.common.upload;

import com.gameranking.common.exception.BusinessException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Optional;

/**
 * Imagens aceitas em uploads (comprovantes e avatares). O tipo e detectado pelos bytes
 * iniciais do arquivo; nome e Content-Type enviados pelo cliente sao ignorados, porque
 * servir HTML/SVG enviado por usuario permite XSS no dominio da API.
 */
public enum ImageFileType {
    JPEG("image/jpeg", ".jpg"),
    PNG("image/png", ".png"),
    GIF("image/gif", ".gif"),
    WEBP("image/webp", ".webp");

    private static final int HEADER_SIZE = 12;

    private final String contentType;
    private final String extension;

    ImageFileType(String contentType, String extension) {
        this.contentType = contentType;
        this.extension = extension;
    }

    public String contentType() {
        return contentType;
    }

    public String extension() {
        return extension;
    }

    public static ImageFileType detect(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Envie um arquivo de imagem");
        }
        try (InputStream input = file.getInputStream()) {
            byte[] header = input.readNBytes(HEADER_SIZE);
            return detect(header)
                    .orElseThrow(() -> new BusinessException("Formato nao suportado. Envie uma imagem JPG, PNG, GIF ou WEBP"));
        } catch (IOException exception) {
            throw new BusinessException("Nao foi possivel ler o arquivo enviado");
        }
    }

    public static Optional<ImageFileType> detect(byte[] header) {
        if (startsWith(header, 0xFF, 0xD8, 0xFF)) {
            return Optional.of(JPEG);
        }
        if (startsWith(header, 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A)) {
            return Optional.of(PNG);
        }
        if (startsWith(header, 'G', 'I', 'F', '8')) {
            return Optional.of(GIF);
        }
        if (startsWith(header, 'R', 'I', 'F', 'F') && header.length >= 12
                && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P') {
            return Optional.of(WEBP);
        }
        return Optional.empty();
    }

    public static Optional<ImageFileType> fromContentType(String contentType) {
        return Arrays.stream(values())
                .filter(type -> type.contentType.equalsIgnoreCase(contentType))
                .findFirst();
    }

    /**
     * Headers para servir um arquivo enviado por usuario. Arquivos antigos que nao sejam
     * imagem permitida sao entregues como download, nunca renderizados pelo navegador.
     */
    public static HttpHeaders safeServingHeaders(String storedContentType) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
        Optional<ImageFileType> type = fromContentType(storedContentType);
        if (type.isPresent()) {
            headers.setContentType(MediaType.parseMediaType(type.get().contentType));
            headers.set(HttpHeaders.CONTENT_DISPOSITION, "inline");
        } else {
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment");
        }
        return headers;
    }

    private static boolean startsWith(byte[] data, int... prefix) {
        if (data.length < prefix.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; i++) {
            if ((data[i] & 0xFF) != prefix[i]) {
                return false;
            }
        }
        return true;
    }
}
