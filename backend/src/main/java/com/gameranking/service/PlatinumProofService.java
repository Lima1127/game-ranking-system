package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.common.exception.NotFoundException;
import com.gameranking.domain.model.Completion;
import com.gameranking.domain.model.PlatinumProof;
import com.gameranking.repository.PlatinumProofRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PlatinumProofService {

    private final PlatinumProofRepository platinumProofRepository;

    @Transactional
    public PlatinumProof upload(MultipartFile file) {
        try {
            UUID id = UUID.randomUUID();
            Path storageDir = Path.of("storage", "platinum");
            Files.createDirectories(storageDir);

            String extension = getExtension(file.getOriginalFilename());
            String key = id + extension;
            Path target = storageDir.resolve(key);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

            PlatinumProof proof = PlatinumProof.builder()
                    .id(id)
                    .completion(null)
                    .storageKey(target.toString())
                    .contentType(file.getContentType() == null ? "application/octet-stream" : file.getContentType())
                    .fileSizeBytes(file.getSize())
                    .sha256(sha256(target))
                    .uploadedAt(OffsetDateTime.now())
                    .build();

            return platinumProofRepository.save(proof);
        } catch (IOException ex) {
            throw new RuntimeException("Falha ao salvar comprovante", ex);
        }
    }

    public PlatinumProof findById(UUID id) {
        return platinumProofRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Comprovante de platina nao encontrado"));
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
        completion.setProof(null);
        deleteByCompletionId(completion.getId());
        attachToCompletion(proofId, completion);
    }

    @Transactional
    public void deleteByCompletionId(UUID completionId) {
        platinumProofRepository.findByCompletionId(completionId).ifPresent(proof -> {
            try {
                Files.deleteIfExists(Path.of(proof.getStorageKey()));
            } catch (IOException ex) {
                throw new RuntimeException("Falha ao remover anexo do disco", ex);
            }
            platinumProofRepository.delete(proof);
            platinumProofRepository.flush();
        });
    }

    private String getExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            return ".bin";
        }
        return fileName.substring(fileName.lastIndexOf('.'));
    }

    private String sha256(Path path) {
        try {
            byte[] bytes = Files.readAllBytes(path);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(bytes));
        } catch (IOException | NoSuchAlgorithmException e) {
            throw new RuntimeException("Nao foi possivel calcular hash do arquivo", e);
        }
    }
}
