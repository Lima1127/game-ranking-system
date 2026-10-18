package com.gameranking.repository;

import com.gameranking.domain.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    /** O usuario e guardado sempre em minusculas: normalize antes (UsuarioDeLogin.normalizar). */
    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    Optional<User> findBySteamId(String steamId);

    boolean existsByIdAndActiveTrue(UUID id);
    List<User> findAllByActiveTrueOrderByDisplayNameAsc();

    List<User> findAllByOrderByDisplayNameAsc();
}
