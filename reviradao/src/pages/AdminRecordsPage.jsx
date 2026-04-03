import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function StatusBadge({ status }) {
  const styles = {
    APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  );
}

const platinumBadgeClass =
  'inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#432200] border border-[#8da8bf] bg-gradient-to-r from-[#fff6d8] via-[#d5f2ff] to-[#8fd9ff] dark:text-[#fff6d8] dark:border-[#163a56] dark:bg-gradient-to-r dark:from-[#1f2b4b] dark:via-[#1d5d88] dark:to-[#2fc7ff]';

function AdminCompletionCard({ item, onDelete, isPending, proofUrl }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">{item.gameName}</h3>
            <StatusBadge status={item.status} />
            {item.platinum && (
              <span className={platinumBadgeClass}>
                Platina
              </span>
            )}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            <strong>Jogador:</strong> {item.userDisplayName}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            <strong>Concluido em:</strong> {item.completedAt} - <strong>Horas:</strong> {item.hoursPlayed}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-300">
            <strong>Enviado em:</strong> {item.createdAt}
          </div>
          {item.status === 'APPROVED' && (
            <div className="text-sm text-green-700">
              <strong>Pontos atuais:</strong> {item.awardedPoints}
            </div>
          )}
          {item.proofId && (
            <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Anexo</div>
              {item.proofContentType?.startsWith('image/') && (
                <img
                  src={proofUrl}
                  alt={`Anexo de ${item.gameName}`}
                  className="max-h-52 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 object-contain"
                />
              )}
              <a
                href={proofUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
              >
                Abrir anexo
              </a>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onDelete}
          disabled={isPending}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
        >
          Excluir
        </button>
      </div>
    </div>
  );
}

export default function AdminRecordsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['admin-completions'],
    queryFn: async () => {
      const response = await api.get('/admin/completions', {
        headers: { 'X-User-Id': user.id },
      });
      return response.data;
    },
    enabled: Boolean(user?.id && user?.role === 'ADMIN'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (completionId) =>
      api.delete(`/admin/completions/${completionId}`, {
        headers: { 'X-User-Id': user.id },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-completions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['completion-requests'] });
      queryClient.invalidateQueries({ queryKey: ['ranking'] });
      queryClient.invalidateQueries({ queryKey: ['ranking-completions'] });
    },
    onError: (error) => alert(error.response?.data?.message || error.message),
  });

  const recalculateMutation = useMutation({
    mutationFn: async () =>
      api.post('/admin/recalculate', null, {
        headers: { 'X-User-Id': user.id },
      }),
    onSuccess: (response) => {
      const data = response.data;
      queryClient.invalidateQueries({ queryKey: ['admin-completions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['completion-requests'] });
      queryClient.invalidateQueries({ queryKey: ['ranking'] });
      queryClient.invalidateQueries({ queryKey: ['ranking-completions'] });
      alert(
        `Recálculo concluído. Conclusões processadas: ${data.processedCompletions}. Eventos regenerados: ${data.regeneratedScoreEvents}.`
      );
    },
    onError: (error) => alert(error.response?.data?.message || error.message),
  });

  const approvedItems = items.filter((item) => item.status === 'APPROVED');
  const requestHistory = items.filter((item) => item.status !== 'APPROVED');

  const handleDelete = (item) => {
    const message =
      item.status === 'APPROVED'
        ? `Excluir o registro aprovado de "${item.gameName}" e remover seus pontos do ranking?`
        : `Excluir do historico a solicitacao de "${item.gameName}"?`;

    if (window.confirm(message)) {
      deleteMutation.mutate(item.completionId);
    }
  };

  if (user?.role !== 'ADMIN') {
    return <div className="text-red-600">Acesso restrito a administradores.</div>;
  }

  if (isLoading) {
    return <div className="text-slate-600 dark:text-slate-300">Carregando painel administrativo...</div>;
  }

  if (error) {
    return <div className="text-red-600">Erro ao carregar registros: {error.message}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <div>
        <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 mb-2">Gestao Administrativa</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Aqui voce pode excluir registros aprovados e limpar o historico de solicitacoes pendentes ou canceladas.
        </p>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  'Recalcular a edicao ativa vai apagar e recriar todos os eventos de pontuacao das conclusoes aprovadas. Deseja continuar?'
                )
              ) {
                recalculateMutation.mutate();
              }
            }}
            disabled={recalculateMutation.isPending}
            className="rounded-xl bg-slate-900 dark:bg-slate-700 px-5 py-3 text-sm font-bold text-white hover:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50"
          >
            {recalculateMutation.isPending ? 'Recalculando...' : 'Recalcular pontos da edicao'}
          </button>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Registros aprovados</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Excluir daqui remove os pontos atuais do ranking para aquela conclusao.</p>
        </div>

        {approvedItems.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 text-slate-500 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-800">Nenhum registro aprovado encontrado.</div>
        ) : (
          approvedItems.map((item) => (
            <AdminCompletionCard
              key={item.completionId}
              item={item}
              proofUrl={`${api.defaults.baseURL}/uploads/proofs/${item.proofId}`}
              isPending={deleteMutation.isPending}
              onDelete={() => handleDelete(item)}
            />
          ))
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Historico de solicitacoes</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Use esta area para limpar solicitacoes pendentes ou canceladas que nao fazem mais sentido manter.</p>
        </div>

        {requestHistory.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 text-slate-500 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-800">Nenhuma solicitacao historica encontrada.</div>
        ) : (
          requestHistory.map((item) => (
            <AdminCompletionCard
              key={item.completionId}
              item={item}
              proofUrl={`${api.defaults.baseURL}/uploads/proofs/${item.proofId}`}
              isPending={deleteMutation.isPending}
              onDelete={() => handleDelete(item)}
            />
          ))
        )}
      </section>
    </div>
  );
}
