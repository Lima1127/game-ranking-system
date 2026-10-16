package com.gameranking.repository;

import com.gameranking.domain.model.PasswordResetRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface PasswordResetRequestRepository extends JpaRepository<PasswordResetRequest, UUID> {

    List<PasswordResetRequest> findAllByStatusOrderByRequestedAtAsc(PasswordResetRequest.Status status);

    List<PasswordResetRequest> findAllByUserIdAndStatusIn(UUID userId, Collection<PasswordResetRequest.Status> statuses);

    long countByUserIdAndRequestedAtAfter(UUID userId, OffsetDateTime since);
}
