import { describe, expect, it } from 'vitest';
import { exibirTelefone, formatarTelefone, somenteDigitos, telefoneValido } from './telefone';

describe('somenteDigitos', () => {
  it('tira tudo que não é dígito', () => {
    expect(somenteDigitos('(11) 91234-5678')).toBe('11912345678');
    expect(somenteDigitos('abc')).toBe('');
  });
});

describe('formatarTelefone', () => {
  it.each([
    ['', ''],
    ['1', '(1'],
    ['11', '(11'],
    ['119', '(11) 9'],
    ['11912', '(11) 912'],
    ['1191234', '(11) 9123-4'],
    ['1133334444', '(11) 3333-4444'],
    ['11912345678', '(11) 91234-5678'],
  ])('máscara progressiva: %s', (entrada, esperado) => {
    expect(formatarTelefone(entrada)).toBe(esperado);
  });

  it('é idempotente: formatar um valor já formatado devolve o mesmo', () => {
    const uma = formatarTelefone('11912345678');
    expect(formatarTelefone(uma)).toBe(uma);
  });

  it('descarta o +55 de quem cola o número com o país', () => {
    expect(formatarTelefone('+55 11 91234-5678')).toBe('(11) 91234-5678');
  });

  it('nunca passa de 11 dígitos', () => {
    expect(formatarTelefone('119123456789999')).toBe('(11) 91234-5678');
  });
});

describe('telefoneValido', () => {
  it.each([
    ['(11) 91234-5678', true],
    ['11912345678', true],
    ['1133334444', true],
    ['+5511912345678', true],
    ['', false],
    ['119123', false],
    // celular de 11 dígitos precisa começar em 9
    ['11612345678', false],
    // 10 dígitos começando em 9 é o formato de antes do nono dígito
    ['1191234567', false],
    // DDD com zero
    ['01912345678', false],
    ['10912345678', false],
  ])('%s → %s', (entrada, esperado) => {
    expect(telefoneValido(entrada)).toBe(esperado);
  });
});

describe('exibirTelefone', () => {
  it('vazio para null, undefined e string vazia', () => {
    expect(exibirTelefone(null)).toBe('');
    expect(exibirTelefone(undefined)).toBe('');
    expect(exibirTelefone('')).toBe('');
  });

  it('formata número brasileiro que veio do banco só com dígitos', () => {
    expect(exibirTelefone('11912345678')).toBe('(11) 91234-5678');
    expect(exibirTelefone('1133334444')).toBe('(11) 3333-4444');
  });

  it('mantém o +55 quando o número veio com o código do país', () => {
    expect(exibirTelefone('5511912345678')).toBe('+55 (11) 91234-5678');
  });

  it('devolve o original quando não reconhece (melhor que mutilar)', () => {
    expect(exibirTelefone('0800 123 4567')).toBe('0800 123 4567');
    expect(exibirTelefone('ramal 22')).toBe('ramal 22');
  });
});
