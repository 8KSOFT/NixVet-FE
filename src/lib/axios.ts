import axios from 'axios';
import { getApiBaseUrl } from './api-base';

const api = axios.create({
  baseURL: getApiBaseUrl(),
});

function isPublicAuthRequest(config: { url?: string }) {
  const path = config.url || '';
  return path.includes('auth/login') || path.includes('auth/register');
}

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Login não deve enviar tenant/token antigos: o middleware usaria outro tenant e o login falha.
    if (!isPublicAuthRequest(config)) {
      const token = localStorage.getItem('accessToken');
      const tenantId = localStorage.getItem('tenantId');

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      if (tenantId) {
        config.headers['x-tenant-id'] = tenantId;
      }
    } else {
      delete config.headers.Authorization;
      delete config.headers['x-tenant-id'];
    }

    // Recalculate baseURL on client side to apply protocol auto-upgrade
    if (!config.baseURL || config.baseURL !== getApiBaseUrl()) {
      config.baseURL = getApiBaseUrl();
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      typeof window !== 'undefined' &&
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login')
    ) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('tenantId');
      localStorage.removeItem('tenantCode');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
