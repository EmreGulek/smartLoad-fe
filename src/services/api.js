import axios from 'axios';

/**
 * Shared axios instance for SmartLoad backend calls.
 *
 * Vite dev server proxies /api/* to http://localhost:8080 (see vite.config.js).
 * In production, set VITE_API_BASE_URL in .env to override.
 */
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartload_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      localStorage.removeItem('smartload_auth_token');
      localStorage.removeItem('smartload_auth_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// Phase 0 sanity check used by services/health on first load.
export async function getHealth() {
  const { data } = await api.get('/health');
  return data;
}
