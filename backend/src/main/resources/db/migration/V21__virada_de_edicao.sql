-- Virada de edicao (decidido em 21/11/2026):
-- 1) O jogador pode registrar de novo, numa edicao nova, um jogo que ja zerou numa edicao anterior.
--    A regra "um registro por jogador e jogo" passa a valer DENTRO de cada edicao.
--    O nome do indice mantem o prefixo "uq_completions_user_game", usado na mensagem de erro amigavel.
DROP INDEX IF EXISTS uq_completions_user_game_not_cancelled;

CREATE UNIQUE INDEX uq_completions_user_game_edition_not_cancelled
    ON completions (user_id, game_id, edition_id)
    WHERE status <> 'CANCELLED';

-- 2) Garantia no banco de que so existe UMA edicao ativa por vez.
CREATE UNIQUE INDEX uq_editions_single_active
    ON editions (active)
    WHERE active = TRUE;
