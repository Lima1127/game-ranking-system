import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const MAX_PLATINUM_IMAGE_SIZE = 5 * 1024 * 1024;

const buildInitialForm = () => ({
  gameName: '',
  completedAt: new Date().toISOString().split('T')[0],
  hoursPlayed: '',
  firstTimeEver: false,
  firstInEdition: false,
  completedInReleaseYear: false,
  platinum: false,
  rotativeList: false,
  coop: false,
  coopPlayerUserIds: [],
});

function formatFileSize(size) {
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export default function CompletionPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(buildInitialForm);
  const [platinumFile, setPlatinumFile] = useState(null);

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
      releaseYear: Number(form.completedAt.slice(0, 4)),
      estimatedHoursMain: null,
      estimatedHoursPlatinum: null,
      genres: ['Nao informado'],
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
    payload.append('file', platinumFile);

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
          hoursPlayed: form.hoursPlayed,
          firstTimeEver: form.firstTimeEver,
          completedInReleaseYear: form.completedInReleaseYear,
          platinum: form.platinum,
          platinumProofId,
          coop: form.coop,
          coopPlayers: form.coop ? form.coopPlayerUserIds.length + 1 : null,
          coopPlayerUserIds: form.coop ? form.coopPlayerUserIds : [],
          hypeParticipation: false,
          hypeCompletedBonus: false,
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
        alert(`Solicitacao de coop enviada para voce e mais ${form.coopPlayerUserIds.length} jogador(es). Todas contarao pontos apenas apos aprovacao.`);
      } else {
        alert('Solicitacao enviada com sucesso! Ela so contara pontos depois da aprovacao.');
      }
      setForm(buildInitialForm());
      setPlatinumFile(null);
      queryClient.invalidateQueries({ queryKey: ['completion-requests'] });
      queryClient.invalidateQueries({ queryKey: ['completion-submissions'] });
    },
    onError: (error) => {
      alert(`Erro ao registrar: ${error.response?.data?.message || error.message}`);
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
      alert('Envie apenas arquivos de imagem.');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_PLATINUM_IMAGE_SIZE) {
      alert(`A imagem excede o limite de ${formatFileSize(MAX_PLATINUM_IMAGE_SIZE)}.`);
      e.target.value = '';
      return;
    }

    setPlatinumFile(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.gameName.trim() || !form.hoursPlayed) {
      alert('Preencha nome do jogo e horas jogadas.');
      return;
    }

    if (hasUserCompletionForGame) {
      alert('Voce ja possui uma conclusao registrada para este jogo. Caso precise alterar essa informacao, entre em contato com o administrador.');
      return;
    }

    if (!platinumFile) {
      alert('Anexe uma imagem para enviar a solicitacao.');
      return;
    }

    if (form.coop) {
      if (form.coopPlayerUserIds.length === 0) {
        alert('Selecione ao menos um jogador para o cooperativo.');
        return;
      }

      if (form.coopPlayerUserIds.length + 1 > 4) {
        alert('Cooperativo permite no maximo 4 jogadores contando com voce.');
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
  const hasUserCompletionForGame = matchingGame
    ? myCompletionRequests.some((request) => request.gameId === matchingGame.id)
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

  const handleSelectSuggestion = (gameSuggestion) => {
    setForm((prev) => ({
      ...prev,
      gameName: gameSuggestion.name,
      rotativeList: gameSuggestion.isRotative,
    }));
  };

  useEffect(() => {
    if (hasExistingGameSelected && !isSelectedGameInRotativeList) {
      setForm((prev) => ({
        ...prev,
        firstInEdition: false,
      }));
    }
  }, [hasExistingGameSelected, isSelectedGameInRotativeList]);

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
        alert('Voce pode selecionar no maximo 3 jogadores (com voce, totaliza 4).');
        return prev;
      }

      return {
        ...prev,
        coopPlayerUserIds: [...prev.coopPlayerUserIds, selectedUserId],
      };
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">Registrar Conclusao</h1>
      <p className="text-gray-600 dark:text-slate-300 mb-8">Informe o jogo livremente. Se ele ainda nao existir, sera criado automaticamente.</p>

      <form onSubmit={handleSubmit} autoComplete="off" className="bg-white dark:bg-slate-900 rounded-lg shadow p-8 border border-gray-100 dark:border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {gamesLoadError && (
            <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Nao foi possivel carregar os jogos cadastrados. Recarregue a pagina ou verifique o backend.
            </div>
          )}

          <div className="md:col-span-2">
            <label className="block text-gray-700 dark:text-slate-200 font-bold mb-2">
              Jogo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="gameName"
              value={form.gameName}
              onChange={handleChange}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: Elden Ring"
              required
            />
            {gameSuggestions.length > 0 && (
              <div className="mt-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                {gameSuggestions.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(game)}
                    className="flex w-full items-center justify-between border-b border-gray-100 dark:border-slate-700 px-4 py-2 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 last:border-b-0"
                  >
                    <span>{game.name}</span>
                    {game.isRotative && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary dark:bg-primary/25 dark:text-indigo-200">
                        🔄 Reviradao
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-gray-700 dark:text-slate-200 font-bold mb-2">
              Data de Conclusao <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="completedAt"
              value={form.completedAt}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 dark:text-slate-200 font-bold mb-2">
              Horas Jogadas <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="hoursPlayed"
              value={form.hoursPlayed}
              onChange={handleChange}
              step="0.5"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: 35.5"
              required
            />
          </div>

          <div className="md:col-span-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-4">
            {form.gameName.trim() ? (
              hasUserCompletionForGame ? (
                <p className="text-sm text-red-700">
                  Voce ja possui uma conclusao registrada para este jogo. Caso precise alterar essa informacao, entre em contato com o administrador.
                </p>
              ) : isSelectedGameInRotativeList ? (
                <p className="text-sm text-indigo-700">
                  Este jogo esta na <strong>Lista Rotativa</strong> e recebe bonus de <strong>+3 pontos</strong> quando concluido.
                </p>
              ) : matchingGame ? (
                <p className="text-sm text-green-700">
                  Este jogo ja existe no sistema e sera reutilizado: <strong>{matchingGame.name}</strong>
                </p>
              ) : (
                <p className="text-sm text-amber-700">
                  Este jogo ainda nao existe no sistema. Ele sera criado automaticamente ao registrar a conclusao.
                </p>
              )
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400">Preencha o nome para o sistema verificar se o jogo ja existe.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <label className="flex items-center cursor-pointer p-4 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition">
            <input
              type="checkbox"
              name="firstTimeEver"
              checked={form.firstTimeEver}
              onChange={handleChange}
              className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
            />
            <span className="ml-3 font-semibold text-gray-700 dark:text-slate-200">
              Primeira Experiencia
              <span className="block text-xs text-gray-500 dark:text-slate-400 font-normal">Primeira vez na vida completando este jogo</span>
            </span>
          </label>

          <label className="flex items-center cursor-pointer p-4 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition">
            <input
              type="checkbox"
              name="platinum"
              checked={form.platinum}
              onChange={handleChange}
              className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
            />
              <span className="ml-3 font-semibold text-gray-700 dark:text-slate-200">
                Platina (100%)
              <span className="block text-xs text-gray-500 dark:text-slate-400 font-normal">Marque quando o anexo enviado comprovar a platina.</span>
            </span>
          </label>

          <label className="flex items-center cursor-pointer p-4 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition">
            <input
              type="checkbox"
              name="firstInEdition"
              checked={form.firstInEdition}
              onChange={handleChange}
              disabled={hasExistingGameSelected && !isSelectedGameInRotativeList}
              className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
            />
            <span className="ml-3 font-semibold text-gray-700 dark:text-slate-200">
              Primeiro na Edicao
              <span className="block text-xs text-gray-500 dark:text-slate-400 font-normal">
                {hasExistingGameSelected && !isSelectedGameInRotativeList
                  ? 'Desabilitado porque este jogo ja existe no sistema.'
                  : hasExistingGameSelected && isSelectedGameInRotativeList
                    ? 'Habilitado porque este jogo pertence a lista rotativa.'
                  : 'Primeiro participante a completar nesta edicao'}
              </span>
            </span>
          </label>

          <label className="flex items-center cursor-pointer p-4 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition">
            <input
              type="checkbox"
              name="completedInReleaseYear"
              checked={form.completedInReleaseYear}
              onChange={handleChange}
              className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
            />
            <span className="ml-3 font-semibold text-gray-700 dark:text-slate-200">
              Em Dia
              <span className="block text-xs text-gray-500 dark:text-slate-400 font-normal">Marque quando este jogo deve contar como lancamento do ano na edicao</span>
            </span>
          </label>
        </div>

        <div className="mt-6 space-y-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-5">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="coop"
              checked={form.coop}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  coop: event.target.checked,
                  coopPlayerUserIds: event.target.checked ? prev.coopPlayerUserIds : [],
                }))
              }
              className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
            />
            <span className="ml-3 font-semibold text-gray-700 dark:text-slate-200">
              Jogo em Cooperativo
              <span className="block text-xs text-gray-500 dark:text-slate-400 font-normal">
                Se marcado, selecione os jogadores que jogaram com voce (maximo de 4 contando com voce).
              </span>
            </span>
          </label>

          {form.coop && (
            <div>
              <p className="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">Jogadores do coop ({form.coopPlayerUserIds.length + 1}/4)</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {users
                  .filter((candidate) => candidate.id !== user.id)
                  .map((candidate) => {
                    const checked = form.coopPlayerUserIds.includes(candidate.id);
                    return (
                      <label
                        key={candidate.id}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition ${
                          checked
                            ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
                            : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCoopPlayer(candidate.id)}
                          className="h-4 w-4 rounded"
                        />
                        <span className="text-sm font-semibold">{candidate.displayName}</span>
                      </label>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-400/35 dark:bg-[#243247]">
          <label className="block text-indigo-900 dark:text-indigo-100 font-bold mb-2">
            Anexo da Solicitacao <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-indigo-900 dark:text-indigo-100 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-indigo-700"
          />
          <p className="mt-2 text-sm text-indigo-800 dark:text-indigo-200">
            Toda solicitacao exige uma imagem anexada, com limite de {formatFileSize(MAX_PLATINUM_IMAGE_SIZE)}.
          </p>
          {platinumFile && (
            <p className="mt-2 text-sm text-indigo-900 dark:text-indigo-100">
              Arquivo selecionado: <strong>{platinumFile.name}</strong> ({formatFileSize(platinumFile.size)})
            </p>
          )}
        </div>

        <div className="mt-8 flex gap-4">
          <button
            type="submit"
            disabled={mutation.isPending || gamesLoading || hasUserCompletionForGame}
            className="flex-1 bg-primary hover:bg-secondary text-white font-bold py-3 rounded-lg transition duration-200 disabled:opacity-50"
          >
            {mutation.isPending ? 'Registrando...' : 'Registrar Conclusao'}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="px-6 bg-gray-400 hover:bg-gray-500 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition duration-200"
          >
            Limpar
          </button>
        </div>

        {mutation.error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {mutation.error.message}
          </div>
        )}
      </form>

      <div className="mt-8 bg-blue-50 dark:bg-slate-900 border border-blue-200 dark:border-slate-700 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 dark:text-sky-300 mb-2">Dica</h3>
        <p className="text-blue-800 dark:text-slate-300 text-sm">
          Se o jogo ainda nao existir no sistema, ele sera cadastrado automaticamente com o genero padrao "Nao informado" e ano tecnico igual ao da data de conclusao.
        </p>
      </div>
    </div>
  );
}
