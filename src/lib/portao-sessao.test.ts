import { describe, expect, it } from 'vitest';
import { ROTAS_PROTEGIDAS, SESSION_HINT_COOKIE, authGateMode, destinoLogin, isRotaProtegida } from './portao-sessao';

describe('authGateMode', () => {
  it('desligado por padrão e para qualquer valor desconhecido', () => {
    expect(authGateMode(undefined)).toBe('off');
    expect(authGateMode('')).toBe('off');
    expect(authGateMode('talvez')).toBe('off');
  });
  it('observe e on, sem se importar com caixa e espaço', () => {
    expect(authGateMode('observe')).toBe('observe');
    expect(authGateMode(' ON ')).toBe('on');
  });
});

describe('isRotaProtegida', () => {
  it('toda rota da lista é protegida, com ou sem subcaminho', () => {
    for (const r of ROTAS_PROTEGIDAS) {
      expect(isRotaProtegida(`/${r}`)).toBe(true);
      expect(isRotaProtegida(`/${r}/qualquer/coisa`)).toBe(true);
    }
  });
  it('rotas redirecionadas para /settings também', () => {
    expect(isRotaProtegida('/produtos')).toBe(true);
    expect(isRotaProtegida('/team')).toBe(true);
  });
  it('páginas públicas e arquivos nunca caem no portão', () => {
    for (const p of ['/', '/login', '/register', '/privacidade', '/_next/static/x.js', '/favicon.ico', '/convite/abc']) {
      expect(isRotaProtegida(p)).toBe(false);
    }
  });
  it('destino fixo, sem open redirect', () => {
    expect(destinoLogin()).toBe('/login');
    expect(SESSION_HINT_COOKIE).toBe('nixvet_csrf');
  });
});
