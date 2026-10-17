import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Check, CheckCircle2, ClipboardList, Flag, Gamepad2, ImagePlus, Info, Send, Undo2, X } from 'lucide-react';
import api from '../services/api';
import { compressImage } from '../utils/compressImage';
import { useAuth } from '../contexts/AuthContext';
import { isStaffRole } from '../utils/roles';
import { formatarData } from '../utils/formatarData';
import { useSugestoesSteam } from '../hooks/useSugestoesSteam';
import SugestoesSteam from '../components/SugestoesSteam';
import JanelaFoco from '../components/JanelaFoco';
import OpcaoBonus from '../components/OpcaoBonus';
import { dicaEmDia, emDiaPeloLancamento } from '../utils/emDia';
import { dicaPlatina, usePlatinaSteam } from '../hooks/usePlatinaSteam';

// Situacao da obrigacao: nome em portugues + cor (mesmo formato das etiquetas de Solicitacoes)
const STATUS = {
  PENDING: { rotulo: 'Aguardando resposta', classe: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-500/30', ponto: 'bg-amber-500' },
  ACCEPTED: { rotulo: 'Aceita · em andamento', classe: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-500/30', ponto: 'bg-indigo-500' },
  REVIEW_PENDING_PARTIAL: { rotulo: 'Em revisão · 25%', classe: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-500/30', ponto: 'bg-sky-500' },
  REVIEW_PENDING_COMPLETION: { rotulo: 'Em revisão · finalizado', classe: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-500/30', ponto: 'bg-sky-500' },
  COMPLETED: { rotulo: 'Concluída', classe: 'bg-green-50 text-green-700 ring-green-200 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-500/30', ponto: 'bg-green-500' },
  PARTIAL: { rotulo: 'Parcial · 25%', classe: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:ring-orange-500/30', ponto: 'bg-orange-500' },
  REFUSED: { rotulo: 'Recusada', classe: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-500/30', ponto: 'bg-red-500' },
  CANCELLED: { rotulo: 'Cancelada', classe: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700', ponto: 'bg-slate-400' },
};
const FINALIZADAS = ['COMPLETED', 'PARTIAL', 'REFUSED', 'CANCELLED'];
const EM_REVISAO = ['REVIEW_PENDING_PARTIAL', 'REVIEW_PENDING_COMPLETION'];

function EtiquetaStatus({ status }) {
  const info = STATUS[status] || STATUS.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${info.classe}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${info.ponto}`} aria-hidden="true" />
      {info.rotulo}
    </span>
  );
}

/** Pontos que a obrigacao ja gerou (ex.: "-3 pts", "+3 pts"). */
function EtiquetaPontos({ item }) {
  const total = (item.rewardPoints || 0) + (item.penaltyPoints || 0);
  if (!total) return null;
  const positivo = total > 0;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
        positivo ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
      }`}
    >
      {positivo ? '+' : ''}
      {total} pts
    </span>
  );
}

/** Capa do jogo vinda da Steam; sem Steam (ou se a imagem falhar), mostra um controle. */
function CapaJogo({ game }) {
  const [falhou, setFalhou] = useState(false);
  if (game?.steamAppId && !falhou) {
    return (
      <img
        src={`https://cdn.akamai.steamstatic.com/steam/apps/${game.steamAppId}/header.jpg`}
        alt=""
        loading="lazy"
        onError={() => setFalhou(true)}
        className="h-[60px] w-32 shrink-0 rounded-xl bg-slate-100 object-cover ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
      />
    );
  }
  return (
    <span className="flex h-[60px] w-32 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-secondary/20 text-primary ring-1 ring-slate-200 dark:text-indigo-300 dark:ring-slate-700">
      <Gamepad2 className="h-6 w-6" aria-hidden="true" />
    </span>
  );
}

const botaoBase = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition disabled:opacity-50';
const botaoPrincipal = `${botaoBase} bg-primary text-white hover:bg-secondary`;
const botaoAprovar = `${botaoBase} bg-green-600 text-white hover:bg-green-700`;
const botaoPerigo = `${botaoBase} border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-950/40`;
const botaoSecundario = `${botaoBase} border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800`;

const campoClasse =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400';

function Rotulo({ children }) {
  return <span className="mb-1 block text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">{children}</span>;
}

const REGRAS = [
  { pontos: '−3', cor: 'text-red-600 dark:text-red-400', texto: 'Recusar, ou aceitar e desistir depois. O slot de quem enviou continua gasto.' },
  { pontos: '0', cor: 'text-slate-500 dark:text-slate-400', texto: 'Quem enviou cancela: o slot volta para ele, sem penalidade.' },
  { pontos: '−1', cor: 'text-orange-600 dark:text-orange-400', texto: 'Chegou a 25% do jogo e a revisão foi aprovada aqui.' },
  { pontos: '+3', cor: 'text-green-600 dark:text-green-400', texto: 'Jogo finalizado: aprovado em Solicitações, junto com os pontos da conclusão.' },
];

export default function ObligationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = isStaffRole(user?.role);
  const [form, setForm] = useState({
    assignedToUserId: '',
    gameName: '',
  });
  const [reviewModal, setReviewModal] = useState(null);
  const [aba, setAba] = useState('recebidas');
  const [aviso, setAviso] = useState(null); // { tipo: 'erro' | 'sucesso', texto }
  const avisarErro = (error) => setAviso({ tipo: 'erro', texto: error.response?.data?.message || error.message });

  const { data: overview, isLoading, error } = useQuery({
    queryKey: ['obligations'],
    queryFn: async () => {
      const response = await api.get('/obligations');
      return response.data;
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    },
  });

  const { data: games = [] } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const response = await api.get('/games');
      return response.data;
    },
  });
  const gamesById = useMemo(() => new Map(games.map((game) => [game.id, game])), [games]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['obligations'] });
    queryClient.invalidateQueries({ queryKey: ['ranking'] });
    queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const normalizedName = form.gameName.trim().toLowerCase();
      const existingGame = games.find((game) => game.name.trim().toLowerCase() === normalizedName);

      let gameId = existingGame?.id;
      if (!gameId) {
        const response = await api.post('/games', {
          name: form.gameName.trim(),
          releaseYear: null,
          estimatedHoursMain: null,
          estimatedHoursPlatinum: null,
          genres: ['Nao informado'],
          // O servidor confere o jogo na Steam e usa o nome e o ano de lancamento oficiais.
          steamAppId: steamAppIdParaCadastro,
        });

        gameId = response.data.id;
        queryClient.setQueryData(['games'], (currentGames = []) => {
          const alreadyCached = currentGames.some((game) => game.id === response.data.id);
          return alreadyCached ? currentGames : [...currentGames, response.data];
        });
      }

      return api.post('/obligations', {
        assignedToUserId: form.assignedToUserId,
        gameId,
      });
    },
    onSuccess: () => {
      const alvo = users.find((candidate) => candidate.id === form.assignedToUserId);
      setAviso({ tipo: 'sucesso', texto: `Obrigação enviada para ${alvo?.displayName || 'o jogador'}! Agora é com ele aceitar ou recusar.` });
      setForm({ assignedToUserId: '', gameName: '' });
      limparSelecaoSteam();
      queryClient.invalidateQueries({ queryKey: ['games'] });
      setAba('enviadas');
      refresh();
    },
    onError: avisarErro,
  });

  const acceptMutation = useMutation({
    mutationFn: async (obligationId) => api.post(`/obligations/${obligationId}/accept`),
    onSuccess: refresh,
    onError: avisarErro,
  });

  const refuseMutation = useMutation({
    mutationFn: async (obligationId) => api.post(`/obligations/${obligationId}/refuse`),
    onSuccess: refresh,
    onError: avisarErro,
  });

  const cancelMutation = useMutation({
    mutationFn: async (obligationId) => api.post(`/obligations/${obligationId}/cancel`),
    onSuccess: refresh,
    onError: avisarErro,
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (payload) => {
      if (!payload.proofFile) {
        throw new Error('Envie uma imagem para comprovar a solicitação.');
      }

      const formData = new FormData();
      formData.append('file', await compressImage(payload.proofFile));
      const uploadResponse = await api.post('/uploads/platinum', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedProofId = uploadResponse.data.proofId;

      if (payload.outcome === 'COMPLETED') {
        await api.post('/completions', {
          gameId: payload.gameId,
          completedAt: payload.completedAt,
          hoursPlayed: Number(payload.hoursPlayed),
          firstTimeEver: payload.firstTimeEver,
          completedInReleaseYear: payload.completedInReleaseYear,
          platinum: payload.platinum,
          // Backend exige anexo em toda solicitacao de conclusao, independente de platina.
          platinumProofId: uploadedProofId,
          coop: false,
          coopPlayers: null,
          hypeParticipation: false,
          hypeCompletedBonus: false,
          rotativeList: false,
          notes: `Conclusao enviada via obrigacao (${payload.outcome}).`,
        });
      }

      return api.post(`/obligations/${payload.obligationId}/submit-review`, {
        outcome: payload.outcome,
        partialHours: payload.outcome === 'PARTIAL' ? Number(payload.hoursPlayed) : null,
      });
    },
    onSuccess: () => {
      setReviewModal(null);
      setAviso({ tipo: 'sucesso', texto: 'Enviado para revisão! Um admin vai conferir.' });
      refresh();
    },
    onError: (error) =>
      setReviewModal((prev) => (prev ? { ...prev, erro: error.response?.data?.message || error.message || 'Erro ao enviar revisão.' } : prev)),
  });

  const approveReviewMutation = useMutation({
    mutationFn: async (obligationId) => api.post(`/obligations/${obligationId}/approve-review`),
    onSuccess: refresh,
    onError: avisarErro,
  });

  const rejectReviewMutation = useMutation({
    mutationFn: async (obligationId) => api.post(`/obligations/${obligationId}/reject-review`),
    onSuccess: refresh,
    onError: avisarErro,
  });

  const availableUsers = useMemo(
    () => users.filter((candidate) => candidate.id !== user?.id),
    [users, user?.id]
  );

  const items = overview?.items || [];
  const disponiveis = overview?.availableAssignments ?? 0;
  const assignedByMe = useMemo(() => items.filter((item) => item.assignedByUserId === user?.id), [items, user?.id]);
  const assignedToMe = useMemo(() => items.filter((item) => item.assignedToUserId === user?.id), [items, user?.id]);
  const pendingReviews = useMemo(() => items.filter((item) => EM_REVISAO.includes(item.status)), [items]);

  const gameSuggestions = useMemo(() => {
    const normalizedQuery = form.gameName.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    return games
      .filter((game) => game.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 6);
  }, [games, form.gameName]);

  const matchingGame = games.find((game) => game.name.trim().toLowerCase() === form.gameName.trim().toLowerCase());
  const { sugestoesSteam, jogoSteamSelecionado, escolherSugestaoSteam, limparSelecaoSteam, steamAppIdParaCadastro } =
    useSugestoesSteam({
      gameName: form.gameName,
      games,
      ativo: !matchingGame,
      idsJaSugeridos: gameSuggestions.map((game) => game.id),
    });

  const handleSelectSteamSuggestion = (steamGame) => {
    const existingGame = escolherSugestaoSteam(steamGame);
    setForm((prev) => ({ ...prev, gameName: existingGame ? existingGame.name : steamGame.name }));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    setAviso(null);
    if (!form.assignedToUserId) {
      setAviso({ tipo: 'erro', texto: 'Escolha para quem vai a obrigação.' });
      return;
    }
    if (!form.gameName.trim()) {
      setAviso({ tipo: 'erro', texto: 'Preencha o nome do jogo.' });
      return;
    }
    createMutation.mutate();
  };

  // Abre na aba de revisoes quando ha algo esperando a equipe
  useEffect(() => {
    if (isAdmin && pendingReviews.length > 0 && assignedToMe.every((item) => item.status !== 'PENDING')) {
      setAba((atual) => (atual === 'recebidas' ? 'revisoes' : atual));
    }
    // So na primeira carga: depois quem escolhe a aba e o usuario
  }, [isLoading]);

  const openReviewModal = (item, outcome) => {
    const completedAt = new Date().toISOString().slice(0, 10);
    // "Em dia" ja vem marcado ou desmarcado pelo ano de lancamento, se o catalogo souber o ano.
    const jogo = games.find((game) => game.id === item.gameId);
    setReviewModal({
      obligationId: item.obligationId,
      gameId: item.gameId,
      gameName: item.gameName,
      anoLancamento: jogo?.releaseYear ?? null,
      origemAnoLancamento: jogo?.steamAppId ? 'Steam' : 'catálogo',
      steamAppId: jogo?.steamAppId ?? null,
      outcome,
      completedAt,
      hoursPlayed: '',
      firstTimeEver: false,
      completedInReleaseYear: emDiaPeloLancamento(jogo?.releaseYear, completedAt) ?? false,
      platinum: false,
      proofFile: null,
      erro: null,
    });
  };

  const handleSubmitReviewWithModal = (event) => {
    event.preventDefault();
    if (!reviewModal) return;
    const erro = (texto) => setReviewModal((prev) => ({ ...prev, erro: texto }));

    if (!reviewModal.completedAt) {
      erro('Informe a data.');
      return;
    }

    if (reviewModal.hoursPlayed === '' || Number(reviewModal.hoursPlayed) < 0) {
      erro('Informe as horas jogadas.');
      return;
    }

    if (!reviewModal.proofFile) {
      erro('Toda solicitação exige uma imagem anexada.');
      return;
    }

    submitReviewMutation.mutate(reviewModal);
  };
  const isPartialReview = reviewModal?.outcome === 'PARTIAL';

  // "Platina" pelas conquistas do jogador na Steam, so na conclusao (jogo finalizado).
  const platinaObrigacao = usePlatinaSteam(reviewModal && !isPartialReview ? reviewModal.steamAppId : null);
  const platinaObrigacaoSugerida = platinaObrigacao?.suggestPlatinum ?? null;
  useEffect(() => {
    if (platinaObrigacaoSugerida === null) {
      return;
    }
    setReviewModal((prev) => (prev && prev.platinum !== platinaObrigacaoSugerida ? { ...prev, platinum: platinaObrigacaoSugerida } : prev));
    // Reaplica so ao abrir outra obrigacao: se o jogador mexer no botao depois, vale a escolha dele.
  }, [platinaObrigacaoSugerida, reviewModal?.obligationId]);

  // Miniatura do anexo da janela de revisao
  const previewUrl = useMemo(() => (reviewModal?.proofFile ? URL.createObjectURL(reviewModal.proofFile) : null), [reviewModal?.proofFile]);
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  const confirmar = (mensagem, acao) => {
    if (window.confirm(mensagem)) {
      setAviso(null);
      acao();
    }
  };

  if (isLoading) {
    return <div className="text-slate-600 dark:text-slate-300">Carregando obrigações...</div>;
  }

  if (error) {
    return <div className="text-red-600">Erro ao carregar obrigações: {error.message}</div>;
  }

  /** Cartao de uma obrigacao. `papel`: 'recebida' | 'enviada' | 'revisao' */
  const renderCartao = (item, papel) => {
    const finalizada = FINALIZADAS.includes(item.status);
    const outraPessoa = papel === 'recebida' ? `De ${item.assignedByDisplayName}` : papel === 'enviada' ? `Para ${item.assignedToDisplayName}` : `${item.assignedByDisplayName} → ${item.assignedToDisplayName}`;

    let acoes = null;
    if (papel === 'recebida' && item.status === 'PENDING') {
      acoes = (
        <>
          <button type="button" onClick={() => { setAviso(null); acceptMutation.mutate(item.obligationId); }} disabled={acceptMutation.isPending} className={botaoAprovar}>
            <Check className="h-4 w-4" aria-hidden="true" /> Aceitar
          </button>
          <button
            type="button"
            onClick={() => confirmar(`Recusar a obrigação de "${item.gameName}"? Você perde 3 pontos.`, () => refuseMutation.mutate(item.obligationId))}
            disabled={refuseMutation.isPending}
            className={botaoPerigo}
          >
            <X className="h-4 w-4" aria-hidden="true" /> Recusar (−3)
          </button>
        </>
      );
    } else if (papel === 'recebida' && item.status === 'ACCEPTED') {
      acoes = (
        <>
          <button type="button" onClick={() => openReviewModal(item, 'COMPLETED')} className={botaoPrincipal}>
            <Flag className="h-4 w-4" aria-hidden="true" /> Terminei o jogo
          </button>
          <button type="button" onClick={() => openReviewModal(item, 'PARTIAL')} className={botaoSecundario}>
            <Send className="h-4 w-4" aria-hidden="true" /> Enviar 25%
          </button>
          <button
            type="button"
            onClick={() => confirmar(`Desistir da obrigação de "${item.gameName}"? Você perde 3 pontos.`, () => cancelMutation.mutate(item.obligationId))}
            disabled={cancelMutation.isPending}
            className={botaoPerigo}
          >
            <X className="h-4 w-4" aria-hidden="true" /> Desistir (−3)
          </button>
        </>
      );
    } else if (papel === 'enviada' && !finalizada) {
      acoes = (
        <button
          type="button"
          onClick={() => confirmar(`Cancelar a obrigação de "${item.gameName}" para ${item.assignedToDisplayName}? O slot volta para você.`, () => cancelMutation.mutate(item.obligationId))}
          disabled={cancelMutation.isPending}
          className={botaoSecundario}
        >
          <Undo2 className="h-4 w-4" aria-hidden="true" /> Cancelar e recuperar slot
        </button>
      );
    } else if (papel === 'revisao') {
      acoes = (
        <>
          {item.status === 'REVIEW_PENDING_COMPLETION' ? (
            <Link to="/requests" className={botaoAprovar}>
              <ClipboardList className="h-4 w-4" aria-hidden="true" /> Aprovar em Solicitações
            </Link>
          ) : (
            <button type="button" onClick={() => { setAviso(null); approveReviewMutation.mutate(item.obligationId); }} disabled={approveReviewMutation.isPending} className={botaoAprovar}>
              <Check className="h-4 w-4" aria-hidden="true" /> Aprovar 25%
            </button>
          )}
          <button type="button" onClick={() => { setAviso(null); rejectReviewMutation.mutate(item.obligationId); }} disabled={rejectReviewMutation.isPending} className={botaoPerigo}>
            <X className="h-4 w-4" aria-hidden="true" /> Rejeitar
          </button>
        </>
      );
    }

    return (
      <div
        key={`${papel}-${item.obligationId}`}
        className={`flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900 ${finalizada ? 'opacity-75' : ''}`}
      >
        <CapaJogo game={gamesById.get(item.gameId)} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="mr-1 text-lg font-bold leading-tight text-slate-900 dark:text-slate-100">{item.gameName}</h3>
            <EtiquetaStatus status={item.status} />
            <EtiquetaPontos item={item} />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <strong className="font-semibold text-slate-800 dark:text-slate-100">{outraPessoa}</strong>
            <span className="text-slate-300 dark:text-slate-600"> · </span>
            enviada em {formatarData(item.createdAt)}
            {item.resolvedAt && (
              <>
                <span className="text-slate-300 dark:text-slate-600"> · </span>
                encerrada em {formatarData(item.resolvedAt)}
              </>
            )}
            {item.partialHours && (
              <>
                <span className="text-slate-300 dark:text-slate-600"> · </span>
                {String(item.partialHours).replace('.', ',')}h informadas
              </>
            )}
          </p>
          {papel === 'revisao' && item.status === 'REVIEW_PENDING_COMPLETION' && (
            <p className="text-xs text-indigo-700 dark:text-indigo-300">Jogo finalizado é aprovado em Solicitações, para somar todos os pontos de uma vez.</p>
          )}
        </div>
        {acoes && <div className="flex shrink-0 flex-wrap gap-2 sm:max-w-[16rem] sm:justify-end">{acoes}</div>}
      </div>
    );
  };

  /** Lista de uma aba: primeiro o que esta em andamento, depois o historico. */
  const renderLista = (lista, papel, vazio) => {
    const ativas = lista.filter((item) => !FINALIZADAS.includes(item.status));
    const historico = lista.filter((item) => FINALIZADAS.includes(item.status));
    if (lista.length === 0) {
      return (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">{vazio}</div>
      );
    }
    return (
      <div className="space-y-5">
        {ativas.length > 0 && <div className="space-y-2.5">{ativas.map((item) => renderCartao(item, papel))}</div>}
        {historico.length > 0 && (
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Histórico</h3>
            {historico.map((item) => renderCartao(item, papel))}
          </div>
        )}
      </div>
    );
  };

  const aguardandoResposta = assignedToMe.filter((item) => item.status === 'PENDING').length;
  const ABAS = [
    { id: 'recebidas', rotulo: 'Recebidas', total: assignedToMe.length, alerta: aguardandoResposta },
    { id: 'enviadas', rotulo: 'Enviadas', total: assignedByMe.length, alerta: 0 },
    ...(isAdmin ? [{ id: 'revisoes', rotulo: 'Revisões', total: pendingReviews.length, alerta: pendingReviews.length }] : []),
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Obrigações</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">Mande um amigo jogar algo. A cada 20 pontos você libera 1 obrigação.</p>
      </div>

      {aviso && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            aviso.tipo === 'sucesso'
              ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-500/40 dark:bg-green-950/40 dark:text-green-300'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300'
          }`}
        >
          {aviso.texto}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Nova obrigacao */}
        <form
          onSubmit={handleCreate}
          autoComplete="off"
          className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Nova obrigação</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                disponiveis > 0 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {disponiveis === 1 ? '1 disponível' : `${disponiveis} disponíveis`}
            </span>
          </div>

          <div>
            <Rotulo>Para quem</Rotulo>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Jogador que vai receber">
              {availableUsers.map((candidate) => {
                const escolhido = form.assignedToUserId === candidate.id;
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    role="radio"
                    aria-checked={escolhido}
                    onClick={() => setForm((prev) => ({ ...prev, assignedToUserId: candidate.id }))}
                    className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
                      escolhido
                        ? 'border-primary bg-primary text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-primary/60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
                    }`}
                  >
                    {escolhido ? '✓ ' : ''}
                    {candidate.displayName}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="relative block">
            <Rotulo>Jogo</Rotulo>
            <input
              type="text"
              value={form.gameName}
              onChange={(e) => setForm((prev) => ({ ...prev, gameName: e.target.value }))}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className={campoClasse}
              placeholder="Ex: Elden Ring"
              required
            />
            {(gameSuggestions.length > 0 || sugestoesSteam.length > 0) && !jogoSteamSelecionado && !matchingGame && (
              <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                {gameSuggestions.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => {
                      limparSelecaoSteam();
                      setForm((prev) => ({ ...prev, gameName: game.name }));
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {game.name}
                  </button>
                ))}
                <SugestoesSteam sugestoes={sugestoesSteam} onEscolher={handleSelectSteamSuggestion} />
              </div>
            )}
          </label>

          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {matchingGame ? (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" aria-hidden="true" />
                <span className="text-green-700 dark:text-green-400">Jogo já cadastrado: {matchingGame.name}</span>
              </>
            ) : (
              <>
                <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
                {!form.gameName.trim()
                  ? 'Digite o nome: o sistema procura no site e na Steam.'
                  : jogoSteamSelecionado
                    ? 'Jogo da Steam: será cadastrado com o nome e o ano oficiais.'
                    : 'Jogo novo: será cadastrado ao enviar. Se estiver na Steam, escolha a sugestão.'}
              </>
            )}
          </p>

          <button
            type="submit"
            disabled={createMutation.isPending || disponiveis <= 0}
            className="w-full rounded-xl bg-primary py-2.5 font-bold text-white transition hover:bg-secondary disabled:opacity-50"
          >
            {createMutation.isPending ? 'Enviando...' : disponiveis > 0 ? 'Enviar obrigação' : 'Junte mais pontos para liberar'}
          </button>
        </form>

        {/* Regras */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Como funciona</h2>
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
            Quem recebe aceita ou recusa. Depois de aceitar, envia o jogo terminado ou 25% dele para revisão.
          </p>
          <ul className="space-y-2.5">
            {REGRAS.map((regra) => (
              <li key={regra.pontos} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                <span className={`w-8 shrink-0 text-right font-extrabold tabular-nums ${regra.cor}`}>{regra.pontos}</span>
                <span>{regra.texto}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Abas */}
      <div className="inline-flex flex-wrap rounded-full bg-indigo-50 p-1 dark:bg-slate-800" role="tablist">
        {ABAS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={aba === item.id}
            onClick={() => setAba(item.id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              aba === item.id
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {item.rotulo}
            {item.alerta > 0 ? (
              <span className="min-w-5 rounded-full bg-amber-500 px-1.5 text-xs font-bold leading-5 text-white">{item.alerta}</span>
            ) : (
              <span className="text-slate-400">({item.total})</span>
            )}
          </button>
        ))}
      </div>

      {aba === 'recebidas' && renderLista(assignedToMe, 'recebida', 'Ninguém te mandou obrigação ainda. Aproveite enquanto dura.')}
      {aba === 'enviadas' && renderLista(assignedByMe, 'enviada', 'Você ainda não enviou obrigações nesta edição.')}
      {aba === 'revisoes' && isAdmin && renderLista(pendingReviews, 'revisao', 'Nenhuma revisão pendente no momento.')}

      {reviewModal && (
        <JanelaFoco
          titulo={isPartialReview ? 'Enviar 25% para revisão' : 'Enviar jogo terminado'}
          subtitulo={reviewModal.gameName}
          largura="max-w-2xl"
          onFechar={() => setReviewModal(null)}
        >
          <form onSubmit={handleSubmitReviewWithModal} className="space-y-5">
            {/* 25% ou finalizado */}
            <div className="inline-flex rounded-full bg-indigo-50 p-1 dark:bg-slate-800" role="radiogroup" aria-label="O que você está enviando">
              {[
                { valor: 'COMPLETED', rotulo: 'Jogo terminado' },
                { valor: 'PARTIAL', rotulo: '25% do jogo' },
              ].map((opcao) => (
                <button
                  key={opcao.valor}
                  type="button"
                  role="radio"
                  aria-checked={reviewModal.outcome === opcao.valor}
                  onClick={() =>
                    setReviewModal((prev) => ({
                      ...prev,
                      outcome: opcao.valor,
                      ...(opcao.valor === 'PARTIAL' ? { firstTimeEver: false, platinum: false } : {}),
                    }))
                  }
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    reviewModal.outcome === opcao.valor
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {opcao.rotulo}
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <Rotulo>{isPartialReview ? 'Data' : 'Concluído em'}</Rotulo>
                <input
                  type="date"
                  value={reviewModal.completedAt}
                  onChange={(e) => setReviewModal((prev) => ({ ...prev, completedAt: e.target.value }))}
                  className={campoClasse}
                  required
                />
              </label>
              <label className="block">
                <Rotulo>Horas jogadas</Rotulo>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  inputMode="decimal"
                  value={reviewModal.hoursPlayed}
                  onChange={(e) => setReviewModal((prev) => ({ ...prev, hoursPlayed: e.target.value }))}
                  className={`${campoClasse} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                  placeholder="Ex: 35.5"
                  required
                />
              </label>
            </div>

            <div>
              <Rotulo>Bônus</Rotulo>
              <div className="grid gap-2 sm:grid-cols-2">
                {!isPartialReview && (
                  <OpcaoBonus
                    regra="FIRST_EXPERIENCE"
                    titulo="Primeira experiência"
                    dica="Primeira vez na vida fechando este jogo"
                    checked={reviewModal.firstTimeEver}
                    onChange={(e) => setReviewModal((prev) => ({ ...prev, firstTimeEver: e.target.checked }))}
                  />
                )}
                {!isPartialReview && (
                  <OpcaoBonus
                    regra="PLATINUM"
                    titulo="Platina (100%)"
                    dica={dicaPlatina(platinaObrigacao, reviewModal.platinum)}
                    checked={reviewModal.platinum}
                    onChange={(e) => setReviewModal((prev) => ({ ...prev, platinum: e.target.checked }))}
                  />
                )}
                <OpcaoBonus
                  regra="IN_RELEASE_YEAR"
                  titulo="Em dia"
                  dica={dicaEmDia({
                    anoLancamento: reviewModal.anoLancamento,
                    origem: reviewModal.origemAnoLancamento,
                    sugestao: emDiaPeloLancamento(reviewModal.anoLancamento, reviewModal.completedAt),
                    marcado: reviewModal.completedInReleaseYear,
                  })}
                  checked={reviewModal.completedInReleaseYear}
                  onChange={(e) => setReviewModal((prev) => ({ ...prev, completedInReleaseYear: e.target.checked }))}
                />
              </div>
            </div>

            <div>
              <Rotulo>Comprovante</Rotulo>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 p-3 transition hover:border-primary hover:bg-primary/5 dark:border-slate-700">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setReviewModal((prev) => ({ ...prev, proofFile: e.target.files?.[0] || null, erro: null }))}
                  className="sr-only"
                />
                {previewUrl ? (
                  <img src={previewUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ImagePlus className="h-6 w-6" aria-hidden="true" />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                    {reviewModal.proofFile ? reviewModal.proofFile.name : 'Clique para escolher uma imagem'}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {reviewModal.proofFile ? 'Clique para trocar' : isPartialReview ? 'Print mostrando o progresso no jogo' : 'Print da tela final, conquista ou platina'}
                  </span>
                </span>
              </label>
            </div>

            {reviewModal.erro && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300">
                {reviewModal.erro}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end dark:border-slate-800">
              <button type="button" onClick={() => setReviewModal(null)} className={`${botaoSecundario} px-5 py-2.5`}>
                Cancelar
              </button>
              <button type="submit" disabled={submitReviewMutation.isPending} className={`${botaoPrincipal} px-6 py-2.5`}>
                {submitReviewMutation.isPending ? 'Enviando...' : 'Enviar para revisão'}
              </button>
            </div>
          </form>
        </JanelaFoco>
      )}
    </div>
  );
}
