import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const api = axios.create({
  baseURL: API_URL
});

// Interceptador de requisição: adiciona JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      
      // Se é requisição para /completions, adicionar X-User-Id
      if (config.url?.includes('/completions')) {
        const userId = localStorage.getItem('user_id');
        if (userId) {
          config.headers['X-User-Id'] = userId;
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptador de resposta: trata erros 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_id');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
