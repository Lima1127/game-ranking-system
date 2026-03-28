ALTER TABLE completions
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
ADD COLUMN approved_by_user_id UUID REFERENCES users(id),
ADD COLUMN approved_at TIMESTAMPTZ,
ADD COLUMN cancelled_at TIMESTAMPTZ;

UPDATE completions
SET status = 'APPROVED',
    approved_at = created_at
WHERE status IS NULL OR status = 'APPROVED';

ALTER TABLE completions
ADD CONSTRAINT chk_completions_status
CHECK (status IN ('PENDING', 'APPROVED', 'CANCELLED'));
