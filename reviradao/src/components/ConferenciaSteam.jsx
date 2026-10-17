import { CheckCircle2, RefreshCw, TriangleAlert } from 'lucide-react';
import { formatarData, formatarHoras } from '../utils/formatarData';

// Diferenca de horas aceita antes de avisar: 2h ou 20% do que a Steam registra (o que for maior).
const FOLGA_HORAS_MINIMA = 2;
const FOLGA_HORAS_PERCENTUAL = 0.2;

/**
 * Compara o que o jogador declarou (horas, platina) com o que a Steam informou.
 * Devolve { resumo, confirmacoes, alertas, nota } para a tela; nunca muda pontos.
 */
export function analisarConferencia(check, submission) {
  if (!check?.status) {
    return { nota: 'Ainda não conferido na Steam.' };
  }

  switch (check.status) {
    case 'NO_STEAM_GAME':
      return null; // jogo de outra plataforma: nada a mostrar
    case 'NO_STEAM_ACCOUNT':
      return { nota: 'Jogador sem conta Steam conectada.' };
    case 'NOT_CONFIGURED':
      return { nota: 'Conferência na Steam desligada (servidor sem chave da API).' };
    case 'UNAVAILABLE':
      return { nota: 'A Steam não respondeu. Tente conferir de novo.' };
    case 'PRIVATE_PROFILE':
      return { alertas: ['Perfil Steam privado: não deu para conferir. O jogador precisa deixar "Detalhes dos jogos" público.'] };
    case 'NOT_OWNED':
      return { alertas: ['O jogo não aparece na biblioteca Steam do jogador (pode ter sido jogado em outra plataforma).'] };
    default:
      break;
  }

  const horasSteam = (check.playtimeMinutes ?? 0) / 60;
  const horasDeclaradas = Number(submission?.hoursPlayed || 0);
  const total = check.achievementsTotal;
  const desbloqueadas = check.achievementsUnlocked;
  const ultima = check.lastUnlockAt ? formatarData(check.lastUnlockAt.slice(0, 10)) : null;

  const partes = [`${Math.floor(horasSteam)}h na Steam`];
  if (total == null) {
    partes.push('conquistas indisponíveis');
  } else if (total === 0) {
    partes.push('jogo sem conquistas');
  } else {
    partes.push(`${desbloqueadas}/${total} conquistas${ultima ? ` (última em ${ultima})` : ''}`);
  }

  const alertas = [];
  const confirmacoes = [];
  const folga = Math.max(FOLGA_HORAS_MINIMA, horasSteam * FOLGA_HORAS_PERCENTUAL);
  if (horasDeclaradas > 0 && horasDeclaradas > horasSteam + folga) {
    alertas.push(`Declarou ${formatarHoras(horasDeclaradas)}; a Steam registra ${Math.floor(horasSteam)}h.`);
  }

  if (submission?.platinum && total > 0) {
    const completouTudo = desbloqueadas === total;
    const antesDaEdicao = check.editionStartsAt && check.lastUnlockAt && check.lastUnlockAt.slice(0, 10) < check.editionStartsAt;
    if (!completouTudo) {
      alertas.push(`Marcou platina, mas a Steam mostra ${desbloqueadas} de ${total} conquistas.`);
    } else if (antesDaEdicao) {
      alertas.push(`100% das conquistas antes do início da edição (última em ${ultima}).`);
    } else {
      confirmacoes.push('Platina confirmada pela Steam');
    }
  }

  return { resumo: partes.join(' · '), confirmacoes, alertas };
}

/** Bloco "Steam" de um pedido na tela de Solicitacoes. */
export default function ConferenciaSteam({ check, submission, nome, podeConferir, conferindo, onConferir }) {
  const analise = analisarConferencia(check, submission);
  if (!analise) {
    return null;
  }

  const { resumo, confirmacoes = [], alertas = [], nota } = analise;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-slate-700 dark:text-slate-200">
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Steam{nome ? ` · ${nome}` : ''}</span>{' '}
          {resumo || <span className="font-normal text-slate-500 dark:text-slate-400">{nota}</span>}
        </p>
        {podeConferir && (
          <button
            type="button"
            onClick={onConferir}
            disabled={conferindo}
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${conferindo ? 'animate-spin' : ''}`} aria-hidden="true" />
            {conferindo ? 'Conferindo...' : check?.status ? 'Conferir de novo' : 'Conferir agora'}
          </button>
        )}
      </div>
      {confirmacoes.map((texto) => (
        <p key={texto} className="mt-1 flex items-center gap-1.5 font-semibold text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> {texto}
        </p>
      ))}
      {alertas.map((texto) => (
        <p key={texto} className="mt-1 flex items-start gap-1.5 font-semibold text-amber-700 dark:text-amber-300">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {texto}
        </p>
      ))}
    </div>
  );
}
