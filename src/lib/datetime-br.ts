/** Timezone do backend NixVet (container). */
export const BR_TIMEZONE = 'America/Sao_Paulo';

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: BR_TIMEZONE,
  dateStyle: 'short',
});

const timeFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: BR_TIMEZONE,
  timeStyle: 'short',
});

const weekdayDateFmt = new Intl.DateTimeFormat('pt-BR', {
  timeZone: BR_TIMEZONE,
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

export function formatDateBr(iso: string | number | Date): string {
  return dateFmt.format(new Date(iso));
}

export function formatTimeBr(iso: string | number | Date): string {
  return timeFmt.format(new Date(iso));
}

/** Primeira linha do bloco data/hora no detalhe da consulta. */
export function formatConsultationWeekdayDate(iso: string | number | Date): string {
  return weekdayDateFmt.format(new Date(iso));
}

export function formatTimeRangeBr(startIso: string | number | Date, endIso: string | number | Date): string {
  return `${timeFmt.format(new Date(startIso))} → ${timeFmt.format(new Date(endIso))}`;
}
