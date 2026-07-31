'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, ClipboardCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStoredUserRole } from '@/lib/role-permissions';
import { useStaffUsersListQuery } from '@/hooks/apiHooks/useUsers';
import { useVetSchedulesQuery } from '@/hooks/apiHooks/useAvailabilityConfig';
import { useResourcesListQuery } from '@/hooks/apiHooks/useResources';
import { useHealthPlansListQuery } from '@/hooks/apiHooks/useHealthPlans';
import { useTenantMeQuery } from '@/hooks/apiHooks/useTenantSettings';
import { useGoogleStatusQuery } from '@/hooks/apiHooks/useGoogleIntegration';
import { useClinicTermTemplatesQuery } from '@/hooks/apiHooks/useClinicTermTemplates';

interface ChecklistItem {
  key: string;
  label: string;
  href: string;
  done: boolean;
}

function dismissKey(userId: string): string {
  return `nixvet:setup-checklist-dismissed:${userId}`;
}

function readStoredUserId(): string | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string };
    return parsed.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Checklist opcional pós-onboarding — itens que NÃO bloqueiam o uso do
 * sistema (diferente do wizard obrigatório em /register). Fica visível até
 * 100% ou até o usuário dispensar de vez; progresso e dispensa são por
 * pessoa (localStorage por userId), não por clínica — um veterinário novo
 * que entra depois ainda vê suas próprias pendências.
 */
export function SetupChecklistWidget() {
  const [userId, setUserId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = readStoredUserId();
    setUserId(id);
    const role = getStoredUserRole();
    const allowedRole = role === 'admin' || role === 'manager';
    const alreadyDismissed = id ? localStorage.getItem(dismissKey(id)) === '1' : true;
    setDismissed(alreadyDismissed);
    setVisible(allowedRole);
  }, []);

  const staffQuery = useStaffUsersListQuery();
  const vetSchedulesQuery = useVetSchedulesQuery();
  const resourcesQuery = useResourcesListQuery();
  const healthPlansQuery = useHealthPlansListQuery();
  const tenantQuery = useTenantMeQuery();
  const googleStatusQuery = useGoogleStatusQuery();
  const termTemplatesQuery = useClinicTermTemplatesQuery();

  if (!visible || dismissed) return null;

  const loading =
    staffQuery.isLoading ||
    vetSchedulesQuery.isLoading ||
    resourcesQuery.isLoading ||
    healthPlansQuery.isLoading ||
    tenantQuery.isLoading ||
    googleStatusQuery.isLoading ||
    termTemplatesQuery.isLoading;

  if (loading) return null;

  const tenant = tenantQuery.data;
  const items: ChecklistItem[] = [
    {
      key: 'team',
      label: 'Cadastrar mais veterinários',
      href: '/settings/team',
      done: (staffQuery.data?.length ?? 0) > 1,
    },
    {
      key: 'vet-schedules',
      label: 'Agenda de cada veterinário',
      href: '/settings/hours',
      done: (vetSchedulesQuery.data?.length ?? 0) > 0,
    },
    {
      key: 'resources',
      label: 'Salas e equipamentos',
      href: '/settings/resources',
      done: (resourcesQuery.data?.length ?? 0) > 0,
    },
    {
      key: 'health-plans',
      label: 'Convênios / planos de saúde',
      href: '/settings/planos-saude',
      done: (healthPlansQuery.data?.length ?? 0) > 0,
    },
    {
      key: 'branding',
      label: 'Identidade visual (logo, cor, subdomínio)',
      href: '/settings',
      done: Boolean(tenant?.logo_url || tenant?.primary_color || tenant?.subdomain),
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp / atendimento por IA',
      href: '/settings/whatsapp-numbers',
      done: Boolean(tenant?.whatsapp_ai_chatbot_enabled),
    },
    {
      key: 'google-calendar',
      label: 'Google Agenda',
      href: '/settings',
      done: Boolean(googleStatusQuery.data?.connected),
    },
    {
      key: 'term-templates',
      label: 'Modelos de termo de consentimento',
      href: '/settings/clinic-terms',
      done: (termTemplatesQuery.data?.length ?? 0) > 0,
    },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const percent = Math.round((doneCount / items.length) * 100);
  if (percent >= 100) return null;

  const handleDismiss = () => {
    if (userId) localStorage.setItem(dismissKey(userId), '1');
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {open && (
        <div className="mb-3 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Configuração — {percent}% completa</h3>
              <p className="text-xs text-slate-500">Opcional, mas ajuda a aproveitar tudo do NixVet.</p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Dispensar definitivamente"
              title="Não mostrar mais"
            >
              <X className="size-4" />
            </button>
          </div>
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50',
                    item.done ? 'text-slate-400 line-through' : 'text-slate-700',
                  )}
                >
                  {item.done ? (
                    <CheckCircle2 className="size-4 shrink-0 text-green-500" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-slate-300" />
                  )}
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-primary/90"
      >
        <ClipboardCheck className="size-4" />
        Configuração {percent}%
      </button>
    </div>
  );
}
