package com.gameranking.common.upload;

import com.gameranking.common.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ImageFileTypeTest {

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0};
    private static final byte[] WEBP = {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'};

    @Test
    void detectaImagensPeloConteudoEIgnoraNomeETipoDoCliente() {
        MockMultipartFile disguised = new MockMultipartFile("file", "foto.html", "text/html", PNG);

        assertThat(ImageFileType.detect(disguised)).isEqualTo(ImageFileType.PNG);
        assertThat(ImageFileType.detect(JPEG)).contains(ImageFileType.JPEG);
        assertThat(ImageFileType.detect(WEBP)).contains(ImageFileType.WEBP);
    }

    @Test
    void recusaHtmlESvgMesmoComContentTypeDeImagem() {
        MockMultipartFile html = new MockMultipartFile(
                "file", "a.png", "image/png", "<html><script>alert(1)</script>".getBytes(StandardCharsets.UTF_8));
        MockMultipartFile svg = new MockMultipartFile(
                "file", "a.svg", "image/svg+xml", "<svg onload=alert(1)>".getBytes(StandardCharsets.UTF_8));

        assertThatThrownBy(() -> ImageFileType.detect(html)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> ImageFileType.detect(svg)).isInstanceOf(BusinessException.class);
    }

    @Test
    void arquivoAntigoQueNaoEhImagemEhServidoComoDownload() {
        HttpHeaders legacy = ImageFileType.safeServingHeaders("text/html");
        HttpHeaders image = ImageFileType.safeServingHeaders("image/png");

        assertThat(legacy.getFirst(HttpHeaders.CONTENT_DISPOSITION)).isEqualTo("attachment");
        assertThat(legacy.getContentType().toString()).isEqualTo("application/octet-stream");
        assertThat(image.getFirst(HttpHeaders.CONTENT_DISPOSITION)).isEqualTo("inline");
        assertThat(image.getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
    }
}
