import { describe, expect, it } from 'vitest';
import { buildCsp, cspHeaders, cspMode } from './csp';

describe('cspMode', () => {
  it('report por padrão', () => {
    expect(cspMode(undefined)).toBe('report');
    expect(cspMode('qualquer')).toBe('report');
  });
  it('enforce e off, sem se importar com caixa', () => {
    expect(cspMode('ENFORCE')).toBe('enforce');
    expect(cspMode(' off ')).toBe('off');
  });
});

describe('buildCsp', () => {
  it('fecha o que não precisa estar aberto', () => {
    const csp = buildCsp();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });
  it("'unsafe-eval' só em dev", () => {
    expect(buildCsp({ dev: true })).toContain("'unsafe-eval'");
    expect(buildCsp({ dev: false })).not.toContain("'unsafe-eval'");
    expect(buildCsp()).not.toContain("'unsafe-eval'");
  });
  it('a origem da API entra no connect-src; URL que não é absoluta é ignorada', () => {
    expect(buildCsp({ apiUrl: 'https://api.exemplo.com/api' })).toMatch(/connect-src [^;]*https:\/\/api\.exemplo\.com/);
    expect(buildCsp({ apiUrl: 'same-origin' })).not.toContain('same-origin');
    expect(buildCsp({ apiUrl: '/api' })).not.toContain(' /api ');
  });
  it('mantém Turnstile e o iframe de PDF por blob', () => {
    const csp = buildCsp();
    expect(csp).toContain('https://challenges.cloudflare.com');
    expect(csp).toMatch(/frame-src [^;]*blob:/);
  });
});

describe('cspHeaders', () => {
  it('off não manda header nenhum', () => {
    expect(cspHeaders('off')).toEqual({});
  });
  it('report usa Report-Only, enforce usa o header de bloqueio', () => {
    expect(Object.keys(cspHeaders('report'))).toContain('Content-Security-Policy-Report-Only');
    const enforce = cspHeaders('enforce');
    expect(Object.keys(enforce)).toContain('Content-Security-Policy');
    expect(Object.keys(enforce)).not.toContain('Content-Security-Policy-Report-Only');
    expect(enforce['Reporting-Endpoints']).toContain('/api/client-telemetry/csp');
  });
});
