import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPublicBranding } from './branding';

const PADRAO = { appName: 'NixVetApp', logoUrl: null, primaryColor: '#0E1E2F', faviconUrl: null, tenantCode: null, tenantId: null };

beforeEach(() => {
  sessionStorage.clear();
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.exemplo.com');
});
afterEach(() => vi.unstubAllGlobals());

function respostaOk(corpo: object) {
  return { ok: true, json: async () => corpo } as Response;
}

describe('fetchPublicBranding', () => {
  it('mescla a marca da clínica sobre o padrão e consulta pelo host', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaOk({ appName: 'Clínica Vida', primaryColor: '#123456' }));
    vi.stubGlobal('fetch', fetchMock);
    const marca = await fetchPublicBranding();
    expect(marca).toEqual({ ...PADRAO, appName: 'Clínica Vida', primaryColor: '#123456' });
    const [url, opcoes] = fetchMock.mock.calls[0];
    expect(url).toMatch(/^https:\/\/api\.exemplo\.com\/api\/tenants\/public-brand\?host=/);
    expect(opcoes.cache).toBe('no-store');
    expect(opcoes.signal).toBeInstanceOf(AbortSignal);
  });

  it('guarda em sessionStorage e a segunda chamada não vai à rede', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respostaOk({ appName: 'Clínica Vida' }));
    vi.stubGlobal('fetch', fetchMock);
    await fetchPublicBranding();
    const segunda = await fetchPublicBranding();
    expect(segunda.appName).toBe('Clínica Vida');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('cache vencido (mais de 5 minutos) busca de novo', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
    const fetchMock = vi.fn().mockResolvedValue(respostaOk({ appName: 'A' }));
    vi.stubGlobal('fetch', fetchMock);
    await fetchPublicBranding();
    vi.setSystemTime(new Date('2026-10-28T12:06:00Z'));
    await fetchPublicBranding();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('cache de outro host é ignorado', async () => {
    sessionStorage.setItem(
      'nixvet_public_branding_v1',
      JSON.stringify({ at: Date.now(), host: 'outro.host', data: { appName: 'Outra' } }),
    );
    const fetchMock = vi.fn().mockResolvedValue(respostaOk({ appName: 'Clínica Vida' }));
    vi.stubGlobal('fetch', fetchMock);
    expect((await fetchPublicBranding()).appName).toBe('Clínica Vida');
  });

  it('resposta com erro ou falha de rede cai na marca padrão, sem lançar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false } as Response));
    expect(await fetchPublicBranding()).toEqual(PADRAO);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('rede')));
    expect(await fetchPublicBranding()).toEqual(PADRAO);
  });

  it('cache com JSON quebrado não derruba', async () => {
    sessionStorage.setItem('nixvet_public_branding_v1', '{quebrado');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respostaOk({ appName: 'X' })));
    expect((await fetchPublicBranding()).appName).toBe('X');
  });
});
