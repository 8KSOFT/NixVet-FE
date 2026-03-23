import axios from 'axios';

const rawBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
let baseURL = rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/?$/, '')}/api`;
// Evitar mixed-content: se a página está em HTTPS, forçar API em HTTPS
if (typeof window !== 'undefined' && window.location.protocol === 'https:' && baseURL.startsWith('http://')) {
  baseURL = baseURL.replace(/^http:\/\//, 'https://');
}

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // Important for CORS if needed, though JWT is header based
});

api.interceptors.request.use(
  (config) => {
    // Add Authorization header if token exists
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Add Tenant ID header
      // In a real multi-tenant app, this might come from the URL subdomain or a selector
      // For now, let's assume it's stored or we use a default/test one if not present
      const tenantId = localStorage.getItem('tenantId');
      if (tenantId) {
        config.headers['x-tenant-id'] = tenantId;
      } else {
        // Fallback for dev/testing if needed, or don't send and let backend fail
        // config.headers['x-tenant-id'] = 'default-tenant-id'; 
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401: token ausente, expirado ou inválido — limpar e redirecionar ao login
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const isAuthRoute = originalRequest?.url?.includes('/auth/login');
      if (!isAuthRoute) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('tenantId');
        localStorage.removeItem('tenantCode');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
