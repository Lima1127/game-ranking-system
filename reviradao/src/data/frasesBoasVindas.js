// Frases sorteadas no "Bem-vindo" do Menu.
//
// COMO EDITAR:
// - Frase fixa: escreva o texto entre aspas simples e uma vírgula no fim.
//   (Se a frase tiver aspas simples dentro, use aspas duplas por fora.)
// - Frase com dados do jogador: use uma função que recebe `d` e devolve o texto,
//   ou `null` quando a frase não fizer sentido (aí ela fica fora do sorteio).
//
// Dados disponíveis em `d`:
//   d.nome           -> nome de exibição
//   d.pontos         -> pontos na edição (0 se ainda não pontuou)
//   d.posicao        -> posição no ranking (null se ainda não aparece)
//   d.totalJogadores -> quantas pessoas aparecem no ranking
//   d.faltamLider    -> pontos que faltam para o líder (0 se for o líder)
//   d.jogos          -> jogos zerados (aprovados) na edição
//   d.horas          -> horas jogadas somadas
//   d.platinas       -> quantas platinas

export const frasesBoasVindas = [
  // --- Fixas ---
  'Agora com 100% menos bugs! (Provavelmente.)',
  'Zerar é preciso, viver não é preciso.',
  'Aquele jogo comprado na promoção não vai se jogar sozinho.',
  'Salve o jogo antes de enfrentar o chefe!',
  'Um dia você termina aquele RPG de 120 horas.',
  'Aperte F para prestar respeito ao seu último save.',
  'Também conhecido como "só mais uma partida".',
  'Platina é um estado de espírito.',
  'Já se hidratou hoje, aventureiro?',
  'Proibido abandonar no último chefe.',
  'Nenhum controle foi arremessado durante a criação deste site.',
  'Coop: porque sofrer junto é melhor.',
  'Se o jogo tem final, ele cabe no Reviradão.',
  'Ganhou o Café com leite? Isso também é estratégia.',
  'Respeite a lista rotativa.',
  'Isso não é vício, é dedicação ao esporte.',
  'Seu save está seguro. Sua rotina de sono, nem tanto.',
  'Só mais uma fase e eu vou dormir. (Mentira.)',
  'Tutorial pulado com sucesso. Boa sorte.',
  'Lag não é desculpa. Mas ajuda.',
  'O chefe final sempre tem uma segunda fase.',
  'Quem nunca morreu para o primeiro inimigo que atire a primeira pedra.',
  'Ninguém leu o manual. Ninguém.',
  'DLC conta como jogo novo? Pergunte ao admin.',
  'Dificuldade fácil também é dificuldade.',
  'Seu controle sabe coisas sobre você que ninguém mais sabe.',
  '"Só um joguinho rápido." Seis horas depois...',
  'Achou um baú? Cuidado, pode ser um mímico.',
  'É perigoso ir sozinho. Chame alguém para o coop!',
  'Carregando piada... 99%.',
  'Nada de spoilers no grupo, por favor.',

  // --- Provocações gerais (servem para todo mundo) ---
  'Abandonou algum jogo este ano? O Reviradão não esquece.',
  'Ainda jogando no fácil? Seu segredo está seguro com a gente.',
  'Sua biblioteca da Steam tem mais jogos do que horas no seu dia.',
  'Perdeu a obrigação? Com certeza a culpa foi do controle.',
  'Seus amigos já estão zerando. E você?',

  // --- Provocações por estilo de jogador (sorteadas para todos) ---
  'Mais um AAA de 150 GB? Seu SSD manda lembranças.',
  'Jogo indie também é jogo, sabia?',
  'Gráfico bonito não dá ponto extra. Infelizmente.',
  'Pagou caro no lançamento. Agora falta zerar.',
  'Day one de novo? Seu cartão pediu socorro.',
  'Ray tracing ligado, 30 FPS e muito orgulho.',
  'O patch de 80 GB chegou antes da sua vontade de jogar.',
  'Só mais um giro... disse você 300 giros atrás.',
  'Gacha não tem final. Já pensou em zerar alguma coisa?',
  'Taxa de drop de 0,6%? Para você parece justo.',
  'Seu personagem favorito chegou no banner. Seu salário, ainda não.',
  'Login diário feito. Jogo zerado? Nenhum.',
  'O pity garantido é o compromisso mais sério da sua vida.',
  'Aqui a única aposta segura é zerar o jogo.',
  'No Reviradão, a casa não ganha. Quem zera, ganha.',
  'Roleta não conta como jogo zerado. Já tentamos.',
  'Seu melhor investimento ainda é aquele jogo em promoção.',
  'All-in em zerar um jogo este mês?',
  'Mais um RPG de 100 horas? Até o fim do ano você termina. Talvez.',
  'Você passou mais tempo na criação de personagem do que no jogo.',
  'Missão secundária de novo? A principal está esperando.',
  'Partida ranqueada não tem final. O Reviradão tem.',
  'Seu K/D não vale ponto aqui.',
  'Jogo zerado é aquele que tem créditos no final, lembra?',

  // --- Com dados do jogador ---
  (d) => `Bom te ver, ${d.nome}!`,
  (d) => (d.posicao === 1 ? 'Você está no topo. Cuidado com quem vem atrás!' : null),
  (d) => {
    if (!(d.posicao > 1) || d.faltamLider <= 0) return null;
    return d.faltamLider === 1
      ? 'Falta só 1 ponto para alcançar o líder!'
      : `Faltam ${d.faltamLider} pontos para alcançar o líder!`;
  },
  (d) => (d.posicao > 1 && d.posicao <= 3 ? `Pódio garantido... por enquanto. Você está em #${d.posicao}.` : null),
  (d) => (d.jogos > 0 ? `${d.jogos} ${d.jogos === 1 ? 'jogo zerado' : 'jogos zerados'} este ano. E contando!` : null),
  (d) => (d.jogos === 0 ? 'Seu primeiro jogo zerado do ano está te esperando.' : null),
  (d) => (d.horas >= 100 ? `${Math.floor(d.horas)} horas jogadas. Isso é dedicação!` : null),
  (d) => (d.platinas > 0 ? `${d.platinas} ${d.platinas === 1 ? 'platina' : 'platinas'} na estante. Brilha!` : null),
  (d) => (d.pontos >= 20 ? 'Você já tem pontos para mandar uma obrigação para alguém...' : null),
  (d) => (d.totalJogadores > 1 && d.posicao === d.totalJogadores ? 'Último lugar é só o começo de uma grande virada.' : null),
  (d) => (d.posicao > 3 && d.posicao < d.totalJogadores ? 'Meio da tabela: o lugar mais confortável do ranking.' : null),
  (d) => (d.horas >= 50 && d.horas < 100 ? `Já são ${Math.floor(d.horas)} horas jogadas. Seu sofá agradece a companhia.` : null),
  (d) => (d.jogos >= 10 ? 'Dez jogos ou mais? Calma, deixa um pouco para o resto do ano.' : null),
  (d) => (d.pontos === 0 ? 'Nenhum ponto ainda. O primeiro é o mais difícil (mentira, é só zerar um jogo).' : null),
];

/** Sorteia uma frase entre as que fazem sentido para os dados atuais. */
export function sortearFrase(dados, aleatorio = Math.random()) {
  const disponiveis = frasesBoasVindas
    .map((frase) => (typeof frase === 'function' ? frase(dados) : frase))
    .filter((frase) => typeof frase === 'string' && frase.trim() !== '');
  if (disponiveis.length === 0) {
    return null;
  }
  return disponiveis[Math.floor(aleatorio * disponiveis.length) % disponiveis.length];
}
