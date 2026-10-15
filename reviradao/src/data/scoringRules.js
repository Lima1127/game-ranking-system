// Regras de pontuacao exibidas no site (Ranking e medalhas do Menu).
// Os PONTOS sao calculados pelo backend (ScoringEngine.java); esta lista so descreve e
// precisa ser atualizada junto quando uma regra mudar. Ver docs/concept.md.
export const scoringRules = [
  { code: 'GAME_COMPLETED', name: 'Jogo fechado', emoji: '🎮', points: 1, description: 'Cada conclusão registrada gera 1 ponto base.', active: true },
  { code: 'FIRST_EXPERIENCE', name: 'Primeira experiência', emoji: '✨', points: 1, description: 'Bônus para a primeira vez que a pessoa fecha aquele jogo.', active: true },
  { code: 'FIRST_IN_EDITION', name: 'Primeiro no Reviradão', emoji: '🚀', points: 1, description: 'Bônus para quem fecha o jogo primeiro dentro da edição ativa.', active: true },
  { code: 'IN_RELEASE_YEAR', name: 'Em dia', emoji: '📅', points: 1, description: 'Bônus manual para jogos considerados lançamento do ano na edição.', active: true },
  { code: 'TIME_VALUABLE_BLOCK', name: 'Tempo valioso', emoji: '⏱️', points: 2, description: 'A cada bloco completo de 25 horas jogadas, soma 2 pontos.', active: true },
  { code: 'PLATINUM', name: 'Platina', emoji: '🏆', points: 3, description: 'Platina confirmada rende 3 pontos.', active: true },
  { code: 'COOP_RIGHT_HAND', name: 'Braço direito', emoji: '🤝', points: 2, description: 'Coop com até 4 jogadores rende 2 pontos extras.', active: true },
  { code: 'HYPE_PARTICIPATION', name: 'Participação no Hype', emoji: '🔥', points: 1, description: 'Participar do Hype adiciona 1 ponto.', active: true },
  { code: 'HYPE_COMPLETION_BONUS', name: 'Hype concluído', emoji: '⚡', points: 2, description: 'Completar o objetivo relacionado ao Hype soma mais 2 pontos.', active: true },
  { code: 'ROTATIVE_LIST_BONUS', name: 'Lista rotativa', emoji: '🔄', points: 3, description: 'Completar um item da lista rotativa adiciona 3 pontos.', active: true },
  { code: 'UNDERDOG_BONUS', name: 'Café com leite', emoji: '🐶', points: 3, description: 'Bônus de 3 pontos para quem inicia a jogada estando 20 pontos ou mais atrás do líder da edição.', active: true },
  { code: 'OBLIGATION_COMPLETED', name: 'Obrigação cumprida', emoji: '📋', points: 3, description: 'Conclusão de obrigação aprovada soma 3 pontos.', active: true },
];

export const emojiByRuleCode = Object.fromEntries(scoringRules.map((rule) => [rule.code, rule.emoji]));

export const pointsByRuleCode = Object.fromEntries(scoringRules.map((rule) => [rule.code, rule.points]));
