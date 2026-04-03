import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function statusClasses(status) {
  if (status === 'COMPLETED') return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
  if (status === 'REFUSED' || status === 'CANCELLED') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
  if (status === 'PARTIAL') return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300';
  if (status?.startsWith('REVIEW_PENDING')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
  if (status === 'ACCEPTED') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
  return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
}

function statusLabel(status) {
  if (status === 'REVIEW_PENDING_PARTIAL') return 'AGUARDANDO REVISAO 25%';
  if (status === 'REVIEW_PENDING_COMPLETION') return 'AGUARDANDO REVISAO FINALIZADO';
  if (status === 'CANCELLED') return 'CANCELADO';
  return status;
}

export default function ObligationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';
  const [form, setForm] = useState({
    assignedToUserId: '',
    gameName: '',
  });
  const [resolutionById, setResolutionById] = useState({});

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
          releaseYear: new Date().getFullYear(),
          estimatedHoursMain: null,
          estimatedHoursPlatinum: null,
          genres: ['Nao informado'],
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
      setForm({ assignedToUserId: '', gameName: '' });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      refresh();
    },
    onError: (error) => alert(error.response?.data?.message || error.message),
  });

  const acceptMutation = useMutation({
    mutationFn: async (obligationId) => api.post(`/obligations/${obligationId}/accept`),
    onSuccess: refresh,
    onError: (error) => alert(error.response?.data?.message || error.message),
  });

  const refuseMutation = useMutation({
    mutationFn: async (obligationId) => api.post(`/obligations/${obligationId}/refuse`),
    onSuccess: refresh,
    onError: (error) => alert(error.response?.data?.message || error.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async (obligationId) => api.post(`/obligations/${obligationId}/cancel`),
    onSuccess: refresh,
    onError: (error) => alert(error.response?.data?.message || error.message),
  });

  const submitReviewMutation = useMutation({
    mutationFn: async ({ obligationId, outcome }) =>
      api.post(`/obligations/${obligationId}/submit-review`, {
        outcome,
        partialHours: null,
      }),
    onSuccess: () => {
      setResolutionById({});
      refresh();
    },
    onError: (error) => alert(error.response?.data?.message || error.message),
  });

  const approveReviewMutation = useMutation({
    mutationFn: async (obligationId) => api.post(`/obligations/${obligationId}/approve-review`),
    onSuccess: refresh,
    onError: (error) => alert(error.response?.data?.message || error.message),
  });

  const rejectReviewMutation = useMutation({
    mutationFn: async (obligationId) => api.post(`/obligations/${obligationId}/reject-review`),
    onSuccess: refresh,
    onError: (error) => alert(error.response?.data?.message || error.message),
  });

  const availableUsers = useMemo(
    () => users.filter((candidate) => candidate.id !== user?.id),
    [users, user?.id]
  );

  const items = overview?.items || [];
  const assignedByMe = useMemo(
    () => items.filter((item) => item.assignedByUserId === user?.id),
    [items, user?.id]
  );

  const assignedToMe = useMemo(
    () => items.filter((item) => item.assignedToUserId === user?.id),
    [items, user?.id]
  );

  const pendingReviews = useMemo(
    () => items.filter((item) => item.status === 'REVIEW_PENDING_PARTIAL' || item.status === 'REVIEW_PENDING_COMPLETION'),
    [items]
  );

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

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.gameName.trim()) {
      alert('Preencha o nome do jogo.');
      return;
    }
    createMutation.mutate();
  };

  const updateResolution = (obligationId, patch) => {
    setResolutionById((prev) => ({
      ...prev,
      [obligationId]: {
        outcome: 'PARTIAL',
        ...prev[obligationId],
        ...patch,
      },
    }));
  };

  if (isLoading) {
    return <div className="text-slate-600 dark:text-slate-300">Carregando obrigacoes...</div>;
  }

  if (error) {
    return <div className="text-red-600">Erro ao carregar obrigacoes: {error.message}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100">Obrigacoes</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          A cada 20 pontos, voce libera 1 obrigacao. O alvo pode aceitar ou recusar. Se aceitar, depois envia 25% ou jogo finalizado para revisao.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Nova obrigacao</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Obrigacoes disponiveis agora: <strong>{overview?.availableAssignments ?? 0}</strong>
          </p>

          <form onSubmit={handleCreate} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block font-semibold text-slate-700 dark:text-slate-200">Jogador alvo</label>
              <select
                value={form.assignedToUserId}
                onChange={(e) => setForm((prev) => ({ ...prev, assignedToUserId: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                required
              >
                <option value="">Selecione um jogador</option>
                {availableUsers.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-semibold text-slate-700 dark:text-slate-200">Jogo</label>
              <input
                type="text"
                value={form.gameName}
                onChange={(e) => setForm((prev) => ({ ...prev, gameName: e.target.value }))}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                placeholder="Ex: Elden Ring"
                required
              />
              {gameSuggestions.length > 0 && (
                <div className="mt-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                  {gameSuggestions.map((game) => (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, gameName: game.name }))}
                      className="block w-full border-b border-gray-100 dark:border-slate-700 px-4 py-2 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 last:border-b-0"
                    >
                      {game.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {form.gameName.trim()
                  ? matchingGame
                    ? <>Este jogo ja existe no sistema e sera reutilizado: <strong>{matchingGame.name}</strong></>
                    : 'Este jogo ainda nao existe no sistema. Ele sera criado automaticamente ao enviar a obrigacao.'
                  : 'Digite o nome para o sistema verificar se o jogo ja existe.'}
              </div>
            </div>

            <button
              type="submit"
              disabled={createMutation.isPending || (overview?.availableAssignments ?? 0) <= 0}
              className="w-full rounded-lg bg-primary py-3 font-bold text-white hover:bg-secondary disabled:opacity-50"
            >
              {createMutation.isPending ? 'Criando...' : 'Criar obrigacao'}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Fluxo</h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            <p>Se recusar, o alvo perde 3 pontos e o slot do emissor continua consumido.</p>
            <p>Se aceitar e desistir depois, o cancelamento do recebedor aplica a mesma penalidade de recusa e o slot segue consumido.</p>
            <p>O emissor tambem pode cancelar uma obrigacao ativa, e nesse caso o slot volta para ele sem penalidade.</p>
            <p>Depois do aceite, o alvo escolhe entre 25% ou jogo finalizado e envia para revisao.</p>
            <p>Admin aprova a revisao e o ranking e atualizado com -1 no parcial ou +3 no finalizado.</p>
          </div>
        </div>
      </div>

      {isAdmin && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Revisoes pendentes</h2>
          {pendingReviews.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              Nenhuma revisao pendente no momento.
            </div>
          ) : (
            pendingReviews.map((item) => (
              <div key={item.obligationId} className="rounded-2xl border border-slate-200 bg-white p-6 shadow dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{item.gameName}</h3>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${statusClasses(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      <strong>Jogador:</strong> {item.assignedToDisplayName} | <strong>Criada por:</strong> {item.assignedByDisplayName}
                    </p>
                    {item.partialHours && (
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        <strong>Horas informadas:</strong> {item.partialHours}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => approveReviewMutation.mutate(item.obligationId)}
                      disabled={approveReviewMutation.isPending}
                      className="rounded-lg bg-green-600 px-4 py-2 font-bold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Aprovar
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectReviewMutation.mutate(item.obligationId)}
                      disabled={rejectReviewMutation.isPending}
                      className="rounded-lg bg-slate-700 px-4 py-2 font-bold text-white hover:bg-slate-900 disabled:opacity-50"
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Obrigacoes recebidas</h2>
        {assignedToMe.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Nenhuma obrigacao recebida ainda.
          </div>
        ) : (
          assignedToMe.map((item) => {
            const isPending = item.status === 'PENDING';
            const isAccepted = item.status === 'ACCEPTED';
            const resolution = resolutionById[item.obligationId] || { outcome: 'PARTIAL' };

            return (
              <div key={item.obligationId} className="rounded-2xl border border-slate-200 bg-white p-6 shadow dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{item.gameName}</h3>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${statusClasses(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      <strong>Enviada por:</strong> {item.assignedByDisplayName}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      <strong>Penalidade:</strong> {item.penaltyPoints} | <strong>Recompensa:</strong> {item.rewardPoints}
                    </p>
                    {item.partialHours && (
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        <strong>Horas informadas:</strong> {item.partialHours}
                      </p>
                    )}
                  </div>

                  {isPending && (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => acceptMutation.mutate(item.obligationId)}
                        disabled={acceptMutation.isPending}
                        className="w-full rounded-lg bg-green-600 px-4 py-2 font-bold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Aceitar
                      </button>
                      <button
                        type="button"
                        onClick={() => refuseMutation.mutate(item.obligationId)}
                        disabled={refuseMutation.isPending}
                        className="w-full rounded-lg bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Recusar (-3)
                      </button>
                    </div>
                  )}

                  {isAccepted && (
                    <div className="w-full max-w-sm space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                          <input
                            type="radio"
                            name={`resolution-${item.obligationId}`}
                            checked={resolution.outcome === 'PARTIAL'}
                            onChange={() => updateResolution(item.obligationId, { outcome: 'PARTIAL' })}
                          />
                          25% do jogo
                        </label>
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                          <input
                            type="radio"
                            name={`resolution-${item.obligationId}`}
                            checked={resolution.outcome === 'COMPLETED'}
                            onChange={() => updateResolution(item.obligationId, { outcome: 'COMPLETED' })}
                          />
                          Jogo finalizado
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          submitReviewMutation.mutate({
                            obligationId: item.obligationId,
                            outcome: resolution.outcome,
                          })
                        }
                        disabled={submitReviewMutation.isPending}
                        className="w-full rounded-lg bg-primary px-4 py-2 font-bold text-white hover:bg-secondary disabled:opacity-50"
                      >
                        Enviar para revisao
                      </button>
                      <button
                        type="button"
                        onClick={() => cancelMutation.mutate(item.obligationId)}
                        disabled={cancelMutation.isPending}
                        className="w-full rounded-lg bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Desistir da obrigacao (-3)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Obrigacoes enviadas por mim</h2>
        {assignedByMe.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Voce ainda nao enviou obrigacoes nesta edicao.
          </div>
        ) : (
          assignedByMe.map((item) => (
            <div key={item.obligationId} className="rounded-2xl border border-slate-200 bg-white p-6 shadow dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{item.gameName}</h3>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${statusClasses(item.status)}`}>
                  {statusLabel(item.status)}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                <strong>Para:</strong> {item.assignedToDisplayName}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                <strong>Penalidade:</strong> {item.penaltyPoints} | <strong>Recompensa:</strong> {item.rewardPoints}
              </p>
              {item.partialHours && (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  <strong>Horas informadas:</strong> {item.partialHours}
                </p>
              )}
              {['PENDING', 'ACCEPTED', 'REVIEW_PENDING_PARTIAL', 'REVIEW_PENDING_COMPLETION'].includes(item.status) && (
                <button
                  type="button"
                  onClick={() => cancelMutation.mutate(item.obligationId)}
                  disabled={cancelMutation.isPending}
                  className="mt-4 rounded-lg bg-slate-700 px-4 py-2 font-bold text-white hover:bg-slate-900 disabled:opacity-50"
                >
                  Cancelar envio e recuperar slot
                </button>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
