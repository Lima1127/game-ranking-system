CREATE TABLE users (
  id UUID PRIMARY KEY,
  display_name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('USER','ADMIN')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE editions (
  id UUID PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  year INT NOT NULL,
  starts_at DATE NOT NULL,
  ends_at DATE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (year),
  CHECK (starts_at <= ends_at)
);

CREATE TABLE games (
  id UUID PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  release_year INT NOT NULL CHECK (release_year BETWEEN 1970 AND 2100),
  estimated_hours_main NUMERIC(6,2),
  estimated_hours_platinum NUMERIC(6,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, release_year)
);


CREATE TABLE genres (
  id UUID PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE game_genres (
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  genre_id UUID NOT NULL REFERENCES genres(id),
  PRIMARY KEY (game_id, genre_id)
);

CREATE TABLE completions (
  id UUID PRIMARY KEY,
  edition_id UUID NOT NULL REFERENCES editions(id),
  user_id UUID NOT NULL REFERENCES users(id),
  game_id UUID NOT NULL REFERENCES games(id),
  completed_at DATE NOT NULL,
  hours_played NUMERIC(6,2) NOT NULL CHECK (hours_played >= 0),
  first_time_ever BOOLEAN NOT NULL DEFAULT FALSE,
  first_in_edition BOOLEAN NOT NULL DEFAULT FALSE,
  completed_in_release_year BOOLEAN NOT NULL DEFAULT FALSE,
  platinum BOOLEAN NOT NULL DEFAULT FALSE,
  coop BOOLEAN NOT NULL DEFAULT FALSE,
  coop_players INT,
  hype_participation BOOLEAN NOT NULL DEFAULT FALSE,
  hype_completed_bonus BOOLEAN NOT NULL DEFAULT FALSE,
  rotative_list BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((coop = FALSE AND coop_players IS NULL) OR (coop = TRUE AND coop_players BETWEEN 1 AND 16))
);

CREATE TABLE platinum_proofs (
  id UUID PRIMARY KEY,
  completion_id UUID UNIQUE REFERENCES completions(id) ON DELETE CASCADE,
  storage_key VARCHAR(255) NOT NULL,
  content_type VARCHAR(120) NOT NULL,
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
  sha256 VARCHAR(64) NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE obligations (
  id UUID PRIMARY KEY,
  edition_id UUID NOT NULL REFERENCES editions(id),
  assigned_by_user_id UUID NOT NULL REFERENCES users(id),
  assigned_to_user_id UUID NOT NULL REFERENCES users(id),
  game_id UUID NOT NULL REFERENCES games(id),
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING','REFUSED','PARTIAL','COMPLETED')),
  accepted BOOLEAN,
  completed BOOLEAN,
  partial_hours NUMERIC(6,2),
  linked_completion_id UUID REFERENCES completions(id),
  penalty_points INT NOT NULL DEFAULT 0,
  reward_points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  CHECK (assigned_by_user_id <> assigned_to_user_id),
  CHECK (partial_hours IS NULL OR partial_hours >= 0)
);

CREATE TABLE rotative_list_entries (
  id UUID PRIMARY KEY,
  edition_id UUID NOT NULL REFERENCES editions(id),
  quarter SMALLINT NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  game_id UUID NOT NULL REFERENCES games(id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (edition_id, quarter, game_id)
);

CREATE TABLE global_goals (
  id UUID PRIMARY KEY,
  edition_id UUID NOT NULL REFERENCES editions(id),
  title VARCHAR(180) NOT NULL,
  description TEXT,
  quarter SMALLINT NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  target_value NUMERIC(10,2) NOT NULL,
  reward_description VARCHAR(255),
  starts_at DATE NOT NULL,
  ends_at DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('PLANNED','ACTIVE','COMPLETED','CANCELLED'))
);

CREATE TABLE global_goal_contributions (
  id UUID PRIMARY KEY,
  global_goal_id UUID NOT NULL REFERENCES global_goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  contribution_value NUMERIC(10,2) NOT NULL CHECK (contribution_value > 0),
  notes VARCHAR(255),
  contributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE score_events (
  id UUID PRIMARY KEY,
  edition_id UUID NOT NULL REFERENCES editions(id),
  user_id UUID NOT NULL REFERENCES users(id),
  completion_id UUID REFERENCES completions(id) ON DELETE SET NULL,
  obligation_id UUID REFERENCES obligations(id) ON DELETE SET NULL,
  source_type VARCHAR(30) NOT NULL,
  rule_code VARCHAR(50) NOT NULL,
  points INT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_completions_user_edition ON completions(user_id, edition_id);
CREATE INDEX idx_completions_game_edition ON completions(game_id, edition_id);
CREATE INDEX idx_score_events_user_edition ON score_events(user_id, edition_id);
CREATE INDEX idx_score_events_rule_code ON score_events(rule_code);
CREATE INDEX idx_obligations_to_user_status ON obligations(assigned_to_user_id, status);
CREATE INDEX idx_global_goal_contrib_goal ON global_goal_contributions(global_goal_id);
CREATE UNIQUE INDEX uq_games_name_year_ci ON games (LOWER(name), release_year);

INSERT INTO editions (id, name, year, starts_at, ends_at, active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Reviradao 2026', 2026, '2026-01-01', '2026-12-31', TRUE);



