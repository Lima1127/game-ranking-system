-- Segunda imagem (opcional) de um registro. A primeira continua em platinum_proofs.completion_id.
-- A segunda e um comprovante enviado do mesmo jeito (POST /uploads/platinum), ligado por aqui.
ALTER TABLE completions
  ADD COLUMN extra_proof_id UUID REFERENCES platinum_proofs(id) ON DELETE SET NULL;

-- Uma mesma imagem nao pode ser a segunda de dois registros.
CREATE UNIQUE INDEX uq_completions_extra_proof ON completions(extra_proof_id) WHERE extra_proof_id IS NOT NULL;
