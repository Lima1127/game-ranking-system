ALTER TABLE completions
    ADD COLUMN IF NOT EXISTS coop_group_id UUID;

CREATE INDEX IF NOT EXISTS idx_completions_coop_group_id
    ON completions (coop_group_id);
