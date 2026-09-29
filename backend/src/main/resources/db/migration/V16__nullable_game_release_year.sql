-- O ano de lancamento passa a ser opcional: antes o frontend inventava o valor
-- (ano da conclusao ou ano atual). Jogos novos ficam sem ano ate um admin preencher.
-- O CHECK (release_year BETWEEN 1970 AND 2100) continua valendo para valores preenchidos.
ALTER TABLE games
ALTER COLUMN release_year DROP NOT NULL;
