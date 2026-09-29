import axios from 'axios';

// Padrao relativo: usa o proxy do Vite (vite.config.js), funcionando em localhost e via tunel.
const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_URL,
});

// Interceptador de requisicao: adiciona token Bearer
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptador de resposta: trata erros 401 e usa a mensagem do backend nas telas
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const backendMessage = error.response?.data?.message;
    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      // Telas que exibem error.message passam a mostrar "Usuario nao encontrado"
      // em vez de "Request failed with status code 404".
      error.message = backendMessage;
    }

    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_display_name');
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_avatar_uploaded_at');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
