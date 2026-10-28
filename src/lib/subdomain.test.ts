import { describe, expect, it, vi } from 'vitest';
import { detectSubdomainFromHost } from './subdomain';

const raiz = 'nixmed.com.br';

describe('detectSubdomainFromHost', () => {
  it('devolve o subdomínio da clínica', () => {
    expect(detectSubdomainFromHost('vida.nixmed.com.br', raiz)).toBe('vida');
  });
  it('ignora porta e caixa', () => {
    expect(detectSubdomainFromHost('VIDA.nixmed.com.br:443', raiz)).toBe('vida');
  });
  it.each(['www', 'app', 'api', 'nixvet'])('%s é reservado', (reservado) => {
    expect(detectSubdomainFromHost(`${reservado}.${raiz}`, raiz)).toBeNull();
  });
  it('null para o domínio raiz, para dois níveis e para outro domínio', () => {
    expect(detectSubdomainFromHost(raiz, raiz)).toBeNull();
    expect(detectSubdomainFromHost('a.b.nixmed.com.br', raiz)).toBeNull();
    expect(detectSubdomainFromHost('vida.outro.com.br', raiz)).toBeNull();
  });
  it('localhost nunca é clínica', () => {
    expect(detectSubdomainFromHost('localhost:3000', raiz)).toBeNull();
    expect(detectSubdomainFromHost('127.0.0.1', raiz)).toBeNull();
  });
  it('hosts da aplicação vêm de NEXT_PUBLIC_APP_HOSTS e vencem o domínio raiz', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_HOSTS', 'vida.nixmed.com.br, hml.nixmed.com.br');
    expect(detectSubdomainFromHost('vida.nixmed.com.br', raiz)).toBeNull();
    expect(detectSubdomainFromHost('outra.nixmed.com.br', raiz)).toBe('outra');
  });
});
