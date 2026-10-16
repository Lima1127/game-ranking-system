import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EsqueciSenhaPage from './pages/EsqueciSenhaPage';
import MenuPage from './pages/MenuPage';
import RankingPage from './pages/RankingPage';
import CompletionPage from './pages/CompletionPage';
import CompletionSubmissionEditPage from './pages/CompletionSubmissionEditPage';
import CompletionUpdatePage from './pages/CompletionUpdatePage';
import RequestsPage from './pages/RequestsPage';
import ObligationsPage from './pages/ObligationsPage';
import RotativeListPage from './pages/RotativeListPage';
import AdminRecordsPage from './pages/AdminRecordsPage';
import AdminAuditLogsPage from './pages/AdminAuditLogsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import { isStaffRole } from './utils/roles';
import { BarraInferior, CabecalhoSite } from './components/CabecalhoSite';

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

  if (!isStaffRole(user.role)) {
    return <Navigate to="/menu" replace />;
  }

  return children;
}

function MainLayout({ children, isDarkMode, onToggleTheme }) {
  return (
    <div className="relative min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
      {/* Brilho suave de cor atras do cabecalho */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_20%_-30%,rgba(102,126,234,0.28),transparent_70%),radial-gradient(45%_90%_at_90%_-35%,rgba(118,75,162,0.25),transparent_70%)]"
      />
      <CabecalhoSite isDarkMode={isDarkMode} onToggleTheme={onToggleTheme} />
      <main className="container relative mx-auto px-4 pb-28 pt-8 lg:pb-8">{children}</main>
      <BarraInferior />
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
      <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
      <Route
        path="/menu"
        element={
          <ProtectedRoute>
            <MainLayout isDarkMode={isDarkMode} onToggleTheme={onToggleTheme}>
              <MenuPage />
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
        path="/admin/users"
        element={
          <AdminRoute>
            <MainLayout isDarkMode={isDarkMode} onToggleTheme={onToggleTheme}>
              <AdminUsersPage />
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
      {/* Endereco antigo: quem tiver salvo /dashboard cai no Menu */}
      <Route path="/dashboard" element={<Navigate to="/menu" replace />} />
      <Route path="/" element={<Navigate to={user ? '/menu' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);

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
