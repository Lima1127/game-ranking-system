import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

/** Devolve o valor so depois que ele para de mudar por `atrasoMs` (evita uma busca por tecla). */
function useValorComAtraso(valor, atrasoMs) {
  const [valorAtrasado, setValorAtrasado] = useState(valor);
  useEffect(() => {
    const timer = setTimeout(() => setValorAtrasado(valor), atrasoMs);
    return () => clearTimeout(timer);
  }, [valor, atrasoMs]);
  return valorAtrasado;
}

/**
 * Sugestoes da loja Steam para um campo "Jogo".
 *
 * - `gameName`: o texto digitado no campo.
 * - `games`: catalogo do Reviradao (GET /games).
 * - `ativo`: false nao busca nada (ex.: o nome digitado ja e de um jogo cadastrado).
 * - `idsJaSugeridos`: ids de jogos do catalogo que a tela ja mostra, para nao repetir.
 *
 * Se a Steam nao responder, a lista vem vazia e o campo segue funcionando pelo nome.
 */
export function useSugestoesSteam({ gameName, games, ativo = true, idsJaSugeridos = [] }) {
  // Jogo escolhido entre as sugestoes: { appId, name }. Vale enquanto o nome nao for editado.
  const [selecao, setSelecao] = useState(null);
  const nomeDigitado = (gameName || '').trim();
  const jogoSteamSelecionado = Boolean(selecao) && selecao.name === nomeDigitado;

  const termo = useValorComAtraso(nomeDigitado, 350);
  const { data: resultados = [] } = useQuery({
    queryKey: ['steam-search', termo.toLowerCase()],
    queryFn: async () => {
      const response = await api.get('/games/steam-search', { params: { term: termo } });
      return response.data;
    },
    enabled: ativo && termo.length >= 2 && !jogoSteamSelecionado,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const chaveIds = idsJaSugeridos.join(',');
  const sugestoesSteam = useMemo(() => {
    if (!ativo || jogoSteamSelecionado) {
      return [];
    }
    const jaSugeridos = new Set(chaveIds ? chaveIds.split(',') : []);
    return resultados.filter((item) => !jaSugeridos.has(item.existingGameId)).slice(0, 5);
  }, [resultados, chaveIds, ativo, jogoSteamSelecionado]);

  /**
   * Marca a sugestao escolhida. Se o jogo ja esta no catalogo, devolve esse jogo (a tela usa o
   * cadastro existente); senao devolve null e o proximo POST /games leva o steamAppId.
   */
  const escolherSugestaoSteam = (steamGame) => {
    const jogoExistente = steamGame.existingGameId && games.find((game) => game.id === steamGame.existingGameId);
    setSelecao(jogoExistente ? null : { appId: steamGame.steamAppId, name: steamGame.name });
    return jogoExistente || null;
  };

  return {
    sugestoesSteam,
    jogoSteamSelecionado,
    escolherSugestaoSteam,
    limparSelecaoSteam: () => setSelecao(null),
    // Vai no POST /games: o servidor confere na Steam e usa o nome e o ano oficiais.
    steamAppIdParaCadastro: jogoSteamSelecionado ? selecao.appId : null,
  };
}
