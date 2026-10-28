import { beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();
const clearClientSession = vi.fn();
vi.mock('@/lib/axios', () => ({ default: { post: (...a: unknown[]) => post(...a) }, clearClientSession: () => clearClientSession() }));

import { destroySession, establishSession, hasClientSession, limparDadoPessoalLegado, semDadoPessoal } from './session';

const usuario = { tenant_id: 't-1', name: 'Dra. Ana', email: 'ana@clinica.com', role: 'doctor' };

beforeEach(() => {
  post.mockReset();
  clearClientSession.mockReset();
});

describe('establishSession', () => {
  it('guarda tenant, código e usuário, sem o e-mail', () => {
    establishSession(usuario, 'VIDA');
    expect(localStorage.getItem('tenantId')).toBe('t-1');
    expect(localStorage.getItem('tenantCode')).toBe('VIDA');
    const salvo = JSON.parse(localStorage.getItem('user')!);
    expect(salvo).toEqual({ tenant_id: 't-1', name: 'Dra. Ana', role: 'doctor' });
    expect(salvo).not.toHaveProperty('email');
  });
});

describe('semDadoPessoal', () => {
  it('tira só o e-mail', () => {
    expect(semDadoPessoal(usuario)).toEqual({ tenant_id: 't-1', name: 'Dra. Ana', role: 'doctor' });
  });
});

describe('limparDadoPessoalLegado', () => {
  it('remove o e-mail de uma sessão antiga', () => {
    localStorage.setItem('user', JSON.stringify(usuario));
    limparDadoPessoalLegado();
    expect(JSON.parse(localStorage.getItem('user')!)).not.toHaveProperty('email');
  });
  it('não faz nada sem usuário, já limpo ou com JSON quebrado', () => {
    expect(() => limparDadoPessoalLegado()).not.toThrow();
    localStorage.setItem('user', '{quebrado');
    expect(() => limparDadoPessoalLegado()).not.toThrow();
    expect(localStorage.getItem('user')).toBe('{quebrado');
  });
});

describe('hasClientSession', () => {
  it('há sessão quando o usuário está guardado', () => {
    expect(hasClientSession()).toBe(false);
    localStorage.setItem('user', '{}');
    expect(hasClientSession()).toBe(true);
  });
});

describe('destroySession', () => {
  it('pede o logout ao backend e limpa o cliente', async () => {
    post.mockResolvedValue({});
    await destroySession();
    expect(post).toHaveBeenCalledWith('/auth/logout');
    expect(clearClientSession).toHaveBeenCalledTimes(1);
  });
  it('limpa o cliente mesmo se o logout falhar (sessão já expirada)', async () => {
    post.mockRejectedValue(new Error('401'));
    await expect(destroySession()).resolves.toBeUndefined();
    expect(clearClientSession).toHaveBeenCalledTimes(1);
  });
});
