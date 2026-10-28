import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() } }));

import api, { TIMEOUT_PADRAO_MS, clearClientSession } from './axios';
import { API_MESSAGE } from '@/app/types/api-response';
import { getLastBillingBlock, subscribeBillingBlock } from './billing-block';

type Resposta = { status?: number; data?: unknown; headers?: Record<string, string> };
type Handler = (config: AxiosRequestConfig) => Resposta | Promise<Resposta>;

/** Troca o transporte do axios: o interceptor roda de verdade, a rede não. */
function servir(handler: Handler) {
  const chamadas: AxiosRequestConfig[] = [];
  api.defaults.adapter = async (config) => {
    chamadas.push(config as AxiosRequestConfig);
    const { status = 200, data = {}, headers = {} } = await handler(config as AxiosRequestConfig);
    const resposta = { data, status, statusText: String(status), headers, config } as AxiosResponse;
    if (status >= 400) {
      throw new AxiosError(`HTTP ${status}`, String(status), config, null, resposta);
    }
    return resposta;
  };
  return chamadas;
}

function definirCookie(nome: string, valor: string) {
  document.cookie = `${nome}=${valor}; path=/`;
}

let navegou: string | null = null;

beforeEach(() => {
  navegou = null;
  toastError.mockReset();
  vi.stubGlobal('location', {
    pathname: '/patients',
    protocol: 'http:',
    set href(v: string) {
      navegou = v;
    },
    get href() {
      return 'http://localhost/patients';
    },
  });
});

afterEach(() => {
  for (const c of ['nixvet_csrf', 'nixvet_tenant_id']) document.cookie = `${c}=; max-age=0; path=/`;
});

describe('requisição', () => {
  it('manda x-request-id único por chamada', async () => {
    const chamadas = servir(() => ({}));
    await api.get('/patients');
    await api.get('/patients');
    const [a, b] = chamadas.map((c) => c.headers as unknown as Record<string, string>);
    expect(a['x-request-id']).toMatch(/[0-9a-f-]{36}/);
    expect(a['x-request-id']).not.toBe(b['x-request-id']);
  });

  // ACHADO (2026-10-28): o interceptor só pede `application/problem+json` quando `Accept` está vazio,
  // mas o axios já preenche `Accept: application/json, text/plain, */*` ANTES dos interceptors. Na
  // prática o pedido do formato novo de erro (E12, ADR-003) nunca sai e a API responde o envelope
  // antigo. Este teste documenta o comportamento de hoje; quando alguém corrigir de propósito (e
  // conferir todas as telas que leem `response.data.message`), a asserção abaixo passa a falhar e
  // deve virar `toContain('application/problem+json')`.
  it('hoje o Accept padrão do axios vence e o problem+json não é pedido', async () => {
    const chamadas = servir(() => ({}));
    await api.get('/patients');
    const h = chamadas[0].headers as unknown as Record<string, string>;
    expect(h['Accept']).toBe('application/json, text/plain, */*');
  });

  it('manda o tenant do localStorage, ou do cookie quando ele existe', async () => {
    const chamadas = servir(() => ({}));
    localStorage.setItem('tenantId', 'tenant-ls');
    await api.get('/patients');
    definirCookie('nixvet_tenant_id', 'tenant-cookie');
    await api.get('/patients');
    expect((chamadas[0].headers as unknown as Record<string, string>)['x-tenant-id']).toBe('tenant-ls');
    expect((chamadas[1].headers as unknown as Record<string, string>)['x-tenant-id']).toBe('tenant-cookie');
  });

  it('só mutação leva o token CSRF', async () => {
    definirCookie('nixvet_csrf', 'csrf-123');
    const chamadas = servir(() => ({}));
    await api.get('/patients');
    await api.post('/patients', {});
    await api.delete('/patients/1');
    const h = chamadas.map((c) => c.headers as unknown as Record<string, string>);
    expect(h[0]['x-csrf-token']).toBeUndefined();
    expect(h[1]['x-csrf-token']).toBe('csrf-123');
    expect(h[2]['x-csrf-token']).toBe('csrf-123');
  });

  it('login e cadastro não mandam tenant antigo nem CSRF', async () => {
    definirCookie('nixvet_csrf', 'csrf-123');
    localStorage.setItem('tenantId', 'tenant-antigo');
    const chamadas = servir(() => ({}));
    await api.post('/auth/login', {});
    await api.post('/billing/register', {});
    for (const c of chamadas) {
      const h = c.headers as unknown as Record<string, string>;
      expect(h['x-tenant-id']).toBeUndefined();
      expect(h['x-csrf-token']).toBeUndefined();
    }
  });

  it('timeout: padrão, longo para blob e IA, maior ainda para upload, e quem define manda', async () => {
    const chamadas = servir(() => ({}));
    await api.get('/patients');
    await api.get('/prescriptions/1/pdf', { responseType: 'blob' });
    await api.post('/ai/format-text', {});
    await api.post('/patient-files', new FormData());
    await api.get('/patients', { timeout: 1234 });
    expect(chamadas.map((c) => c.timeout)).toEqual([TIMEOUT_PADRAO_MS, 60_000, 60_000, 120_000, 1234]);
  });
});

describe('resposta de sucesso', () => {
  it('desembrulha o envelope { success, message, data } e guarda a mensagem fora do enumerável', async () => {
    servir(() => ({ data: { success: true, message: 'Paciente criado', data: { id: 'p1', name: 'Ana' } } }));
    const { data } = await api.post('/patients', {});
    expect(data).toEqual({ id: 'p1', name: 'Ana' });
    expect(Object.keys(data)).not.toContain(API_MESSAGE.toString());
    expect((data as Record<symbol | string, unknown>)[API_MESSAGE as symbol]).toBe('Paciente criado');
  });

  it('resposta que não é envelope passa como veio', async () => {
    servir(() => ({ data: [{ id: 1 }] }));
    const { data } = await api.get('/patients');
    expect(data).toEqual([{ id: 1 }]);
  });

  it('envelope com data primitivo não quebra (contador de notificações)', async () => {
    servir(() => ({ data: { success: true, message: 'ok', data: 7 } }));
    const { data } = await api.get('/x');
    expect(data).toBe(7);
  });
});

describe('erro do servidor', () => {
  it('5xx ganha o código da requisição no fim da mensagem que a tela mostra', async () => {
    servir(() => ({ status: 500, data: { statusCode: 500, message: 'Falha interna', requestId: 'abcdef1234567890' } }));
    const erro = await api.get('/x').catch((e: AxiosError) => e);
    expect((erro as AxiosError<{ message: string }>).response?.data.message).toBe('Falha interna Código: abcdef12');
  });

  it('4xx não leva código', async () => {
    servir(() => ({ status: 422, data: { statusCode: 422, message: 'CPF inválido', requestId: 'abcdef1234567890' } }));
    const erro = await api.post('/x', {}).catch((e: AxiosError) => e);
    expect((erro as AxiosError<{ message: string }>).response?.data.message).toBe('CPF inválido');
  });

  it('corpo de erro em Blob vira JSON, para a tela ler a mensagem do servidor', async () => {
    const corpo = new Blob([JSON.stringify({ message: 'Exportação acima de 50.000 linhas' })], { type: 'application/json' });
    servir(() => ({ status: 422, data: corpo, headers: { 'content-type': 'application/json' } }));
    const erro = await api.get('/export', { responseType: 'blob' }).catch((e: AxiosError) => e);
    expect((erro as AxiosError<{ message: string }>).response?.data.message).toBe('Exportação acima de 50.000 linhas');
  });
});

describe('402: bloqueio de cobrança', () => {
  it('publica o bloqueio, avisa e leva para o checkout', async () => {
    const ouvinte = vi.fn();
    const cancelar = subscribeBillingBlock(ouvinte);
    servir(() => ({ status: 402, data: { statusCode: 402, message: 'Teste encerrado', code: 'TRIAL_EXPIRED' } }));
    await expect(api.post('/patients', {})).rejects.toBeTruthy();
    cancelar();
    expect(ouvinte).toHaveBeenCalledWith({ code: 'TRIAL_EXPIRED', message: 'Teste encerrado' });
    expect(getLastBillingBlock()?.code).toBe('TRIAL_EXPIRED');
    expect(toastError).toHaveBeenCalledWith('Teste encerrado');
    expect(navegou).toBe('/billing/upgrade');
  });

  it('somente leitura avisa mas deixa a pessoa na tela', async () => {
    servir(() => ({ status: 402, data: { statusCode: 402, message: 'Somente leitura', code: 'SUBSCRIPTION_READ_ONLY' } }));
    await expect(api.post('/patients', {})).rejects.toBeTruthy();
    expect(getLastBillingBlock()?.code).toBe('SUBSCRIPTION_READ_ONLY');
    expect(navegou).toBeNull();
  });

  it('já dentro de /billing não redireciona de novo', async () => {
    (window.location as unknown as { pathname: string }).pathname = '/billing/upgrade';
    servir(() => ({ status: 402, data: { statusCode: 402, message: 'Suspensa', code: 'SUBSCRIPTION_SUSPENDED' } }));
    await expect(api.get('/x')).rejects.toBeTruthy();
    expect(navegou).toBeNull();
  });

  it('402 sem código de cobrança conhecido não vira bloqueio', async () => {
    servir(() => ({ status: 402, data: { statusCode: 402, message: 'Outro', code: 'OUTRO' } }));
    await expect(api.get('/x')).rejects.toBeTruthy();
    expect(navegou).toBeNull();
  });

  it('o mesmo aviso não empilha toasts', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
    servir(() => ({ status: 402, data: { statusCode: 402, message: 'Somente leitura', code: 'SUBSCRIPTION_CANCELLED' } }));
    await api.get('/a').catch(() => {});
    await api.get('/b').catch(() => {});
    expect(toastError).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date('2026-10-28T12:00:09Z'));
    await api.get('/c').catch(() => {});
    expect(toastError).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe('401: renovação da sessão', () => {
  it('renova uma vez e repete a requisição original', async () => {
    let renovado = false;
    const post = vi.spyOn(axios, 'post').mockImplementation(async () => {
      renovado = true;
      return { data: {} };
    });
    const chamadas = servir(() => (renovado ? { data: { ok: true } } : { status: 401, data: {} }));
    const { data } = await api.get('/patients');
    expect(data).toEqual({ ok: true });
    expect(post).toHaveBeenCalledTimes(1);
    expect(String(post.mock.calls[0][0])).toContain('/auth/refresh');
    expect(chamadas).toHaveLength(2);
    expect(navegou).toBeNull();
  });

  it('seis requisições com a sessão vencida abrem um refresh só', async () => {
    let renovado = false;
    let solta!: () => void;
    const post = vi.spyOn(axios, 'post').mockImplementation(
      () =>
        new Promise((resolve) => {
          solta = () => {
            renovado = true;
            resolve({ data: {} });
          };
        }),
    );
    servir(() => (renovado ? { data: { ok: true } } : { status: 401, data: {} }));
    const todas = Promise.all(Array.from({ length: 6 }, (_, i) => api.get(`/r${i}`)));
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    solta();
    const respostas = await todas;
    expect(respostas.every((r) => (r.data as { ok: boolean }).ok)).toBe(true);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('refresh recusado: limpa a sessão e vai para o login', async () => {
    localStorage.setItem('user', '{}');
    localStorage.setItem('tenantId', 't');
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('refresh recusado'));
    servir(() => ({ status: 401, data: {} }));
    await expect(api.get('/patients')).rejects.toBeTruthy();
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('tenantId')).toBeNull();
    expect(navegou).toBe('/login');
  });

  it('só tenta renovar uma vez: se a repetição também der 401, desloga', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ data: {} });
    servir(() => ({ status: 401, data: {} }));
    await expect(api.get('/patients')).rejects.toBeTruthy();
    expect(navegou).toBe('/login');
  });

  it('401 do próprio login não renova nem redireciona', async () => {
    const post = vi.spyOn(axios, 'post');
    servir(() => ({ status: 401, data: { message: 'Credenciais inválidas' } }));
    await expect(api.post('/auth/login', {})).rejects.toBeTruthy();
    expect(post).not.toHaveBeenCalled();
    expect(navegou).toBeNull();
  });

  it('401 do refresh e do logout não entram em laço', async () => {
    const post = vi.spyOn(axios, 'post');
    servir(() => ({ status: 401, data: {} }));
    await expect(api.post('/auth/logout')).rejects.toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });
});

describe('clearClientSession', () => {
  it('apaga o que o cliente guardou da sessão, inclusive o resquício do accessToken', () => {
    for (const k of ['accessToken', 'tenantId', 'tenantCode', 'user']) localStorage.setItem(k, 'x');
    localStorage.setItem('preferencia', 'fica');
    clearClientSession();
    for (const k of ['accessToken', 'tenantId', 'tenantCode', 'user']) expect(localStorage.getItem(k)).toBeNull();
    expect(localStorage.getItem('preferencia')).toBe('fica');
  });
});
