package com.gameranking.web.controller;

import com.gameranking.service.AdminService;
import com.gameranking.web.dto.admin.AdminAuditLogResponse;
import com.gameranking.web.dto.admin.AdminCompletionItemResponse;
import com.gameranking.web.dto.admin.AdminRecalculationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/completions")
    public List<AdminCompletionItemResponse> listCompletions(@RequestHeader("X-User-Id") UUID userId) {
        return adminService.listCompletions(userId);
    }

    @DeleteMapping("/completions/{completionId}")
    public Map<String, Object> deleteCompletion(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID completionId
    ) {
        return adminService.deleteCompletion(userId, completionId);
    }

    @GetMapping("/audit-logs")
    public List<AdminAuditLogResponse> listAuditLogs(@RequestHeader("X-User-Id") UUID userId) {
        return adminService.listAuditLogs(userId);
    }

    @PostMapping("/recalculate")
    public AdminRecalculationResponse recalculateEdition(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestParam(required = false) UUID editionId
    ) {
        return adminService.recalculateEdition(userId, editionId);
    }
}
