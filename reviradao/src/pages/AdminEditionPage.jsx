import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarClock, CheckCircle2, CircleAlert, PartyPopper } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { isFundadorRole } from '../utils/roles';
import { formatarData } from '../utils/formatarData';

function Card({ children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-100 bg-white p-5 shadow sm:p-6 dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {children}
    </section>
  );
}

function Titulo({ children }) {
  return <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{children}</h2>;
}

/** Uma linha da checagem: verde quando está zerado, vermelho (bloqueia) ou âmbar (só aviso). */
function ItemChecagem({ quantidade, texto, bloqueia, link, rotuloLink, avisoQuandoTem }) {
  const ok = quantidade === 0;
  const cor = ok
    ? 'text-green-600 dark:text-green-400'
    : bloqueia
      ? 'text-red-600 dark:text-red-400'
      : 'text-amber-600 dark:text-amber-400';
  const Icone = ok ? CheckCircle2 : bloqueia ? CircleAlert : AlertTriangle;

  return (
    <li className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
      <Icone className={`mt-0.5 h-5 w-5 shrink-0 ${cor}`} aria-hidden="true" />
      <span className="min-w-0 flex-1 text-sm">
        <span className="font-bold text-slate-800 dark:text-slate-100">
          {quantidade} {texto}
        </span>
        {!ok && avisoQuandoTem && <span className="block text-xs text-slate-500 dark:text-slate-400">{avisoQuandoTem}</span>}
      </span>
      {!ok && link && (
        <Link to={link} className="shrink-0 text-xs font-bold text-primary hover:underline">
          {rotuloLink}
        </Link>
      )}
    </li>
  );
}

const classeCampo =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
const classeRotulo = 'mb-1.5 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400';

export default function AdminEditionPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fundador = isFundadorRole(user?.role);

  const [form, setForm] = useState(null);
  const [confirmacao, setConfirmacao] = useState('');
  const [novaEdicao, setNovaEdicao] = useState(null);

  const { data: preview, isLoading, error, refetch } = useQuery({
    queryKey: ['edition-rollover-preview'],
    queryFn: async () => (await api.get('/admin/editions/rollover-preview')).data,
    enabled: fundador,
  });

  // Preenche o formulário com a sugestão do servidor (ano seguinte) na primeira carga.
  useEffect(() => {
    if (preview && !form) {
      setForm({
        name: preview.suggestedName,
        year: preview.suggestedYear,
        startsAt: preview.suggestedStartsAt,
        endsAt: preview.suggestedEndsAt,
      });
    }
  }, [preview, form]);

  const virada = useMutation({
    mutationFn: async () =>
      (
        await api.post('/admin/editions/rollover', {
          currentEditionId: preview.currentEdition.id,
          name: form.name,
          year: Number(form.year),
          startsAt: form.startsAt,
          endsAt: form.endsAt,
        })
      ).data,
    onSuccess: (edicao) => {
      setNovaEdicao(edicao);
      setConfirmacao('');
      // Tudo no site depende da edição ativa: recarrega todas as consultas.
      queryClient.invalidateQueries();
    },
  });

  if (!fundador) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-4xl font-bold">Virada de edição</h1>
        <Card>
          <p className="text-sm text-slate-600 dark:text-slate-300">Só o Fundador pode fazer a virada de edição.</p>
        </Card>
      </div>
    );
  }

  if (novaEdicao) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-4xl font-bold">Virada de edição</h1>
        <Card className="text-center">
          <PartyPopper className="mx-auto mb-3 h-12 w-12 text-primary" aria-hidden="true" />
          <p className="text-2xl font-black">{novaEdicao.name} começou!</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Período: {formatarData(novaEdicao.startsAt)} a {formatarData(novaEdicao.endsAt)}. O ranking começa do zero e as edições
            anteriores continuam disponíveis no seletor do Ranking.
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Lembrete: a lista rotativa da nova edição começa vazia. Gere a primeira rodada na tela Lista Rotativa.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link to="/ranking" className="rounded-xl bg-primary px-4 py-2 font-bold text-white hover:bg-secondary">
              Ver o ranking
            </Link>
            <Link to="/rotative-list" className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
              Lista Rotativa
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading || !form) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        {error ? (
          <p className="text-red-600">{error.message}</p>
        ) : (
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
        )}
      </div>
    );
  }

  const atual = preview.currentEdition;
  const confirmou = confirmacao.trim() === atual.name;
  const podeVirar = preview.canRollover && confirmou && !virada.isPending;
  const alterar = (campo) => (event) => setForm((anterior) => ({ ...anterior, [campo]: event.target.value }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Virada de edição</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Encerra a edição atual e começa uma nova. O ranking da edição atual fica guardado (só para consulta) e o da nova começa do zero.
        </p>
      </div>

      <Card>
        <Titulo>Edição atual</Titulo>
        <div className="flex items-center gap-3">
          <CalendarClock className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-xl font-black">{atual.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {formatarData(atual.startsAt)} a {formatarData(atual.endsAt)}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <Titulo>Checagem antes da virada</Titulo>
          <button type="button" onClick={() => refetch()} className="mb-4 text-xs font-bold text-primary hover:underline">
            Atualizar
          </button>
        </div>
        <ul className="space-y-2">
          <ItemChecagem
            quantidade={preview.pendingCompletions}
            texto="pedido(s) de registro pendente(s)"
            bloqueia
            link="/requests"
            rotuloLink="Resolver"
            avisoQuandoTem="Aprove ou recuse todos antes da virada."
          />
          <ItemChecagem
            quantidade={preview.pendingUpdateRequests}
            texto="pedido(s) de atualização pendente(s)"
            bloqueia
            link="/requests"
            rotuloLink="Resolver"
            avisoQuandoTem="Aprove ou recuse todos antes da virada."
          />
          <ItemChecagem
            quantidade={preview.obligationsUnderReview}
            texto="obrigação(ões) aguardando revisão"
            bloqueia
            link="/obligations"
            rotuloLink="Resolver"
            avisoQuandoTem="Revise todas antes da virada."
          />
          <ItemChecagem
            quantidade={preview.openObligationsToClose}
            texto="obrigação(ões) em aberto"
            avisoQuandoTem="Não bloqueia: serão encerradas na virada, sem penalidade para ninguém."
          />
        </ul>
      </Card>

      <Card>
        <Titulo>Nova edição</Titulo>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="nome-edicao" className={classeRotulo}>Nome</label>
            <input id="nome-edicao" maxLength={80} value={form.name} onChange={alterar('name')} className={classeCampo} />
          </div>
          <div>
            <label htmlFor="ano-edicao" className={classeRotulo}>Ano</label>
            <input id="ano-edicao" type="number" value={form.year} onChange={alterar('year')} className={classeCampo} />
          </div>
          <div className="hidden sm:block" />
          <div>
            <label htmlFor="inicio-edicao" className={classeRotulo}>Começa em</label>
            <input id="inicio-edicao" type="date" value={form.startsAt} onChange={alterar('startsAt')} className={classeCampo} />
          </div>
          <div>
            <label htmlFor="fim-edicao" className={classeRotulo}>Termina em</label>
            <input id="fim-edicao" type="date" value={form.endsAt} onChange={alterar('endsAt')} className={classeCampo} />
          </div>
        </div>
      </Card>

      <Card className="border-red-200 dark:border-red-900/60">
        <Titulo>Confirmar</Titulo>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          Essa ação <strong>não pode ser desfeita pelo site</strong>. Para confirmar, digite o nome da edição atual:{' '}
          <strong className="select-all">{atual.name}</strong>
        </p>
        <input
          value={confirmacao}
          onChange={(event) => setConfirmacao(event.target.value)}
          placeholder={atual.name}
          aria-label="Nome da edição atual para confirmar"
          className={`${classeCampo} mb-4`}
        />
        {!preview.canRollover && (
          <p className="mb-3 text-sm font-semibold text-red-600 dark:text-red-400">Resolva as pendências em vermelho antes de continuar.</p>
        )}
        {virada.error && <p className="mb-3 text-sm font-semibold text-red-600 dark:text-red-400">{virada.error.message}</p>}
        <button
          type="button"
          disabled={!podeVirar}
          onClick={() => virada.mutate()}
          className="w-full rounded-xl bg-red-600 px-4 py-3 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {virada.isPending ? 'Virando...' : `Encerrar ${atual.name} e iniciar ${form.name || 'nova edição'}`}
        </button>
      </Card>
    </div>
  );
}
