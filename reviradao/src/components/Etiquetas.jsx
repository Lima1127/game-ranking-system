import { ClipboardList, Trophy } from 'lucide-react';

/* Etiquetas pequenas usadas nos cartoes (Solicitacoes, Admin > Registros). */

export const STATUS = {
  PENDING: { rotulo: 'Pendente', classe: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-500/30', ponto: 'bg-amber-500' },
  APPROVED: { rotulo: 'Aprovado', classe: 'bg-green-50 text-green-700 ring-green-200 dark:bg-green-900/30 dark:text-green-300 dark:ring-green-500/30', ponto: 'bg-green-500' },
  CANCELLED: { rotulo: 'Cancelado', classe: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-500/30', ponto: 'bg-red-500' },
};

const classeEtiqueta = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ring-1 ring-inset';

/** Situacao da solicitacao: bolinha colorida + nome em portugues. */
export function EtiquetaStatus({ status }) {
  const info = STATUS[status] || STATUS.PENDING;
  return (
    <span className={`${classeEtiqueta} ${info.classe}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${info.ponto}`} aria-hidden="true" />
      {info.rotulo}
    </span>
  );
}

export function Etiqueta({ icone: Icone, children, classe, title }) {
  return (
    <span className={`${classeEtiqueta} ${classe}`} title={title}>
      {Icone && <Icone className="h-3 w-3" aria-hidden="true" />}
      {children}
    </span>
  );
}

export const etiquetaNeutra = 'bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700';
export const etiquetaCoop = 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:ring-indigo-500/30';
const etiquetaPlatina = 'bg-gradient-to-r from-sky-50 to-cyan-100 text-sky-800 ring-sky-300 dark:from-sky-900/40 dark:to-cyan-900/40 dark:text-sky-200 dark:ring-sky-500/40';
const etiquetaObrigacao = 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-500/30';

/** Etiquetas comuns a todos os cartoes. */
export function EtiquetasDoJogo({ platina, obrigacao }) {
  return (
    <>
      {platina && <Etiqueta icone={Trophy} classe={etiquetaPlatina}>Platina</Etiqueta>}
      {obrigacao && <Etiqueta icone={ClipboardList} classe={etiquetaObrigacao} title="Jogo de obrigação">Obrigação</Etiqueta>}
    </>
  );
}
