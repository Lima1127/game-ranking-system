package com.gameranking.repository;

import com.gameranking.domain.model.SteamLinkRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SteamLinkRequestRepository extends JpaRepository<SteamLinkRequest, UUID> {

    Optional<SteamLinkRequest> findByStateHash(String stateHash);

    List<SteamLinkRequest> findAllByUserIdAndUsedAtIsNull(UUID userId);
}
