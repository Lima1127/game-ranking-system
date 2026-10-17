-- Lista Rotativa: novas vagas do sorteio e destaque do jogo que entrou por "Sortear outro".
--   review_band: CURRENT_YEAR = lancado no ano da edicao (1400+); TOP = 3000+ avaliacoes;
--                HIGH = 1400+ avaliacoes; MID = 1000 a 1399
--   replaced_game_name / rerolled_at: preenchidos quando o jogo entrou no lugar de outro, para o
--   admin ver qual e o novo (some na proxima lista sorteada).
ALTER TABLE rotative_list_entries
DROP CONSTRAINT IF EXISTS rotative_list_entries_review_band_check;

ALTER TABLE rotative_list_entries
ADD CONSTRAINT rotative_list_entries_review_band_check
    CHECK (review_band IN ('CURRENT_YEAR', 'TOP', 'HIGH', 'MID')),
ADD COLUMN replaced_game_name VARCHAR(180),
ADD COLUMN rerolled_at TIMESTAMPTZ;
