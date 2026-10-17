import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import JanelaFoco from './JanelaFoco';

const STEAM_LOGIN = 'https://steamcommunity.com/openid/login';

export const steamProfileUrl = (steamId) => `https://steamcommunity.com/profiles/${steamId}`;

// Resultado que o backend manda no endereco (?steam=...) ao voltar do login da Steam.
const MENSAGENS_RETORNO = {
  vinculado: { tipo: 'ok', texto: 'Conta Steam conectada!' },
  expirado: { tipo: 'erro', texto: 'O pedido para conectar expirou (vale 10 minutos). Tente de novo.' },
  invalido: { tipo: 'erro', texto: 'A resposta da Steam não pôde ser aceita. Tente de novo pelo botão "Conectar Steam".' },
  'nao-confirmado': { tipo: 'erro', texto: 'Não foi possível confirmar o login com a Steam. Tente de novo em alguns minutos.' },
  'em-uso': { tipo: 'erro', texto: 'Este perfil Steam já está conectado à conta de outro jogador.' },
};

/** Explica o que acontece antes de mandar a pessoa para o login da Steam. */
function JanelaConectarSteam({ onFechar }) {
  const iniciar = useMutation({
    mutationFn: async () => {
      const { redirectUrl } = (await api.post('/steam/link/start')).data;
      // Defesa extra: so sai do site se o destino for mesmo o login oficial da Steam.
      if (!String(redirectUrl || '').startsWith(`${STEAM_LOGIN}?`)) {
        throw new Error('Endereço de login inesperado. Avise um admin.');
      }
      return redirectUrl;
    },
    // Mesma aba, sem janela pop-up: a pessoa ve o endereco real da Steam na barra do navegador.
    onSuccess: (redirectUrl) => window.location.assign(redirectUrl),
  });

  return (
    <JanelaFoco titulo="Conectar Steam" largura="max-w-md" onFechar={onFechar}>
      <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-200">
        <li>Você vai para o <strong>site oficial da Steam</strong>, nesta mesma aba, e entra por lá como de costume.</li>
        <li>
          Antes de digitar sua senha, confira se o endereço começa com{' '}
          <strong className="whitespace-nowrap">https://steamcommunity.com</strong>.
        </li>
        <li>
          O Reviradão <strong>nunca pede sua senha da Steam</strong> e não recebe nenhum acesso à sua conta: só o
          número público do seu perfil.
        </li>
        <li>Seu perfil Steam fica visível para o grupo, no ranking. Você pode desconectar quando quiser.</li>
      </ul>
      {iniciar.error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{iniciar.error.message}</p>
      )}
      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => iniciar.mutate()}
          disabled={iniciar.isPending || iniciar.isSuccess}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-secondary disabled:opacity-50"
        >
          {iniciar.isPending || iniciar.isSuccess ? 'Abrindo a Steam...' : 'Continuar para a Steam'}
        </button>
      </div>
    </JanelaFoco>
  );
}

/** Situacao do vinculo com a Steam no perfil (tela Menu). */
export default function ContaSteam() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [aviso, setAviso] = useState(null);
  const [conectando, setConectando] = useState(false);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get('/users/me')).data,
  });
  const steamId = me?.steamId;

  const atualizarDados = () => {
    queryClient.invalidateQueries({ queryKey: ['me'] });
    queryClient.invalidateQueries({ queryKey: ['ranking'] });
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  // Volta do login da Steam: mostra o resultado e tira o ?steam=... do endereco.
  useEffect(() => {
    const retorno = searchParams.get('steam');
    if (!retorno) return;
    setAviso(MENSAGENS_RETORNO[retorno] || MENSAGENS_RETORNO.invalido);
    atualizarDados();
    const semRetorno = new URLSearchParams(searchParams);
    semRetorno.delete('steam');
    setSearchParams(semRetorno, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams]);

  const desconectar = useMutation({
    mutationFn: async () => api.delete('/steam/link'),
    onSuccess: () => {
      setAviso({ tipo: 'ok', texto: 'Conta Steam desconectada.' });
      atualizarDados();
    },
    onError: (error) => setAviso({ tipo: 'erro', texto: error.message }),
  });

  const confirmarDesconexao = () => {
    if (window.confirm('Desconectar sua conta Steam do Reviradão?')) {
      setAviso(null);
      desconectar.mutate();
    }
  };

  return (
    <div className="mt-2 text-xs">
      {steamId ? (
        <span className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:justify-start">
          <a
            href={steamProfileUrl(steamId)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-green-700 hover:underline dark:text-green-400"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Steam conectada
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={confirmarDesconexao}
            disabled={desconectar.isPending}
            className="font-bold text-slate-500 hover:text-red-600 hover:underline disabled:opacity-50 dark:text-slate-400 dark:hover:text-red-400"
          >
            Desconectar
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => {
            setAviso(null);
            setConectando(true);
          }}
          className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline"
        >
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Conectar Steam
        </button>
      )}
      {aviso && (
        <p className={`mt-1.5 text-sm font-semibold ${aviso.tipo === 'ok' ? 'text-green-600' : 'text-red-600'}`}>{aviso.texto}</p>
      )}
      {conectando && <JanelaConectarSteam onFechar={() => setConectando(false)} />}
    </div>
  );
}
