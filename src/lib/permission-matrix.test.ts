import { describe, expect, it } from 'vitest';
import { roleHasPermission } from './permission-matrix';

describe('roleHasPermission', () => {
  it('superadmin tem tudo', () => {
    expect(roleHasPermission('superadmin', 'permissions.write', 'stock.cancel')).toBe(true);
  });

  it('admin tem tudo menos permissions.*', () => {
    expect(roleHasPermission('admin', 'patients.write', 'tutors.export')).toBe(true);
    expect(roleHasPermission('admin', 'permissions.read')).toBe(false);
  });

  it('manager é como o admin, menos a exportação LGPD completa do tutor', () => {
    expect(roleHasPermission('manager', 'patients.write')).toBe(true);
    expect(roleHasPermission('manager', 'tutors.export')).toBe(false);
    expect(roleHasPermission('manager', 'permissions.read')).toBe(false);
  });

  it('veterinário atende e prescreve, mas não vende nem mexe em estoque', () => {
    expect(roleHasPermission('veterinarian', 'prescriptions.write', 'signature.sign', 'tutors.read')).toBe(true);
    expect(roleHasPermission('veterinarian', 'products.sell')).toBe(false);
    expect(roleHasPermission('veterinarian', 'stock.write')).toBe(false);
  });

  it('recepção vende e agenda, mas não prescreve nem assina', () => {
    expect(roleHasPermission('reception', 'products.sell', 'consultations.write', 'tutors.write')).toBe(true);
    expect(roleHasPermission('reception', 'prescriptions.read')).toBe(false);
    expect(roleHasPermission('reception', 'signature.sign')).toBe(false);
  });

  it('residente só lê', () => {
    expect(roleHasPermission('intern', 'patients.read', 'tutors.read')).toBe(true);
    expect(roleHasPermission('intern', 'patients.write')).toBe(false);
  });

  it('X.write concede X.create e X.update', () => {
    expect(roleHasPermission('veterinarian', 'patients.create', 'patients.update')).toBe(true);
    expect(roleHasPermission('intern', 'patients.create')).toBe(false);
  });

  it('com várias chaves é E: falta uma, nega', () => {
    expect(roleHasPermission('veterinarian', 'patients.read', 'products.sell')).toBe(false);
  });

  it('papel desconhecido, nulo ou com caixa e espaço', () => {
    expect(roleHasPermission('papel-novo', 'qualquer.coisa')).toBe(true);
    expect(roleHasPermission(null, 'patients.read')).toBe(true);
    expect(roleHasPermission(undefined, 'patients.read')).toBe(true);
    expect(roleHasPermission('  Veterinarian ', 'products.sell')).toBe(false);
  });
});
