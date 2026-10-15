package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.common.exception.NotFoundException;
import com.gameranking.common.upload.ImageFileType;
import com.gameranking.domain.model.User;
import com.gameranking.repository.UserRepository;
import com.gameranking.web.dto.user.UserSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final long MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

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

        ImageFileType imageType = validateAvatar(file);
        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException exception) {
            throw new UncheckedIOException("Falha ao ler avatar", exception);
        }

        String previousKey = user.getAvatarStorageKey();
        String fileName = user.getId() + "-" + UUID.randomUUID() + imageType.extension();
        user.setAvatarStorageKey(fileStorageService.save("avatars", fileName, content));
        user.setAvatarContentType(imageType.contentType());
        user.setAvatarFileSizeBytes((long) content.length);
        user.setAvatarUploadedAt(OffsetDateTime.now());
        fileStorageService.delete(previousKey);
        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public User getById(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));
    }

    @Transactional(readOnly = true)
    public byte[] readAvatar(User user) {
        return fileStorageService.read(user.getAvatarStorageKey());
    }

    private ImageFileType validateAvatar(MultipartFile file) {
        ImageFileType imageType = ImageFileType.detect(file);
        if (file.getSize() > MAX_AVATAR_SIZE_BYTES) {
            throw new BusinessException("Avatar excede o limite de 5MB");
        }
        return imageType;
    }
}
