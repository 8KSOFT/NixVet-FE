export const CLASSIFICATIONS = [
  { value: 'scheduled',    label: 'Consulta agendada',     badgeClass: 'bg-wa-green-bg text-wa-brand-700 border-transparent'  },
  { value: 'not_returned', label: 'Não retornou',          badgeClass: 'bg-wa-warn-bg text-wa-warn border-transparent'         },
  { value: 'resolved',     label: 'Atendimento encerrado', badgeClass: 'bg-wa-blue-bg text-wa-blue border-transparent'         },
  { value: 'spam',         label: 'Spam / engano',         badgeClass: 'bg-wa-warn-bg text-wa-warn border-transparent'         },
  { value: 'lost',         label: 'Desistência',           badgeClass: 'bg-wa-line-2 text-wa-ink-2 border-transparent'         },
  { value: 'other',        label: 'Outro',                 badgeClass: 'bg-wa-line-2 text-wa-ink-2 border-transparent'         },
] as const;

export type ClassificationValue = (typeof CLASSIFICATIONS)[number]['value'];

export function classificationInfo(value: string | null | undefined) {
  if (!value) return null;
  return CLASSIFICATIONS.find((c) => c.value === value) ?? null;
}
