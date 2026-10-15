package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.common.exception.NotFoundException;
import com.gameranking.common.upload.ImageFileType;
import com.gameranking.domain.model.Completion;
import com.gameranking.domain.model.PlatinumProof;
import com.gameranking.repository.PlatinumProofRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PlatinumProofService {

    private final PlatinumProofRepository platinumProofRepository;
    private final FileStorageService fileStorageService;

    @Transactional
    public PlatinumProof upload(MultipartFile file) {
        ImageFileType imageType = ImageFileType.detect(file);
        byte[] content = readBytes(file);

        UUID id = UUID.randomUUID();
        String storageKey = fileStorageService.save("platinum", id + imageType.extension(), content);

        PlatinumProof proof = PlatinumProof.builder()
                .id(id)
                .completion(null)
                .storageKey(storageKey)
                .contentType(imageType.contentType())
                .fileSizeBytes((long) content.length)
                .sha256(sha256(content))
                .uploadedAt(OffsetDateTime.now())
                .build();

        return platinumProofRepository.save(proof);
    }

    public PlatinumProof findById(UUID id) {
        return platinumProofRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Comprovante de platina nao encontrado"));
    }

    public byte[] readContent(PlatinumProof proof) {
        return fileStorageService.read(proof.getStorageKey());
    }

    public String getContentType(UUID proofId) {
        return findById(proofId).getContentType();
    }

    public String getContentTypeIfExists(UUID proofId) {
        if (proofId == null) {
            return null;
        }
        return platinumProofRepository.findById(proofId)
                .map(PlatinumProof::getContentType)
                .orElse(null);
    }

    @Transactional
    public void attachToCompletion(UUID proofId, Completion completion) {
        PlatinumProof proof = findById(proofId);
        if (proof.getCompletion() != null && !proof.getCompletion().getId().equals(completion.getId())) {
            throw new BusinessException("Este anexo ja esta vinculado a outro registro");
        }
        proof.setCompletion(completion);
        PlatinumProof savedProof = platinumProofRepository.save(proof);
        completion.setProof(savedProof);
    }

    @Transactional
    public void replaceCompletionProof(UUID proofId, Completion completion) {
        if (completion.getProof() != null && completion.getProof().getId().equals(proofId)) {
            return;
        }
        completion.setProof(null);
        deleteByCompletionId(completion.getId());
        attachToCompletion(proofId, completion);
    }

    @Transactional
    public void deleteByCompletionId(UUID completionId) {
        platinumProofRepository.findByCompletionId(completionId).ifPresent(proof -> {
            platinumProofRepository.delete(proof);
            platinumProofRepository.flush();
            fileStorageService.delete(proof.getStorageKey());
        });
    }

    private static byte[] readBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException exception) {
            throw new UncheckedIOException("Falha ao ler comprovante", exception);
        }
    }

    private static String sha256(byte[] content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(content));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 indisponivel", exception);
        }
    }
}
