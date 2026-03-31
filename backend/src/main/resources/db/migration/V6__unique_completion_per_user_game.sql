ALTER TABLE completions
ADD CONSTRAINT uq_completions_user_game UNIQUE (user_id, game_id);
