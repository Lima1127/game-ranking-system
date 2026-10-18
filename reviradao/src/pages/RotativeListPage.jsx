import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, RefreshCw, Shuffle, TriangleAlert } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { isStaffRole } from '../utils/roles';

const MAX_SOURCE_FILE_SIZE = 8 * 1024 * 1024;

// Vagas do sorteio da Steam (regra do grupo, 30 jogos): 22 com 1400+ avaliacoes, sendo 5 lancamentos
// do ano e 10 com 3000+, e 8 com 1000 a 1399.
const FAIXAS = {
  CURRENT_YEAR: { rotulo: 'Lançamento do ano', classe: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  TOP: { rotulo: '3000+ avaliações', classe: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300' },
  HIGH: { rotulo: '1400+ avaliações', classe: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  MID: { rotulo: '1000–1399 avaliações', classe: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300' },
};

function formatFileSize(size) {
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export default function RotativeListPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = isStaffRole(user?.role);
  const [sourceFile, setSourceFile] = useState(null);

  const { data: currentList = [], isLoading, error } = useQuery({
    queryKey: ['rotative-list'],
    queryFn: async () => {
      const response = await api.get('/rotative-list');
      return response.data;
    },
  });

  const atualizarLista = () => {
    queryClient.invalidateQueries({ queryKey: ['rotative-list'] });
    queryClient.invalidateQueries({ queryKey: ['games'] });
  };

  const steamDrawMutation = useMutation({
    mutationFn: async () => api.post('/rotative-list/steam-draw'),
    onSuccess: (response) => {
      atualizarLista();
      const { roundNumber, totalInCurrentList, warning } = response.data;
      alert(`Lista #${roundNumber} sorteada da Steam com ${totalInCurrentList} jogos.${warning ? `

Atenção: ${warning}` : ''}`);
    },
    onError: (requestError) => alert(requestError.response?.data?.message || requestError.message),
  });

  const rerollMutation = useMutation({
    mutationFn: async (entryId) => (await api.post(`/rotative-list/${entryId}/reroll`)).data,
    onSuccess: atualizarLista,
    onError: (requestError) => alert(requestError.response?.data?.message || requestError.message),
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
      atualizarLista();
      alert(
        `Lista #${data.roundNumber} criada. Mantidos da anterior: ${data.carriedFromPreviousList}. Adicionados do arquivo: ${data.addedFromSourcePool}. Total atual: ${data.totalInCurrentList}.`
      );
    },
    onError: (requestError) => alert(requestError.response?.data?.message || requestError.message),
  });

  const sortearListaDaSteam = () => {
    const confirmou = window.confirm(
      'Sortear uma lista nova da Steam?\n\n' +
        'A lista atual é substituída por 30 jogos: 22 com 1400+ avaliações (5 lançamentos do ano e 10 com 3000+) ' +
        'e 8 com 1000 a 1399. ' +
        'Jogos já zerados nesta edição não entram.'
    );
    if (confirmou) {
      steamDrawMutation.mutate();
    }
  };

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
  // Tags marcadas (Nudez, Hentai...) so chegam para admins: para os demais, a lista nao tem destaque.
  const totalMarcados = currentList.filter((entry) => entry.flaggedTags?.length > 0).length;

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
            <p className="font-bold text-indigo-900 dark:text-indigo-100">Sortear da Steam</p>
            <p className="mt-1 text-sm text-indigo-900/80 dark:text-indigo-100/80">
              30 jogos aleatórios da loja: 22 com 1400+ avaliações (5 lançamentos do ano e 10 com 3000+) e 8 com 1000 a
              1399. Jogos com as tags Nudez, Hentai, Conteúdo Sexual ou LGBTQIA+ aparecem em vermelho; use "Sortear outro"
              para trocar qualquer jogo por outro da mesma vaga. O jogo que entrou fica destacado.
            </p>
            <button
              type="button"
              onClick={sortearListaDaSteam}
              disabled={steamDrawMutation.isPending}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-bold text-white hover:bg-secondary disabled:opacity-50"
            >
              <Shuffle className="h-4 w-4" aria-hidden="true" />
              {steamDrawMutation.isPending ? 'Sorteando na Steam... (alguns segundos)' : 'Sortear nova lista da Steam'}
            </button>
          </div>

          <details className="rounded-xl border border-slate-200 p-5 dark:border-slate-700">
            <summary className="cursor-pointer font-bold text-slate-700 dark:text-slate-200">
              Montar a partir de arquivo (.csv / .txt)
            </summary>
            <div className="mt-4">
              <input
                type="file"
                accept=".csv,.txt,text/plain,text/csv"
                onChange={handleSourceFile}
                className="block w-full text-sm text-slate-700 dark:text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-indigo-700"
              />
              {sourceFile && (
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
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
                  {generateMutation.isPending ? 'Montando...' : 'Montar lista do arquivo'}
                </button>
              </div>
            </div>
          </details>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Lista ativa</h2>
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && totalMarcados > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300">
                <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                {totalMarcados} {totalMarcados === 1 ? 'jogo marcado' : 'jogos marcados'}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary ring-1 ring-inset ring-primary/30 dark:bg-primary/20 dark:text-indigo-200">
              🔄 Lista #{currentRound || 0}
            </span>
          </div>
        </div>

        {currentList.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400">Nenhuma lista ativa no momento.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {currentList.map((entry, index) => {
              const marcado = entry.flaggedTags?.length > 0;
              const novo = Boolean(entry.replacedGameName);
              const faixa = FAIXAS[entry.reviewBand];
              const trocando = rerollMutation.isPending && rerollMutation.variables === entry.id;
              return (
                <div
                  key={entry.id}
                  className={`flex flex-col gap-2 rounded-xl border px-4 py-3 ${
                    marcado
                      ? 'border-red-400 bg-red-50 dark:border-red-500/60 dark:bg-red-950/40'
                      : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80'
                  } ${novo ? 'ring-2 ring-primary ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : ''}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Item {index + 1}</span>
                      {novo && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">Novo</span>
                      )}
                    </span>
                    {faixa && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${faixa.classe}`}>{faixa.rotulo}</span>}
                  </div>

                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {entry.steamAppId ? (
                      <a
                        href={`https://store.steampowered.com/app/${entry.steamAppId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        {entry.gameName} <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
                      </a>
                    ) : (
                      entry.gameName
                    )}
                  </div>

                  {entry.steamReviewCount != null && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {entry.steamReviewCount.toLocaleString('pt-BR')} avaliações na Steam
                    </p>
                  )}

                  {novo && (
                    <p className="text-xs font-semibold text-primary dark:text-indigo-300">
                      Entrou no lugar de <strong>{entry.replacedGameName}</strong>
                    </p>
                  )}

                  {marcado && (
                    <p className="flex items-start gap-1.5 text-sm font-bold text-red-700 dark:text-red-300">
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      {entry.flaggedTags.join(', ')}
                    </p>
                  )}

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => rerollMutation.mutate(entry.id)}
                      disabled={rerollMutation.isPending}
                      className="mt-auto inline-flex items-center gap-1.5 self-start text-xs font-bold text-primary hover:underline disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${trocando ? 'animate-spin' : ''}`} aria-hidden="true" />
                      {trocando ? 'Sorteando...' : 'Sortear outro'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
