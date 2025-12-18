import axios from 'axios';

// Handle import.meta.env for both Vite and Jest
// In Jest, import.meta is not available, so we use a fallback
// @ts-ignore - import.meta is available in Vite but not in Jest
const API_BASE_URL = (globalThis as any).__VITE_API_URL__ || 
  (typeof (globalThis as any).import !== 'undefined' && (globalThis as any).import.meta?.env?.VITE_API_URL) ||
  '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

