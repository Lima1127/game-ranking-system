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

    if (token && userId) {
      setUser({
        id: userId,
        email: userEmail,
        displayName,
        role,
      });
    }

    setIsLoading(false);
  }, []);

  const persistSession = ({ accessToken, userId, displayName, email, role }) => {
    localStorage.setItem('auth_token', accessToken);
    localStorage.setItem('user_id', userId);
    localStorage.setItem('user_email', email);
    localStorage.setItem('user_role', role);

    if (displayName) {
      localStorage.setItem('user_display_name', displayName);
    }

    setUser({ id: userId, email, displayName, role });
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { accessToken, userId, displayName, role } = response.data;

    persistSession({ accessToken, userId, displayName, email, role });
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
