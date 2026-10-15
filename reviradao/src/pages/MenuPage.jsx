import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Camera, ClipboardList, Gamepad2, ListTodo, Lock, Trophy } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import AvatarCropModal from '../components/AvatarCropModal';
import JanelaAlterarSenha from '../components/JanelaAlterarSenha';
import { MAX_ORIGINAL_IMAGE_SIZE } from '../utils/compressImage';
import { scoringRules } from '../data/scoringRules';
import { sortearFrase } from '../data/frasesBoasVindas';
import { formatarData } from '../utils/formatarData';
import { isStaffRole } from '../utils/roles';

// "Jogo fechado" já aparece como contagem de jogos; as demais regras viram medalhas.
const medalRules = scoringRules.filter((rule) => rule.code !== 'GAME_COMPLETED');

// Obrigacoes "abertas" (as demais ja foram resolvidas). precisaDeVoce = destaque em ambar.
const STATUS_OBRIGACAO = {
  PENDING: { texto: 'Aguardando sua resposta', precisaDeVoce: true },
  ACCEPTED: { texto: 'Em andamento', precisaDeVoce: false },
  REVIEW_PENDING_PARTIAL: { texto: 'Em revisão (parcial)', precisaDeVoce: false },
  REVIEW_PENDING_COMPLETION: { texto: 'Em revisão (conclusão)', precisaDeVoce: false },
};

function StatTile({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center dark:border-slate-700 dark:bg-slate-800">
      <div className="text-xl font-black text-slate-900 dark:text-slate-100">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

export default function MenuPage() {
  const { user, updateAvatar } = useAuth();
  const fileInputRef = useRef(null);
  const [cropFile, setCropFile] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [alterandoSenha, setAlterandoSenha] = useState(false);
  // Sorteado uma vez por visita: a frase nao muda enquanto a tela estiver aberta.
  const [sorteio] = useState(() => Math.random());

  // Mesmas consultas da tela de Ranking: os dados sao compartilhados (cache).
  const { data: ranking = [], isLoading: rankingLoading } = useQuery({
    queryKey: ['ranking'],
    queryFn: async () => (await api.get('/ranking')).data,
  });
  const { data: completions = [], isLoading: completionsLoading } = useQuery({
    queryKey: ['ranking-completions'],
    queryFn: async () => (await api.get('/completions')).data,
  });

  const displayName = user?.displayName || user?.email;
  const avatarUrl = user?.avatarUploadedAt
    ? `${api.defaults.baseURL}/users/${user.id}/avatar?v=${encodeURIComponent(user.avatarUploadedAt)}`
    : null;

  const stats = useMemo(() => {
    const index = ranking.findIndex((row) => row.userId === user?.id);
    const myRow = index >= 0 ? ranking[index] : null;
    const pontos = myRow?.totalPoints ?? 0;
    const lider = ranking[0]?.totalPoints ?? 0;
    const mine = completions.filter((completion) => completion.userId === user?.id);

    const ruleCounts = {};
    mine.forEach((completion) => {
      (completion.ruleCodes || []).forEach((code) => {
        ruleCounts[code] = (ruleCounts[code] || 0) + 1;
      });
    });

    return {
      nome: displayName,
      pontos,
      posicao: myRow ? index + 1 : null,
      totalJogadores: ranking.length,
      faltamLider: myRow ? Math.max(0, lider - pontos) : 0,
      jogos: mine.length,
      horas: mine.reduce((total, completion) => total + Number(completion.hoursPlayed || 0), 0),
      platinas: mine.filter((completion) => completion.platinum).length,
      medalhas: medalRules
        .map((rule) => ({ ...rule, count: ruleCounts[rule.code] || 0 }))
        .filter((rule) => rule.count > 0),
      // Datas no formato AAAA-MM-DD: a comparacao de texto ja ordena do mais novo para o mais antigo.
      ultimosJogos: [...mine]
        .sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')))
        .slice(0, 3),
    };
  }, [ranking, completions, user?.id, displayName]);

  // Mesma consulta da tela de Obrigacoes (dados compartilhados).
  const { data: obligationsOverview } = useQuery({
    queryKey: ['obligations'],
    queryFn: async () => (await api.get('/obligations')).data,
  });
  // Admin recebe todas as obrigacoes da edicao: filtra so as destinadas a este jogador.
  const obrigacoesAtivas = (obligationsOverview?.items || []).filter(
    (item) => item.assignedToUserId === user?.id && STATUS_OBRIGACAO[item.status]
  );

  // Mesma consulta da tela de Solicitacoes. Jogador recebe so os proprios pedidos; admin recebe todos.
  const { data: submissions = [] } = useQuery({
    queryKey: ['completion-submissions'],
    queryFn: async () => (await api.get('/completions/submissions')).data,
    enabled: Boolean(user?.id),
  });
  const isAdmin = isStaffRole(user?.role);
  const solicitacoesPendentes = submissions
    .filter((item) => item.status === 'PENDING')
    // Para o admin, pedidos de outros jogadores dependem dele: vem primeiro e em destaque.
    .map((item) => ({ ...item, precisaDeVoce: isAdmin && item.userId !== user?.id }))
    .sort((a, b) => Number(b.precisaDeVoce) - Number(a.precisaDeVoce) || String(b.createdAt).localeCompare(String(a.createdAt)));
  const LIMITE_SOLICITACOES = 3;

  const dataReady = !rankingLoading && !completionsLoading;
  const frase = useMemo(() => (dataReady ? sortearFrase(stats, sorteio) : null), [dataReady, stats, sorteio]);

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file) => {
      const payload = new FormData();
      payload.append('file', file);
      const response = await api.post('/users/me/avatar', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: (data) => {
      updateAvatar(data.avatarUploadedAt);
      setCropFile(null);
      setFeedback({ type: 'ok', text: 'Foto de perfil atualizada!' });
    },
    onError: (error) => {
      setFeedback({ type: 'error', text: error.message || 'Erro ao atualizar a foto.' });
    },
  });

  const openFilePicker = () => {
    setFeedback(null);
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // permite escolher o mesmo arquivo de novo
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', text: 'Escolha um arquivo de imagem (JPG, PNG, GIF ou WEBP).' });
      return;
    }
    if (file.size > MAX_ORIGINAL_IMAGE_SIZE) {
      setFeedback({ type: 'error', text: 'Imagem muito grande (limite de 20 MB).' });
      return;
    }
    setCropFile(file);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <h1 className="text-4xl font-bold">Menu</h1>

      {/* Fundo mais escuro que o roxo da marca: melhora o contraste da frase dourada,
          principalmente no tema escuro. */}
      <div className="rounded-lg bg-gradient-to-r from-indigo-700 to-purple-800 p-8 text-white shadow-lg dark:from-slate-900 dark:via-indigo-950 dark:to-purple-950 dark:ring-1 dark:ring-white/10">
        <h2 className="mb-3 font-display text-3xl font-bold tracking-wide sm:text-4xl">Bem-vindo, {displayName}!</h2>
        <p className="min-h-[1.75rem] font-display text-lg sm:text-xl">
          {frase ? <span className="splash-text">{frase}</span> : <span className="opacity-90">Acompanhe seu progresso no Reviradão.</span>}
        </p>
      </div>

      {/* Perfil a esquerda e Acoes Rapidas a direita (no celular, um embaixo do outro) */}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section className="rounded-lg border border-gray-100 bg-white p-6 shadow sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={openFilePicker}
            className="group relative mx-auto h-24 w-24 shrink-0 rounded-full sm:mx-0"
            aria-label="Trocar foto de perfil"
            title="Trocar foto de perfil"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={`Avatar de ${displayName}`} className="h-24 w-24 rounded-full border border-slate-300 object-cover dark:border-slate-700" />
            ) : (
              <span className="flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-slate-400 bg-slate-100 text-3xl font-black text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {displayName?.slice(0, 1)?.toUpperCase() || '?'}
              </span>
            )}
            {/* Unico indicador de "trocar foto": visivel sempre, inclusive no celular */}
            <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow transition group-hover:scale-110 group-hover:bg-secondary group-focus-visible:scale-110 dark:border-slate-900">
              <Camera className="h-4 w-4" aria-hidden="true" />
            </span>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelected} className="hidden" />

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{displayName}</div>
            <div className="break-all text-sm text-slate-500 dark:text-slate-400">{user?.email}</div>
            <button
              type="button"
              onClick={() => setAlterandoSenha(true)}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
            >
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              Alterar senha
            </button>
            {feedback && (
              <p className={`mt-3 text-sm font-semibold ${feedback.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{feedback.text}</p>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Posição" value={stats.posicao ? `#${stats.posicao}` : '-'} />
          <StatTile label="Pontos" value={stats.pontos} />
          <StatTile label="Jogos" value={stats.jogos} />
          <StatTile label="Horas" value={Math.floor(stats.horas)} />
        </div>

        <div className="mt-6">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Medalhas</h3>
          {!dataReady ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Carregando...</p>
          ) : stats.medalhas.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Suas medalhas aparecem aqui quando seus jogos forem aprovados.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {stats.medalhas.map((medal) => (
                <span
                  key={medal.code}
                  title={`${medal.name}: ${medal.description}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <span className="text-lg leading-none" aria-hidden="true">{medal.emoji}</span>
                  {medal.name}
                  <span className="rounded-full bg-slate-900 px-1.5 text-xs text-white dark:bg-slate-600">×{medal.count}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* So aparece quando existe obrigacao aberta para o jogador; sem nenhuma, nada e exibido. */}
        {obrigacoesAtivas.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {obrigacoesAtivas.length === 1 ? 'Obrigação ativa' : 'Obrigações ativas'}
            </h3>
            <div className="space-y-2">
              {obrigacoesAtivas.map((obrigacao) => {
                const status = STATUS_OBRIGACAO[obrigacao.status];
                return (
                  <Link
                    key={obrigacao.obligationId}
                    to="/obligations"
                    className={`flex flex-col gap-1 rounded-2xl border px-4 py-2.5 transition hover:shadow sm:flex-row sm:items-center sm:gap-3 sm:rounded-full ${
                      status.precisaDeVoce
                        ? 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-900/20'
                        : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="text-lg leading-none" aria-hidden="true">📋</span>
                      <span className="min-w-0 truncate text-sm font-bold text-slate-800 dark:text-slate-100" title={obrigacao.gameName}>
                        {obrigacao.gameName}
                      </span>
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">enviada por {obrigacao.assignedByDisplayName}</span>
                    <span
                      className={`text-xs font-bold sm:ml-auto ${
                        status.precisaDeVoce ? 'text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {status.texto}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Últimos jogos zerados</h3>
          {!dataReady ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Carregando...</p>
          ) : stats.ultimosJogos.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Seus jogos aparecem aqui quando forem aprovados.</p>
          ) : (
            // Barrinha arredondada: lado a lado no computador, um embaixo do outro no celular.
            <div className="flex flex-col divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 sm:flex-row sm:divide-x sm:divide-y-0 sm:rounded-full dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800">
              {stats.ultimosJogos.map((jogo) => (
                <div key={jogo.completionId} className="flex min-w-0 flex-1 items-center gap-2 px-4 py-2.5" title={jogo.gameName}>
                  <span className="text-lg leading-none" aria-hidden="true">{jogo.platinum ? '🏆' : '🎮'}</span>
                  <span className="min-w-0 truncate text-sm font-bold text-slate-800 dark:text-slate-100">{jogo.gameName}</span>
                  <span className="ml-auto shrink-0 text-xs text-slate-500 dark:text-slate-400">{formatarData(jogo.completedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="space-y-8 lg:sticky lg:top-6">
      <section className="rounded-lg border border-gray-100 bg-white p-6 shadow dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-6 text-2xl font-bold">Ações Rápidas</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <Link to="/ranking" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-bold text-white transition duration-200 hover:bg-secondary">
            <Trophy className="h-5 w-5" aria-hidden="true" /> Ver Ranking
          </Link>
          <Link to="/completion" className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-6 py-3 font-bold text-white transition duration-200 hover:bg-primary">
            <Gamepad2 className="h-5 w-5" aria-hidden="true" /> Registrar Conclusão
          </Link>
          <Link to="/requests" className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-700 px-6 py-3 font-bold text-white transition duration-200 hover:bg-slate-900">
            <ListTodo className="h-5 w-5" aria-hidden="true" /> Ver Solicitações
          </Link>
          <Link to="/obligations" className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-6 py-3 font-bold text-white transition duration-200 hover:bg-amber-700">
            <ClipboardList className="h-5 w-5" aria-hidden="true" /> Gerenciar Obrigações
          </Link>
        </div>
      </section>

      {/* So aparece quando existe pedido pendente; sem nenhum, nada e exibido. */}
      {solicitacoesPendentes.length > 0 && (
        <section className="rounded-lg border border-gray-100 bg-white p-6 shadow dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            {solicitacoesPendentes.length === 1 ? 'Solicitação pendente' : `Solicitações pendentes (${solicitacoesPendentes.length})`}
          </h3>
          <div className="space-y-2">
            {solicitacoesPendentes.slice(0, LIMITE_SOLICITACOES).map((item) => (
              <Link
                key={`${item.kind}-${item.submissionId}`}
                to="/requests"
                className={`block rounded-2xl border px-4 py-2.5 transition hover:shadow ${
                  item.precisaDeVoce
                    ? 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-900/20'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="text-lg leading-none" aria-hidden="true">{item.kind === 'UPDATE_COMPLETION' ? '✏️' : '🎮'}</span>
                  <span className="min-w-0 truncate text-sm font-bold text-slate-800 dark:text-slate-100" title={item.gameName}>
                    {item.gameName}
                  </span>
                </span>
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                  {item.kind === 'UPDATE_COMPLETION' ? 'Atualização' : 'Novo registro'}
                  {item.precisaDeVoce ? ` de ${item.userDisplayName}` : ''}
                </span>
                <span className={`mt-0.5 block text-xs font-bold ${item.precisaDeVoce ? 'text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300'}`}>
                  {item.precisaDeVoce ? 'Aguardando sua aprovação' : 'Aguardando aprovação do admin'}
                </span>
              </Link>
            ))}
            {solicitacoesPendentes.length > LIMITE_SOLICITACOES && (
              <Link to="/requests" className="block pt-1 text-center text-sm font-bold text-primary hover:underline">
                e mais {solicitacoesPendentes.length - LIMITE_SOLICITACOES}... ver todas
              </Link>
            )}
          </div>
        </section>
      )}
      </div>
      </div>

      {alterandoSenha && <JanelaAlterarSenha onFechar={() => setAlterandoSenha(false)} />}

      <AvatarCropModal
        file={cropFile}
        isSaving={uploadAvatarMutation.isPending}
        onConfirm={(file) => uploadAvatarMutation.mutate(file)}
        onCancel={() => setCropFile(null)}
      />
    </div>
  );
}
