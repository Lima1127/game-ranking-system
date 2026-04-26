import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import RankingPage from './pages/RankingPage';
import CompletionPage from './pages/CompletionPage';
import CompletionSubmissionEditPage from './pages/CompletionSubmissionEditPage';
import CompletionUpdatePage from './pages/CompletionUpdatePage';
import RequestsPage from './pages/RequestsPage';
import ObligationsPage from './pages/ObligationsPage';
import RotativeListPage from './pages/RotativeListPage';
import AdminRecordsPage from './pages/AdminRecordsPage';
import AdminAuditLogsPage from './pages/AdminAuditLogsPage';

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function MainLayout({ children, isDarkMode, onToggleTheme }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors">
      <header className="bg-gradient-to-r from-primary to-secondary text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Game Ranking</h1>
          <nav className="flex gap-4 items-center flex-wrap">
            <Link to="/dashboard" className="hover:opacity-80">
              Dashboard
            </Link>
            <Link to="/ranking" className="hover:opacity-80">
              Ranking
            </Link>
            <Link to="/completion" className="hover:opacity-80">
              Registrar
            </Link>
            <Link to="/requests" className="hover:opacity-80">
              Solicitacoes
            </Link>
            <Link to="/obligations" className="hover:opacity-80">
              Obrigacoes
            </Link>
            <Link to="/rotative-list" className="hover:opacity-80">
              Lista Rotativa
            </Link>
            {user?.role === 'ADMIN' && (
              <>
                <Link to="/admin/records" className="hover:opacity-80">
                  Admin
                </Link>
                <Link to="/admin/logs" className="hover:opacity-80">
                  Logs
                </Link>
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em]">
                  Admin
                </span>
              </>
            )}
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDarkMode ? 'Ativar tema claro' : 'Ativar tema escuro'}
              title={isDarkMode ? 'Ativar tema claro' : 'Ativar tema escuro'}
              className={`relative h-10 w-20 rounded-full border transition-all duration-300 ${
                isDarkMode
                  ? 'border-white/30 bg-black/90'
                  : 'border-white/50 bg-slate-100/90'
              }`}
            >
              <span
                className={`absolute top-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-lg transition-all duration-300 ${
                  isDarkMode
                    ? 'left-1 bg-white text-slate-900'
                    : 'left-11 bg-slate-900 text-white'
                }`}
                aria-hidden="true"
              >
                {isDarkMode ? '☀' : '☾'}
              </span>
            </button>
            <button
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-bold"
            >
              Sair
            </button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

function AppContent({ isDarkMode, onToggleTheme }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MainLayout isDarkMode={isDarkMode} onToggleTheme={onToggleTheme}>
              <DashboardPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ranking"
        element={
          <ProtectedRoute>
            <MainLayout isDarkMode={isDarkMode} onToggleTheme={onToggleTheme}>
              <RankingPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/completion"
        element={
          <ProtectedRoute>
            <MainLayout isDarkMode={isDarkMode} onToggleTheme={onToggleTheme}>
              <CompletionPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/completion/:completionId/update"
        element={
          <ProtectedRoute>
            <MainLayout isDarkMode={isDarkMode} onToggleTheme={onToggleTheme}>
              <CompletionUpdatePage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests"
        element={
          <ProtectedRoute>
            <MainLayout isDarkMode={isDarkMode} onToggleTheme={onToggleTheme}>
              <RequestsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/obligations"
        element={
          <ProtectedRoute>
            <MainLayout isDarkMode={isDarkMode} onToggleTheme={onToggleTheme}>
              <ObligationsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/rotative-list"
        element={
          <ProtectedRoute>
            <MainLayout isDarkMode={isDarkMode} onToggleTheme={onToggleTheme}>
              <RotativeListPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests/:kind/:submissionId/edit"
        element={
          <ProtectedRoute>
            <MainLayout isDarkMode={isDarkMode} onToggleTheme={onToggleTheme}>
              <CompletionSubmissionEditPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/records"
        element={
          <AdminRoute>
            <MainLayout isDarkMode={isDarkMode} onToggleTheme={onToggleTheme}>
              <AdminRecordsPage />
            </MainLayout>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/logs"
        element={
          <AdminRoute>
            <MainLayout isDarkMode={isDarkMode} onToggleTheme={onToggleTheme}>
              <AdminAuditLogsPage />
            </MainLayout>
          </AdminRoute>
        }
      />
      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      return;
    }
    if (savedTheme === 'light') {
      setIsDarkMode(false);
      return;
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode((prev) => !prev)}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
