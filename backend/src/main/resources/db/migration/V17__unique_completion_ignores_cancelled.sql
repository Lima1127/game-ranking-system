-- Um registro por usuario e jogo continua valendo, mas pedidos CANCELADOS nao contam mais:
-- antes, quem cancelava um pedido (ex.: anexo errado) nunca mais conseguia registrar o jogo.
-- O nome do indice mantem o prefixo "uq_completions_user_game", usado na mensagem de erro amigavel.
ALTER TABLE completions
DROP CONSTRAINT IF EXISTS uq_completions_user_game;

CREATE UNIQUE INDEX uq_completions_user_game_not_cancelled
    ON completions (user_id, game_id)
    WHERE status <> 'CANCELLED';
