/**
 * Registro so de "Participacao no Hype" (sem marcar "Concluí o jogo do Hype") nao e jogo zerado:
 * ele da +1 ponto, mas nao entra em "jogos zerados", horas, platinas nem destaques.
 * Quem zerou de verdade ganha o ponto "Jogo fechado" (GAME_COMPLETED); a participacao pura nao.
 */
export function soParticipacaoNoHype(completion) {
  const regras = completion?.ruleCodes || [];
  return regras.includes('HYPE_PARTICIPATION') && !regras.includes('GAME_COMPLETED');
}

export const foiZerado = (completion) => !soParticipacaoNoHype(completion);
