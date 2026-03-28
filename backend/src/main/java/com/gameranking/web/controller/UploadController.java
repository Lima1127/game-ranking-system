package com.gameranking.web.controller;

import com.gameranking.domain.model.PlatinumProof;
import com.gameranking.service.PlatinumProofService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
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
                "storageKey", proof.getStorageKey(),
                "contentType", proof.getContentType(),
                "size", proof.getFileSizeBytes()
        );
    }

    @GetMapping("/proofs/{proofId}")
    public ResponseEntity<ByteArrayResource> viewProof(@PathVariable UUID proofId) throws IOException {
        PlatinumProof proof = platinumProofService.findById(proofId);
        Path path = Path.of(proof.getStorageKey());
        ByteArrayResource resource = new ByteArrayResource(Files.readAllBytes(path));

        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (proof.getContentType() != null) {
            mediaType = MediaType.parseMediaType(proof.getContentType());
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .contentLength(proof.getFileSizeBytes())
                .contentType(mediaType)
                .body(resource);
    }
}
