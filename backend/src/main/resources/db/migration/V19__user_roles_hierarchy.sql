-- Hierarquia de cargos: USER < ADMIN < COFUNDADOR < FUNDADOR.
-- FUNDADOR so e atribuido direto no banco, por exemplo:
--   UPDATE users SET role = 'FUNDADOR' WHERE lower(email) = lower('email@do-fundador.com');
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check CHECK (role IN ('USER', 'ADMIN', 'COFUNDADOR', 'FUNDADOR'));
