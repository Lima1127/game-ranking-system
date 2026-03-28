import { useState } from 'react';
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
});

function formatFileSize(size) {
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export default function CompletionPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(buildInitialForm);
  const [platinumFile, setPlatinumFile] = useState(null);

  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const response = await api.get('/games');
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
          coop: false,
          coopPlayers: null,
          hypeParticipation: false,
          hypeCompletedBonus: false,
          rotativeList: false,
          notes: null,
        },
        {
          headers: { 'X-User-Id': user.id },
        }
      );
    },
    onSuccess: () => {
      alert('Solicitacao enviada com sucesso! Ela so contara pontos depois da aprovacao.');
      setForm(buildInitialForm());
      setPlatinumFile(null);
      queryClient.invalidateQueries({ queryKey: ['completion-requests'] });
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

    if (!platinumFile) {
      alert('Anexe uma imagem para enviar a solicitacao.');
      return;
    }

    mutation.mutate();
  };

  const matchingGame = games.find((game) => game.name.trim().toLowerCase() === form.gameName.trim().toLowerCase());

  const resetForm = () => {
    setForm(buildInitialForm());
    setPlatinumFile(null);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">Registrar Conclusao</h1>
      <p className="text-gray-600 mb-8">Informe o jogo livremente. Se ele ainda nao existir, sera criado automaticamente.</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-gray-700 font-bold mb-2">
              Jogo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="gameName"
              value={form.gameName}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: Elden Ring"
              required
            />
            <p className="mt-2 text-sm text-gray-500">
              O nome e digitado livremente pelo usuario. Nao depende mais de uma lista fechada.
            </p>
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">
              Data de Conclusao <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="completedAt"
              value={form.completedAt}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">
              Horas Jogadas <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="hoursPlayed"
              value={form.hoursPlayed}
              onChange={handleChange}
              step="0.5"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: 35.5"
              required
            />
          </div>

          <div className="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
            {form.gameName.trim() ? (
              matchingGame ? (
                <p className="text-sm text-green-700">
                  Este jogo ja existe no sistema e sera reutilizado: <strong>{matchingGame.name}</strong>
                </p>
              ) : (
                <p className="text-sm text-amber-700">
                  Este jogo ainda nao existe no sistema. Ele sera criado automaticamente ao registrar a conclusao.
                </p>
              )
            ) : (
              <p className="text-sm text-gray-500">Preencha o nome para o sistema verificar se o jogo ja existe.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <label className="flex items-center cursor-pointer p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <input
              type="checkbox"
              name="firstTimeEver"
              checked={form.firstTimeEver}
              onChange={handleChange}
              className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
            />
            <span className="ml-3 font-semibold text-gray-700">
              Primeira Experiencia
              <span className="block text-xs text-gray-500 font-normal">Primeira vez na vida completando este jogo</span>
            </span>
          </label>

          <label className="flex items-center cursor-pointer p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <input
              type="checkbox"
              name="platinum"
              checked={form.platinum}
              onChange={handleChange}
              className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
            />
              <span className="ml-3 font-semibold text-gray-700">
                Platina (100%)
              <span className="block text-xs text-gray-500 font-normal">Marque quando o anexo enviado comprovar a platina.</span>
            </span>
          </label>

          <label className="flex items-center cursor-pointer p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <input
              type="checkbox"
              name="firstInEdition"
              checked={form.firstInEdition}
              onChange={handleChange}
              className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
            />
            <span className="ml-3 font-semibold text-gray-700">
              Primeiro na Edicao
              <span className="block text-xs text-gray-500 font-normal">Primeiro participante a completar nesta edicao</span>
            </span>
          </label>

          <label className="flex items-center cursor-pointer p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <input
              type="checkbox"
              name="completedInReleaseYear"
              checked={form.completedInReleaseYear}
              onChange={handleChange}
              className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
            />
            <span className="ml-3 font-semibold text-gray-700">
              Em Dia
              <span className="block text-xs text-gray-500 font-normal">Marque quando este jogo deve contar como lancamento do ano na edicao</span>
            </span>
          </label>
        </div>

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <label className="block text-amber-900 font-bold mb-2">
            Anexo da Solicitacao <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-amber-900 file:mr-4 file:rounded-lg file:border-0 file:bg-amber-600 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-amber-700"
          />
          <p className="mt-2 text-sm text-amber-800">
            Toda solicitacao exige uma imagem anexada, com limite de {formatFileSize(MAX_PLATINUM_IMAGE_SIZE)}.
          </p>
          {platinumFile && (
            <p className="mt-2 text-sm text-amber-900">
              Arquivo selecionado: <strong>{platinumFile.name}</strong> ({formatFileSize(platinumFile.size)})
            </p>
          )}
        </div>

        <div className="mt-8 flex gap-4">
          <button
            type="submit"
            disabled={mutation.isPending || gamesLoading}
            className="flex-1 bg-primary hover:bg-secondary text-white font-bold py-3 rounded-lg transition duration-200 disabled:opacity-50"
          >
            {mutation.isPending ? 'Registrando...' : 'Registrar Conclusao'}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="px-6 bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 rounded-lg transition duration-200"
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

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 mb-2">Dica</h3>
        <p className="text-blue-800 text-sm">
          Se o jogo ainda nao existir no sistema, ele sera cadastrado automaticamente com o genero padrao "Nao informado" e ano tecnico igual ao da data de conclusao.
        </p>
      </div>
    </div>
  );
}
