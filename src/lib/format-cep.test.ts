import { describe, expect, it } from 'vitest';
import { formatCepMask } from './format-cep';

describe('formatCepMask', () => {
  it.each([
    ['01310100', '01310-100'],
    ['01310-100', '01310-100'],
    ['01310', '01310'],
    ['013', '013'],
    ['01.310-100 xx', '01310-100'],
    ['013101009999', '01310-100'],
    ['', ''],
    [null, ''],
    [undefined, ''],
  ])('%s → %s', (entrada, esperado) => {
    expect(formatCepMask(entrada as string | null | undefined)).toBe(esperado);
  });
});
