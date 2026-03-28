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

    if (token && userId) {
      setUser({
        id: userId,
        email: userEmail,
        displayName,
      });
    }

    setIsLoading(false);
  }, []);

  const persistSession = ({ accessToken, userId, displayName, email }) => {
    localStorage.setItem('auth_token', accessToken);
    localStorage.setItem('user_id', userId);
    localStorage.setItem('user_email', email);

    if (displayName) {
      localStorage.setItem('user_display_name', displayName);
    }

    setUser({ id: userId, email, displayName });
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, userId, displayName } = response.data;

      persistSession({ accessToken, userId, displayName, email });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const register = async (displayName, email, password) => {
    try {
      await api.post('/auth/register', {
        displayName,
        email,
        password,
      });

      return login(email, password);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_display_name');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
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
