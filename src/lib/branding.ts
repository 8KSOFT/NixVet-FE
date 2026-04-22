import { getApiBaseUrl } from './api-base';

export interface PublicBranding {
  appName: string;
  logoUrl: string | null;
  primaryColor: string;
  faviconUrl: string | null;
  tenantCode: string | null;
  tenantId: string | null;
}

const fallbackBranding: PublicBranding = {
  appName: 'NixVetApp',
  logoUrl: null,
  primaryColor: '#0E1E2F',
  faviconUrl: null,
  tenantCode: null,
  tenantId: null,
};

const BRANDING_CACHE_KEY = 'nixvet_public_branding_v1';
const BRANDING_TTL_MS = 5 * 60 * 1000;

export async function fetchPublicBranding(): Promise<PublicBranding> {
  try {
    const apiUrl = getApiBaseUrl();

    const host = typeof window !== 'undefined' ? window.location.host : '';
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(BRANDING_CACHE_KEY);
        if (raw) {
          const entry = JSON.parse(raw) as { at: number; host: string; data: PublicBranding };
          if (
            entry?.at &&
            entry.host === host &&
            Date.now() - entry.at < BRANDING_TTL_MS &&
            entry.data
          ) {
            return { ...fallbackBranding, ...entry.data };
          }
        }
      } catch {
        /* ignore */
      }
    }

    const query = host ? `?host=${encodeURIComponent(host)}` : '';
    const response = await fetch(`${apiUrl}/tenants/public-brand${query}`, {
      cache: 'no-store',
    });
    if (!response.ok) return fallbackBranding;
    const data = await response.json();
    const merged = { ...fallbackBranding, ...data };
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(
          BRANDING_CACHE_KEY,
          JSON.stringify({ at: Date.now(), host, data: merged }),
        );
      } catch {
        /* ignore */
      }
    }
    return merged;
  } catch {
    return fallbackBranding;
  }
}
