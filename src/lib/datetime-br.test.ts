import { describe, expect, it } from 'vitest';
import {
  BR_TIMEZONE,
  formatConsultationWeekdayDate,
  formatDateBr,
  formatTimeBr,
  formatTimeRangeBr,
} from './datetime-br';

// 2026-10-28T02:00:00Z ainda é 27/10 em São Paulo (UTC-3): a data da clínica manda, não a do navegador.
describe('datetime-br', () => {
  it('usa o fuso de São Paulo', () => {
    expect(BR_TIMEZONE).toBe('America/Sao_Paulo');
  });
  it('data no fuso da clínica, não no UTC', () => {
    expect(formatDateBr('2026-10-28T02:00:00Z')).toBe('27/10/2026');
    expect(formatDateBr('2026-10-28T12:00:00Z')).toBe('28/10/2026');
  });
  it('hora no fuso da clínica', () => {
    expect(formatTimeBr('2026-10-28T15:30:00Z')).toBe('12:30');
  });
  it('intervalo de horas', () => {
    expect(formatTimeRangeBr('2026-10-28T15:30:00Z', '2026-10-28T16:00:00Z')).toBe('12:30 → 13:00');
  });
  it('dia da semana por extenso', () => {
    expect(formatConsultationWeekdayDate('2026-10-28T02:00:00Z')).toBe('terça-feira, 27 de outubro de 2026');
  });
  it('aceita número e Date', () => {
    const d = new Date('2026-10-28T12:00:00Z');
    expect(formatDateBr(d)).toBe('28/10/2026');
    expect(formatDateBr(d.getTime())).toBe('28/10/2026');
  });
});
