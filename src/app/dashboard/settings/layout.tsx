'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { key: '/dashboard/settings', icon: Settings, label: 'Dados da Clínica' },
  { key: '/dashboard/settings/hours', icon: Clock, label: 'Horários' },
  { key: '/dashboard/settings/holidays', icon: CalendarOff, label: 'Feriados' },
  { key: '/dashboard/settings/appointment-types', icon: List, label: 'Tipos de Procedimento' },
  { key: '/dashboard/settings/resources', icon: Layers, label: 'Recursos' },
  { key: '/dashboard/settings/diseases', icon: HeartPulse, label: 'Doenças' },
  { key: '/dashboard/settings/surgical-procedures', icon: Scissors, label: 'Procedimentos cirúrgicos' },
  { key: '/dashboard/settings/exams', icon: FlaskConical, label: 'Exames' },
  { key: '/dashboard/settings/materials', icon: Wrench, label: 'Materiais' },
  { key: '/dashboard/settings/whatsapp-numbers', icon: MessageSquare, label: 'WhatsApp da clínica' },
  { key: '/dashboard/settings/chatbot', icon: Bot, label: 'Chatbot / IA' },
  { key: '/dashboard/settings/ai-costs', icon: DollarSign, label: 'Custos IA' },
  { key: '/dashboard/settings/automations', icon: Zap, label: 'Automações' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-6">
      <div className="w-56 shrink-0">
        <nav className="flex flex-col gap-0.5 rounded-lg border border-slate-200 bg-white p-1.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.key;
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
        </nav>
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
