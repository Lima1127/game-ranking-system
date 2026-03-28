import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function CompletionPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    gameId: '',
    editionId: '',
    completedAt: new Date().toISOString().split('T')[0],
    hoursPlayed: '',
    firstTimeEver: false,
    firstInEdition: false,
    completedInReleaseYear: false,
    platinum: false
  });

  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const response = await api.get('/games');
      return response.data;
    }
  });

  const mutation = useMutation({
    mutationFn: async () => {
      return api.post('/completions', form, {
        headers: { 'X-User-Id': user.id }
      });
    },
    onSuccess: () => {
      alert('✅ Conclusão registrada com sucesso!');
      // Resetar form
      setForm({
        gameId: '',
        editionId: '',
        completedAt: new Date().toISOString().split('T')[0],
        hoursPlayed: '',
        firstTimeEver: false,
        firstInEdition: false,
        completedInReleaseYear: false,
        platinum: false
      });
      // Invalidar cache do ranking
      queryClient.invalidateQueries({ queryKey: ['ranking'] });
    },
    onError: (error) => {
      alert('❌ Erro ao registrar: ' + (error.response?.data?.message || error.message));
    }
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.gameId || !form.hoursPlayed) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    mutation.mutate();
  };

  const selectedGame = games.find(g => g.id === form.gameId);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">✅ Registrar Conclusão</h1>
      <p className="text-gray-600 mb-8">Informe um jogo que você completou</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Jogo */}
          <div>
            <label className="block text-gray-700 font-bold mb-2">
              Jogo <span className="text-red-500">*</span>
            </label>
            <select
              name="gameId"
              value={form.gameId}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
              disabled={gamesLoading}
            >
              <option value="">
                {gamesLoading ? 'Carregando jogos...' : 'Selecione um jogo'}
              </option>
              {games.map(game => (
                <option key={game.id} value={game.id}>
                  {game.name} ({game.releaseYear})
                </option>
              ))}
            </select>
          </div>

          {/* Data */}
          <div>
            <label className="block text-gray-700 font-bold mb-2">
              Data de Conclusão <span className="text-red-500">*</span>
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

          {/* Horas */}
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

          {/* Info do Jogo */}
          {selectedGame && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Campanha:</strong> {selectedGame.estimatedHoursMain || '?'} horas
              </p>
              <p className="text-sm text-gray-600">
                <strong>Platina:</strong> {selectedGame.estimatedHoursPlatinum || '?'} horas
              </p>
            </div>
          )}
        </div>

        {/* Checkboxes */}
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
              🆕 Primeira Experiência
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
              👑 Platina (100%)
              <span className="block text-xs text-gray-500 font-normal">Atingiu 100% de completude</span>
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
              🥇 Primeiro na Edição
              <span className="block text-xs text-gray-500 font-normal">Primeiro participante a completar nesta edição</span>
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
              📅 Em Dia
              <span className="block text-xs text-gray-500 font-normal">Completou no ano de lançamento</span>
            </span>
          </label>
        </div>

        {/* Submit */}
        <div className="mt-8 flex gap-4">
          <button
            type="submit"
            disabled={mutation.isLoading || gamesLoading}
            className="flex-1 bg-primary hover:bg-secondary text-white font-bold py-3 rounded-lg transition duration-200 disabled:opacity-50"
          >
            {mutation.isLoading ? '⏳ Registrando...' : '✅ Registrar Conclusão'}
          </button>
          <button
            type="button"
            onClick={() => {
              setForm({
                gameId: '',
                editionId: '',
                completedAt: new Date().toISOString().split('T')[0],
                hoursPlayed: '',
                firstTimeEver: false,
                firstInEdition: false,
                completedInReleaseYear: false,
                platinum: false
              });
            }}
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

      {/* Info */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 mb-2">💡 Dica</h3>
        <p className="text-blue-800 text-sm">
          Quanto mais campos você marcar, mais pontos ganhará! Aproveite bônus especiais como "Primeira Experiência", "Platina" e "Tempo Valioso" (25h).
        </p>
      </div>
    </div>
  );
}
