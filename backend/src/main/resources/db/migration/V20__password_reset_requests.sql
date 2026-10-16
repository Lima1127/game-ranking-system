-- "Esqueci minha senha" sem e-mail: o jogador pede, um admin aprova e gera um codigo,
-- e o jogador usa o codigo para escolher a senha nova.
--   PENDING   = pedido feito pelo jogador, aguardando um admin
--   APPROVED  = codigo gerado (vale ate code_expires_at, uma unica vez)
--   USED      = codigo usado, senha trocada
--   REJECTED  = recusado por um admin
--   CANCELLED = substituido por um codigo mais novo ou bloqueado por tentativas erradas
CREATE TABLE password_reset_requests (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'USED', 'REJECTED', 'CANCELLED')),
  code_hash VARCHAR(64),
  code_expires_at TIMESTAMPTZ,
  failed_attempts INT NOT NULL DEFAULT 0,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ
);

CREATE INDEX idx_password_reset_requests_user ON password_reset_requests(user_id, status);
CREATE INDEX idx_password_reset_requests_status ON password_reset_requests(status);
