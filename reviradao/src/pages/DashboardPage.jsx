import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

      <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-lg shadow-lg p-8 mb-8">
        <h2 className="text-3xl font-bold mb-2">
          Bem-vindo, {localStorage.getItem('user_display_name') || user?.email}!
        </h2>
        <p className="opacity-90">Acompanhe seu progresso no sistema de ranking</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 font-semibold mb-2">Seu Email</h3>
          <p className="text-2xl font-bold text-primary">{user?.email}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 font-semibold mb-2">ID do Usuario</h3>
          <p className="text-sm font-mono text-gray-700">{user?.id}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 font-semibold mb-2">Status</h3>
          <p className="text-2xl font-bold text-green-600">Ativo</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-8">
        <h3 className="text-2xl font-bold mb-6">Acoes Rapidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/ranking"
            className="bg-primary hover:bg-secondary text-white px-6 py-3 rounded-lg font-bold text-center transition duration-200"
          >
            Ver Ranking
          </Link>
          <Link
            to="/completion"
            className="bg-secondary hover:bg-primary text-white px-6 py-3 rounded-lg font-bold text-center transition duration-200"
          >
            Registrar Conclusao
          </Link>
        </div>
      </div>
    </div>
  );
}
