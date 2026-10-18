import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(usuario, password);
      navigate('/menu');
    } catch (err) {
      setError(err.response?.data?.message || `Erro ao fazer login${err.response?.status ? ` (codigo ${err.response.status})` : ' (sem resposta do servidor)'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-secondary px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg bg-white p-8 shadow-2xl dark:bg-slate-900 dark:text-slate-100"
      >
        <h1 className="text-3xl font-bold text-center mb-2 text-primary">Game Ranking</h1>
        <p className="text-center text-gray-600 mb-8 dark:text-slate-300">Sistema de Ranking de Jogos</p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-gray-700 font-bold mb-2 dark:text-slate-200">Usuário</label>
          <input
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            placeholder="ex.: samy"
            required
          />
        </div>

        <div className="mb-6">
          <div className="mb-2 flex items-baseline justify-between">
            <label className="block text-gray-700 font-bold dark:text-slate-200">Senha</label>
            <Link to="/esqueci-senha" className="text-sm font-semibold text-primary hover:underline">
              Esqueci minha senha
            </Link>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary hover:bg-secondary text-white py-2 rounded-lg font-bold transition duration-200 disabled:opacity-50"
        >
          {isLoading ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="text-center mt-6 text-gray-600 dark:text-slate-300">
          Não tem conta?{' '}
          <Link to="/register" className="text-primary font-bold hover:underline">
            Criar conta
          </Link>
        </p>
      </form>
    </div>
  );
}
