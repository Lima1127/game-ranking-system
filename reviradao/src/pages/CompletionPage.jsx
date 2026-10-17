import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ImagePlus, Info, RotateCcw, Sparkles, TriangleAlert, Users } from 'lucide-react';
import api from '../services/api';
import { compressImage, MAX_ORIGINAL_IMAGE_SIZE } from '../utils/compressImage';
import { useAuth } from '../contexts/AuthContext';
import { pointsByRuleCode } from '../data/scoringRules';
import { useSugestoesSteam } from '../hooks/useSugestoesSteam';
import SugestoesSteam from '../components/SugestoesSteam';
import OpcaoBonus from '../components/OpcaoBonus';

const MAX_PLATINUM_IMAGE_SIZE = MAX_ORIGINAL_IMAGE_SIZE; // a foto e reduzida antes do envio

const buildInitialForm = () => ({
  gameName: '',
  completedAt: new Date().toISOString().split('T')[0],
  hoursPlayed: '',
  firstTimeEver: false,
  completedInReleaseYear: false,
  platinum: false,
  rotativeList: false,
  coop: false,
  coopPlayerUserIds: [],
  hypeParticipation: false,
  hypeCompletedBonus: false,
});

function formatFileSize(size) {
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

const campoClasse =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400';

function Rotulo({ children, obrigatorio }) {
  return (
    <span className="mb-1 block text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
      {children}
      {obrigatorio && <span className="text-red-500"> *</span>}
    </span>
  );
}

export default function CompletionPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(buildInitialForm);
  const [platinumFile, setPlatinumFile] = useState(null);
  // Mensagens na propria tela (no lugar das janelinhas de alerta do navegador).
  const [aviso, setAviso] = useState(null); // { tipo: 'erro' | 'sucesso', texto }
  const avisar = (texto, tipo = 'erro') => setAviso({ tipo, texto });

  // Miniatura da imagem anexada
  const previewUrl = useMemo(() => (platinumFile ? URL.createObjectURL(platinumFile) : null), [platinumFile]);
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  const { data: games = [], isLoading: gamesLoading, isError: gamesLoadError } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const response = await api.get('/games');
      return response.data;
    },
  });
  const { data: myCompletionRequests = [] } = useQuery({
    queryKey: ['my-completion-requests', user?.id],
    queryFn: async () => {
      const response = await api.get('/completions/requests', {
        headers: { 'X-User-Id': user.id },
      });
      return response.data;
    },
    enabled: Boolean(user?.id),
  });
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    },
    enabled: Boolean(user?.id),
  });
  const { data: rotativeEntries = [] } = useQuery({
    queryKey: ['rotative-list'],
    queryFn: async () => {
      const response = await api.get('/rotative-list');
      return response.data;
    },
  });

  const resolveGameId = async () => {
    const normalizedName = form.gameName.trim().toLowerCase();
    const existingGame = games.find((game) => game.name.trim().toLowerCase() === normalizedName);

    if (existingGame) {
      return existingGame.id;
    }

    const response = await api.post('/games', {
      name: form.gameName.trim(),
      releaseYear: null,
      estimatedHoursMain: null,
      estimatedHoursPlatinum: null,
      genres: ['Nao informado'],
      // O servidor confere o jogo na Steam e usa o nome e o ano de lancamento oficiais.
      steamAppId: steamAppIdParaCadastro,
    });

    queryClient.setQueryData(['games'], (currentGames = []) => {
      const alreadyCached = currentGames.some((game) => game.id === response.data.id);
      return alreadyCached ? currentGames : [...currentGames, response.data];
    });
    queryClient.invalidateQueries({ queryKey: ['games'] });
    return response.data.id;
  };

  const uploadPlatinumProof = async () => {
    if (!platinumFile) {
      return null;
    }

    const payload = new FormData();
    payload.append('file', await compressImage(platinumFile));

    const response = await api.post('/uploads/platinum', payload, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.proofId;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const gameId = await resolveGameId();
      const platinumProofId = await uploadPlatinumProof();

      return api.post(
        '/completions',
        {
          gameId,
          completedAt: form.completedAt,
          hoursPlayed: isHypeParticipationOnly ? 0 : form.hoursPlayed,
          firstTimeEver: form.firstTimeEver,
          completedInReleaseYear: form.completedInReleaseYear,
          platinum: form.platinum,
          platinumProofId,
          coop: form.coop,
          coopPlayers: form.coop ? form.coopPlayerUserIds.length + 1 : null,
          coopPlayerUserIds: form.coop ? form.coopPlayerUserIds : [],
          hypeParticipation: form.hypeParticipation,
          hypeCompletedBonus: form.hypeCompletedBonus,
          rotativeList: form.rotativeList,
          notes: null,
        },
        {
          headers: { 'X-User-Id': user.id },
        }
      );
    },
    onSuccess: () => {
      if (form.coop) {
        avisar(`Solicitação de coop enviada para você e mais ${form.coopPlayerUserIds.length} jogador(es). Todas contarão pontos apenas após a aprovação.`, 'sucesso');
      } else {
        avisar('Solicitação enviada! Ela só contará pontos depois da aprovação.', 'sucesso');
      }
      setForm(buildInitialForm());
      setPlatinumFile(null);
      limparSelecaoSteam();
      queryClient.invalidateQueries({ queryKey: ['completion-requests'] });
      queryClient.invalidateQueries({ queryKey: ['completion-submissions'] });
    },
    onError: (error) => {
      avisar(`Erro ao registrar: ${error.response?.data?.message || error.message}`);
    },
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      setPlatinumFile(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      avisar('Envie apenas arquivos de imagem.');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_PLATINUM_IMAGE_SIZE) {
      avisar(`A imagem passa do limite de ${formatFileSize(MAX_PLATINUM_IMAGE_SIZE)}.`);
      e.target.value = '';
      return;
    }

    setAviso(null);
    setPlatinumFile(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setAviso(null);

    if (!form.gameName.trim() || (!isHypeParticipationOnly && !form.hoursPlayed)) {
      avisar('Preencha o nome do jogo e as horas jogadas.');
      return;
    }

    if (hasUserCompletionForGame) {
      avisar('Você já tem uma conclusão registrada para este jogo. Para alterar, fale com um admin.');
      return;
    }

    if (!platinumFile) {
      avisar('Anexe uma imagem para enviar a solicitação.');
      return;
    }

    if (form.coop) {
      if (form.coopPlayerUserIds.length === 0) {
        avisar('Selecione ao menos um jogador para o cooperativo.');
        return;
      }

      if (form.coopPlayerUserIds.length + 1 > 4) {
        avisar('O cooperativo permite no máximo 4 jogadores contando com você.');
        return;
      }
    }

    mutation.mutate();
  };

  const matchingGame = games.find((game) => game.name.trim().toLowerCase() === form.gameName.trim().toLowerCase());
  const rotativeByGameId = useMemo(
    () => new Map(rotativeEntries.map((entry) => [entry.gameId, entry])),
    [rotativeEntries]
  );
  const hasExistingGameSelected = Boolean(matchingGame);
  const isSelectedGameInRotativeList = matchingGame ? rotativeByGameId.has(matchingGame.id) : false;
  const isHypeParticipationOnly = form.hypeParticipation && !form.hypeCompletedBonus;
  const hasUserCompletionForGame = matchingGame
    ? myCompletionRequests.some((request) => request.gameId === matchingGame.id && request.status !== 'CANCELLED')
    : false;
  const gameSuggestions = useMemo(() => {
    const normalizedQuery = form.gameName.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    return games
      .filter((game) => game.name.toLowerCase().includes(normalizedQuery))
      .map((game) => ({
        ...game,
        isRotative: rotativeByGameId.has(game.id),
        quarter: rotativeByGameId.get(game.id)?.quarter ?? null,
      }))
      .sort((a, b) => {
        if (a.isRotative !== b.isRotative) {
          return a.isRotative ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      })
      .slice(0, 6);
  }, [games, form.gameName, rotativeByGameId]);

  const { sugestoesSteam, jogoSteamSelecionado, escolherSugestaoSteam, limparSelecaoSteam, steamAppIdParaCadastro } =
    useSugestoesSteam({
      gameName: form.gameName,
      games,
      ativo: !matchingGame,
      idsJaSugeridos: gameSuggestions.map((game) => game.id),
    });

  const handleSelectSuggestion = (gameSuggestion) => {
    limparSelecaoSteam();
    setForm((prev) => ({
      ...prev,
      gameName: gameSuggestion.name,
      rotativeList: gameSuggestion.isRotative,
    }));
  };

  const handleSelectSteamSuggestion = (steamGame) => {
    const existingGame = escolherSugestaoSteam(steamGame);
    if (existingGame) {
      handleSelectSuggestion({ ...existingGame, isRotative: rotativeByGameId.has(existingGame.id) });
      return;
    }
    setForm((prev) => ({ ...prev, gameName: steamGame.name }));
  };

  useEffect(() => {
    setForm((prev) => {
      const nextRotative = hasExistingGameSelected ? isSelectedGameInRotativeList : false;
      if (prev.rotativeList === nextRotative) {
        return prev;
      }
      return {
        ...prev,
        rotativeList: nextRotative,
      };
    });
  }, [hasExistingGameSelected, isSelectedGameInRotativeList]);

  const resetForm = () => {
    setForm(buildInitialForm());
    setPlatinumFile(null);
    limparSelecaoSteam();
    setAviso(null);
  };

  const toggleCoopPlayer = (selectedUserId) => {
    setForm((prev) => {
      const isSelected = prev.coopPlayerUserIds.includes(selectedUserId);
      if (isSelected) {
        return {
          ...prev,
          coopPlayerUserIds: prev.coopPlayerUserIds.filter((id) => id !== selectedUserId),
        };
      }

      if (prev.coopPlayerUserIds.length >= 3) {
        avisar('Você pode selecionar no máximo 3 jogadores (com você, totaliza 4).');
        return prev;
      }

      return {
        ...prev,
        coopPlayerUserIds: [...prev.coopPlayerUserIds, selectedUserId],
      };
    });
  };

  const handleHypeParticipationToggle = (checked) => {
    setForm((prev) => ({
      ...prev,
      hypeParticipation: checked,
      hypeCompletedBonus: checked ? prev.hypeCompletedBonus : false,
      hoursPlayed: checked && !prev.hypeCompletedBonus ? '' : prev.hoursPlayed,
      firstTimeEver: checked ? false : prev.firstTimeEver,
      completedInReleaseYear: checked ? false : prev.completedInReleaseYear,
      platinum: checked ? false : prev.platinum,
      coop: checked ? false : prev.coop,
      coopPlayerUserIds: checked ? [] : prev.coopPlayerUserIds,
    }));
  };

  const handleHypeCompletedToggle = (checked) => {
    setForm((prev) => ({
      ...prev,
      hypeParticipation: checked ? true : prev.hypeParticipation,
      hypeCompletedBonus: checked,
      hoursPlayed: checked ? prev.hoursPlayed : '',
      firstTimeEver: checked ? prev.firstTimeEver : false,
      completedInReleaseYear: checked ? prev.completedInReleaseYear : false,
      platinum: checked ? prev.platinum : false,
      coop: checked ? prev.coop : false,
      coopPlayerUserIds: checked ? prev.coopPlayerUserIds : [],
    }));
  };

  // Situacao do jogo digitado, em uma linha so
  const situacaoJogo = !form.gameName.trim()
    ? { icone: Info, cor: 'text-slate-500 dark:text-slate-400', texto: 'Digite o nome: o sistema verifica se o jogo já existe.' }
    : hasUserCompletionForGame
      ? { icone: TriangleAlert, cor: 'text-red-600 dark:text-red-400', texto: 'Você já registrou este jogo. Para alterar, fale com um admin.' }
      : isSelectedGameInRotativeList
        ? { icone: Sparkles, cor: 'text-indigo-600 dark:text-indigo-300', texto: `Está na Lista Rotativa: +${pointsByRuleCode.ROTATIVE_LIST_BONUS} pontos ao concluir!` }
        : matchingGame
          ? { icone: CheckCircle2, cor: 'text-green-600 dark:text-green-400', texto: `Jogo já cadastrado: ${matchingGame.name}` }
          : jogoSteamSelecionado
            ? { icone: CheckCircle2, cor: 'text-green-600 dark:text-green-400', texto: 'Jogo da loja Steam: será cadastrado com o nome e o ano de lançamento oficiais.' }
            : { icone: Info, cor: 'text-amber-600 dark:text-amber-300', texto: 'Jogo novo: será cadastrado ao registrar. Se ele estiver na Steam, escolha a sugestão para preencher o ano.' };
  const IconeSituacao = situacaoJogo.icone;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Registrar Conclusão</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">Fechou um jogo? Conta pra gente. Os pontos entram depois da aprovação.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        autoComplete="off"
        className="space-y-6 rounded-2xl border border-slate-100 bg-white p-5 shadow sm:p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        {gamesLoadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300">
            Não foi possível carregar os jogos cadastrados. Recarregue a página ou verifique o backend.
          </div>
        )}

        {/* Jogo, data e horas na mesma linha */}
        <div className="grid gap-4 md:grid-cols-[1fr_11rem_9rem]">
          <label className="relative block">
            <Rotulo obrigatorio>Jogo</Rotulo>
            <input
              type="text"
              name="gameName"
              value={form.gameName}
              onChange={handleChange}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className={campoClasse}
              placeholder="Ex: Elden Ring"
              required
            />
            {(gameSuggestions.length > 0 || sugestoesSteam.length > 0) && !matchingGame && !jogoSteamSelecionado && (
              <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                {gameSuggestions.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(game)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <span className="truncate">{game.name}</span>
                    {game.isRotative && (
                      <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary dark:bg-primary/25 dark:text-indigo-200">
                        🔄 Rotativa
                      </span>
                    )}
                  </button>
                ))}
                <SugestoesSteam sugestoes={sugestoesSteam} onEscolher={handleSelectSteamSuggestion} />
              </div>
            )}
          </label>

          <label className="block">
            <Rotulo obrigatorio>Concluído em</Rotulo>
            <input type="date" name="completedAt" value={form.completedAt} onChange={handleChange} className={campoClasse} required />
          </label>

          <label className="block">
            <Rotulo obrigatorio={!isHypeParticipationOnly}>Horas</Rotulo>
            <input
              type="number"
              name="hoursPlayed"
              value={form.hoursPlayed}
              onChange={handleChange}
              step="0.5"
              min="0"
              inputMode="decimal"
              // Esconde as setinhas de aumentar/diminuir do campo numerico (Chrome, Edge e Firefox)
              className={`${campoClasse} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
              placeholder={isHypeParticipationOnly ? '—' : 'Ex: 35.5'}
              required={!isHypeParticipationOnly}
              disabled={isHypeParticipationOnly}
            />
          </label>

          <p className={`-mt-2 flex items-center gap-1.5 text-sm font-semibold md:col-span-3 ${situacaoJogo.cor}`}>
            <IconeSituacao className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0">{situacaoJogo.texto}</span>
          </p>
        </div>

        {/* Bonus */}
        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Bônus</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <OpcaoBonus
              regra="FIRST_EXPERIENCE"
              titulo="Primeira experiência"
              dica="Primeira vez na vida fechando este jogo"
              checked={form.firstTimeEver}
              onChange={(event) => setForm((prev) => ({ ...prev, firstTimeEver: event.target.checked }))}
              disabled={isHypeParticipationOnly}
            />
            <OpcaoBonus
              regra="PLATINUM"
              titulo="Platina (100%)"
              dica="O anexo precisa comprovar a platina"
              checked={form.platinum}
              onChange={(event) => setForm((prev) => ({ ...prev, platinum: event.target.checked }))}
              disabled={isHypeParticipationOnly}
            />
            <OpcaoBonus
              regra="IN_RELEASE_YEAR"
              titulo="Em dia"
              dica="Conta como lançamento do ano na edição"
              checked={form.completedInReleaseYear}
              onChange={(event) => setForm((prev) => ({ ...prev, completedInReleaseYear: event.target.checked }))}
              disabled={isHypeParticipationOnly}
            />
            <OpcaoBonus
              regra="COOP_RIGHT_HAND"
              titulo="Cooperativo"
              dica="Jogou junto com até 3 amigos"
              checked={form.coop}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  coop: event.target.checked,
                  coopPlayerUserIds: event.target.checked ? prev.coopPlayerUserIds : [],
                }))
              }
              disabled={isHypeParticipationOnly}
            />
            <OpcaoBonus
              regra="HYPE_PARTICIPATION"
              titulo="Participação do Hype"
              dica="Sem concluir, os outros bônus ficam travados"
              checked={form.hypeParticipation}
              onChange={(event) => handleHypeParticipationToggle(event.target.checked)}
            />
            {form.hypeParticipation && (
              <OpcaoBonus
                regra="HYPE_COMPLETION_BONUS"
                titulo="Concluí o jogo do Hype"
                dica="Libera os outros bônus de novo"
                checked={form.hypeCompletedBonus}
                onChange={(event) => handleHypeCompletedToggle(event.target.checked)}
              />
            )}
          </div>

          {form.coop && (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                <Users className="h-4 w-4" aria-hidden="true" /> Quem jogou com você ({form.coopPlayerUserIds.length + 1}/4)
              </p>
              <div className="flex flex-wrap gap-2">
                {users
                  .filter((candidate) => candidate.id !== user.id)
                  .map((candidate) => {
                    const checked = form.coopPlayerUserIds.includes(candidate.id);
                    return (
                      <label
                        key={candidate.id}
                        className={`cursor-pointer rounded-full border px-3 py-1 text-sm font-semibold transition ${
                          checked
                            ? 'border-primary bg-primary text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:border-primary/60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
                        }`}
                      >
                        <input type="checkbox" checked={checked} onChange={() => toggleCoopPlayer(candidate.id)} className="sr-only" />
                        {checked ? '✓ ' : ''}
                        {candidate.displayName}
                      </label>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Anexo */}
        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Comprovante <span className="text-red-500">*</span>
          </h2>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 p-3 transition hover:border-primary hover:bg-primary/5 dark:border-slate-700">
            <input type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
            {previewUrl ? (
              <img src={previewUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ImagePlus className="h-6 w-6" aria-hidden="true" />
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                {platinumFile ? platinumFile.name : 'Clique para escolher uma imagem'}
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                {platinumFile
                  ? `${formatFileSize(platinumFile.size)} · clique para trocar`
                  : `Print da tela final, conquista ou platina · até ${formatFileSize(MAX_PLATINUM_IMAGE_SIZE)}`}
              </span>
            </span>
          </label>
        </div>

        {aviso && (
          <div
            role="status"
            className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
              aviso.tipo === 'sucesso'
                ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-500/40 dark:bg-green-950/40 dark:text-green-300'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300'
            }`}
          >
            {aviso.texto}
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end dark:border-slate-800">
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 font-bold text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Limpar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || gamesLoading || hasUserCompletionForGame}
            className="rounded-xl bg-primary px-8 py-2.5 font-bold text-white transition hover:bg-secondary disabled:opacity-50"
          >
            {mutation.isPending ? 'Registrando...' : 'Registrar Conclusão'}
          </button>
        </div>
      </form>
    </div>
  );
}
