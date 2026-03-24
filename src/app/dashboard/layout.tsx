'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Badge } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  MedicineBoxOutlined,
  FileSearchOutlined,
  CalendarOutlined,
  SettingOutlined,
  LogoutOutlined,
  MessageOutlined,
  BellOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import api from '@/lib/axios';
import { fetchPublicBranding } from '@/lib/branding';
import { getStoredMenuKeys, getStoredUserRole } from '@/lib/role-permissions';

interface ClinicNotification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  createdAt?: string;
}

function NotificationsBell() {
  const { t } = useTranslation('common');
  const [unreadCount, setUnreadCount] = useState(0);
  const [list, setList] = useState<ClinicNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUnread = () => {
    api.get<number>('/notifications/unread-count').then((r) => setUnreadCount(Number(r.data ?? 0))).catch(() => {});
  };

  const fetchList = () => {
    setLoading(true);
    api.get<ClinicNotification[]>('/notifications', { params: { unread: true } })
      .then((r) => setList(Array.isArray(r.data) ? r.data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUnread();
    const t = setInterval(fetchUnread, 60000);
    return () => clearInterval(t);
  }, []);

  const markRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      fetchUnread();
      setList((prev) => prev.filter((n) => n.id !== id));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setUnreadCount(0);
      setList([]);
    } catch {}
  };

  const dropdownContent = (
    <div className="min-w-[280px] max-h-[360px] overflow-auto">
      <div className="p-2 border-b flex justify-between items-center">
        <span className="font-medium">{t('notifications.title')}</span>
        {list.length > 0 && (
          <Button type="link" size="small" onClick={markAllRead}>
            {t('notifications.markAllRead')}
          </Button>
        )}
      </div>
      {loading ? (
        <div className="p-4 text-center text-slate-500">{t('notifications.loading')}</div>
      ) : list.length === 0 ? (
        <div className="p-4 text-center text-slate-500">{t('notifications.empty')}</div>
      ) : (
        <ul className="list-none p-0 m-0">
          {list.map((n) => (
            <li
              key={n.id}
              className="px-3 py-2 border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
              onClick={() => markRead(n.id)}
            >
              <div className="text-sm text-slate-800">{n.message}</div>
              <div className="text-xs text-slate-400 mt-0.5">{n.type}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  return (
    <Dropdown dropdownRender={() => dropdownContent} trigger={['click']} onOpenChange={(open) => open && fetchList()}>
      <Badge count={unreadCount} size="small" offset={[-2, 2]}>
        <Button type="text" icon={<BellOutlined className="text-lg" />} className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-blue-600" />
      </Badge>
    </Dropdown>
  );
}

const { Header, Sider, Content } = Layout;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [brandName, setBrandName] = useState('NixVet');
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [menuAllow, setMenuAllow] = useState<Set<string>>(() => new Set(getStoredMenuKeys()));
  const [headerRole, setHeaderRole] = useState<string>(() => getStoredUserRole() || '');
  const router = useRouter();
  const pathname = usePathname();
  const { t, i18n } = useTranslation('common');

  useEffect(() => {
    fetchPublicBranding().then((branding) => {
      setBrandName(branding.appName || 'NixVet');
      setBrandLogo(branding.logoUrl);
    });
  }, []);

  useEffect(() => {
    setMenuAllow(new Set(getStoredMenuKeys()));
    setHeaderRole(getStoredUserRole() || '');
  }, [pathname]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('tenantId');
    }
    router.push('/login');
  };

  const userMenu = useMemo(
    () => ({
      items: [
        {
          key: 'profile',
          label: t('userMenu.profile'),
          icon: <UserOutlined />,
        },
        {
          key: 'settings',
          label: <Link href="/dashboard/settings">{t('userMenu.settings')}</Link>,
          icon: <SettingOutlined />,
        },
        { type: 'divider' as const },
        {
          key: 'logout',
          label: t('userMenu.logout'),
          icon: <LogoutOutlined />,
          danger: true,
          onClick: handleLogout,
        },
      ],
    }),
    [t, i18n.language],
  );

  const getSelectedKey = () => {
    if (pathname.includes('/dashboard/patients')) return 'patients';
    if (pathname.includes('/dashboard/owners')) return 'owners';
    if (pathname.includes('/dashboard/calendar')) return 'calendar';
    if (pathname.includes('/dashboard/settings')) return 'settings';
    if (pathname.includes('/dashboard/bulario')) return 'bulario';
    if (pathname.includes('/dashboard/prescriptions')) return 'prescriptions';
    if (pathname.includes('/dashboard/exams')) return 'exams';
    if (pathname.includes('/dashboard/followups')) return 'followups';
    if (pathname.includes('/dashboard/vaccines')) return 'vaccines';
    if (pathname.includes('/dashboard/tasks')) return 'tasks';
    if (pathname.includes('/dashboard/whatsapp')) return 'whatsapp';
    return 'dashboard';
  };

  const allMenuItems = useMemo(
    () => [
      { key: 'dashboard', icon: <DashboardOutlined />, label: <Link href="/dashboard">{t('nav.dashboard')}</Link> },
      { key: 'patients', icon: <MedicineBoxOutlined />, label: <Link href="/dashboard/patients">{t('nav.patients')}</Link> },
      { key: 'owners', icon: <TeamOutlined />, label: <Link href="/dashboard/owners">{t('nav.owners')}</Link> },
      { key: 'team', icon: <UserOutlined />, label: <Link href="/dashboard/team">{t('nav.team')}</Link> },
      { key: 'prescriptions', icon: <MedicineBoxOutlined />, label: <Link href="/dashboard/prescriptions">{t('nav.prescriptions')}</Link> },
      { key: 'bulario', icon: <MedicineBoxOutlined />, label: <Link href="/dashboard/bulario">{t('nav.bulario')}</Link> },
      { key: 'exams', icon: <FileSearchOutlined />, label: <Link href="/dashboard/exams">{t('nav.exams')}</Link> },
      { key: 'followups', icon: <FileSearchOutlined />, label: <Link href="/dashboard/followups">{t('nav.followups')}</Link> },
      { key: 'calendar', icon: <CalendarOutlined />, label: <Link href="/dashboard/calendar">{t('nav.calendar')}</Link> },
      { key: 'vaccines', icon: <MedicineBoxOutlined />, label: <Link href="/dashboard/vaccines">{t('nav.vaccines')}</Link> },
      { key: 'tasks', icon: <UnorderedListOutlined />, label: <Link href="/dashboard/tasks">{t('nav.tasks')}</Link> },
      { key: 'whatsapp', icon: <MessageOutlined />, label: <Link href="/dashboard/whatsapp">{t('nav.whatsapp')}</Link> },
      { key: 'settings', icon: <SettingOutlined />, label: <Link href="/dashboard/settings">{t('nav.settings')}</Link> },
    ],
    [t, i18n.language],
  );

  const menuItems = useMemo(() => {
    const filtered = allMenuItems.filter((item) => menuAllow.has(item.key));
    return filtered.length > 0 ? filtered : allMenuItems.filter((i) => i.key === 'dashboard');
  }, [allMenuItems, menuAllow]);

  const roleLabel = headerRole
    ? t(`roles.${headerRole}`, { defaultValue: headerRole })
    : t('header.roleUnknown');

  return (
    <Layout className="min-h-screen bg-[#f1f5f9]">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={260}
        theme="light"
        className="!bg-white border-r border-slate-200/80 shadow-sm"
        style={{ overflow: 'auto', height: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100 }}
      >
        <div className="flex items-center h-16 px-4 border-b border-slate-200/80">
          <div className={`flex items-center gap-3 w-full ${collapsed ? 'justify-center' : ''}`}>
            <Logo
              width={collapsed ? 44 : 52}
              height={collapsed ? 44 : 52}
              src={brandLogo}
              alt={brandName}
            />
            {!collapsed && (
              <span className="text-slate-800 font-semibold text-lg tracking-tight">{brandName}</span>
            )}
          </div>
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          className="border-0 mt-3 px-2 !bg-transparent"
          style={{ minHeight: 'calc(100vh - 64px)' }}
          items={menuItems}
        />
      </Sider>
      <Layout className={`transition-[margin-left] duration-200 ${collapsed ? 'ml-[80px]' : 'ml-[260px]'}`}>
        <Header
          className="sticky top-0 z-50 flex items-center justify-between h-16 px-6 bg-white border-b border-slate-200/80 shadow-sm"
          style={{ padding: 0 }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-12 h-12 text-slate-600 hover:bg-slate-100 hover:text-blue-600 rounded-xl"
          />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <NotificationsBell />
            <span className="text-slate-600 text-sm hidden sm:inline">
              {t('header.greeting')}{' '}
              <strong className="text-slate-800">{roleLabel}</strong>
            </span>
            <Dropdown menu={userMenu} placement="bottomRight" arrow>
              <Avatar
                className="cursor-pointer border-2 border-white shadow-md hover:ring-2 hover:ring-blue-200"
                style={{ backgroundColor: '#2563eb' }}
                icon={<UserOutlined />}
                size="default"
              />
            </Dropdown>
          </div>
        </Header>
        <Content className="p-6 min-h-[calc(100vh-64px)]">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
