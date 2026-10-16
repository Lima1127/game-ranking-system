import { scoringRules } from '../data/scoringRules';

const ruleByCode = Object.fromEntries(scoringRules.map((rule) => [rule.code, rule]));

/**
 * Emojis das regras que pontuaram num jogo, agrupados (ex.: ⏱️ x2).
 * Ao passar o mouse aparece o nome em portugues (ex.: "Tempo valioso ×2").
 */
export default function RuleEmojiStrip({ ruleCodes = [], className = '' }) {
  if (ruleCodes.length === 0) {
    return null;
  }

  const counts = {};
  ruleCodes.forEach((code) => {
    counts[code] = (counts[code] || 0) + 1;
  });

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {Object.entries(counts).map(([code, count]) => {
        const rule = ruleByCode[code];
        const label = `${rule?.name || 'Bônus'}${count > 1 ? ` ×${count}` : ''}`;
        return (
          <span key={code} className="relative inline-flex" title={label}>
            <span className="inline-block h-7 w-7 overflow-hidden rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              {/* Altura da linha = altura do circulo e texto centralizado: cada emoji tem uma largura diferente, assim todos ficam no meio */}
              <span aria-hidden="true" className="emoji block h-full w-full text-center text-[14px] leading-[26px]">
                {rule?.emoji || '⭐'}
              </span>
              <span className="sr-only">{label}</span>
            </span>
            {count > 1 && (
              <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-bold leading-4 text-white dark:bg-slate-600">
                {count}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
