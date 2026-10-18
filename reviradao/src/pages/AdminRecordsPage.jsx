import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calculator, ExternalLink, Search, Trash2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ImagePreviewModal from '../components/ImagePreviewModal';
import { EtiquetaStatus, EtiquetasDoJogo } from '../components/Etiquetas';
import { isStaffRole } from '../utils/roles';
import { formatarData, formatarDataHora, formatarHoras } from '../utils/formatarData';

function AdminCompletionCard({ item, onDelete, isPending, proofUrl, onPreview }) {
  const isImage = item.proofId && item.proofContentType?.startsWith('image/');
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Miniatura do anexo (clique amplia) */}
      {isImage ? (
        <button
          type="button"
          onClick={() => onPreview(proofUrl, `Anexo de ${item.gameName}`)}
          className="shrink-0 overflow-hidden rounded-xl ring-1 ring-slate-200 transition hover:ring-2 hover:ring-primary dark:ring-slate-700"
          title="Ampliar anexo"
        >
          <img src={proofUrl} alt={`Anexo de ${item.gameName}`} className="h-16 w-16 cursor-zoom-in bg-slate-100 object-cover dark:bg-slate-800" />
        </button>
      ) : (
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-400 dark:bg-slate-800">
          {item.proofId ? 'Anexo' : 'Sem anexo'}
        </span>
      )}
      {item.extraProofId && (
        <button
          type="button"
          onClick={() => onPreview(`${api.defaults.baseURL}/uploads/proofs/${item.extraProofId}`, `2ª imagem de ${item.gameName}`)}
          className="relative -ml-2 shrink-0 overflow-hidden rounded-xl ring-1 ring-slate-200 transition hover:ring-2 hover:ring-primary dark:ring-slate-700"
          title="Ampliar 2ª imagem"
        >
          <img src={`${api.defaults.baseURL}/uploads/proofs/${item.extraProofId}`} alt="" className="h-16 w-12 cursor-zoom-in bg-slate-100 object-cover dark:bg-slate-800" />
          <span className="absolute bottom-0.5 right-0.5 rounded bg-slate-900/80 px-1 text-[10px] font-bold text-white">2ª</span>
        </button>
      )}

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="mr-1 truncate text-lg font-bold text-slate-900 dark:text-slate-100">{item.gameName}</h3>
          <EtiquetaStatus status={item.status} />
          <EtiquetasDoJogo platina={item.platinum} />
          {item.status === 'APPROVED' && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary dark:bg-primary/20 dark:text-indigo-300">
              {item.awardedPoints} pts
            </span>
          )}
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          <strong className="font-semibold text-slate-800 dark:text-slate-100">{item.userDisplayName}</strong>
          <span className="text-slate-300 dark:text-slate-600"> · </span>
          Concluído em {formatarData(item.completedAt)}
          <span className="text-slate-300 dark:text-slate-600"> · </span>
          {formatarHoras(item.hoursPlayed)}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Enviado em {formatarDataHora(item.createdAt)}
          {item.approvedAt && <> · aprovado em {formatarDataHora(item.approvedAt)}</>}
          {item.cancelledAt && <> · cancelado em {formatarDataHora(item.cancelledAt)}</>}
          {item.proofId && (
            <>
              {' · '}
              <a href={proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline">
                abrir anexo <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </>
          )}
        </p>
      </div>

      <button
        type="button"
        onClick={onDelete}
        disabled={isPending}
        title="Excluir"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Excluir</span>
      </button>
    </div>
  );
}

const ABAS = [
  { id: 'aprovados', rotulo: 'Aprovados', dica: 'Excluir daqui remove os pontos dessa conclusão do ranking.' },
  { id: 'historico', rotulo: 'Pendentes e cancelados', dica: 'Limpe pedidos pendentes ou cancelados que não fazem mais sentido manter.' },
];

export default function AdminRecordsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [previewImage, setPreviewImage] = useState(null);
  const [aba, setAba] = useState('aprovados');
  const [busca, setBusca] = useState('');
  const [aviso, setAviso] = useState(null);

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['admin-completions'],
    queryFn: async () => {
      const response = await api.get('/admin/completions', {
        headers: { 'X-User-Id': user.id },
      });
      return response.data;
    },
    enabled: Boolean(user?.id && isStaffRole(user?.role)),
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
    onError: (error) => setAviso({ tipo: 'erro', texto: error.response?.data?.message || error.message }),
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
      setAviso({
        tipo: 'sucesso',
        texto: `Recálculo concluído. Conclusões processadas: ${data.processedCompletions}. Eventos de pontuação recriados: ${data.regeneratedScoreEvents}.`,
      });
    },
    onError: (error) => setAviso({ tipo: 'erro', texto: error.response?.data?.message || error.message }),
  });

  const approvedItems = items.filter((item) => item.status === 'APPROVED');
  const requestHistory = items.filter((item) => item.status !== 'APPROVED');

  const visiveis = useMemo(() => {
    const lista = aba === 'aprovados' ? approvedItems : requestHistory;
    const termo = busca.trim().toLowerCase();
    if (!termo) return lista;
    return lista.filter((item) => `${item.gameName} ${item.userDisplayName}`.toLowerCase().includes(termo));
  }, [aba, approvedItems, requestHistory, busca]);

  const handleDelete = (item) => {
    const message =
      item.status === 'APPROVED'
        ? `Excluir o registro aprovado de "${item.gameName}" e remover seus pontos do ranking?`
        : `Excluir do histórico a solicitação de "${item.gameName}"?`;

    if (window.confirm(message)) {
      setAviso(null);
      deleteMutation.mutate(item.completionId);
    }
  };

  if (!isStaffRole(user?.role)) {
    return <div className="text-red-600">Acesso restrito a administradores.</div>;
  }

  if (isLoading) {
    return <div className="text-slate-600 dark:text-slate-300">Carregando registros...</div>;
  }

  if (error) {
    return <div className="text-red-600">Erro ao carregar registros: {error.message}</div>;
  }

  const abaAtual = ABAS.find((item) => item.id === aba);
  const contagem = { aprovados: approvedItems.length, historico: requestHistory.length };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Registros</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">Exclua registros e limpe o histórico de pedidos.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm(
                'Recalcular a edição ativa vai apagar e recriar todos os eventos de pontuação das conclusões aprovadas. Deseja continuar?'
              )
            ) {
              setAviso(null);
              recalculateMutation.mutate();
            }
          }}
          disabled={recalculateMutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Calculator className="h-4 w-4" aria-hidden="true" />
          {recalculateMutation.isPending ? 'Recalculando...' : 'Recalcular pontos da edição'}
        </button>
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-full bg-indigo-50 p-1 dark:bg-slate-800" role="tablist">
          {ABAS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={aba === item.id}
              onClick={() => setAba(item.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                aba === item.id
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {item.rotulo} <span className="text-slate-400">({contagem[item.id]})</span>
            </button>
          ))}
        </div>
        <label className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar jogo ou jogador"
            className="w-full rounded-full border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
      </div>

      <p className="-mt-3 text-sm text-slate-500 dark:text-slate-400">{abaAtual.dica}</p>

      {visiveis.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {busca.trim() ? 'Nada encontrado com essa busca.' : 'Nenhum registro aqui.'}
        </div>
      ) : (
        <div className="space-y-2.5">
          {visiveis.map((item) => (
            <AdminCompletionCard
              key={item.completionId}
              item={item}
              proofUrl={`${api.defaults.baseURL}/uploads/proofs/${item.proofId}`}
              isPending={deleteMutation.isPending}
              onDelete={() => handleDelete(item)}
              onPreview={(src, alt) => setPreviewImage({ src, alt })}
            />
          ))}
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
