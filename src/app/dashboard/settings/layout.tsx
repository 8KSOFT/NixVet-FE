'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu } from 'antd';
import { SettingOutlined, MedicineBoxOutlined, ExperimentOutlined, FileSearchOutlined, ToolOutlined, ClockCircleOutlined, AppstoreOutlined, MessageOutlined, ThunderboltOutlined, UnorderedListOutlined, RobotOutlined } from '@ant-design/icons';

const items = [
  { key: '/dashboard/settings', icon: <SettingOutlined />, label: <Link href="/dashboard/settings">Dados da Clínica</Link> },
  { key: '/dashboard/settings/hours', icon: <ClockCircleOutlined />, label: <Link href="/dashboard/settings/hours">Horários</Link> },
  { key: '/dashboard/settings/appointment-types', icon: <UnorderedListOutlined />, label: <Link href="/dashboard/settings/appointment-types">Tipos de Procedimento</Link> },
  { key: '/dashboard/settings/resources', icon: <AppstoreOutlined />, label: <Link href="/dashboard/settings/resources">Recursos</Link> },
  { key: '/dashboard/settings/diseases', icon: <MedicineBoxOutlined />, label: <Link href="/dashboard/settings/diseases">Doenças</Link> },
  { key: '/dashboard/settings/surgical-procedures', icon: <ExperimentOutlined />, label: <Link href="/dashboard/settings/surgical-procedures">Procedimentos cirúrgicos</Link> },
  { key: '/dashboard/settings/exams', icon: <FileSearchOutlined />, label: <Link href="/dashboard/settings/exams">Exames</Link> },
  { key: '/dashboard/settings/materials', icon: <ToolOutlined />, label: <Link href="/dashboard/settings/materials">Materiais</Link> },
  { key: '/dashboard/settings/whatsapp-numbers', icon: <MessageOutlined />, label: <Link href="/dashboard/settings/whatsapp-numbers">WhatsApp da clínica</Link> },
  { key: '/dashboard/settings/chatbot', icon: <RobotOutlined />, label: <Link href="/dashboard/settings/chatbot">Chatbot / IA</Link> },
  { key: '/dashboard/settings/automations', icon: <ThunderboltOutlined />, label: <Link href="/dashboard/settings/automations">Automações</Link> },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const selected = items.find((i) => i.key === pathname)?.key ?? '/dashboard/settings';

  return (
    <div className="flex gap-6">
      <div className="w-56 shrink-0">
        <Menu
          selectedKeys={[selected]}
          mode="vertical"
          items={items}
          style={{ border: 'none', background: 'transparent' }}
          className="rounded border border-gray-200 bg-white p-1"
        />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
