import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function statusClasses(status) {
  if (status === 'APPROVED') return 'bg-green-100 text-green-800';
  if (status === 'CANCELLED') return 'bg-red-100 text-red-800';
  return 'bg-amber-100 text-amber-800';
}

export default function RequestsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';
  const buildProofUrl = (proofId) => `${api.defaults.baseURL}/uploads/proofs/${proofId}`;

  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: ['completion-requests'],
    queryFn: async () => {
      const response = await api.get('/completions/requests', {
        headers: { 'X-User-Id': user.id },
      });
      return response.data;
    },
    enabled: Boolean(user?.id),
  });

  const { data: updateRequests = [], isLoading: updateLoading, error: updateError } = useQuery({
    queryKey: ['completion-update-requests'],
    queryFn: async () => {
      const response = await api.get('/completions/update-requests', {
        headers: { 'X-User-Id': user.id },
      });
      return response.data;
    },
    enabled: Boolean(user?.id),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['completion-requests'] });
    queryClient.invalidateQueries({ queryKey: ['completion-update-requests'] });
    queryClient.invalidateQueries({ queryKey: ['ranking'] });
    queryClient.invalidateQueries({ queryKey: ['ranking-completions'] });
    queryClient.invalidateQueries({ queryKey: ['admin-completions'] });
    queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
  };

  const approveMutation = useMutation({
    mutationFn: async (completionId) =>
      api.post(`/completions/${completionId}/approve`, null, {
        headers: { 'X-User-Id': user.id },
      }),
    onSuccess: refresh,
    onError: (error) => alert(error.response?.data?.message || error.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async (completionId) =>
      api.post(`/completions/${completionId}/cancel`, null, {
        headers: { 'X-User-Id': user.id },
      }),
    onSuccess: refresh,
    onError: (error) => alert(error.response?.data?.message || error.message),
  });

  const approveUpdateMutation = useMutation({
    mutationFn: async (updateRequestId) =>
      api.post(`/completions/update-requests/${updateRequestId}/approve`, null, {
        headers: { 'X-User-Id': user.id },
      }),
    onSuccess: refresh,
    onError: (error) => alert(error.response?.data?.message || error.message),
  });

  const cancelUpdateMutation = useMutation({
    mutationFn: async (updateRequestId) =>
      api.post(`/completions/update-requests/${updateRequestId}/cancel`, null, {
        headers: { 'X-User-Id': user.id },
      }),
    onSuccess: refresh,
    onError: (error) => alert(error.response?.data?.message || error.message),
  });

  if (isLoading || updateLoading) {
    return <div className="text-gray-600">Carregando solicitacoes...</div>;
  }

  if (error || updateError) {
    return <div className="text-red-600">Erro ao carregar solicitacoes: {(error || updateError).message}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Solicitacoes</h1>
        <p className="text-gray-600">
          {isAdmin
            ? 'Voce pode revisar, aprovar ou cancelar solicitacoes pendentes.'
            : 'Aqui ficam suas solicitacoes enviadas. Enquanto estiverem pendentes, voce pode cancelar.'}
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-8 text-gray-600">Nenhuma solicitacao encontrada.</div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const canCancel = request.status === 'PENDING' && (request.userId === user.id || isAdmin);
            const canApprove = request.status === 'PENDING' && isAdmin;

            return (
              <div key={request.completionId} className="bg-white rounded-2xl shadow p-6 border border-gray-100">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-2xl font-bold text-slate-900">{request.gameName}</h2>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${statusClasses(request.status)}`}>
                        {request.status}
                      </span>
                      {request.platinum && (
                        <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-900">
                          Platina
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-600">
                      <strong>Jogador:</strong> {request.userDisplayName}
                    </div>
                    <div className="text-sm text-slate-600">
                      <strong>Data:</strong> {request.completedAt} · <strong>Horas:</strong> {request.hoursPlayed}
                    </div>
                    <div className="text-sm text-slate-500">
                      <strong>Enviado em:</strong> {request.createdAt}
                    </div>
                    {request.proofId && (
                      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-sm font-semibold text-slate-700">Anexo enviado</div>
                        {request.proofContentType?.startsWith('image/') && (
                          <img
                            src={buildProofUrl(request.proofId)}
                            alt={`Anexo de ${request.gameName}`}
                            className="max-h-56 w-auto rounded-lg border border-slate-200 object-contain bg-white"
                          />
                        )}
                        <a
                          href={buildProofUrl(request.proofId)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
                        >
                          Abrir anexo
                        </a>
                      </div>
                    )}
                    {request.approvedAt && (
                      <div className="text-sm text-green-700">
                        <strong>Aprovado em:</strong> {request.approvedAt}
                      </div>
                    )}
                    {request.status === 'APPROVED' && request.userId === user.id && (
                      <div>
                        <Link
                          to={`/completion/${request.completionId}/update`}
                          className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-secondary"
                        >
                          Solicitar atualizacao
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    {canApprove && (
                      <button
                        type="button"
                        onClick={() => approveMutation.mutate(request.completionId)}
                        disabled={approveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50"
                      >
                        Aprovar
                      </button>
                    )}
                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => cancelMutation.mutate(request.completionId)}
                        disabled={cancelMutation.isPending}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div>
        <h2 className="text-3xl font-bold mb-2">Atualizacoes de Registros</h2>
        <p className="text-gray-600">
          {isAdmin
            ? 'Solicitacoes de atualizacao enviadas pelos usuarios para registros ja aprovados.'
            : 'Aqui voce acompanha as atualizacoes pedidas para jogos que ja tinham sido aprovados.'}
        </p>
      </div>

      {updateRequests.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-8 text-gray-600">Nenhuma solicitacao de atualizacao encontrada.</div>
      ) : (
        <div className="space-y-4">
          {updateRequests.map((request) => {
            const canApprove = request.status === 'PENDING' && isAdmin;
            const canCancel = request.status === 'PENDING' && (request.userId === user.id || isAdmin);

            return (
              <div key={request.updateRequestId} className="bg-white rounded-2xl shadow p-6 border border-gray-100">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-2xl font-bold text-slate-900">{request.gameName}</h2>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${statusClasses(request.status)}`}>
                        {request.status}
                      </span>
                      {request.platinum && (
                        <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-900">
                          Platina
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-600">
                      <strong>Jogador:</strong> {request.userDisplayName}
                    </div>
                    <div className="text-sm text-slate-600">
                      <strong>Atualizacao para o registro:</strong> {request.completionId}
                    </div>
                    <div className="text-sm text-slate-600">
                      <strong>Data:</strong> {request.completedAt} · <strong>Horas:</strong> {request.hoursPlayed}
                    </div>
                    <div className="text-sm text-slate-500">
                      <strong>Enviado em:</strong> {request.createdAt}
                    </div>
                    {request.proofId && (
                      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-sm font-semibold text-slate-700">Novo anexo enviado</div>
                        {request.proofContentType?.startsWith('image/') && (
                          <img
                            src={buildProofUrl(request.proofId)}
                            alt={`Atualizacao de ${request.gameName}`}
                            className="max-h-56 w-auto rounded-lg border border-slate-200 object-contain bg-white"
                          />
                        )}
                        <a
                          href={buildProofUrl(request.proofId)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
                        >
                          Abrir anexo
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    {canApprove && (
                      <button
                        type="button"
                        onClick={() => approveUpdateMutation.mutate(request.updateRequestId)}
                        disabled={approveUpdateMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50"
                      >
                        Aprovar
                      </button>
                    )}
                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => cancelUpdateMutation.mutate(request.updateRequestId)}
                        disabled={cancelUpdateMutation.isPending}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
