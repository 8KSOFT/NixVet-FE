import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Cada teste começa com a memória de envios e de falha de API zerada.
  vi.resetModules();
  fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.useRealTimers());

const carregar = () => import('./client-telemetry');
const corpoEnviado = (i = 0) => JSON.parse(fetchMock.mock.calls[i][1].body);

describe('reportarErroDoCliente', () => {
  it('envia com keepalive para o proxy same-origin e preenche a rota', async () => {
    const { reportarErroDoCliente } = await carregar();
    reportarErroDoCliente({ mensagem: 'Boom', stack: 'at x' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opcoes] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/client-telemetry/erro');
    expect(opcoes).toMatchObject({ method: 'POST', keepalive: true });
    expect(corpoEnviado()).toMatchObject({ mensagem: 'Boom', rota: window.location.pathname });
  });

  it('ignora erro sem mensagem', async () => {
    const { reportarErroDoCliente } = await carregar();
    reportarErroDoCliente({ mensagem: '' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a mesma mensagem na mesma rota é enviada uma vez a cada 30 s (página em laço de erro)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
    const { reportarErroDoCliente } = await carregar();
    for (let i = 0; i < 50; i++) reportarErroDoCliente({ mensagem: 'laço', rota: '/patients' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    reportarErroDoCliente({ mensagem: 'outra', rota: '/patients' });
    reportarErroDoCliente({ mensagem: 'laço', rota: '/agenda' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    vi.setSystemTime(new Date('2026-10-28T12:00:31Z'));
    reportarErroDoCliente({ mensagem: 'laço', rota: '/patients' });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('liga o erro de JS à última chamada de API que falhou, por 60 s', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
    const { registrarFalhaDeApi, reportarErroDoCliente } = await carregar();
    registrarFalhaDeApi('req-123');
    reportarErroDoCliente({ mensagem: 'tela branca' });
    expect(corpoEnviado(0).requestId).toBe('req-123');

    vi.setSystemTime(new Date('2026-10-28T12:01:01Z'));
    reportarErroDoCliente({ mensagem: 'tarde demais' });
    expect(corpoEnviado(1).requestId).toBeUndefined();
  });

  it('o requestId informado vence o recente; registrar vazio não apaga o anterior', async () => {
    const { registrarFalhaDeApi, reportarErroDoCliente } = await carregar();
    registrarFalhaDeApi('req-1');
    registrarFalhaDeApi(undefined);
    registrarFalhaDeApi(null);
    reportarErroDoCliente({ mensagem: 'a' });
    reportarErroDoCliente({ mensagem: 'b', requestId: 'explicito' });
    expect(corpoEnviado(0).requestId).toBe('req-1');
    expect(corpoEnviado(1).requestId).toBe('explicito');
  });

  it('nunca lança, nem quando o fetch falha', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    const { reportarErroDoCliente } = await carregar();
    expect(() => reportarErroDoCliente({ mensagem: 'x' })).not.toThrow();
    fetchMock.mockImplementation(() => {
      throw new Error('síncrono');
    });
    expect(() => reportarErroDoCliente({ mensagem: 'y' })).not.toThrow();
  });
});

describe('instalarCapturaDeErros', () => {
  it('captura erro global e promise rejeitada, e desliga ao limpar', async () => {
    const { instalarCapturaDeErros } = await carregar();
    const desligar = instalarCapturaDeErros();

    window.dispatchEvent(new ErrorEvent('error', { message: 'falhou', filename: 'app.js', lineno: 10, colno: 5, error: new Error('falhou') }));
    expect(corpoEnviado(0)).toMatchObject({ mensagem: 'falhou', origem: 'app.js:10:5' });

    const evento = new Event('unhandledrejection') as Event & { reason: unknown };
    evento.reason = new Error('promessa quebrada');
    window.dispatchEvent(evento);
    expect(corpoEnviado(1)).toMatchObject({ mensagem: 'promessa quebrada', origem: 'unhandledrejection' });

    desligar();
    window.dispatchEvent(new ErrorEvent('error', { message: 'depois de desligar' }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejeição com valor que não é Error vira texto', async () => {
    const { instalarCapturaDeErros } = await carregar();
    const desligar = instalarCapturaDeErros();
    const evento = new Event('unhandledrejection') as Event & { reason: unknown };
    evento.reason = 'texto solto';
    window.dispatchEvent(evento);
    expect(corpoEnviado(0).mensagem).toBe('texto solto');
    desligar();
  });
});
