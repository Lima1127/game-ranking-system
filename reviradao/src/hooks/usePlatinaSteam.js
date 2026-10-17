import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

const DICA_PADRAO = 'O anexo precisa comprovar a platina';

/**
 * Conquistas do proprio jogador no jogo da Steam, consultadas antes de enviar o registro.
 * Devolve a resposta do servidor (com suggestPlatinum true/false/null) ou null enquanto carrega,
 * se o jogo nao for da Steam ou se a consulta falhar.
 */
export function usePlatinaSteam(steamAppId) {
  const { data } = useQuery({
    queryKey: ['steam-platina', steamAppId],
    queryFn: async () => (await api.get('/steam/me/platinum', { params: { steamAppId } })).data,
    enabled: Boolean(steamAppId),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  return steamAppId ? data ?? null : null;
}

/** Dica do botao "Platina", explicando o que a Steam mostrou e se o jogador mudou a sugestao. */
export function dicaPlatina(preview, marcado) {
  if (!preview) {
    return DICA_PADRAO;
  }

  const { status, achievementsTotal: total, achievementsUnlocked: desbloqueadas, minimumAchievements, suggestPlatinum } = preview;
  switch (status) {
    case 'NO_STEAM_ACCOUNT':
      return 'Conecte sua Steam no Menu para marcar sozinho';
    case 'PRIVATE_PROFILE':
      return 'Perfil Steam privado: não deu para conferir';
    case 'OK':
      break;
    default:
      return DICA_PADRAO;
  }

  if (!total) {
    return total === 0 ? 'Jogo sem conquistas na Steam' : DICA_PADRAO;
  }
  const contagem = `${desbloqueadas}/${total} conquistas na Steam`;

  if (suggestPlatinum === true) {
    return marcado ? `Confirmado: ${contagem}` : `${contagem}: você desmarcou`;
  }
  // Regra do grupo: jogo com poucas conquistas nao conta como platina, mesmo com 100%.
  const motivo = total < minimumAchievements
    ? `Só ${total} conquistas: platina vale a partir de ${minimumAchievements}`
    : contagem;
  return marcado ? `${motivo}: o admin vai conferir` : motivo;
}
