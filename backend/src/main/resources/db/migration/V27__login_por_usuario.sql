-- Login por "usuario" (ex.: samy) no lugar do e-mail. O e-mail deixa de existir.
-- display_name continua sendo o apelido livre que aparece no site.
--
-- Regra do usuario: 3 a 20 caracteres, so letras minusculas, numeros, ponto e sublinhado.
-- Tornar alguem Fundador (so pelo banco):
--   UPDATE users SET role = 'FUNDADOR' WHERE username = 'samy';

ALTER TABLE users ADD COLUMN username VARCHAR(20);

-- Contas existentes: usuario tirado da parte antes do @ do e-mail.
-- Ex.: "Samy.Gamer@gmail.com" -> "samy.gamer". Repetido ganha numero no fim (samy.gamer2).
DO $$
DECLARE
  conta RECORD;
  base TEXT;
  candidato TEXT;
  n INT;
BEGIN
  FOR conta IN SELECT id, email FROM users ORDER BY created_at, id LOOP
    base := regexp_replace(lower(split_part(conta.email, '@', 1)), '[^a-z0-9._]', '', 'g');
    IF length(base) < 3 THEN
      base := rpad(base, 3, '0');
    END IF;
    base := left(base, 18);
    candidato := base;
    n := 1;
    WHILE EXISTS (SELECT 1 FROM users WHERE username = candidato) LOOP
      n := n + 1;
      candidato := base || n;
    END LOOP;
    UPDATE users SET username = candidato WHERE id = conta.id;
  END LOOP;
END $$;

ALTER TABLE users ALTER COLUMN username SET NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
ALTER TABLE users ADD CONSTRAINT users_username_formato CHECK (username ~ '^[a-z0-9._]{3,20}$');

ALTER TABLE users DROP COLUMN email;
