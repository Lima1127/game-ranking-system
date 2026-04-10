import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import ImagePreviewModal from '../components/ImagePreviewModal';

const scoringRules = [
  { code: 'GAME_COMPLETED', emoji: '🎮', points: 1, description: 'Cada conclusao registrada gera 1 ponto base.', active: true },
  { code: 'FIRST_EXPERIENCE', emoji: '✨', points: 1, description: 'Bonus para a primeira vez que a pessoa fecha aquele jogo.', active: true },
  { code: 'FIRST_IN_EDITION', emoji: '🚀', points: 1, description: 'Bonus para quem fecha o jogo primeiro dentro da edicao ativa.', active: true },
  { code: 'IN_RELEASE_YEAR', emoji: '📅', points: 1, description: 'Bonus manual para jogos considerados lancamento do ano na edicao.', active: true },
  { code: 'TIME_VALUABLE_BLOCK', emoji: '⏱️', points: 2, description: 'A cada bloco completo de 25 horas jogadas, soma 2 pontos.', active: true },
  { code: 'PLATINUM', emoji: '🏆', points: 3, description: 'Platina confirmada rende 3 pontos.', active: true },
  { code: 'COOP_RIGHT_HAND', emoji: '🤝', points: 2, description: 'Coop com ate 4 jogadores rende 2 pontos extras.', active: true },
  { code: 'HYPE_PARTICIPATION', emoji: '🔥', points: 1, description: 'Participar do Hype adiciona 1 ponto.', active: true },
  { code: 'HYPE_COMPLETION_BONUS', emoji: '⚡', points: 2, description: 'Completar o objetivo relacionado ao Hype soma mais 2 pontos.', active: true },
  { code: 'ROTATIVE_LIST_BONUS', emoji: '🔄', points: 3, description: 'Completar um item da lista rotativa adiciona 3 pontos.', active: true },
  { code: 'UNDERDOG_BONUS', emoji: '🐶', points: 3, description: 'Bonus de 3 pontos para quem inicia a jogada estando 20 pontos ou mais atras do lider da edicao.', active: true },
];

const emojiByRuleCode = scoringRules.reduce((acc, rule) => {
  acc[rule.code] = rule.emoji;
  return acc;
}, {});

const platinumBadgeClass =
  'rounded-full border border-[#8da8bf] bg-gradient-to-r from-[#fff6d8] via-[#d5f2ff] to-[#8fd9ff] px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-[#432200] dark:border-[#163a56] dark:bg-gradient-to-r dark:from-[#1f2b4b] dark:via-[#1d5d88] dark:to-[#2fc7ff] dark:text-[#fff6d8]';

function formatPosition(index) {
  return String(index + 1);
}

function RuleEmojiStrip({ ruleCodes = [] }) {
  if (ruleCodes.length === 0) {
    return null;
  }

  const groupedRules = ruleCodes.reduce((acc, ruleCode) => {
    if (!acc[ruleCode]) {
      acc[ruleCode] = { code: ruleCode, count: 0 };
    }
    acc[ruleCode].count += 1;
    return acc;
  }, {});

  const orderedGroupedRules = Object.values(groupedRules);

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {orderedGroupedRules.map(({ code, count }) => (
        <span key={code} className="relative inline-flex">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-lg shadow-sm"
            title={count > 1 ? `${code} x${count}` : code}
          >
            {emojiByRuleCode[code] || '⭐'}
          </span>
          {count > 1 && (
            <span className="absolute -right-2 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-slate-900 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow">
              x{count}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

function PodiumCard({ player, index, userCompletions, avatarUrl, onPreview }) {
  const styles = [
    'from-amber-400 to-yellow-300 text-amber-950',
    'from-slate-300 to-slate-100 text-slate-900',
    'from-orange-300 to-amber-200 text-orange-950',
  ];

  const medals = ['Top 1', 'Top 2', 'Top 3'];

  return (
    <div className={`rounded-3xl bg-gradient-to-br ${styles[index]} shadow-lg p-6`}>
      <div className="text-xs uppercase tracking-[0.3em] opacity-70 mb-3">{medals[index]}</div>
      <div className="mb-2 flex items-center gap-3">
        {avatarUrl ? (
          <button
            type="button"
            onClick={() => onPreview(avatarUrl, `Avatar de ${player.displayName}`)}
            className="inline-block"
          >
            <img
              src={avatarUrl}
              alt={`Avatar de ${player.displayName}`}
              className="h-10 w-10 rounded-full object-cover border border-black/10 cursor-zoom-in"
            />
          </button>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/10 text-xs font-bold">
            {player.displayName?.slice(0, 1)?.toUpperCase() || '?'}
          </div>
        )}
        <div className="text-2xl font-black">{player.displayName}</div>
      </div>
      <div className="text-sm opacity-80 mb-4">Pontuacao total acumulada na edicao ativa.</div>
      {player.underdogBonusCount > 0 && (
        <div className="inline-flex items-center rounded-full bg-black/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] mb-4">
          UnderDog x{player.underdogBonusCount}
        </div>
      )}
      <div className="flex items-end justify-between mb-4">
        <span className="text-5xl font-black leading-none">{player.totalPoints}</span>
        <span className="text-sm font-bold uppercase tracking-[0.25em]">pts</span>
      </div>
      <div className="space-y-2">
        {userCompletions.slice(0, 3).map((completion) => (
          <div key={completion.completionId} className="rounded-2xl bg-white/25 dark:bg-black/20 px-4 py-3">
            <div className="font-bold">{completion.gameName}</div>
            <div className="text-xs opacity-80">
              {completion.completedAt} - {completion.hoursPlayed}h{completion.platinum ? ' - platina' : ''}
            </div>
            <RuleEmojiStrip ruleCodes={completion.ruleCodes} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RankingPage() {
  const { user } = useAuth();
  const [previewImage, setPreviewImage] = useState(null);
  const { data: ranking = [], isLoading, error } = useQuery({
    queryKey: ['ranking'],
    queryFn: async () => {
      const response = await api.get('/ranking');
      return response.data;
    },
  });

  const { data: completions = [], isLoading: completionsLoading } = useQuery({
    queryKey: ['ranking-completions'],
    queryFn: async () => {
      const response = await api.get('/completions');
      return response.data;
    },
  });

  const completionsByUser = completions.reduce((acc, completion) => {
    if (!acc[completion.userId]) {
      acc[completion.userId] = [];
    }
    acc[completion.userId].push(completion);
    return acc;
  }, {});

  const leader = ranking[0];
  const totalPlayers = ranking.length;
  const activeRules = scoringRules.filter((rule) => rule.active);
  const currentUserIndex = ranking.findIndex((row) => row.userId === user?.id);
  const currentUserEntry = currentUserIndex >= 0 ? ranking[currentUserIndex] : null;
  const buildAvatarUrl = (row) => {
    if (!row?.hasAvatar) {
      return null;
    }
    const version = row.avatarUploadedAt ? `?v=${encodeURIComponent(row.avatarUploadedAt)}` : '';
    return `${api.defaults.baseURL}/users/${row.userId}/avatar${version}`;
  };

  const scrollToCurrentUserRow = () => {
    if (!currentUserEntry) {
      return;
    }

    const row = document.getElementById(`ranking-row-${currentUserEntry.userId}`);
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (isLoading || completionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-300">Carregando ranking...</p>
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
              Cada jogo aprovado agora mostra os emojis das categorias que realmente pontuaram naquela conclusao.
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
              <div className="text-xs uppercase tracking-[0.25em] text-white/60 mb-2">Registros</div>
              <div className="text-3xl font-black">{completions.length}</div>
            </div>
          </div>
        </div>
      </section>

      {user?.id && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-5">
          {currentUserEntry ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-1">Sua posicao</div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                  #{currentUserIndex + 1} - {currentUserEntry.displayName}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300">{currentUserEntry.totalPoints} pontos</div>
              </div>
              <button
                type="button"
                onClick={scrollToCurrentUserRow}
                className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-secondary"
              >
                Ir para minha linha
              </button>
            </div>
          ) : (
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Voce ainda nao aparece no ranking desta edicao.
            </div>
          )}
        </section>
      )}

      {ranking.length === 0 ? (
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-lg p-8 border border-slate-100 dark:border-slate-800">
            <h2 className="text-2xl font-black mb-3">Nenhuma conclusao registrada ainda</h2>
            <p className="text-gray-600 dark:text-slate-300 mb-6">
              Assim que os usuarios registrarem conclusoes, o ranking sera calculado automaticamente pela soma dos eventos de score.
            </p>
            <Link
              to="/completion"
              className="inline-block bg-primary hover:bg-secondary text-white px-6 py-3 rounded-xl font-bold transition duration-200"
            >
              Registrar primeira conclusao
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-lg p-8 border border-slate-100 dark:border-slate-800">
            <h2 className="text-xl font-black mb-4">Como a pontuacao funciona</h2>
            <div className="space-y-3">
              {activeRules.slice(0, 5).map((rule) => (
                <div key={rule.code} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className="text-3xl">{rule.emoji}</span>
                    <span className="bg-slate-900 dark:bg-slate-700 text-white text-sm font-bold px-3 py-1 rounded-full">+{rule.points}</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{rule.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="grid gap-5 lg:grid-cols-3">
            {ranking.slice(0, 3).map((player, index) => (
              <PodiumCard
                key={player.userId}
                player={player}
                index={index}
                userCompletions={completionsByUser[player.userId] || []}
                avatarUrl={buildAvatarUrl(player)}
                onPreview={(src, alt) => setPreviewImage({ src, alt })}
              />
            ))}
          </section>

          <section className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-lg overflow-hidden border border-slate-100 dark:border-slate-800">
              <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Tabela completa</h2>
                <p className="text-slate-600 dark:text-slate-300 mt-1">Cada jogador mostra abaixo os jogos e os emojis das categorias que pontuaram.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                      <th className="px-8 py-4 font-bold">Posicao</th>
                      <th className="px-8 py-4 font-bold">Jogador</th>
                      <th className="px-8 py-4 font-bold">Destaque</th>
                      <th className="px-8 py-4 font-bold text-right">Pontos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((row, index) => {
                      const userCompletions = completionsByUser[row.userId] || [];
                      const isCurrentUser = Boolean(user?.id && row.userId === user.id);

                      return (
                        <tr
                          id={`ranking-row-${row.userId}`}
                          key={row.userId}
                          className={`border-t border-slate-100 dark:border-slate-800 align-top ${
                            index % 2 === 0 ? 'bg-slate-50/70 dark:bg-slate-900/60' : 'bg-white dark:bg-slate-900'
                          } ${
                            isCurrentUser ? 'shadow-[4px_0_0_0_#8b5cf6_inset]' : ''
                          }`}
                        >
                          <td className={isCurrentUser ? 'pl-11 pr-8 py-5' : 'px-8 py-5'}>
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 dark:bg-slate-700 text-white font-black">
                                {formatPosition(index)}
                              </span>
                              {index < 3 && <span className="text-xs uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Top {index + 1}</span>}
                            </div>
                          </td>
                          <td className="px-8 py-5 min-w-[320px]">
                            <div className="flex items-center gap-2">
                              {buildAvatarUrl(row) ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewImage({
                                      src: buildAvatarUrl(row),
                                      alt: `Avatar de ${row.displayName}`,
                                    })
                                  }
                                  className="inline-block"
                                >
                                  <img
                                    src={buildAvatarUrl(row)}
                                    alt={`Avatar de ${row.displayName}`}
                                    className="h-9 w-9 rounded-full object-cover border border-slate-300 dark:border-slate-700 cursor-zoom-in"
                                  />
                                </button>
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
                                  {row.displayName?.slice(0, 1)?.toUpperCase() || '?'}
                                </div>
                              )}
                              <div className="font-bold text-slate-900 dark:text-slate-100">{row.displayName}</div>
                              {isCurrentUser && (
                                <span className="inline-flex rounded-full bg-primary/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary dark:bg-primary/25 dark:text-indigo-200">
                                  Voce
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">Usuario {row.userId}</div>
                            <div className="space-y-2">
                              {userCompletions.length > 0 ? (
                                userCompletions.map((completion) => (
                                  <div key={completion.completionId} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800 px-4 py-3">
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="font-semibold text-slate-900 dark:text-slate-100">{completion.gameName}</span>
                                      {completion.platinum && (
                                        <span className={platinumBadgeClass}>
                                          Platina
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                      {completion.completedAt} - {completion.hoursPlayed}h
                                    </div>
                                    <RuleEmojiStrip ruleCodes={completion.ruleCodes} />
                                  </div>
                                ))
                              ) : (
                                <div className="text-sm text-slate-400 dark:text-slate-500">Nenhum jogo registrado.</div>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            {row.underdogBonusCount > 0 ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-2 text-emerald-800 font-bold text-sm">
                                UnderDog +3 x{row.underdogBonusCount}
                              </span>
                            ) : (
                              <span className="text-sm text-slate-400 dark:text-slate-500">-</span>
                            )}
                          </td>
                          <td className="px-8 py-5 text-right">
                            <span className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-white font-black shadow-sm">
                              {row.totalPoints} pts
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-lg p-8 border border-slate-100 dark:border-slate-800">
                <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-3">Como o calculo funciona</h2>
                <p className="text-slate-600 dark:text-slate-300 mb-6">
                  O backend gera eventos de score para cada conclusao. Depois o ranking soma os pontos por usuario e exibe os emojis das regras aplicadas em cada jogo.
                </p>

                <div className="space-y-3">
                  {scoringRules.map((rule) => (
                    <div key={rule.code} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-2xl">
                            {rule.emoji}
                          </div>
                          <div className="text-[11px] uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">{rule.code}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-black ${rule.active ? 'text-primary' : 'text-slate-400'}`}>+{rule.points} pts</div>
                          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{rule.active ? 'ativo' : 'inativo'}</div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{rule.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] bg-slate-950 text-white p-8 shadow-lg">
                <h3 className="text-xl font-black mb-3">Resumo tecnico</h3>
                <div className="space-y-3 text-sm text-slate-300">
                  <p>`CompletionService` salva a conclusao e chama o `ScoringEngine` para gerar os eventos de pontuacao.</p>
                  <p>`RankingService` busca a edicao ativa e delega ao repositorio a soma dos pontos por usuario.</p>
                  <p>A tela consulta `GET /completions` e agora recebe tambem os `ruleCodes` de cada jogo aprovado.</p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      <ImagePreviewModal
        isOpen={Boolean(previewImage)}
        imageSrc={previewImage?.src}
        imageAlt={previewImage?.alt}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}
