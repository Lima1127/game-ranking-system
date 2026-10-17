// Bonus "Em dia": jogo lancado no ano da edicao. A data de conclusao sempre fica dentro da edicao
// (que e o ano inteiro), entao o ano da conclusao e o ano da edicao.

/** true/false pelo ano de lancamento; null quando o ano de lancamento nao e conhecido. */
export function emDiaPeloLancamento(anoLancamento, dataConclusao) {
  const anoConclusao = Number(String(dataConclusao || '').slice(0, 4));
  if (!anoLancamento || !anoConclusao) {
    return null;
  }
  return Number(anoLancamento) === anoConclusao;
}

/**
 * Dica mostrada no botao "Em dia". `origem` = 'Steam' ou 'catálogo'.
 * Sem ano conhecido, volta ao texto padrao (o jogador marca e o admin confere).
 */
export function dicaEmDia({ anoLancamento, origem, sugestao, marcado }) {
  if (sugestao === null) {
    return 'Conta como lançamento do ano na edição';
  }
  if (marcado === sugestao) {
    return `Definido pelo lançamento: ${anoLancamento} (${origem})`;
  }
  return `Diferente do lançamento (${anoLancamento}, ${origem}): o admin vai conferir`;
}
