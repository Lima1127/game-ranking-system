-- Lista Rotativa sorteada da loja Steam: guarda de qual faixa de avaliacoes o jogo veio (para
-- "sortear outro" manter a proporcao 22/8), quantas avaliacoes tinha e as tags marcadas em vermelho.
-- Jogos de listas montadas por arquivo ficam com as tres colunas vazias.
--   review_band: HIGH = 1400+ avaliacoes; MID = 1000 a 1399
--   flagged_tags: nomes separados por virgula (ex.: "Nudez,Hentai"); vazio = nenhuma
ALTER TABLE rotative_list_entries
ADD COLUMN review_band VARCHAR(10) CHECK (review_band IN ('HIGH', 'MID')),
ADD COLUMN steam_review_count INT,
ADD COLUMN flagged_tags VARCHAR(200);
