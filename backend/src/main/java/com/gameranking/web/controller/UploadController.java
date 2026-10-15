package com.gameranking.web.controller;

import com.gameranking.common.upload.ImageFileType;
import com.gameranking.domain.model.PlatinumProof;
import com.gameranking.service.PlatinumProofService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/uploads")
@RequiredArgsConstructor
public class UploadController {

    private final PlatinumProofService platinumProofService;

    @PostMapping("/platinum")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> uploadPlatinum(@RequestParam("file") MultipartFile file) {
        PlatinumProof proof = platinumProofService.upload(file);
        return Map.of(
                "proofId", proof.getId(),
                "contentType", proof.getContentType(),
                "size", proof.getFileSizeBytes()
        );
    }

    @GetMapping("/proofs/{proofId}")
    public ResponseEntity<ByteArrayResource> viewProof(@PathVariable UUID proofId) {
        PlatinumProof proof = platinumProofService.findById(proofId);
        ByteArrayResource resource = new ByteArrayResource(platinumProofService.readContent(proof));

        // Cada comprovante tem id proprio e nunca muda: o navegador pode guardar em cache.
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofDays(7)))
                .headers(ImageFileType.safeServingHeaders(proof.getContentType()))
                .contentLength(resource.contentLength())
                .body(resource);
    }
}
