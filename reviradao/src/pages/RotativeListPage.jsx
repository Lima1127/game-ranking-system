import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const MAX_SOURCE_FILE_SIZE = 8 * 1024 * 1024;

function formatFileSize(size) {
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export default function RotativeListPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ADMIN';
  const [sourceFile, setSourceFile] = useState(null);

  const { data: currentList = [], isLoading, error } = useQuery({
    queryKey: ['rotative-list'],
    queryFn: async () => {
      const response = await api.get('/rotative-list');
      return response.data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!sourceFile) {
        throw new Error('Selecione um arquivo .csv ou .txt');
      }

      const payload = new FormData();
      payload.append('file', sourceFile);
      return api.post('/rotative-list/source-file', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (response) => {
      const data = response.data;
      alert(
        `Arquivo processado com sucesso. Jogos importados: ${data.importedLines}. Total unico no pool: ${data.totalUniqueGamesInSource}.`
      );
      setSourceFile(null);
    },
    onError: (requestError) => alert(requestError.response?.data?.message || requestError.message),
  });

  const generateMutation = useMutation({
    mutationFn: async () => api.post('/rotative-list/generate-next'),
    onSuccess: (response) => {
      const data = response.data;
      queryClient.invalidateQueries({ queryKey: ['rotative-list'] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      alert(
        `Lista #${data.roundNumber} criada. Mantidos da anterior: ${data.carriedFromPreviousList}. Adicionados do arquivo: ${data.addedFromSourcePool}. Total atual: ${data.totalInCurrentList}.`
      );
    },
    onError: (requestError) => alert(requestError.response?.data?.message || requestError.message),
  });

  const handleSourceFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSourceFile(null);
      return;
    }

    const fileName = (file.name || '').toLowerCase();
    if (!(fileName.endsWith('.csv') || fileName.endsWith('.txt'))) {
      alert('Formato invalido. Envie um arquivo .csv ou .txt');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_SOURCE_FILE_SIZE) {
      alert(`Arquivo muito grande. Limite: ${formatFileSize(MAX_SOURCE_FILE_SIZE)}.`);
      event.target.value = '';
      return;
    }

    setSourceFile(file);
  };

  if (isLoading) {
    return <div className="text-slate-600 dark:text-slate-300">Carregando lista rotativa...</div>;
  }

  if (error) {
    return <div className="text-red-600">Erro ao carregar lista rotativa: {error.message}</div>;
  }

  const currentRound = currentList[0]?.quarter ?? 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100">Lista Rotativa</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Completar um jogo desta lista gera <strong>+3 pontos</strong>. Quando o jogo e concluido, ele sai automaticamente da lista ativa.
        </p>
      </div>

      {isAdmin && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Gerenciamento (Admin)</h2>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-400/35 dark:bg-[#243247]">
            <label className="block text-indigo-900 dark:text-indigo-100 font-bold mb-2">
              Adicionar arquivo (.csv / .txt)
            </label>
            <input
              type="file"
              accept=".csv,.txt,text/plain,text/csv"
              onChange={handleSourceFile}
              className="block w-full text-sm text-indigo-900 dark:text-indigo-100 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-indigo-700"
            />
            {sourceFile && (
              <p className="mt-2 text-sm text-indigo-900 dark:text-indigo-100">
                Arquivo selecionado: <strong>{sourceFile.name}</strong> ({formatFileSize(sourceFile.size)})
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => uploadMutation.mutate()}
                disabled={uploadMutation.isPending || !sourceFile}
                className="rounded-lg bg-primary px-4 py-2 font-bold text-white hover:bg-secondary disabled:opacity-50"
              >
                {uploadMutation.isPending ? 'Processando arquivo...' : 'Adicionar arquivo'}
              </button>
              <button
                type="button"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="rounded-lg bg-slate-900 px-4 py-2 font-bold text-white hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50"
              >
                {generateMutation.isPending ? 'Montando...' : 'Montar nova lista'}
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Lista ativa</h2>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary dark:bg-primary/25 dark:text-indigo-200">
            🔄 Lista #{currentRound || 0}
          </span>
        </div>

        {currentList.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400">Nenhuma lista ativa no momento.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {currentList.map((entry, index) => (
              <div
                key={entry.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 py-3"
              >
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-2">
                  Item {index + 1}
                </div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">{entry.gameName}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

