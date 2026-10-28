import { describe, expect, it } from 'vitest';
import { urlDePagamentoSegura } from './url-pagamento';

describe('urlDePagamentoSegura', () => {
  it('aceita o domínio do Asaas e subdomínios, por https', () => {
    expect(urlDePagamentoSegura('https://asaas.com/i/abc')).toBe('https://asaas.com/i/abc');
    expect(urlDePagamentoSegura('https://www.asaas.com/i/abc')).toBe('https://www.asaas.com/i/abc');
    expect(urlDePagamentoSegura('https://sandbox.asaas.com/i/abc')).toBe('https://sandbox.asaas.com/i/abc');
  });
  it.each([
    ['http (sem TLS)', 'http://asaas.com/i/abc'],
    ['host parecido', 'https://evilasaas.com/i/abc'],
    ['asaas como subdomínio de outro', 'https://asaas.com.evil.com/i/abc'],
    ['esquema perigoso', 'javascript:alert(1)'],
    ['não é URL', 'asaas.com/i/abc'],
    ['vazio', ''],
  ])('recusa %s', (_nome, valor) => {
    expect(urlDePagamentoSegura(valor)).toBeNull();
  });
  it('recusa o que não é string', () => {
    expect(urlDePagamentoSegura(undefined)).toBeNull();
    expect(urlDePagamentoSegura(null)).toBeNull();
    expect(urlDePagamentoSegura(123)).toBeNull();
    expect(urlDePagamentoSegura({ href: 'https://asaas.com' })).toBeNull();
  });
});
