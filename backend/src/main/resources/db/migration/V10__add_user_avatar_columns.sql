ALTER TABLE users
  ADD COLUMN avatar_storage_key VARCHAR(255),
  ADD COLUMN avatar_content_type VARCHAR(120),
  ADD COLUMN avatar_file_size_bytes BIGINT,
  ADD COLUMN avatar_uploaded_at TIMESTAMPTZ;
