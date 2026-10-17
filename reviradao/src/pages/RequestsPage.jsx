import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ExternalLink, Pencil, RefreshCw, TriangleAlert, Users, X } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ImagePreviewModal from '../components/ImagePreviewModal';
import RuleEmojiStrip from '../components/RuleEmojiStrip';
import ConferenciaSteam from '../components/ConferenciaSteam';
import { Etiqueta, EtiquetaStatus, EtiquetasDoJogo, STATUS, etiquetaCoop, etiquetaNeutra } from '../components/Etiquetas';
import { isStaffRole } from '../utils/roles';
import { formatarData, formatarDataHora, formatarHoras } from '../utils/formatarData';
import { emDiaPeloLancamento } from '../utils/emDia';

function hasObligationBadge(submission) {
  return Boolean(
    submission?.fromObligation ||
    (submission?.ruleCodes || []).includes('OBLIGATION_COMPLETED')
  );
}

/** "Samy · 29/09/2026 · 35h" */
function LinhaInfo({ itens }) {
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-slate-600 dark:text-slate-300">
      {itens.filter(Boolean).map((item, indice) => (
        <span key={indice} className="inline-flex items-center gap-1.5">
          {indice > 0 && <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>}
          {item}
        </span>
      ))}
    </p>
  );
}

/** Rodape do cartao: quando foi enviado e quem aprovou. */
function Datas({ submission }) {
  return (
    <div className="space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
      <p>Enviado em {formatarDataHora(submission.createdAt)}</p>
      {submission.approvedAt && (
        <p className="text-green-700 dark:text-green-400">
          Aprovado
          {submission.approvedByDisplayName && (
            <>
              {' '}por <strong className="font-bold">{submission.approvedByDisplayName}</strong>
            </>
          )}{' '}
          em {formatarDataHora(submission.approvedAt)}
        </p>
      )}
    </div>
  );
}

const botaoBase = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition disabled:opacity-50';
const botaoAprovar = `${botaoBase} bg-green-600 text-white hover:bg-green-700`;
const botaoCancelar = `${botaoBase} border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-950/40`;
const botaoSecundario = `${botaoBase} border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800`;

export default function RequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [previewImage, setPreviewImage] = useState(null);
  const [groupActionKey, setGroupActionKey] = useState(null);
  const isAdmin = isStaffRole(user?.role);
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

  // Catalogo de jogos: ano de lancamento e vinculo com a Steam, para conferir o bonus "Em dia".
  const { data: games = [] } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const response = await api.get('/games');
      return response.data;
    },
  });
  const gamesById = useMemo(() => new Map(games.map((game) => [game.id, game])), [games]);
  const gamesByName = useMemo(() => new Map(games.map((game) => [game.name.trim().toLowerCase(), game])), [games]);
  // Pedidos de atualizacao nao trazem o id do jogo, so o nome.
  const jogoDoPedido = (submission) =>
    gamesById.get(submission.gameId) || gamesByName.get(String(submission.gameName || '').trim().toLowerCase());

  /** "Lançado em 2022" (com link para a loja Steam, se o jogo estiver vinculado). */
  const infoLancamento = (submission) => {
    const game = jogoDoPedido(submission);
    if (!game?.releaseYear && !game?.steamAppId) {
      return null;
    }
    return (
      <span key="lancamento" className="inline-flex items-center gap-1.5">
        {game.releaseYear ? `Lançado em ${game.releaseYear}` : 'Ano de lançamento não informado'}
        {game.steamAppId && (
          <a
            href={`https://store.steampowered.com/app/${game.steamAppId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Steam <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        )}
      </span>
    );
  };

  /**
   * Alerta quando o jogador marcou "Em dia" num jogo que nao foi lancado no ano da edicao
   * (o sistema ja desmarcava, entao ele mudou de proposito: ex. port de console com data diferente).
   */
  const avisoEmDia = (submission) => {
    if (submission.status !== 'PENDING' || !submission.completedInReleaseYear) {
      return null;
    }
    const game = jogoDoPedido(submission);
    if (emDiaPeloLancamento(game?.releaseYear, submission.completedAt) !== false) {
      return null;
    }
    return (
      <p className="flex items-start gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-300">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        Marcou "Em dia", mas o jogo foi lançado em {game.releaseYear}
        {game.steamAppId ? ' (pela Steam)' : ''}. Confira antes de aprovar.
      </p>
    );
  };

  // Conferencia na Steam (horas e conquistas) dos pedidos pendentes. So evidencia para o admin.
  const pendingCompletionIds = useMemo(
    () => [...new Set(submissions.filter((item) => item.status === 'PENDING').map((item) => item.completionId))].slice(0, 200),
    [submissions]
  );
  const { data: steamChecks = [] } = useQuery({
    queryKey: ['steam-checks', pendingCompletionIds],
    queryFn: async () => {
      const response = await api.get('/completions/steam-checks', { params: { completionIds: pendingCompletionIds.join(',') } });
      return response.data;
    },
    enabled: pendingCompletionIds.length > 0,
    // Sem status = conferencia rodando no servidor: busca de novo a cada 3s (no maximo 10 vezes).
    refetchInterval: (query) =>
      (query.state.data || []).some((check) => !check.status) && query.state.dataUpdateCount < 10 ? 3000 : false,
  });
  const steamCheckByCompletionId = useMemo(
    () => new Map(steamChecks.map((check) => [check.completionId, check])),
    [steamChecks]
  );
  const conferirSteamMutation = useMutation({
    mutationFn: async (completionId) => (await api.post(`/completions/${completionId}/steam-check`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['steam-checks'] }),
    onError: (error) => alert(error.response?.data?.message || error.message),
  });

  const renderConferenciaSteam = (submission, nome) => {
    if (submission.status !== 'PENDING') {
      return null;
    }
    return (
      <ConferenciaSteam
        key={`steam-${submission.kind}-${submission.submissionId}`}
        check={steamCheckByCompletionId.get(submission.completionId)}
        submission={submission}
        nome={nome}
        podeConferir={isAdmin || submission.userId === user.id}
        conferindo={conferirSteamMutation.isPending && conferirSteamMutation.variables === submission.completionId}
        onConferir={() => conferirSteamMutation.mutate(submission.completionId)}
      />
    );
  };

  const groupedSubmissions = useMemo(() => {
    const map = new Map();

    submissions.forEach((submission, index) => {
      const isCoopGroup = submission.kind === 'NEW_COMPLETION' && submission.coopGroupId;
      const key = isCoopGroup
        ? `coop-${submission.coopGroupId}`
        : `${submission.kind}-${submission.submissionId}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          isCoopGroup,
          createdAt: submission.createdAt,
          index,
          entries: [],
        });
      }

      const group = map.get(key);
      group.entries.push(submission);

      if (submission.createdAt > group.createdAt) {
        group.createdAt = submission.createdAt;
      }
    });

    return Array.from(map.values())
      .map((group) => ({
        ...group,
        entries: [...group.entries].sort((a, b) => a.userDisplayName.localeCompare(b.userDisplayName)),
      }))
      .sort((a, b) => {
        if (a.createdAt === b.createdAt) return a.index - b.index;
        return a.createdAt > b.createdAt ? -1 : 1;
      });
  }, [submissions]);

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

  const runGroupAction = async (group, action) => {
    const pendingEntries = group.entries.filter((entry) => entry.status === 'PENDING');
    if (pendingEntries.length === 0) return;

    setGroupActionKey(`${action}-${group.key}`);
    try {
      // Sequencial de proposito: cada aprovacao depende do estado deixado pela anterior.
      for (const entry of pendingEntries) {
        await api.post(`/completions/submissions/${entry.kind}/${entry.submissionId}/${action}`, null, {
          headers: { 'X-User-Id': user.id },
        });
      }
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    } finally {
      refresh();
      setGroupActionKey(null);
    }
  };

  /** Miniatura do anexo (clique amplia) com link para abrir em outra aba. */
  const renderAnexo = (proofSource, gameName) => {
    if (!proofSource?.proofId) {
      return <div className="hidden h-28 w-28 shrink-0 sm:block" aria-hidden="true" />;
    }
    const url = buildProofUrl(proofSource.proofId);
    const isImage = proofSource.proofContentType?.startsWith('image/');
    return (
      <div className="flex shrink-0 flex-col items-center gap-1.5">
        {isImage ? (
          <button
            type="button"
            onClick={() => setPreviewImage({ src: url, alt: `Anexo de ${gameName}` })}
            className="overflow-hidden rounded-xl ring-1 ring-slate-200 transition hover:ring-2 hover:ring-primary dark:ring-slate-700"
            title="Ampliar anexo"
          >
            <img src={url} alt={`Anexo de ${gameName}`} className="h-28 w-28 cursor-zoom-in bg-slate-100 object-cover dark:bg-slate-800" />
          </button>
        ) : (
          <span className="flex h-28 w-28 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800">Anexo</span>
        )}
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          Abrir <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>
    );
  };

  const classeCartao = 'flex gap-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900';

  const renderSingleSubmissionCard = (submission) => {
    const isUpdate = submission.kind === 'UPDATE_COMPLETION';
    const canCancel = submission.status === 'PENDING' && (submission.userId === user.id || isAdmin);
    const canApprove = submission.status === 'PENDING' && isAdmin;
    const canEdit = submission.editable;
    const canRequestUpdate = submission.kind === 'NEW_COMPLETION' && submission.status === 'APPROVED' && submission.userId === user.id;
    const temAcoes = canApprove || canCancel || canEdit || canRequestUpdate;

    return (
      <div key={`${submission.kind}-${submission.submissionId}`} className={classeCartao}>
        {renderAnexo(submission, submission.gameName)}

        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-1 text-xl font-bold leading-tight text-slate-900 dark:text-slate-100">{submission.gameName}</h2>
            <EtiquetaStatus status={submission.status} />
            {isUpdate && <Etiqueta icone={RefreshCw} classe={etiquetaNeutra}>Atualização</Etiqueta>}
            <EtiquetasDoJogo platina={submission.platinum} obrigacao={hasObligationBadge(submission)} />
          </div>

          <LinhaInfo
            itens={[
              <strong key="j" className="font-semibold text-slate-800 dark:text-slate-100">{submission.userDisplayName}</strong>,
              `Concluído em ${formatarData(submission.completedAt)}`,
              formatarHoras(submission.hoursPlayed),
              infoLancamento(submission),
            ]}
          />

          {avisoEmDia(submission)}

          {submission.ruleCodes && submission.ruleCodes.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <RuleEmojiStrip ruleCodes={submission.ruleCodes} />
              {isUpdate && submission.status === 'PENDING' && (
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">prévia dos pontos se a atualização for aprovada</span>
              )}
            </div>
          )}

          {renderConferenciaSteam(submission)}

          <div className="mt-auto flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <Datas submission={submission} />
            {temAcoes && (
              <div className="flex flex-wrap gap-2">
                {canApprove && (
                  <button
                    type="button"
                    onClick={() => approveMutation.mutate({ kind: submission.kind, submissionId: submission.submissionId })}
                    disabled={approveMutation.isPending}
                    className={botaoAprovar}
                  >
                    <Check className="h-4 w-4" aria-hidden="true" /> Aprovar
                  </button>
                )}
                {canEdit && (
                  <Link to={`/requests/${submission.kind}/${submission.submissionId}/edit`} className={botaoSecundario}>
                    <Pencil className="h-4 w-4" aria-hidden="true" /> Editar
                  </Link>
                )}
                {canRequestUpdate && (
                  <button type="button" onClick={() => navigate(`/completion/${submission.completionId}/update`)} className={botaoSecundario}>
                    <RefreshCw className="h-4 w-4" aria-hidden="true" /> Solicitar atualização
                  </button>
                )}
                {canCancel && (
                  <button
                    type="button"
                    onClick={() => cancelMutation.mutate({ kind: submission.kind, submissionId: submission.submissionId })}
                    disabled={cancelMutation.isPending}
                    className={botaoCancelar}
                  >
                    <X className="h-4 w-4" aria-hidden="true" /> Cancelar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCoopGroupCard = (group) => {
    const firstSubmission = group.entries[0];
    const proofEntry = group.entries.find((entry) => entry.proofId) || firstSubmission;
    const pendingEntries = group.entries.filter((entry) => entry.status === 'PENDING');
    const canApproveGroup = isAdmin && pendingEntries.length > 0;
    const canCancelGroup = pendingEntries.length > 0 && (isAdmin || pendingEntries.some((entry) => entry.userId === user.id));
    const isRunningApprove = groupActionKey === `approve-${group.key}`;
    const isRunningCancel = groupActionKey === `cancel-${group.key}`;

    return (
      <div key={group.key} className={classeCartao}>
        {renderAnexo(proofEntry, firstSubmission.gameName)}

        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-1 text-xl font-bold leading-tight text-slate-900 dark:text-slate-100">{firstSubmission.gameName}</h2>
            <Etiqueta icone={Users} classe={etiquetaCoop}>Coop · {group.entries.length}</Etiqueta>
            <EtiquetasDoJogo
              platina={group.entries.some((entry) => entry.platinum)}
              obrigacao={group.entries.some((entry) => hasObligationBadge(entry))}
            />
          </div>

          <LinhaInfo
            itens={[
              `Concluído em ${formatarData(firstSubmission.completedAt)}`,
              formatarHoras(firstSubmission.hoursPlayed),
              infoLancamento(firstSubmission),
            ]}
          />

          {avisoEmDia(firstSubmission)}

          {/* Cada participante com a sua situacao */}
          <div className="flex flex-wrap gap-1.5">
            {group.entries.map((entry) => {
              const info = STATUS[entry.status] || STATUS.PENDING;
              return (
                <span
                  key={`${entry.kind}-${entry.submissionId}`}
                  title={info.rotulo}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 py-0.5 pl-2 pr-2.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${info.ponto}`} aria-hidden="true" />
                  {entry.userDisplayName}
                  <span className="sr-only">: {info.rotulo}</span>
                </span>
              );
            })}
          </div>

          {/* Cada participante e conferido no proprio perfil Steam */}
          {group.entries.map((entry) => renderConferenciaSteam(entry, entry.userDisplayName))}

          <div className="mt-auto flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <Datas submission={group.entries.find((entry) => entry.approvedAt) || firstSubmission} />
            {(canApproveGroup || canCancelGroup) && (
              <div className="flex flex-wrap gap-2">
                {canApproveGroup && (
                  <button type="button" onClick={() => runGroupAction(group, 'approve')} disabled={isRunningApprove || isRunningCancel} className={botaoAprovar}>
                    <Check className="h-4 w-4" aria-hidden="true" /> {isRunningApprove ? 'Aprovando...' : `Aprovar grupo (${pendingEntries.length})`}
                  </button>
                )}
                {canCancelGroup && (
                  <button type="button" onClick={() => runGroupAction(group, 'cancel')} disabled={isRunningApprove || isRunningCancel} className={botaoCancelar}>
                    <X className="h-4 w-4" aria-hidden="true" /> {isRunningCancel ? 'Cancelando...' : `Cancelar grupo (${pendingEntries.length})`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="text-gray-600 dark:text-slate-300">Carregando solicitações...</div>;
  }

  if (error) {
    return <div className="text-red-600">Erro ao carregar solicitações: {error.message}</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Solicitações</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          {isAdmin
            ? 'Revise, edite, aprove ou cancele os pedidos de todos os jogadores.'
            : 'Seus registros e atualizações. Enquanto estiverem pendentes, você pode editar ou cancelar.'}
        </p>
      </div>

      {groupedSubmissions.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Nenhuma solicitação encontrada.
        </div>
      ) : (
        <div className="space-y-3">
          {groupedSubmissions.map((group) =>
            !group.isCoopGroup || group.entries.length === 1 ? renderSingleSubmissionCard(group.entries[0]) : renderCoopGroupCard(group)
          )}
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
