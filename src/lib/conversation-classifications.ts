export const CLASSIFICATIONS = [
  { value: 'scheduled',    labelKey: 'whatsapp.classifications.scheduled',     badgeClass: 'bg-wa-green-bg text-wa-brand-700 border-transparent'  },
  { value: 'not_returned', labelKey: 'whatsapp.classifications.not_returned',          badgeClass: 'bg-wa-warn-bg text-wa-warn border-transparent'         },
  { value: 'resolved',     labelKey: 'whatsapp.classifications.resolved', badgeClass: 'bg-wa-blue-bg text-wa-blue border-transparent'         },
  { value: 'spam',         labelKey: 'whatsapp.classifications.spam',         badgeClass: 'bg-wa-warn-bg text-wa-warn border-transparent'         },
  { value: 'lost',         labelKey: 'whatsapp.classifications.lost',           badgeClass: 'bg-wa-line-2 text-wa-ink-2 border-transparent'         },
  { value: 'other',        labelKey: 'whatsapp.classifications.other',                 badgeClass: 'bg-wa-line-2 text-wa-ink-2 border-transparent'         },
] as const;

export type ClassificationValue = (typeof CLASSIFICATIONS)[number]['value'];

export function classificationInfo(value: string | null | undefined) {
  if (!value) return null;
  return CLASSIFICATIONS.find((c) => c.value === value) ?? null;
}
