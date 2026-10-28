import { describe, expect, it } from 'vitest';
import { getStoredMenuKeys, getStoredUserRole } from './role-permissions';

describe('getStoredMenuKeys', () => {
  it('lê o que o servidor gravou no login', () => {
    localStorage.setItem('user', JSON.stringify({ role: 'doctor', permissions: ['dashboard', 'patients'] }));
    expect(getStoredMenuKeys()).toEqual(['dashboard', 'patients']);
  });
  it('sem sessão, JSON quebrado ou permissions que não é lista: vazio, nunca adivinha', () => {
    expect(getStoredMenuKeys()).toEqual([]);
    localStorage.setItem('user', '{quebrado');
    expect(getStoredMenuKeys()).toEqual([]);
    localStorage.setItem('user', JSON.stringify({ permissions: 'dashboard' }));
    expect(getStoredMenuKeys()).toEqual([]);
  });
});

describe('getStoredUserRole', () => {
  it('papel gravado, ou null', () => {
    expect(getStoredUserRole()).toBeNull();
    localStorage.setItem('user', JSON.stringify({ role: 'doctor' }));
    expect(getStoredUserRole()).toBe('doctor');
    localStorage.setItem('user', '{quebrado');
    expect(getStoredUserRole()).toBeNull();
  });
});
