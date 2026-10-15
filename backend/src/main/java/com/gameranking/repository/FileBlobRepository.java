package com.gameranking.repository;

import com.gameranking.domain.model.FileBlob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface FileBlobRepository extends JpaRepository<FileBlob, UUID> {
}
