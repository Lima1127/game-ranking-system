package com.gameranking.repository;

import com.gameranking.domain.model.CompletionSteamCheck;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CompletionSteamCheckRepository extends JpaRepository<CompletionSteamCheck, UUID> {
}
