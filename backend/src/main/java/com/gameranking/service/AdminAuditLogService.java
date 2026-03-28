package com.gameranking.service;

import com.gameranking.domain.model.AdminAuditLog;
import com.gameranking.domain.model.Completion;
import com.gameranking.domain.model.User;
import com.gameranking.repository.AdminAuditLogRepository;
import com.gameranking.web.dto.admin.AdminAuditLogResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminAuditLogService {

    private final AdminAuditLogRepository adminAuditLogRepository;

    @Transactional
    public void log(User actor, String actionCode, Completion completion, String details) {
        adminAuditLogRepository.save(AdminAuditLog.builder()
                .id(UUID.randomUUID())
                .actorUserId(actor.getId())
                .actorDisplayName(actor.getDisplayName())
                .actorRole(actor.getRole().name())
                .actionCode(actionCode)
                .subjectCompletionId(completion != null ? completion.getId() : null)
                .subjectUserId(completion != null ? completion.getUser().getId() : null)
                .subjectDisplayName(completion != null ? completion.getUser().getDisplayName() : null)
                .gameName(completion != null ? completion.getGame().getName() : null)
                .details(details)
                .createdAt(OffsetDateTime.now())
                .build());
    }

    @Transactional(readOnly = true)
    public List<AdminAuditLogResponse> list() {
        return adminAuditLogRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(log -> new AdminAuditLogResponse(
                        log.getId(),
                        log.getActorUserId(),
                        log.getActorDisplayName(),
                        log.getActorRole(),
                        log.getActionCode(),
                        log.getSubjectCompletionId(),
                        log.getSubjectUserId(),
                        log.getSubjectDisplayName(),
                        log.getGameName(),
                        log.getDetails(),
                        log.getCreatedAt()
                ))
                .toList();
    }
}
