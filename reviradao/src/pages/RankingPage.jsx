import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export default function RankingPage() {
  const { data: ranking = [], isLoading, error } = useQuery({
    queryKey: ['ranking'],
    queryFn: async () => {
      const response = await api.get('/ranking');
      return response.data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando ranking...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🏆 Ranking</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg">
          <p className="font-bold">Erro ao carregar ranking</p>
          <p className="text-sm mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">🏆 Ranking</h1>
      <p className="text-gray-600 mb-8">Confira a posição dos jogadores</p>

      {ranking.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">Ainda não há conclusões registradas.</p>
          <a
            href="/completion"
            className="inline-block bg-primary hover:bg-secondary text-white px-6 py-2 rounded font-bold"
          >
            Registrar Conclusão
          </a>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-primary to-secondary text-white">
                <th className="px-6 py-4 text-left font-bold">Posição</th>
                <th className="px-6 py-4 text-left font-bold">Jogador</th>
                <th className="px-6 py-4 text-right font-bold">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((row, index) => (
                <tr
                  key={row.userId}
                  className={`border-b transition duration-150 ${
                    index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                  } hover:bg-gray-100`}
                >
                  <td className="px-6 py-4">
                    <span className="font-bold text-lg">
                      {index === 0 && '🥇'}
                      {index === 1 && '🥈'}
                      {index === 2 && '🥉'}
                      {index > 2 && `#${index + 1}`}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold">{row.displayName}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="bg-primary text-white px-4 py-2 rounded-full font-bold">
                      {row.totalPoints} pts
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
