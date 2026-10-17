import { emojiByRuleCode, pointsByRuleCode } from '../data/scoringRules';

/** Bonus em formato de "botao que liga e desliga" (por baixo continua sendo um checkbox). */
export default function OpcaoBonus({ regra, titulo, dica, checked, onChange, disabled }) {
  return (
    <label
      title={dica}
      className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${
        disabled
          ? 'cursor-not-allowed border-slate-200 opacity-45 dark:border-slate-800'
          : checked
            ? 'cursor-pointer border-primary bg-primary/10 shadow-sm dark:bg-primary/20'
            : 'cursor-pointer border-slate-200 hover:border-primary/50 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="sr-only" />
      <span className="text-xl leading-none" aria-hidden="true">{emojiByRuleCode[regra]}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">{titulo}</span>
        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{dica}</span>
      </span>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
          checked ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
        }`}
      >
        +{pointsByRuleCode[regra]}
      </span>
    </label>
  );
}
