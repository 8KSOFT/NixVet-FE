'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Settings,
  Clock,
  List,
  Layers,
  HeartPulse,
  Scissors,
  FlaskConical,
  Wrench,
  MessageSquare,
  Bot,
  Zap,
  DollarSign,
  CalendarOff,
  Landmark,
  Wallet,
  CreditCard,
  HeartHandshake,
  BadgeDollarSign,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStoredUserRole } from '@/lib/role-permissions';

type NavSection = {
  label: string;
  items: { key: string; icon: React.ElementType; label: string }[];
};

const navSections: NavSection[] = [
  {
    label: 'Geral',
    items: [
      { key: '/settings', icon: Settings, label: 'Dados da Clínica' },
      { key: '/settings/billing', icon: CreditCard, label: 'Assinatura & NFS-e' },
    ],
  },
  {
    label: 'Agenda',
    items: [
      { key: '/settings/hours', icon: Clock, label: 'Horários' },
      { key: '/settings/holidays', icon: CalendarOff, label: 'Feriados' },
      { key: '/settings/appointment-types', icon: List, label: 'Tipos de Procedimento' },
      { key: '/settings/resources', icon: Layers, label: 'Recursos' },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { key: '/settings/diseases', icon: HeartPulse, label: 'Doenças' },
      { key: '/settings/surgical-procedures', icon: Scissors, label: 'Procedimentos cirúrgicos' },
      { key: '/settings/exams', icon: FlaskConical, label: 'Exames' },
      { key: '/settings/materials', icon: Wrench, label: 'Materiais' },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { key: '/settings/planos-saude', icon: HeartHandshake, label: 'Planos de Saúde' },
      { key: '/settings/pagamentos', icon: BadgeDollarSign, label: 'Taxas de Pagamento' },
      { key: '/settings/fiscal', icon: FileText, label: 'Configurações Fiscais' },
    ],
  },
  {
    label: 'Comunicação & IA',
    items: [
      { key: '/settings/whatsapp-numbers', icon: MessageSquare, label: 'WhatsApp da clínica' },
      { key: '/settings/chatbot', icon: Bot, label: 'Chatbot / IA' },
      { key: '/settings/ai-costs', icon: DollarSign, label: 'Custos IA' },
      { key: '/settings/automations', icon: Zap, label: 'Automações' },
    ],
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentPathname = pathname ?? '';
  const role = (getStoredUserRole() || '').toLowerCase();
  const isSuperAdmin = role === 'superadmin';
  const canManageTerms = ['admin', 'manager', 'superadmin'].includes(role);

  // GRUPO 7 — "Termos da Clínica" visível só para admin/manager
  const sections = canManageTerms
    ? navSections.map((s) =>
        s.label === 'Geral'
          ? {
              ...s,
              items: [
                ...s.items,
                { key: '/settings/clinic-terms', icon: FileText, label: 'Termos da Clínica' },
              ],
            }
          : s,
      )
    : navSections;

  const platformItems = isSuperAdmin
    ? [
        { key: '/superadmin/clinics', icon: Landmark, label: 'Clínicas (global)' },
        { key: '/superadmin/finance', icon: Wallet, label: 'Financeiro (global)' },
      ]
    : [];

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      {/* Mobile / tablet: dropdown de navegação */}
      <div className="lg:hidden">
        <select
          value={currentPathname}
          onChange={(e) => router.push(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
        >
          {platformItems.length > 0 && (
            <optgroup label="Plataforma">
              {platformItems.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          )}
          {sections.map((section) => (
            <optgroup key={section.label} label={section.label}>
              {section.items.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Desktop: sidebar completa */}
      <div className="hidden w-56 shrink-0 lg:block">
        <nav className="flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-white p-1.5">
          {platformItems.length > 0 && (
            <>
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Plataforma
              </p>
              {platformItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPathname === item.key || currentPathname.startsWith(`${item.key}/`);
                return (
                  <Link
                    key={item.key}
                    href={item.key}
                    className={cn(
                      'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
              <div className="my-1 border-t border-slate-200" />
            </>
          )}
          {sections.map((section) => (
            <div key={section.label}>
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {section.label}
              </p>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  currentPathname === item.key ||
                  (item.key !== '/settings' && currentPathname.startsWith(`${item.key}/`));
                return (
                  <Link
                    key={item.key}
                    href={item.key}
                    className={cn(
                      'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
