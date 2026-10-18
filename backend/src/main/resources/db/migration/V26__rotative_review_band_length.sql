-- A coluna review_band foi criada (V24) com 10 caracteres, quando as vagas eram so HIGH e MID.
-- A vaga CURRENT_YEAR (V25) tem 12 caracteres e nao cabia: o sorteio da lista falhava ao gravar.
ALTER TABLE rotative_list_entries
ALTER COLUMN review_band TYPE VARCHAR(20);
