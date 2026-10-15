-- Conteudo dos arquivos enviados (comprovantes e avatares) guardado no proprio banco.
-- Usado quando app.storage.type=database (hospedagens cujo disco e apagado a cada reinicio).
-- Tabela separada para que listar usuarios/registros nao carregue os bytes das imagens.
-- platinum_proofs.storage_key e users.avatar_storage_key passam a valer "db:<id>" nesse modo.
CREATE TABLE file_blobs (
  id UUID PRIMARY KEY,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
