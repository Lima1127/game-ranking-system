import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calculator, Check, ClipboardList, KeyRound, Pencil, PlusCircle, Search, Send, Shield, ShieldCheck, Shuffle, Trash2, UserCog, X } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { isStaffRole, roleLabel } from '../utils/roles';
import { formatarData } from '../utils/formatarData';

// Cada tipo de log: nome em portugues, grupo (para o filtro), icone e cor.
const VERDE = 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
const VERMELHO = 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
const AZUL = 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300';
const AMBAR = 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
const CINZA = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';

const TIPOS = {
  REQUEST_APPROVED: { rotulo: 'Solicitação aprovada', grupo: 'solicitacoes', icone: Check, cor: VERDE },
  REQUEST_CANCELLED: { rotulo: 'Solicitação cancelada', grupo: 'solicitacoes', icone: X, cor: VERMELHO },
  UPDATE_REQUEST_CREATED: { rotulo: 'Pedido de atualização criado', grupo: 'solicitacoes', icone: Send, cor: AZUL },
  UPDATE_REQUEST_APPROVED: { rotulo: 'Atualização aprovada', grupo: 'solicitacoes', icone: Check, cor: VERDE },
  UPDATE_REQUEST_CANCELLED: { rotulo: 'Atualização cancelada', grupo: 'solicitacoes', icone: X, cor: VERMELHO },
  COMPLETION_DELETED: { rotulo: 'Registro aprovado excluído', grupo: 'solicitacoes', icone: Trash2, cor: VERMELHO },
  REQUEST_HISTORY_DELETED: { rotulo: 'Histórico de solicitação excluído', grupo: 'solicitacoes', icone: Trash2, cor: CINZA },
  OBLIGATION_CREATED: { rotulo: 'Obrigação criada', grupo: 'obrigacoes', icone: PlusCircle, cor: AZUL },
  OBLIGATION_REFUSED: { rotulo: 'Obrigação recusada', grupo: 'obrigacoes', icone: X, cor: VERMELHO },
  OBLIGATION_CANCELLED_BY_SENDER: { rotulo: 'Obrigação cancelada pelo emissor', grupo: 'obrigacoes', icone: X, cor: CINZA },
  OBLIGATION_REVIEW_SUBMITTED: { rotulo: 'Obrigação enviada para revisão', grupo: 'obrigacoes', icone: Send, cor: AMBAR },
  OBLIGATION_REVIEW_APPROVED: { rotulo: 'Revisão de obrigação aprovada', grupo: 'obrigacoes', icone: Check, cor: VERDE },
  OBLIGATION_REVIEW_REJECTED: { rotulo: 'Revisão de obrigação rejeitada', grupo: 'obrigacoes', icone: X, cor: VERMELHO },
  USER_ROLE_CHANGED: { rotulo: 'Cargo alterado', grupo: 'usuarios', icone: Shield, cor: AZUL },
  USER_NAME_CHANGED: { rotulo: 'Nome alterado', grupo: 'usuarios', icone: Pencil, cor: AZUL },
  USER_PASSWORD_CHANGED: { rotulo: 'Senha alterada pelo jogador', grupo: 'usuarios', icone: KeyRound, cor: CINZA },
  PASSWORD_RESET_REQUESTED: { rotulo: 'Pediu código de senha', grupo: 'usuarios', icone: KeyRound, cor: AMBAR },
  PASSWORD_RESET_APPROVED: { rotulo: 'Código de senha gerado', grupo: 'usuarios', icone: KeyRound, cor: VERDE },
  PASSWORD_RESET_REJECTED: { rotulo: 'Pedido de senha recusado', grupo: 'usuarios', icone: KeyRound, cor: VERMELHO },
  PASSWORD_RESET_COMPLETED: { rotulo: 'Senha redefinida com código', grupo: 'usuarios', icone: KeyRound, cor: VERDE },
  STEAM_LINKED: { rotulo: 'Conta Steam conectada', grupo: 'usuarios', icone: ShieldCheck, cor: VERDE },
  STEAM_UNLINKED: { rotulo: 'Conta Steam desconectada', grupo: 'usuarios', icone: ShieldCheck, cor: CINZA },
  ROTATIVE_LIST_DRAWN: { rotulo: 'Lista rotativa sorteada da Steam', grupo: 'sistema', icone: Shuffle, cor: AZUL },
  ROTATIVE_GAME_REROLLED: { rotulo: 'Jogo da lista rotativa trocado', grupo: 'sistema', icone: Shuffle, cor: CINZA },
  EDITION_RECALCULATED: { rotulo: 'Pontos da edição recalculados', grupo: 'sistema', icone: Calculator, cor: CINZA },
};

const TIPO_DESCONHECIDO = { grupo: 'sistema', icone: UserCog, cor: CINZA };

const FILTROS = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'solicitacoes', rotulo: 'Solicitações' },
  { id: 'obrigacoes', rotulo: 'Obrigações' },
  { id: 'usuarios', rotulo: 'Usuários e senhas' },
  { id: 'sistema', rotulo: 'Sistema' },
];

const tipoDoLog = (actionCode) => TIPOS[actionCode] || { ...TIPO_DESCONHECIDO, rotulo: actionCode };

/** "2026-10-15T21:16:00Z" -> chave do dia no horario local ("2026-10-15") */
function diaLocal(dataHora) {
  const data = new Date(dataHora);
  if (Number.isNaN(data.getTime())) return '';
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

function tituloDoDia(chave) {
  const hoje = diaLocal(new Date());
  const ontem = diaLocal(new Date(Date.now() - 24 * 60 * 60 * 1000));
  if (chave === hoje) return 'Hoje';
  if (chave === ontem) return 'Ontem';
  return formatarData(chave);
}

const hora = (dataHora) => new Date(dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function AdminAuditLogsPage() {
  const { user } = useAuth();
  const [filtro, setFiltro] = useState('todos');
  const [busca, setBusca] = useState('');

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const response = await api.get('/admin/audit-logs', {
        headers: { 'X-User-Id': user.id },
      });
      return response.data;
    },
    enabled: Boolean(user?.id && isStaffRole(user?.role)),
  });

  // Filtra e agrupa por dia (os logs ja chegam do mais novo para o mais antigo)
  const dias = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const grupos = [];
    logs
      .filter((log) => filtro === 'todos' || tipoDoLog(log.actionCode).grupo === filtro)
      .filter(
        (log) =>
          !termo ||
          [log.actorDisplayName, log.subjectDisplayName, log.gameName, log.details, tipoDoLog(log.actionCode).rotulo]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(termo)
      )
      .forEach((log) => {
        const chave = diaLocal(log.createdAt);
        const ultimo = grupos[grupos.length - 1];
        if (ultimo && ultimo.chave === chave) ultimo.logs.push(log);
        else grupos.push({ chave, logs: [log] });
      });
    return grupos;
  }, [logs, filtro, busca]);

  if (!isStaffRole(user?.role)) {
    return <div className="text-red-600">Acesso restrito a administradores.</div>;
  }

  if (isLoading) {
    return <div className="text-slate-600 dark:text-slate-300">Carregando logs...</div>;
  }

  if (error) {
    return <div className="text-red-600">Erro ao carregar logs: {error.message}</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Logs</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">Tudo o que foi aprovado, cancelado, excluído ou alterado no site.</p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFiltro(item.id)}
              aria-pressed={filtro === item.id}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                filtro === item.id
                  ? 'bg-primary text-white'
                  : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:text-white'
              }`}
            >
              {item.rotulo}
            </button>
          ))}
        </div>
        <label className="relative w-full lg:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar pessoa ou jogo"
            className="w-full rounded-full border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
      </div>

      {dias.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {logs.length === 0 ? 'Nenhum log encontrado.' : 'Nada encontrado com esse filtro.'}
        </div>
      ) : (
        dias.map((dia) => (
          <section key={dia.chave}>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{tituloDoDia(dia.chave)}</h2>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {dia.logs.map((log) => {
                const tipo = tipoDoLog(log.actionCode);
                const Icone = tipo.icone;
                const outraPessoa = log.subjectDisplayName && log.subjectDisplayName !== log.actorDisplayName;
                return (
                  <li key={log.id} className="flex gap-3 px-4 py-3">
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tipo.cor}`}>
                      <Icone className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-bold text-slate-900 dark:text-slate-100">{tipo.rotulo}</p>
                        <time dateTime={log.createdAt} className="shrink-0 text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                          {hora(log.createdAt)}
                        </time>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        <strong className="font-semibold text-slate-800 dark:text-slate-100">{log.actorDisplayName}</strong>
                        {log.actorRole && <span className="text-slate-400"> ({roleLabel(log.actorRole)})</span>}
                        {outraPessoa && (
                          <>
                            {' → '}
                            <strong className="font-semibold text-slate-800 dark:text-slate-100">{log.subjectDisplayName}</strong>
                          </>
                        )}
                        {log.gameName && (
                          <>
                            <span className="text-slate-300 dark:text-slate-600"> · </span>
                            {log.gameName}
                          </>
                        )}
                      </p>
                      {log.details && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{log.details}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
