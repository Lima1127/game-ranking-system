package com.gameranking.web.controller;

import com.gameranking.domain.model.PlatinumProof;
import com.gameranking.service.PlatinumProofService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

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
}
