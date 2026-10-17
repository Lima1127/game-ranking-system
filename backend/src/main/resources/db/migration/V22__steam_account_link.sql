-- Vinculo da conta do Reviradao com um perfil Steam (login OpenID da propria Steam).
-- O Reviradao guarda apenas o SteamID (numero publico do perfil); nenhuma senha ou token da Steam.
-- Texto, e nao numero: o SteamID tem 17 digitos e perderia precisao no JavaScript.
ALTER TABLE users
ADD COLUMN steam_id VARCHAR(20),
ADD COLUMN steam_linked_at TIMESTAMPTZ;

-- Um perfil Steam so pode estar ligado a uma conta.
CREATE UNIQUE INDEX uq_users_steam_id ON users (steam_id) WHERE steam_id IS NOT NULL;

-- Cada tentativa de vincular comeca aqui: um codigo aleatorio de uso unico (guardado so como
-- hash) que vai e volta pela Steam e prova qual usuario logado iniciou o vinculo.
CREATE TABLE steam_link_requests (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state_hash VARCHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE INDEX idx_steam_link_requests_user ON steam_link_requests(user_id);
