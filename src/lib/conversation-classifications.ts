export const CLASSIFICATIONS = [
  { value: 'scheduled',    label: 'Consulta agendada',     badgeClass: 'bg-green-100 text-green-700 border-green-200'   },
  { value: 'not_returned', label: 'Não retornou',          badgeClass: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'resolved',     label: 'Atendimento encerrado', badgeClass: 'bg-blue-100 text-blue-700 border-blue-200'       },
  { value: 'spam',         label: 'Spam / engano',         badgeClass: 'bg-red-100 text-red-700 border-red-200'         },
  { value: 'lost',         label: 'Desistência',           badgeClass: 'bg-gray-100 text-gray-600 border-gray-200'      },
  { value: 'other',        label: 'Outro',                 badgeClass: 'bg-gray-100 text-gray-600 border-gray-200'      },
] as const;

export type ClassificationValue = (typeof CLASSIFICATIONS)[number]['value'];

export function classificationInfo(value: string | null | undefined) {
  if (!value) return null;
  return CLASSIFICATIONS.find((c) => c.value === value) ?? null;
}
