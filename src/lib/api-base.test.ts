import { describe, expect, it, vi } from 'vitest';
import { getApiBaseUrl } from './api-base';

describe('getApiBaseUrl', () => {
  it('sem variável, aponta para a API local', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    expect(getApiBaseUrl()).toBe('http://localhost:8537/api');
  });
  it.each(['same-origin', 'relative', 'SAME-ORIGIN'])('%s usa o proxy do mesmo host', (v) => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', v);
    expect(getApiBaseUrl()).toBe('/api');
  });
  it('acrescenta /api uma vez só e tira barra final', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.exemplo.com');
    expect(getApiBaseUrl()).toBe('https://api.exemplo.com/api');
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.exemplo.com/api/');
    expect(getApiBaseUrl()).toBe('https://api.exemplo.com/api');
  });
  it('página em https com API em http sobe para https (evita conteúdo misto)', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.exemplo.com');
    vi.stubGlobal('window', { location: { protocol: 'https:' } });
    expect(getApiBaseUrl()).toBe('https://api.exemplo.com/api');
  });
  it('página em http mantém o http (dev)', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:9000');
    vi.stubGlobal('window', { location: { protocol: 'http:' } });
    expect(getApiBaseUrl()).toBe('http://localhost:9000/api');
  });
});
