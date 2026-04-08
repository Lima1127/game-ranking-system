import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ImagePreviewModal from '../components/ImagePreviewModal';

function statusClasses(status) {
  if (status === 'APPROVED') return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
  if (status === 'CANCELLED') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
  return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
}

const platinumBadgeClass =
  'inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#432200] border border-[#8da8bf] bg-gradient-to-r from-[#fff6d8] via-[#d5f2ff] to-[#8fd9ff] dark:text-[#fff6d8] dark:border-[#163a56] dark:bg-gradient-to-r dark:from-[#1f2b4b] dark:via-[#1d5d88] dark:to-[#2fc7ff]';

export default function RequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [previewImage, setPreviewImage] = useState(null);
  const isAdmin = user?.role === 'ADMIN';
  const buildProofUrl = (proofId) => `${api.defaults.baseURL}/uploads/proofs/${proofId}`;

  const { data: submissions = [], isLoading, error } = useQuery({
    queryKey: ['completion-submissions'],
    queryFn: async () => {
      const response = await api.get('/completions/submissions', {
        headers: { 'X-User-Id': user.id },
      });
      return response.data;
    },
    enabled: Boolean(user?.id),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['completion-submissions'] });
    queryClient.invalidateQueries({ queryKey: ['completion-requests'] });
    queryClient.invalidateQueries({ queryKey: ['completion-update-requests'] });
    queryClient.invalidateQueries({ queryKey: ['ranking'] });
    queryClient.invalidateQueries({ queryKey: ['ranking-completions'] });
    queryClient.invalidateQueries({ queryKey: ['admin-completions'] });
    queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
  };

  const approveMutation = useMutation({
    mutationFn: async ({ kind, submissionId }) =>
      api.post(`/completions/submissions/${kind}/${submissionId}/approve`, null, {
        headers: { 'X-User-Id': user.id },
      }),
    onSuccess: refresh,
    onError: (error) => alert(error.response?.data?.message || error.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ kind, submissionId }) =>
      api.post(`/completions/submissions/${kind}/${submissionId}/cancel`, null, {
        headers: { 'X-User-Id': user.id },
      }),
    onSuccess: refresh,
    onError: (error) => alert(error.response?.data?.message || error.message),
  });

  if (isLoading) {
    return <div className="text-gray-600 dark:text-slate-300">Carregando solicitacoes...</div>;
  }

  if (error) {
    return <div className="text-red-600">Erro ao carregar solicitacoes: {error.message}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Solicitacoes</h1>
        <p className="text-gray-600 dark:text-slate-300">
          {isAdmin
            ? 'Voce pode revisar, editar, aprovar ou cancelar a fila unificada de solicitacoes.'
            : 'Aqui ficam suas solicitacoes e atualizacoes. Enquanto estiverem pendentes, voce pode editar ou cancelar.'}
        </p>
      </div>

      {submissions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow p-8 text-gray-600 dark:text-slate-300 border border-gray-100 dark:border-slate-800">
          Nenhuma solicitacao encontrada.
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => {
            const isUpdate = submission.kind === 'UPDATE_COMPLETION';
            const canCancel = submission.status === 'PENDING' && (submission.userId === user.id || isAdmin);
            const canApprove = submission.status === 'PENDING' && isAdmin;
            const canEdit = submission.editable;
            const canRequestUpdate = submission.kind === 'NEW_COMPLETION' && submission.status === 'APPROVED' && submission.userId === user.id;

            return (
              <div key={`${submission.kind}-${submission.submissionId}`} className="bg-white dark:bg-slate-900 rounded-2xl shadow p-6 border border-gray-100 dark:border-slate-800">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{submission.gameName}</h2>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${statusClasses(submission.status)}`}>
                        {submission.status}
                      </span>
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {isUpdate ? 'Atualizacao' : 'Novo registro'}
                      </span>
                      {submission.platinum && <span className={platinumBadgeClass}>Platina</span>}
                    </div>

                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      <strong>Jogador:</strong> {submission.userDisplayName}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      <strong>Data:</strong> {submission.completedAt} · <strong>Horas:</strong> {submission.hoursPlayed}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      <strong>Enviado em:</strong> {submission.createdAt}
                    </div>
                    {isUpdate && (
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        <strong>Registro oficial relacionado:</strong> {submission.completionId}
                      </div>
                    )}
                    {submission.proofId && (
                      <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Anexo enviado</div>
                        {submission.proofContentType?.startsWith('image/') && (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewImage({
                                src: buildProofUrl(submission.proofId),
                                alt: `Anexo de ${submission.gameName}`,
                              })
                            }
                            className="inline-block"
                          >
                            <img
                              src={buildProofUrl(submission.proofId)}
                              alt={`Anexo de ${submission.gameName}`}
                              className="max-h-56 w-auto rounded-lg border border-slate-200 dark:border-slate-700 object-contain bg-white dark:bg-slate-900 cursor-zoom-in"
                            />
                          </button>
                        )}
                        <a
                          href={buildProofUrl(submission.proofId)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
                        >
                          Abrir anexo
                        </a>
                      </div>
                    )}
                    {submission.approvedAt && (
                      <div className="text-sm text-green-700 dark:text-green-300">
                        <strong>Aprovado em:</strong> {submission.approvedAt}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      {canEdit && (
                        <Link
                          to={`/requests/${submission.kind}/${submission.submissionId}/edit`}
                          className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-secondary"
                        >
                          Editar solicitacao
                        </Link>
                      )}
                      {canRequestUpdate && (
                        <button
                          type="button"
                          onClick={() => navigate(`/completion/${submission.completionId}/update`)}
                          className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-secondary"
                        >
                          Solicitar atualizacao
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {canApprove && (
                      <button
                        type="button"
                        onClick={() => approveMutation.mutate({ kind: submission.kind, submissionId: submission.submissionId })}
                        disabled={approveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50"
                      >
                        Aprovar
                      </button>
                    )}
                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => cancelMutation.mutate({ kind: submission.kind, submissionId: submission.submissionId })}
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

      <ImagePreviewModal
        isOpen={Boolean(previewImage)}
        imageSrc={previewImage?.src}
        imageAlt={previewImage?.alt}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}
