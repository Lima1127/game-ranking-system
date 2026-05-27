CREATE TABLE rotative_source_games (
  id UUID PRIMARY KEY,
  edition_id UUID NOT NULL REFERENCES editions(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (edition_id, game_id)
);

CREATE INDEX idx_rotative_source_games_edition ON rotative_source_games(edition_id);

