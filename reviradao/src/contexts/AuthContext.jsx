import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userId = localStorage.getItem('user_id');
    const userEmail = localStorage.getItem('user_email');
    const displayName = localStorage.getItem('user_display_name');
    const role = localStorage.getItem('user_role');
    const avatarUploadedAt = localStorage.getItem('user_avatar_uploaded_at');

    if (token && userId) {
      setUser({
        id: userId,
        email: userEmail,
        displayName,
        role,
        avatarUploadedAt: avatarUploadedAt || null,
      });
    }

    setIsLoading(false);
  }, []);

  const persistSession = ({ accessToken, userId, displayName, email, role, avatarUploadedAt }) => {
    localStorage.setItem('auth_token', accessToken);
    localStorage.setItem('user_id', userId);
    localStorage.setItem('user_email', email);
    localStorage.setItem('user_role', role);

    if (displayName) {
      localStorage.setItem('user_display_name', displayName);
    }
    if (avatarUploadedAt) {
      localStorage.setItem('user_avatar_uploaded_at', avatarUploadedAt);
    } else {
      localStorage.removeItem('user_avatar_uploaded_at');
    }

    setUser({ id: userId, email, displayName, role, avatarUploadedAt: avatarUploadedAt || null });
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { accessToken, userId, displayName, role, avatarUploadedAt } = response.data;

    persistSession({ accessToken, userId, displayName, email, role, avatarUploadedAt });
    return response.data;
  };

  const register = async (displayName, email, password) => {
    await api.post('/auth/register', {
      displayName,
      email,
      password,
    });

    return login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_display_name');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_avatar_uploaded_at');
    setUser(null);
  };

  const updateAvatar = (avatarUploadedAt) => {
    localStorage.setItem('user_avatar_uploaded_at', avatarUploadedAt);
    setUser((prev) => (prev ? { ...prev, avatarUploadedAt } : prev));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
