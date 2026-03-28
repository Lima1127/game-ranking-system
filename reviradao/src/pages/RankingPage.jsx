import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const scoringRules = [
  {
    code: 'GAME_COMPLETED',
    points: 1,
    title: 'Jogo fechado',
    description: 'Cada conclusao registrada gera 1 ponto base.',
    active: true,
  },
  {
    code: 'FIRST_EXPERIENCE',
    points: 1,
    title: 'Primeira experiencia',
    description: 'Bonus para a primeira vez que a pessoa fecha aquele jogo.',
    active: true,
  },
  {
    code: 'FIRST_IN_EDITION',
    points: 1,
    title: 'Primeiro no Reviradao',
    description: 'Bonus para quem fecha o jogo primeiro dentro da edicao ativa.',
    active: true,
  },
  {
    code: 'IN_RELEASE_YEAR',
    points: 1,
    title: 'Em dia',
    description: 'Bonus quando a conclusao acontece no ano de lancamento do jogo.',
    active: true,
  },
  {
    code: 'TIME_VALUABLE_BLOCK',
    points: 2,
    title: 'Tempo valioso',
    description: 'A cada bloco completo de 25 horas jogadas, soma 2 pontos.',
    active: true,
  },
  {
    code: 'PLATINUM',
    points: 3,
    title: 'Platina',
    description: 'Platina confirmada rende 3 pontos.',
    active: true,
  },
  {
    code: 'COOP_RIGHT_HAND',
    points: 2,
    title: 'Braco direito',
    description: 'Coop com ate 4 jogadores rende 2 pontos extras.',
    active: true,
  },
  {
    code: 'HYPE_PARTICIPATION',
    points: 1,
    title: 'Participacao no Hype',
    description: 'Participar do Hype adiciona 1 ponto.',
    active: true,
  },
  {
    code: 'HYPE_COMPLETION_BONUS',
    points: 2,
    title: 'Bonus de Hype',
    description: 'Completar o objetivo relacionado ao Hype soma mais 2 pontos.',
    active: true,
  },
  {
    code: 'ROTATIVE_LIST_BONUS',
    points: 3,
    title: 'Lista rotativa',
    description: 'Completar um item da lista rotativa adiciona 3 pontos.',
    active: true,
  },
  {
    code: 'UNDERDOG_BONUS',
    points: 3,
    title: 'Cafe com leite',
    description: 'Bonus de 3 pontos para quem inicia a jogada estando 20 pontos ou mais atras do lider da edicao.',
    active: true,
  },
];

function formatPosition(index) {
  if (index === 0) return '1';
  if (index === 1) return '2';
  if (index === 2) return '3';
  return String(index + 1);
}

function PodiumCard({ player, index }) {
  const styles = [
    'from-amber-400 to-yellow-300 text-amber-950',
    'from-slate-300 to-slate-100 text-slate-900',
    'from-orange-300 to-amber-200 text-orange-950',
  ];

  const medals = ['Top 1', 'Top 2', 'Top 3'];

  return (
    <div className={`rounded-3xl bg-gradient-to-br ${styles[index]} shadow-lg p-6`}>
      <div className="text-xs uppercase tracking-[0.3em] opacity-70 mb-3">{medals[index]}</div>
      <div className="text-2xl font-black mb-2">{player.displayName}</div>
      <div className="text-sm opacity-80 mb-6">Pontuacao total acumulada na edicao ativa.</div>
      {player.underdogBonusCount > 0 && (
        <div className="inline-flex items-center rounded-full bg-black/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] mb-4">
          UnderDog x{player.underdogBonusCount}
        </div>
      )}
      <div className="flex items-end justify-between">
        <span className="text-5xl font-black leading-none">{player.totalPoints}</span>
        <span className="text-sm font-bold uppercase tracking-[0.25em]">pts</span>
      </div>
    </div>
  );
}

export default function RankingPage() {
  const { data: ranking = [], isLoading, error } = useQuery({
    queryKey: ['ranking'],
    queryFn: async () => {
      const response = await api.get('/ranking');
      return response.data;
    },
  });

  const leader = ranking[0];
  const totalPlayers = ranking.length;
  const totalPoints = ranking.reduce((sum, row) => sum + row.totalPoints, 0);
  const activeRules = scoringRules.filter((rule) => rule.active);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando ranking...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Ranking</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg">
          <p className="font-bold">Erro ao carregar ranking</p>
          <p className="text-sm mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <section className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-primary to-secondary text-white p-8 shadow-2xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-sm uppercase tracking-[0.35em] text-white/70 mb-3">Ranking ao vivo</div>
            <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4">Classificacao geral da edicao</h1>
            <p className="text-white/80 text-base md:text-lg">
              A tela mostra a soma dos eventos de pontuacao gerados para cada usuario. Cada conclusao pode criar varios eventos e o ranking ordena pelo total de pontos.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 min-w-full lg:min-w-[420px]">
            <div className="rounded-2xl bg-white/10 backdrop-blur px-5 py-4">
              <div className="text-xs uppercase tracking-[0.25em] text-white/60 mb-2">Jogadores</div>
              <div className="text-3xl font-black">{totalPlayers}</div>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur px-5 py-4">
              <div className="text-xs uppercase tracking-[0.25em] text-white/60 mb-2">Lider</div>
              <div className="text-3xl font-black">{leader ? leader.totalPoints : 0}</div>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur px-5 py-4">
              <div className="text-xs uppercase tracking-[0.25em] text-white/60 mb-2">Pontos somados</div>
              <div className="text-3xl font-black">{totalPoints}</div>
            </div>
          </div>
        </div>
      </section>

      {ranking.length === 0 ? (
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="bg-white rounded-[2rem] shadow-lg p-8">
            <h2 className="text-2xl font-black mb-3">Nenhuma conclusao registrada ainda</h2>
            <p className="text-gray-600 mb-6">
              Assim que os usuarios registrarem concluosoes, o ranking sera calculado automaticamente pela soma dos eventos de score.
            </p>
            <a
              href="/completion"
              className="inline-block bg-primary hover:bg-secondary text-white px-6 py-3 rounded-xl font-bold transition duration-200"
            >
              Registrar primeira conclusao
            </a>
          </div>

          <div className="bg-white rounded-[2rem] shadow-lg p-8">
            <h2 className="text-xl font-black mb-4">Como a pontuacao funciona</h2>
            <div className="space-y-3">
              {activeRules.slice(0, 5).map((rule) => (
                <div key={rule.code} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className="font-bold text-slate-900">{rule.title}</span>
                    <span className="bg-slate-900 text-white text-sm font-bold px-3 py-1 rounded-full">+{rule.points}</span>
                  </div>
                  <p className="text-sm text-slate-600">{rule.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="grid gap-5 lg:grid-cols-3">
            {ranking.slice(0, 3).map((player, index) => (
              <PodiumCard key={player.userId} player={player} index={index} />
            ))}
          </section>

          <section className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="bg-white rounded-[2rem] shadow-lg overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100">
                <h2 className="text-2xl font-black text-slate-900">Tabela completa</h2>
                <p className="text-slate-600 mt-1">Ordenada pelo total de pontos gerados na edicao ativa.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.25em] text-slate-500">
                      <th className="px-8 py-4 font-bold">Posicao</th>
                      <th className="px-8 py-4 font-bold">Jogador</th>
                      <th className="px-8 py-4 font-bold">Destaque</th>
                      <th className="px-8 py-4 font-bold text-right">Pontos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((row, index) => (
                      <tr
                        key={row.userId}
                        className={`border-t border-slate-100 transition ${
                          index === 0 ? 'bg-amber-50/80' : index % 2 === 0 ? 'bg-slate-50/70' : 'bg-white'
                        }`}
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white font-black">
                              {formatPosition(index)}
                            </span>
                            {index < 3 && (
                              <span className="text-xs uppercase tracking-[0.25em] text-slate-500">Top {index + 1}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="font-bold text-slate-900">{row.displayName}</div>
                          <div className="text-sm text-slate-500">Usuario {row.userId}</div>
                        </td>
                        <td className="px-8 py-5">
                          {row.underdogBonusCount > 0 ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-2 text-emerald-800 font-bold text-sm">
                              UnderDog +3 x{row.underdogBonusCount}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <span className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-white font-black shadow-sm">
                            {row.totalPoints} pts
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-[2rem] shadow-lg p-8">
                <h2 className="text-2xl font-black text-slate-900 mb-3">Como o calculo funciona</h2>
                <p className="text-slate-600 mb-6">
                  O backend gera eventos de score para cada conclusao. Depois o ranking soma `ScoreEvent.points` por usuario e ordena do maior para o menor.
                </p>

                <div className="space-y-3">
                  {scoringRules.map((rule) => (
                    <div key={rule.code} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <div>
                          <div className="font-bold text-slate-900">{rule.title}</div>
                          <div className="text-[11px] uppercase tracking-[0.25em] text-slate-400">{rule.code}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-black ${rule.active ? 'text-primary' : 'text-slate-400'}`}>
                            +{rule.points} pts
                          </div>
                          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                            {rule.active ? 'ativo' : 'inativo'}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600">{rule.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] bg-slate-950 text-white p-8 shadow-lg">
                <h3 className="text-xl font-black mb-3">Resumo tecnico</h3>
                <div className="space-y-3 text-sm text-slate-300">
                  <p>
                    `CompletionService` salva a conclusao e chama o `ScoringEngine` para gerar os eventos de pontuacao.
                  </p>
                  <p>
                    `RankingService` busca a edicao ativa e delega ao repositorio a soma dos pontos por usuario.
                  </p>
                  <p>
                    A API agora tambem entrega `underdogBonusCount`, permitindo destacar quem ja recebeu esse bonus no ranking.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
