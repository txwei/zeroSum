import axios from 'axios';

// Handle import.meta.env for both Vite and Jest
// In Jest, import.meta is not available, so we use a fallback
// @ts-ignore - import.meta is available in Vite but not in Jest
const getApiBaseUrl = () => {
  // Check for test mock first
  if ((globalThis as any).__VITE_API_URL__) {
    return (globalThis as any).__VITE_API_URL__;
  }
  
  // Check for Vite environment variable
  let viteApiUrl: string | undefined;
  try {
    // @ts-ignore
    viteApiUrl = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_URL : undefined;
  } catch (e) {
    // import.meta not available (e.g., in Jest)
  }
  
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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

