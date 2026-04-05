package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.common.exception.NotFoundException;
import com.gameranking.domain.model.User;
import com.gameranking.repository.UserRepository;
import com.gameranking.web.dto.user.UserSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final long MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<UserSummaryResponse> listActiveUsers() {
        return userRepository.findAllByActiveTrueOrderByDisplayNameAsc().stream()
                .map(user -> new UserSummaryResponse(user.getId(), user.getDisplayName()))
                .toList();
    }

    @Transactional
    public User uploadAvatar(UUID userId, MultipartFile file) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));

        validateAvatar(file);

        try {
            Path storageDir = Path.of("storage", "avatars");
            Files.createDirectories(storageDir);

            if (user.getAvatarStorageKey() != null) {
                Files.deleteIfExists(Path.of(user.getAvatarStorageKey()));
            }

            String extension = getExtension(file.getOriginalFilename());
            String fileName = user.getId() + "-" + UUID.randomUUID() + extension;
            Path target = storageDir.resolve(fileName);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

            user.setAvatarStorageKey(target.toString());
            user.setAvatarContentType(file.getContentType());
            user.setAvatarFileSizeBytes(file.getSize());
            user.setAvatarUploadedAt(OffsetDateTime.now());
            return userRepository.save(user);
        } catch (IOException exception) {
            throw new RuntimeException("Falha ao salvar avatar", exception);
        }
    }

    @Transactional(readOnly = true)
    public User getById(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));
    }

    private void validateAvatar(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Envie um arquivo de imagem");
        }
        if (file.getContentType() == null || !file.getContentType().startsWith("image/")) {
            throw new BusinessException("Avatar deve ser uma imagem");
        }
        if (file.getSize() > MAX_AVATAR_SIZE_BYTES) {
            throw new BusinessException("Avatar excede o limite de 5MB");
        }
    }

    private String getExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            return ".bin";
        }
        return fileName.substring(fileName.lastIndexOf('.'));
    }
}
