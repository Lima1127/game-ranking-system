import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, KeyRound, Pencil, Search, UserCog, X } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import JanelaFoco from '../components/JanelaFoco';
import { isStaffRole, roleLabel } from '../utils/roles';
import { formatarData } from '../utils/formatarData';

// Cor de cada cargo (selo ao lado do nome).
const COR_CARGO = {
  FUNDADOR: 'bg-amber-100 text-amber-900 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-amber-700',
  COFUNDADOR: 'bg-purple-100 text-purple-900 ring-purple-300 dark:bg-purple-900/40 dark:text-purple-200 dark:ring-purple-700',
  ADMIN: 'bg-sky-100 text-sky-900 ring-sky-300 dark:bg-sky-900/40 dark:text-sky-200 dark:ring-sky-700',
  USER: 'bg-slate-100 text-slate-700 ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600',
};

const DESCRICAO_CARGO = {
  COFUNDADOR: 'Pode promover e rebaixar admins e jogadores, além de tudo que um admin faz.',
  ADMIN: 'Aprova solicitações, revisa obrigações e acessa o painel Admin.',
  USER: 'Registra jogos e participa do ranking.',
};

function SeloCargo({ role }) {
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${COR_CARGO[role] || COR_CARGO.USER}`}>
      {roleLabel(role)}
    </span>
  );
}

function Avatar({ usuario }) {
  if (usuario.hasAvatar) {
    const versao = usuario.avatarUploadedAt ? `?v=${encodeURIComponent(usuario.avatarUploadedAt)}` : '';
    return (
      <img
        src={`${api.defaults.baseURL}/users/${usuario.id}/avatar${versao}`}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full border border-slate-300 object-cover dark:border-slate-700"
      />
    );
  }
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-sm font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
      {(usuario.displayName || '?').slice(0, 1).toUpperCase()}
    </span>
  );
}

function BotaoAcao({ icone: Icone, children, onClick, perigo = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
        perigo
          ? 'border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40'
          : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800'
      }`}
    >
      <Icone className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </button>
  );
}

function MensagemErro({ erro }) {
  if (!erro) return null;
  return <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{erro.message}</p>;
}

function BotoesRodape({ onCancelar, onConfirmar, confirmando, desabilitado, textoConfirmar, perigo = false }) {
  return (
    <div className="mt-5 flex justify-end gap-3">
      <button
        type="button"
        onClick={onCancelar}
        className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onConfirmar}
        disabled={confirmando || desabilitado}
        className={`rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50 ${perigo ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-secondary'}`}
      >
        {confirmando ? 'Salvando...' : textoConfirmar}
      </button>
    </div>
  );
}

function JanelaCargo({ usuario, onFechar, onSalvo }) {
  const [cargo, setCargo] = useState(usuario.role);
  const mutation = useMutation({
    mutationFn: async () => (await api.patch(`/admin/users/${usuario.id}/role`, { role: cargo })).data,
    onSuccess: onSalvo,
  });

  return (
    <JanelaFoco titulo={`Cargo de ${usuario.displayName}`} subtitulo={`Atual: ${roleLabel(usuario.role)}`} largura="max-w-lg" onFechar={onFechar}>
      <div className="space-y-2">
        {[...usuario.assignableRoles].reverse().map((role) => (
          <label
            key={role}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
              cargo === role ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
            }`}
          >
            <input type="radio" name="cargo" value={role} checked={cargo === role} onChange={() => setCargo(role)} className="mt-1 accent-primary" />
            <span>
              <SeloCargo role={role} />
              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{DESCRICAO_CARGO[role]}</span>
            </span>
          </label>
        ))}
      </div>
      <MensagemErro erro={mutation.error} />
      <BotoesRodape
        onCancelar={onFechar}
        onConfirmar={() => mutation.mutate()}
        confirmando={mutation.isPending}
        desabilitado={cargo === usuario.role}
        textoConfirmar="Salvar cargo"
      />
    </JanelaFoco>
  );
}

function JanelaNome({ usuario, onFechar, onSalvo }) {
  const [nome, setNome] = useState(usuario.displayName);
  const mutation = useMutation({
    mutationFn: async () => (await api.patch(`/admin/users/${usuario.id}/display-name`, { displayName: nome })).data,
    onSuccess: onSalvo,
  });

  return (
    <JanelaFoco titulo="Editar nome" subtitulo={`Nome que aparece no ranking (${usuario.email})`} largura="max-w-lg" onFechar={onFechar}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <input
          type="text"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          maxLength={120}
          autoFocus
          className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        <MensagemErro erro={mutation.error} />
        <BotoesRodape
          onCancelar={onFechar}
          onConfirmar={() => mutation.mutate()}
          confirmando={mutation.isPending}
          desabilitado={!nome.trim() || nome.trim() === usuario.displayName}
          textoConfirmar="Salvar nome"
        />
      </form>
    </JanelaFoco>
  );
}

/** "2026-10-15T18:30:00-03:00" -> "18:30" */
function formatarHora(dataHora) {
  const data = new Date(dataHora);
  return Number.isNaN(data.getTime()) ? '' : data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Gera o código de redefinição e mostra para o admin repassar.
 * `gerar` é a chamada à API (código por iniciativa do admin ou aprovação de um pedido).
 */
function JanelaCodigo({ nome, gerar, onFechar, onGerado }) {
  const [copiado, setCopiado] = useState(false);
  const mutation = useMutation({ mutationFn: gerar, onSuccess: onGerado });

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(mutation.data.code);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <JanelaFoco titulo="Código para redefinir a senha" subtitulo={nome} largura="max-w-lg" onFechar={onFechar}>
      {!mutation.data ? (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Será gerado um código que vale por <strong>30 minutos</strong> e pode ser usado <strong>uma única vez</strong>.
            Com ele, o próprio jogador escolhe a senha nova: você não fica sabendo a senha.
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">A senha atual dele continua valendo até ele usar o código.</p>
          <MensagemErro erro={mutation.error} />
          <BotoesRodape onCancelar={onFechar} onConfirmar={() => mutation.mutate()} confirmando={mutation.isPending} textoConfirmar="Gerar código" />
        </>
      ) : (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-300">Passe este código para o jogador. Ele aparece <strong>só agora</strong>:</p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 select-all rounded-xl bg-slate-100 px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.2em] text-slate-900 dark:bg-slate-800 dark:text-slate-100">
              {mutation.data.code}
            </code>
            <button
              type="button"
              onClick={copiar}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {copiado ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <p className="mt-2 text-center text-xs font-semibold text-amber-700 dark:text-amber-300">Vale até às {formatarHora(mutation.data.expiresAt)}</p>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            O jogador deve ir em <strong>Login → Esqueci minha senha → Já tenho um código</strong> e informar o e-mail, o código e a senha nova.
          </p>
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={onFechar} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-secondary">
              Pronto
            </button>
          </div>
        </>
      )}
    </JanelaFoco>
  );
}

/** Pedidos de "Esqueci minha senha" aguardando um admin (só aparece se houver algum). */
function PedidosDeSenha({ pedidos, onGerarCodigo, onRecusar, recusandoId }) {
  if (pedidos.length === 0) return null;
  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow dark:border-amber-500/40 dark:bg-amber-900/20">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.15em] text-amber-800 dark:text-amber-300">
        <KeyRound className="h-4 w-4" aria-hidden="true" />
        {pedidos.length === 1 ? 'Pedido de senha' : `Pedidos de senha (${pedidos.length})`}
      </h2>
      <ul className="space-y-2">
        {pedidos.map((pedido) => (
          <li key={pedido.id} className="flex flex-col gap-2 rounded-xl bg-white/70 px-3 py-2 sm:flex-row sm:items-center dark:bg-slate-900/60">
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold text-slate-900 dark:text-slate-100">{pedido.displayName}</div>
              <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                {pedido.email} · pediu em {formatarData(pedido.requestedAt)} às {formatarHora(pedido.requestedAt)}
              </div>
            </div>
            {pedido.canDecide ? (
              <div className="flex gap-2">
                <BotaoAcao icone={KeyRound} onClick={() => onGerarCodigo(pedido)}>Gerar código</BotaoAcao>
                <BotaoAcao icone={X} perigo onClick={() => onRecusar(pedido)}>
                  {recusandoId === pedido.id ? 'Recusando...' : 'Recusar'}
                </BotaoAcao>
              </div>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">Só um cargo acima pode decidir</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function AdminUsersPage() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState('');
  const [janela, setJanela] = useState(null); // { tipo: 'cargo' | 'nome' | 'senha', usuario }

  const { data: usuarios = [], isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => (await api.get('/admin/users')).data,
    enabled: Boolean(user?.id && isStaffRole(user?.role)),
  });

  const { data: pedidosSenha = [] } = useQuery({
    queryKey: ['admin-password-resets'],
    queryFn: async () => (await api.get('/admin/password-resets')).data,
    enabled: Boolean(user?.id && isStaffRole(user?.role)),
  });

  const recusarMutation = useMutation({
    mutationFn: async (pedido) => api.post(`/admin/password-resets/${pedido.id}/reject`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-password-resets'] }),
  });

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return usuarios;
    return usuarios.filter((u) => u.displayName.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo));
  }, [usuarios, busca]);

  const fecharJanela = () => setJanela(null);

  const aposSalvar = (alterado) => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    // Nome novo aparece no ranking, histórico, solicitações...
    queryClient.invalidateQueries({ queryKey: ['ranking'] });
    queryClient.invalidateQueries({ queryKey: ['ranking-completions'] });
    queryClient.invalidateQueries({ queryKey: ['completion-submissions'] });
    if (alterado?.self) {
      refreshUser();
    }
    fecharJanela();
  };

  if (!isStaffRole(user?.role)) {
    return <div className="text-red-600">Acesso restrito a administradores.</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Usuários</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            Seu cargo: <SeloCargo role={user?.role} />
          </p>
        </div>
        <label className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome ou e-mail"
            className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
      </div>

      <PedidosDeSenha
        pedidos={pedidosSenha}
        onGerarCodigo={(pedido) => setJanela({ tipo: 'codigo-pedido', pedido })}
        onRecusar={(pedido) => recusarMutation.mutate(pedido)}
        recusandoId={recusarMutation.isPending ? recusarMutation.variables?.id : null}
      />
      {recusarMutation.error && <MensagemErro erro={recusarMutation.error} />}

      <section className="rounded-2xl border border-slate-100 bg-white p-2 shadow sm:p-4 dark:border-slate-800 dark:bg-slate-900">
        {isLoading ? (
          <p className="p-4 text-slate-500 dark:text-slate-400">Carregando usuários...</p>
        ) : error ? (
          <p className="p-4 text-red-600">Erro ao carregar usuários: {error.message}</p>
        ) : filtrados.length === 0 ? (
          <p className="p-4 text-slate-500 dark:text-slate-400">Nenhum usuário encontrado.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtrados.map((usuario) => {
              const temAcao = usuario.canChangeRole || usuario.canEditDisplayName || usuario.canResetPassword;
              return (
                <li key={usuario.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar usuario={usuario} />
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="truncate font-bold text-slate-900 dark:text-slate-100">{usuario.displayName}</span>
                        <SeloCargo role={usuario.role} />
                        {usuario.self && (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary dark:bg-primary/25 dark:text-indigo-200">
                            Você
                          </span>
                        )}
                        {!usuario.active && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/50 dark:text-red-300">Inativo</span>
                        )}
                      </div>
                      <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {usuario.email}
                        {usuario.createdAt && <> · desde {formatarData(usuario.createdAt)}</>}
                      </div>
                    </div>
                  </div>
                  {temAcao ? (
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {usuario.canChangeRole && (
                        <BotaoAcao icone={UserCog} onClick={() => setJanela({ tipo: 'cargo', usuario })}>Cargo</BotaoAcao>
                      )}
                      {usuario.canEditDisplayName && (
                        <BotaoAcao icone={Pencil} onClick={() => setJanela({ tipo: 'nome', usuario })}>Nome</BotaoAcao>
                      )}
                      {usuario.canResetPassword && (
                        <BotaoAcao icone={KeyRound} onClick={() => setJanela({ tipo: 'codigo-usuario', usuario })}>Código de senha</BotaoAcao>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500 sm:text-right">Sem ações disponíveis</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Ninguém altera o próprio cargo nem o de quem está no mesmo nível ou acima. O cargo de Fundador só é definido direto no banco de dados.
        Códigos de senha valem 30 minutos e uma única vez. Todas as alterações ficam registradas nos Logs.
      </p>

      {janela?.tipo === 'cargo' && <JanelaCargo usuario={janela.usuario} onFechar={fecharJanela} onSalvo={aposSalvar} />}
      {janela?.tipo === 'nome' && <JanelaNome usuario={janela.usuario} onFechar={fecharJanela} onSalvo={aposSalvar} />}
      {janela?.tipo === 'codigo-usuario' && (
        <JanelaCodigo
          nome={janela.usuario.displayName}
          gerar={async () => (await api.post(`/admin/users/${janela.usuario.id}/reset-code`)).data}
          onGerado={() => queryClient.invalidateQueries({ queryKey: ['admin-password-resets'] })}
          onFechar={fecharJanela}
        />
      )}
      {janela?.tipo === 'codigo-pedido' && (
        <JanelaCodigo
          nome={janela.pedido.displayName}
          gerar={async () => (await api.post(`/admin/password-resets/${janela.pedido.id}/approve`)).data}
          onGerado={() => queryClient.invalidateQueries({ queryKey: ['admin-password-resets'] })}
          onFechar={fecharJanela}
        />
      )}
    </div>
  );
}
