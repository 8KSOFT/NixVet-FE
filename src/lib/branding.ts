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
  primaryColor: '#2563eb',
  faviconUrl: null,
  tenantCode: null,
  tenantId: null,
};

export async function fetchPublicBranding(): Promise<PublicBranding> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return fallbackBranding;

  try {
    const host = typeof window !== 'undefined' ? window.location.host : '';
    const query = host ? `?host=${encodeURIComponent(host)}` : '';
    const response = await fetch(`${apiUrl}/tenants/public-brand${query}`, {
      cache: 'no-store',
    });
    if (!response.ok) return fallbackBranding;
    const data = await response.json();
    return { ...fallbackBranding, ...data };
  } catch {
    return fallbackBranding;
  }
}
