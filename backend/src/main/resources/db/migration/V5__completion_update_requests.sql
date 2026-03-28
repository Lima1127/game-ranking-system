CREATE TABLE completion_update_requests (
  id UUID PRIMARY KEY,
  completion_id UUID NOT NULL REFERENCES completions(id) ON DELETE CASCADE,
  requested_by_user_id UUID NOT NULL REFERENCES users(id),
  approved_by_user_id UUID REFERENCES users(id),
  completed_at DATE NOT NULL,
  hours_played NUMERIC(6,2) NOT NULL CHECK (hours_played >= 0),
  first_time_ever BOOLEAN NOT NULL DEFAULT FALSE,
  completed_in_release_year BOOLEAN NOT NULL DEFAULT FALSE,
  platinum BOOLEAN NOT NULL DEFAULT FALSE,
  proof_id UUID,
  coop BOOLEAN NOT NULL DEFAULT FALSE,
  coop_players INT,
  hype_participation BOOLEAN NOT NULL DEFAULT FALSE,
  hype_completed_bonus BOOLEAN NOT NULL DEFAULT FALSE,
  rotative_list BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','APPROVED','CANCELLED')),
  approved_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((coop = FALSE AND coop_players IS NULL) OR (coop = TRUE AND coop_players BETWEEN 1 AND 16))
);

CREATE INDEX idx_completion_update_requests_completion ON completion_update_requests(completion_id);
CREATE INDEX idx_completion_update_requests_status ON completion_update_requests(status);
