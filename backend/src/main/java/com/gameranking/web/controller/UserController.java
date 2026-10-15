package com.gameranking.web.controller;

import com.gameranking.common.upload.ImageFileType;
import com.gameranking.domain.model.User;
import com.gameranking.security.AuthenticatedUser;
import com.gameranking.service.UserService;
import com.gameranking.web.dto.user.UserSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public List<UserSummaryResponse> list() {
        return userService.listActiveUsers();
    }

    @PostMapping("/me/avatar")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> uploadAvatar(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @RequestParam("file") MultipartFile file
    ) {
        User user = userService.uploadAvatar(currentUser.userId(), file);
        return Map.of(
                "userId", user.getId(),
                "hasAvatar", user.getAvatarStorageKey() != null,
                "avatarUploadedAt", user.getAvatarUploadedAt()
        );
    }

    @GetMapping("/{userId}/avatar")
    public ResponseEntity<ByteArrayResource> getAvatar(@PathVariable UUID userId) {
        User user = userService.getById(userId);
        if (user.getAvatarStorageKey() == null) {
            return ResponseEntity.notFound().build();
        }

        ByteArrayResource resource = new ByteArrayResource(userService.readAvatar(user));

        // O site pede o avatar com ?v=<data do envio>: um avatar novo nunca usa o cache antigo.
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofDays(7)))
                .headers(ImageFileType.safeServingHeaders(user.getAvatarContentType()))
                .contentLength(resource.contentLength())
                .body(resource);
    }
}
