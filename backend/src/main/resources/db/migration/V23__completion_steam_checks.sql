-- "Foto" do que a Steam informava sobre o jogo de um registro: horas e conquistas do jogador.
-- E so evidencia para o admin conferir (nunca gera pontos). Fica guardada para o admin e o log
-- continuarem vendo o dado mesmo que o jogador deixe o perfil privado depois.
-- Uma linha por registro; uma nova conferencia substitui a anterior.
--   OK               = dados lidos
--   PRIVATE_PROFILE  = perfil (ou "Detalhes dos jogos") privado
--   NOT_OWNED        = o jogo nao aparece na biblioteca Steam do jogador
--   NO_STEAM_ACCOUNT = jogador sem conta Steam conectada
--   NO_STEAM_GAME    = jogo sem vinculo com a loja Steam
--   NOT_CONFIGURED   = servidor sem chave da API da Steam
--   UNAVAILABLE      = a Steam nao respondeu
CREATE TABLE completion_steam_checks (
  completion_id UUID PRIMARY KEY REFERENCES completions(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('OK', 'PRIVATE_PROFILE', 'NOT_OWNED', 'NO_STEAM_ACCOUNT',
                                                'NO_STEAM_GAME', 'NOT_CONFIGURED', 'UNAVAILABLE')),
  steam_id VARCHAR(20),
  steam_app_id INT,
  playtime_minutes INT,
  achievements_total INT,
  achievements_unlocked INT,
  last_unlock_at TIMESTAMPTZ,
  checked_at TIMESTAMPTZ NOT NULL
);
