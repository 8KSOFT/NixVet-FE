import axios from 'axios';
import { getApiBaseUrl } from './api-base';
import { API_MESSAGE, isApiEnvelope } from '@/app/types/api-response';

const api = axios.create({
  baseURL: getApiBaseUrl(),
});

function isPublicAuthRequest(config: { url?: string }) {
  const path = config.url || '';
  return path.includes('auth/login') || path.includes('auth/register');
}

/** Lê um cookie pelo nome. Retorna null se não existir ou se não estiver no browser. */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Persiste tenantId em cookie para que novas abas no mesmo subdomínio
 * herdem o contexto sem depender exclusivamente do localStorage.
 * Chamado após login bem-sucedido (ver login/page.tsx).
 */
export function setTenantCookie(tenantId: string) {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `nixvet_tenant_id=${encodeURIComponent(tenantId)}; max-age=86400; path=/${secure}; SameSite=Lax`;
}

/** Remove o cookie de tenant (logout). */
export function clearTenantCookie() {
  document.cookie = 'nixvet_tenant_id=; max-age=0; path=/';
}

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Login não deve enviar tenant/token antigos: o middleware usaria outro tenant e o login falha.
    if (!isPublicAuthRequest(config)) {
      const token = localStorage.getItem('accessToken');
      // Lê tenantId do localStorage; se ausente (ex: localStorage limpo mas cookie presente), usa cookie.
      const tenantId = localStorage.getItem('tenantId') ?? getCookie('nixvet_tenant_id');

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

/**
 * O backend esta migrando gradualmente as respostas de sucesso para o envelope
 * { success, message, data } (ver DOCS/response-phase-1-front.md e response-phase-4-front.md).
 * Aqui detectamos o envelope por formato (nao por rota) e desembrulhamos `data` de forma
 * transparente, para que os hooks continuem lendo `response.data` como antes da migracao.
 * A mensagem do backend fica "grudada" (nao-enumeravel) no payload desembrulhado, para ser
 * usada pelo toast global de sucesso das mutations (ver AppProviders.tsx).
 */
api.interceptors.response.use(
  (response) => {
    if (isApiEnvelope(response.data)) {
      const { message, data: payload } = response.data;
      if (payload && (typeof payload === 'object' || typeof payload === 'function')) {
        Object.defineProperty(payload, API_MESSAGE, {
          value: message,
          enumerable: false,
          configurable: true,
        });
      }
      response.data = payload;
    }
    return response;
  },
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
      clearTenantCookie();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
