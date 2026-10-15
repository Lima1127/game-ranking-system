import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { History, Info } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import JanelaFoco from '../components/JanelaFoco';
import RuleEmojiStrip from '../components/RuleEmojiStrip';
import { scoringRules, pointsByRuleCode } from '../data/scoringRules';
import { formatarData, formatarHoras } from '../utils/formatarData';

// Quantos jogos aparecem no histórico da página (o resto fica em "Ver completo").
const HISTORICO_NA_PAGINA = 5;

const ORDENAR_POR_DATA = (a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || ''));

function getCompletionPoints(completion) {
  return (completion.ruleCodes || []).reduce((sum, code) => sum + (pointsByRuleCode[code] || 0), 0);
}

function hasObligationBadge(completion) {
  return Boolean(completion?.fromObligation || (completion?.ruleCodes || []).includes('OBLIGATION_COMPLETED'));
}

function buildAvatarUrl(row) {
  if (!row?.hasAvatar) {
    return null;
  }
  const version = row.avatarUploadedAt ? `?v=${encodeURIComponent(row.avatarUploadedAt)}` : '';
  return `${api.defaults.baseURL}/users/${row.userId}/avatar${version}`;
}

/** Junta nomes empatados: ["A"] -> "A", ["A","B"] -> "A e B", ["A","B","C"] -> "A, B e C". */
function juntarNomes(nomes) {
  if (nomes.length <= 1) return nomes[0] || '';
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

function Avatar({ row, name, size = 'h-8 w-8', textSize = 'text-xs' }) {
  const url = buildAvatarUrl(row);
  if (url) {
    return <img src={url} alt="" className={`${size} shrink-0 rounded-full border border-slate-300 object-cover dark:border-slate-700`} />;
  }
  return (
    <span className={`${size} ${textSize} flex shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300`}>
      {(name || row?.displayName || '?').slice(0, 1).toUpperCase()}
    </span>
  );
}

function Card({ children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-100 bg-white p-5 shadow sm:p-6 dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {children}
    </section>
  );
}

function CardTitle({ children, acao }) {
  return (
    // flex-wrap: em coluna estreita, o botão ao lado do título desce de linha em vez de espremer.
    <div className="mb-4 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
      <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{children}</h2>
      {acao}
    </div>
  );
}

function SeloPlatina() {
  return (
    <span className="shrink-0 rounded-full border border-[#8da8bf] bg-gradient-to-r from-[#fff6d8] via-[#d5f2ff] to-[#8fd9ff] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#432200] dark:border-[#163a56] dark:from-[#1f2b4b] dark:via-[#1d5d88] dark:to-[#2fc7ff] dark:text-[#fff6d8]">
      Platina
    </span>
  );
}

/** Cartão de um jogo (histórico e janela de jogos do jogador). */
function LinhaJogo({ completion, row, mostrarJogador = true }) {
  return (
    <li className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="flex items-start gap-3">
        {mostrarJogador && <Avatar row={row} name={completion.userDisplayName} size="h-9 w-9" />}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-bold text-slate-900 dark:text-slate-100" title={completion.gameName}>
              {completion.gameName}
            </span>
            {hasObligationBadge(completion) && <span className="shrink-0" title="Jogo de obrigação">📋</span>}
            {completion.platinum && <SeloPlatina />}
          </div>
          <div className="truncate text-xs text-slate-500 dark:text-slate-400">
            {mostrarJogador && <span className="font-semibold text-slate-600 dark:text-slate-300">{completion.userDisplayName} · </span>}
            {formatarData(completion.completedAt)} · {formatarHoras(completion.hoursPlayed)}
          </div>
          <RuleEmojiStrip ruleCodes={completion.ruleCodes} className="mt-2" />
        </div>
        <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-xs font-black text-white">+{getCompletionPoints(completion)}</span>
      </div>
    </li>
  );
}

function LegendaPontuacao() {
  const [aberta, setAberta] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <Info className="h-4 w-4" aria-hidden="true" />
        Como pontuar
      </button>

      {aberta && (
        <JanelaFoco titulo="Como pontuar" largura="max-w-3xl" onFechar={() => setAberta(false)}>
          <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {scoringRules.map((rule) => (
              <li key={rule.code} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg dark:bg-slate-800" aria-hidden="true">
                  {rule.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{rule.name}</span>
                    <span className="shrink-0 text-xs font-black text-primary">+{rule.points}</span>
                  </span>
                  <span className="block text-xs leading-snug text-slate-500 dark:text-slate-400">{rule.description}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-200">
            <strong>Obrigações também tiram pontos:</strong> recusar <strong>−3</strong>, desistir depois de aceitar <strong>−3</strong> e entrega parcial <strong>−1</strong>.
          </p>
        </JanelaFoco>
      )}
    </>
  );
}

function ResumoEstatistico({ totais, destaques, children }) {
  return (
    <Card>
      <CardTitle>Resumo da rapaziada</CardTitle>
      <div className="grid grid-cols-4 gap-2.5">
        {totais.map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-1 py-3 text-center dark:border-slate-700 dark:bg-slate-800">
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{item.valor}</div>
            {/* Sem espaçamento extra entre letras: "JOGADORES" precisa caber no quadradinho. */}
            <div className="truncate text-[10px] font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400" title={item.label}>
              {item.label}
            </div>
          </div>
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {destaques.map((item) => (
          <li key={item.titulo} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
            <span className="text-xl leading-none" aria-hidden="true">{item.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-slate-500 dark:text-slate-400">{item.titulo}</span>
              <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100" title={item.nomes}>
                {item.nomes || '—'}
              </span>
            </span>
            {item.nomes && <span className="shrink-0 text-sm font-black text-primary">{item.valor}</span>}
          </li>
        ))}
      </ul>
      {children}
    </Card>
  );
}

// Pódio em pilares: lisos, de uma cor só (a da posição), finos e sem 3D.
// Os 3 pilares aparecem sempre; lugar sem jogador fica como "Vago".
const PILARES = {
  1: { fuste: 'h-28 bg-amber-300', borda: 'bg-amber-500', numero: 'text-amber-700', aro: 'ring-amber-400', avatar: 'h-16 w-16' },
  2: { fuste: 'h-20 bg-slate-300', borda: 'bg-slate-400', numero: 'text-slate-600', aro: 'ring-slate-300', avatar: 'h-12 w-12' },
  3: { fuste: 'h-12 bg-orange-300', borda: 'bg-orange-500', numero: 'text-orange-700', aro: 'ring-orange-400', avatar: 'h-12 w-12' },
};

function Podio({ ranking }) {
  // Ordem visual de um pódio: 2º à esquerda, 1º no centro, 3º à direita.
  const lugares = [2, 1, 3].map((posicao) => ({ posicao, row: ranking[posicao - 1] || null }));

  // Fica dentro do card do resumo (economiza bordas e espaçamentos para caber em Full HD).
  return (
    <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800">
      <CardTitle>Pódio</CardTitle>
      <div className="mx-auto max-w-sm">
        <div className="flex items-end">
          {lugares.map(({ posicao, row }) => {
            const pilar = PILARES[posicao];
            return (
              <div key={posicao} className="flex min-w-0 flex-1 flex-col items-center">
                {posicao === 1 && <span className={`mb-1 text-2xl leading-none ${row ? '' : 'opacity-30 grayscale'}`} aria-hidden="true">🏆</span>}
                {row ? (
                  <span className={`rounded-full ring-4 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ${pilar.aro}`}>
                    <Avatar row={row} size={pilar.avatar} textSize="text-xl" />
                  </span>
                ) : (
                  <span className={`flex items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-xl font-bold text-slate-400 dark:border-slate-600 dark:text-slate-500 ${pilar.avatar}`}>
                    ?
                  </span>
                )}
                <span
                  className={`mb-2 mt-2 w-full truncate px-1 text-center text-sm font-bold ${row ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}
                  title={row?.displayName}
                >
                  {row ? row.displayName : 'Vago'}
                </span>

                {/* Pilar: capitel, fuste liso com o número, base */}
                <div className={`h-2.5 w-[60%] rounded-sm ${pilar.borda}`} />
                <div className={`flex w-[44%] justify-center pt-2 ${pilar.fuste}`}>
                  <span className={`text-2xl font-black ${pilar.numero}`}>{posicao}</span>
                </div>
                <div className={`h-2.5 w-[60%] rounded-sm ${pilar.borda}`} />
              </div>
            );
          })}
        </div>

        {/* Piso comum aos três pilares */}
        <div className="h-2.5 w-full rounded-sm bg-slate-300 dark:bg-slate-600" aria-hidden="true" />

        {/* Pontuação embaixo de cada pilar, na mesma ordem */}
        <div className="mt-3 flex">
          {lugares.map(({ posicao, row }) => (
            <div key={posicao} className="flex-1 text-center">
              <span
                className={`inline-block rounded-full px-3 py-1 text-sm font-black ${
                  !row
                    ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                    : posicao === 1
                      ? 'bg-amber-400 text-amber-950'
                      : 'bg-slate-900 text-white dark:bg-slate-700'
                }`}
              >
                {row ? `${row.totalPoints} pts` : '— pts'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabelaRanking({ ranking, jogosPorUsuario, usuarioAtualId, onSelecionar }) {
  return (
    <Card>
      <CardTitle>Classificação</CardTitle>
      {ranking.length === 0 ? (
        <div className="text-sm text-slate-500 dark:text-slate-400">
          <p className="mb-3">Ninguém pontuou ainda. Assim que os primeiros jogos forem aprovados, a classificação aparece aqui.</p>
          <Link to="/completion" className="inline-block rounded-xl bg-primary px-4 py-2 font-bold text-white transition hover:bg-secondary">
            Registrar um jogo
          </Link>
        </div>
      ) : (
        <ol className="space-y-1">
          {ranking.map((row, index) => {
            const souEu = row.userId === usuarioAtualId;
            const jogos = (jogosPorUsuario[row.userId] || []).length;
            return (
              <li key={row.userId}>
                <button
                  type="button"
                  onClick={() => onSelecionar(row.userId)}
                  title="Ver os jogos deste jogador"
                  className={`flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                    souEu ? 'bg-primary/5 ring-1 ring-primary/30 dark:bg-primary/10' : ''
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white dark:bg-slate-700">
                    {index + 1}
                  </span>
                  <Avatar row={row} size="h-9 w-9" />
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-bold text-slate-900 dark:text-slate-100">{row.displayName}</span>
                      {row.underdogBonusCount > 0 && (
                        <span className="shrink-0 text-sm" title={`Café com leite${row.underdogBonusCount > 1 ? ` ×${row.underdogBonusCount}` : ''}`}>🐶</span>
                      )}
                      {souEu && (
                        <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-primary dark:bg-primary/25 dark:text-indigo-200">
                          Você
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {jogos} {jogos === 1 ? 'jogo zerado' : 'jogos zerados'}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-sm font-black text-white">{row.totalPoints} pts</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

function Historico({ completions, rankingPorUsuario }) {
  const [completoAberto, setCompletoAberto] = useState(false);
  const ordenados = useMemo(() => [...completions].sort(ORDENAR_POR_DATA), [completions]);

  return (
    <Card>
      <CardTitle
        acao={
          ordenados.length > HISTORICO_NA_PAGINA && (
            <button
              type="button"
              onClick={() => setCompletoAberto(true)}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <History className="h-3.5 w-3.5" aria-hidden="true" />
              Ver completo ({ordenados.length})
            </button>
          )
        }
      >
        Histórico de conquistas
      </CardTitle>
      {ordenados.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum jogo aprovado ainda.</p>
      ) : (
        <ul className="space-y-3">
          {ordenados.slice(0, HISTORICO_NA_PAGINA).map((completion) => (
            <LinhaJogo key={completion.completionId} completion={completion} row={rankingPorUsuario[completion.userId]} />
          ))}
        </ul>
      )}

      {completoAberto && (
        <JanelaFoco
          titulo="Histórico de conquistas"
          subtitulo={`${ordenados.length} jogos aprovados, do mais recente ao mais antigo`}
          onFechar={() => setCompletoAberto(false)}
        >
          <ul className="space-y-3">
            {ordenados.map((completion) => (
              <LinhaJogo key={completion.completionId} completion={completion} row={rankingPorUsuario[completion.userId]} />
            ))}
          </ul>
        </JanelaFoco>
      )}
    </Card>
  );
}

const ORDENACOES = {
  date: ORDENAR_POR_DATA,
  hours: (a, b) => Number(b.hoursPlayed || 0) - Number(a.hoursPlayed || 0),
  points: (a, b) => getCompletionPoints(b) - getCompletionPoints(a),
  alpha: (a, b) => String(a.gameName || '').localeCompare(String(b.gameName || ''), 'pt-BR'),
};

function JogosDoJogador({ jogador, jogos, onFechar }) {
  const [ordem, setOrdem] = useState('date');
  const ordenados = [...jogos].sort((a, b) => ORDENACOES[ordem](a, b) || ORDENAR_POR_DATA(a, b));

  return (
    <JanelaFoco
      titulo={`Jogos de ${jogador.displayName}`}
      subtitulo={`${jogador.totalPoints} pts · ${jogos.length} ${jogos.length === 1 ? 'jogo' : 'jogos'}`}
      icone={<Avatar row={jogador} size="h-10 w-10" />}
      onFechar={onFechar}
    >
      <label htmlFor="ordem-jogos" className="mb-1.5 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        Ordenar por
      </label>
      <select
        id="ordem-jogos"
        value={ordem}
        onChange={(event) => setOrdem(event.target.value)}
        className="mb-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      >
        <option value="date">Data (mais recente)</option>
        <option value="hours">Horas jogadas (maior)</option>
        <option value="points">Pontos ganhos (maior)</option>
        <option value="alpha">Ordem alfabética</option>
      </select>
      {ordenados.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum jogo aprovado ainda.</p>
      ) : (
        <ul className="space-y-3">
          {ordenados.map((completion) => (
            <LinhaJogo key={completion.completionId} completion={completion} mostrarJogador={false} />
          ))}
        </ul>
      )}
    </JanelaFoco>
  );
}

export default function RankingPage() {
  const { user } = useAuth();
  const [jogadorSelecionadoId, setJogadorSelecionadoId] = useState(null);

  const { data: ranking = [], isLoading, error } = useQuery({
    queryKey: ['ranking'],
    queryFn: async () => (await api.get('/ranking')).data,
  });
  const { data: completions = [], isLoading: completionsLoading } = useQuery({
    queryKey: ['ranking-completions'],
    queryFn: async () => (await api.get('/completions')).data,
  });

  const { jogosPorUsuario, rankingPorUsuario, totais, destaques } = useMemo(() => {
    const porUsuario = {};
    const nomePorUsuario = {};
    completions.forEach((completion) => {
      if (!porUsuario[completion.userId]) porUsuario[completion.userId] = [];
      porUsuario[completion.userId].push(completion);
      nomePorUsuario[completion.userId] = completion.userDisplayName;
    });
    ranking.forEach((row) => {
      nomePorUsuario[row.userId] = row.displayName;
    });

    const horasTotais = completions.reduce((soma, completion) => soma + Number(completion.hoursPlayed || 0), 0);

    // Destaque = quem tem o maior valor; empates aparecem juntos ("A e B").
    const destaque = (titulo, emoji, valorDe, formatar) => {
      const valores = Object.entries(porUsuario).map(([userId, jogos]) => ({ userId, valor: valorDe(jogos) }));
      const maior = Math.max(0, ...valores.map((item) => item.valor));
      const lideres = maior > 0 ? valores.filter((item) => item.valor === maior).map((item) => nomePorUsuario[item.userId]) : [];
      return { titulo, emoji, nomes: juntarNomes(lideres), valor: formatar(maior) };
    };

    return {
      jogosPorUsuario: porUsuario,
      rankingPorUsuario: Object.fromEntries(ranking.map((row) => [row.userId, row])),
      totais: [
        { label: 'Jogadores', valor: ranking.length },
        { label: 'Jogos', valor: completions.length },
        { label: 'Horas', valor: Math.floor(horasTotais) },
        { label: 'Platinas', valor: completions.filter((completion) => completion.platinum).length },
      ],
      destaques: [
        destaque('Quem mais zerou', '🎮', (jogos) => jogos.length, (v) => `${v} ${v === 1 ? 'jogo' : 'jogos'}`),
        destaque('Quem mais jogou', '⏱️', (jogos) => jogos.reduce((s, j) => s + Number(j.hoursPlayed || 0), 0), (v) => formatarHoras(Math.floor(v))),
        destaque('Quem mais platinou', '🏆', (jogos) => jogos.filter((j) => j.platinum).length, (v) => `${v} ${v === 1 ? 'platina' : 'platinas'}`),
      ],
    };
  }, [ranking, completions]);

  const jogadorSelecionado = jogadorSelecionadoId ? rankingPorUsuario[jogadorSelecionadoId] : null;

  if (isLoading || completionsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-gray-600 dark:text-slate-300">Carregando ranking...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-3xl font-bold">Ranking</h1>
        <div className="rounded-lg border border-red-400 bg-red-100 px-6 py-4 text-red-700">
          <p className="font-bold">Erro ao carregar o ranking</p>
          <p className="mt-2 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl font-bold">Ranking</h1>
        <LegendaPontuacao />
      </div>

      {/* Telas largas: Resumo+Pódio | Classificação | Histórico. Médias: 2 colunas. Celular: uma embaixo da outra.
          O layout aparece sempre, mesmo sem jogos aprovados (o pódio mostra os lugares vagos). */}
      <div className="grid items-start gap-6 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
        <ResumoEstatistico totais={totais} destaques={destaques}>
          <Podio ranking={ranking} />
        </ResumoEstatistico>
        <TabelaRanking ranking={ranking} jogosPorUsuario={jogosPorUsuario} usuarioAtualId={user?.id} onSelecionar={setJogadorSelecionadoId} />
        <div className="lg:col-span-2 xl:col-span-1">
          <Historico completions={completions} rankingPorUsuario={rankingPorUsuario} />
        </div>
      </div>

      {jogadorSelecionado && (
        <JogosDoJogador
          jogador={jogadorSelecionado}
          jogos={jogosPorUsuario[jogadorSelecionado.userId] || []}
          onFechar={() => setJogadorSelecionadoId(null)}
        />
      )}
    </div>
  );
}
