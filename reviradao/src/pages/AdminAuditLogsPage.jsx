import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function actionLabel(actionCode) {
  const labels = {
    REQUEST_APPROVED: 'Solicitacao aprovada',
    REQUEST_CANCELLED: 'Solicitacao cancelada',
    UPDATE_REQUEST_CREATED: 'Solicitacao de atualizacao criada',
    UPDATE_REQUEST_APPROVED: 'Solicitacao de atualizacao aprovada',
    UPDATE_REQUEST_CANCELLED: 'Solicitacao de atualizacao cancelada',
    COMPLETION_DELETED: 'Registro aprovado excluido',
    REQUEST_HISTORY_DELETED: 'Historico de solicitacao excluido',
    EDITION_RECALCULATED: 'Edicao recalculada',
  };

  return labels[actionCode] || actionCode;
}

export default function AdminAuditLogsPage() {
  const { user } = useAuth();

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const response = await api.get('/admin/audit-logs', {
        headers: { 'X-User-Id': user.id },
      });
      return response.data;
    },
    enabled: Boolean(user?.id && user?.role === 'ADMIN'),
  });

  if (user?.role !== 'ADMIN') {
    return <div className="text-red-600">Acesso restrito a administradores.</div>;
  }

  if (isLoading) {
    return <div className="text-slate-600 dark:text-slate-300">Carregando logs...</div>;
  }

  if (error) {
    return <div className="text-red-600">Erro ao carregar logs: {error.message}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 mb-2">Logs Administrativos</h1>
        <p className="text-slate-600 dark:text-slate-300">Acompanhe tudo o que foi aprovado, cancelado ou excluido pelos fluxos administrativos.</p>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 text-slate-500 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-800">Nenhum log encontrado.</div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">{log.actionCode}</div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">{actionLabel(log.actionCode)}</h2>
                  <div className="text-sm text-slate-600 dark:text-slate-300">
                    <strong>Admin/ator:</strong> {log.actorDisplayName} ({log.actorRole})
                  </div>
                  {log.subjectDisplayName && (
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      <strong>Usuario afetado:</strong> {log.subjectDisplayName}
                    </div>
                  )}
                  {log.gameName && (
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      <strong>Jogo:</strong> {log.gameName}
                    </div>
                  )}
                  {log.details && <div className="text-sm text-slate-500 dark:text-slate-400">{log.details}</div>}
                </div>

                <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">{log.createdAt}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
