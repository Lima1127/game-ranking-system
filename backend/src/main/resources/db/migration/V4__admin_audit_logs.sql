CREATE TABLE admin_audit_logs (
  id UUID PRIMARY KEY,
  actor_user_id UUID NOT NULL,
  actor_display_name VARCHAR(120) NOT NULL,
  actor_role VARCHAR(20) NOT NULL,
  action_code VARCHAR(50) NOT NULL,
  subject_completion_id UUID,
  subject_user_id UUID,
  subject_display_name VARCHAR(120),
  game_name VARCHAR(180),
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX idx_admin_audit_logs_action_code ON admin_audit_logs(action_code);
