import { afterEach, describe, expect, it, vi } from 'vitest';
import { codigoDoProblema, logarErroDeApi, problemaDe } from './problem';

const erro = (response: unknown, extra: object = {}) => ({ response, ...extra });

describe('problemaDe', () => {
  it('null quando não houve resposta da API (rede, timeout)', () => {
    expect(problemaDe(new Error('timeout'))).toBeNull();
    expect(problemaDe(null)).toBeNull();
    expect(problemaDe(undefined)).toBeNull();
  });

  it('lê application/problem+json (RFC 7807)', () => {
    const p = problemaDe(
      erro({
        status: 402,
        data: { status: 402, detail: 'Assinatura suspensa', code: 'SUBSCRIPTION_SUSPENDED', instance: 'abcdef1234567890', title: 'Pagamento' },
      }),
    );
    expect(p).toEqual({
      status: 402,
      detail: 'Assinatura suspensa',
      code: 'SUBSCRIPTION_SUSPENDED',
      instance: 'abcdef1234567890',
      title: 'Pagamento',
    });
  });

  it('lê o envelope antigo { statusCode, message, requestId }', () => {
    const p = problemaDe(erro({ status: 404, data: { statusCode: 404, message: 'Paciente não encontrado', requestId: 'req-1' } }));
    expect(p).toMatchObject({ status: 404, detail: 'Paciente não encontrado', instance: 'req-1' });
  });

  it('message em lista: a primeira vira detail e, com mais de uma, todas vão em erros', () => {
    const duas = problemaDe(erro({ status: 400, data: { message: ['nome é obrigatório', 'cpf inválido'] } }));
    expect(duas?.detail).toBe('nome é obrigatório');
    expect(duas?.erros).toEqual(['nome é obrigatório', 'cpf inválido']);

    const uma = problemaDe(erro({ status: 400, data: { message: ['nome é obrigatório'] } }));
    expect(uma?.erros).toBeUndefined();
  });

  it('o status do corpo vence o da resposta HTTP, e sem corpo usa o da resposta', () => {
    expect(problemaDe(erro({ status: 500, data: { status: 503 } }))?.status).toBe(503);
    expect(problemaDe(erro({ status: 500, data: null }))?.status).toBe(500);
  });

  it('o código da requisição cai no header da resposta e depois no da requisição', () => {
    const daResposta = problemaDe(erro({ status: 500, data: {}, headers: { 'x-request-id': 'resp-id' } }));
    expect(daResposta?.instance).toBe('resp-id');

    const daRequisicao = problemaDe(erro({ status: 500, data: {} }, { config: { headers: { 'x-request-id': 'req-id' } } }));
    expect(daRequisicao?.instance).toBe('req-id');
  });
});

describe('codigoDoProblema', () => {
  it('os 8 primeiros caracteres do instance', () => {
    expect(codigoDoProblema({ status: 500, detail: '', instance: 'abcdef1234567890' })).toBe('abcdef12');
    expect(codigoDoProblema({ status: 500, detail: '' })).toBeUndefined();
    expect(codigoDoProblema(null)).toBeUndefined();
  });
});

describe('logarErroDeApi', () => {
  afterEach(() => vi.restoreAllMocks());

  it('registra só status, código e request_id, nunca o corpo da requisição', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logarErroDeApi('ao salvar paciente', {
      response: { status: 422, data: { code: 'CPF_INVALIDO', instance: 'abc' } },
      config: { data: '{"name":"Maria","cpf":"52998224725"}' },
    });
    expect(spy).toHaveBeenCalledTimes(1);
    const [contexto, dados] = spy.mock.calls[0];
    expect(contexto).toBe('ao salvar paciente');
    expect(dados).toEqual({ status: 422, code: 'CPF_INVALIDO', request_id: 'abc' });
    expect(JSON.stringify(spy.mock.calls)).not.toContain('52998224725');
  });

  it('sem resposta registra nulos', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logarErroDeApi('sem rede', new Error('Network Error'));
    expect(spy.mock.calls[0][1]).toEqual({ status: null, code: null, request_id: null });
  });
});
