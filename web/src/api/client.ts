import axios from 'axios';
import { getApiUrl } from '../utils/env';

// Handle import.meta.env for both Vite and Jest
const getApiBaseUrl = () => {
  // Check for test mock first (set in jest setup)
  if ((globalThis as any).__VITE_API_URL__) {
    return (globalThis as any).__VITE_API_URL__;
  }
  
  // Get API URL from environment
  const viteApiUrl = getApiUrl();
  if (viteApiUrl) {
    return viteApiUrl;
  }
  
  // Fallback to relative URL (works in development with Vite proxy, fails in production)
  // In production, VITE_API_URL must be set!
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    console.error('⚠️ VITE_API_URL is not set in production!');
    console.error('Please set VITE_API_URL environment variable in Railway to your backend URL');
    console.error('Example: https://zerosum-production.up.railway.app/api');
    console.error('⚠️ IMPORTANT: Must include /api at the end!');
  }
  
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

// Log API URL in development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  console.log('🔗 API Base URL:', API_BASE_URL);
}

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
      // Clear auth data on 401, but don't automatically redirect
      // Let components handle the error and decide whether to redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Dispatch custom event to notify AuthContext to update state
      window.dispatchEvent(new Event('auth-cleared'));
    }
    return Promise.reject(error);
  }
);

export default apiClient;

