/** Secao "Na loja Steam" dentro da lista de sugestoes de um campo "Jogo". */
export default function SugestoesSteam({ sugestoes, onEscolher }) {
  if (sugestoes.length === 0) {
    return null;
  }

  return (
    <>
      <p className="border-t border-slate-100 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500 first:border-t-0 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
        Na loja Steam
      </p>
      {sugestoes.map((steamGame) => (
        <button
          key={steamGame.steamAppId}
          type="button"
          onClick={() => onEscolher(steamGame)}
          className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {steamGame.imageUrl ? (
            <img src={steamGame.imageUrl} alt="" loading="lazy" className="h-8 w-[85px] shrink-0 rounded object-cover" />
          ) : (
            <span className="h-8 w-[85px] shrink-0 rounded bg-slate-100 dark:bg-slate-800" aria-hidden="true" />
          )}
          <span className="min-w-0 flex-1 truncate">{steamGame.name}</span>
          {steamGame.existingGameId && (
            <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700 dark:bg-green-900/40 dark:text-green-300">
              Cadastrado
            </span>
          )}
        </button>
      ))}
    </>
  );
}
