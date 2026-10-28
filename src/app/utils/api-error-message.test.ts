import { describe, expect, it } from 'vitest';
import { getApiErrorMessage } from './api-error-message';

const comResposta = (status: number, data: object, extra: object = {}) => ({ isAxiosError: true, response: { status, data }, ...extra });

describe('getApiErrorMessage', () => {
  it('mensagem do servidor, nos dois formatos', () => {
    expect(getApiErrorMessage(comResposta(422, { statusCode: 422, message: 'CPF inválido' }), 'x')).toBe('CPF inválido');
    expect(getApiErrorMessage(comResposta(422, { status: 422, detail: 'CPF inválido' }), 'x')).toBe('CPF inválido');
  });

  it('lista de mensagens de validação: a primeira', () => {
    expect(getApiErrorMessage(comResposta(400, { message: ['nome é obrigatório', 'cpf inválido'] }), 'x')).toBe('nome é obrigatório');
  });

  it('5xx leva o código; 4xx não', () => {
    expect(getApiErrorMessage(comResposta(500, { message: 'Falha', requestId: 'abcdef1234567890' }), 'x')).toBe('Falha Código: abcdef12');
    expect(getApiErrorMessage(comResposta(400, { message: 'Dado ruim', requestId: 'abcdef1234567890' }), 'x')).toBe('Dado ruim');
  });

  it('não repete o código se a mensagem já o tem', () => {
    const msg = getApiErrorMessage(comResposta(500, { message: 'Falha Código: abcdef12', requestId: 'abcdef1234567890' }), 'x');
    expect(msg.match(/abcdef12/g)).toHaveLength(1);
  });

  it('timeout e queda de rede ganham texto em português', () => {
    expect(getApiErrorMessage({ isAxiosError: true, code: 'ECONNABORTED', message: 'timeout of 20000ms exceeded' }, 'x')).toMatch(/demorou/);
    expect(getApiErrorMessage({ isAxiosError: true, code: 'ERR_NETWORK', message: 'Network Error' }, 'x')).toMatch(/Sem conexão/);
  });

  it('cancelamento não é erro de rede: cai na mensagem do próprio erro', () => {
    expect(getApiErrorMessage({ isAxiosError: true, code: 'ERR_CANCELED', message: 'canceled' }, 'x')).toBe('canceled');
  });

  it('erro qualquer: a mensagem dele, ou o fallback', () => {
    expect(getApiErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
    expect(getApiErrorMessage(null, 'fallback')).toBe('fallback');
    expect(getApiErrorMessage(comResposta(500, {}), 'fallback')).toBe('fallback');
  });
});
