-- Liga o jogo do catalogo ao jogo da loja Steam (o "appid", ex.: 1245620 = Elden Ring).
-- Opcional: jogos de outras plataformas, ou cadastrados antes desta versao, ficam sem.
-- Quando preenchido, o nome oficial e o ano de lancamento vem da propria Steam.
ALTER TABLE games
ADD COLUMN steam_app_id INT;

CREATE UNIQUE INDEX uq_games_steam_app_id ON games (steam_app_id) WHERE steam_app_id IS NOT NULL;
