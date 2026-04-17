'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  CalendarDays,
  Settings,
  LogOut,
  MessageSquare,
  Bell,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Menu,
  User,
  ClipboardList,
  Syringe,
  FileSearch,
  BookOpen,
  FlaskConical,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
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
  const isUrgent = (type: string) => type === 'emergency' || type === 'human_attention';

  const { t } = useTranslation('common');
  const [unreadCount, setUnreadCount] = useState(0);
  const [list, setList] = useState<ClinicNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchUnread = () => {
    api.get<number>('/notifications/unread-count').then((r) => setUnreadCount(Number(r.data ?? 0))).catch(() => {});
  };

  const fetchList = () => {
    setLoading(true);
    api
      .get<ClinicNotification[]>('/notifications')
      .then((r) => setList(Array.isArray(r.data) ? r.data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUnread();
    const tick = setInterval(fetchUnread, 60000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (open) {
      fetchList();
      fetchUnread();
    }
  }, [open]);

  const markRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      fetchUnread();
      setList((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setUnreadCount(0);
      setList((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative text-slate-600 hover:text-blue-600"
        onClick={() => setOpen(true)}
        aria-label={t('notifications.title')}
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {list.some((n) => !n.is_read && isUrgent(n.type)) && (
          <AlertTriangle className="absolute -bottom-0.5 -left-0.5 size-3 text-amber-500" />
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[420px] p-0 flex flex-col">
          <SheetHeader className="flex flex-row items-center justify-between p-4 border-b space-y-0">
            <SheetTitle className="text-base">{t('notifications.title')}</SheetTitle>
            <SheetDescription className="sr-only">Painel de notificações</SheetDescription>
            {list.some((n) => !n.is_read) && (
              <Button variant="ghost" size="sm" className="text-blue-600 text-xs h-auto py-1" onClick={() => void markAllRead()}>
                {t('notifications.markAllRead')}
              </Button>
            )}
          </SheetHeader>
          <ScrollArea className="flex-1 bg-slate-100 p-3">
            {loading ? (
              <p className="py-12 text-center text-slate-500 text-sm">{t('notifications.loading')}</p>
            ) : list.length === 0 ? (
              <p className="py-12 text-center text-slate-500 text-sm">{t('notifications.empty')}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {list.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={cn(
                      'w-full text-left rounded-lg border border-slate-200 shadow-sm p-3 transition-colors text-sm',
                      n.is_read ? 'bg-white' : 'bg-blue-50 border-blue-200',
                      !n.is_read && n.type === 'human_attention' && 'bg-amber-50 border-amber-300',
                      !n.is_read && n.type === 'emergency' && 'bg-red-50 border-red-300',
                      'hover:bg-slate-50',
                    )}
                    onClick={() => void markRead(n.id)}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {n.type === 'emergency' ? 'Emergência' : n.type === 'human_attention' ? 'Atendimento humano' : 'Notificação'}
                      </span>
                    </div>
                    <p className="text-slate-900 whitespace-pre-wrap break-words">{n.message}</p>
                    {!n.is_read && (
                      <div className="flex justify-end mt-2">
                        <span
                          className={cn(
                            'text-xs font-medium',
                            n.type === 'emergency' ? 'text-red-600' : n.type === 'human_attention' ? 'text-amber-700' : 'text-blue-600',
                          )}
                        >
                          Nova
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

const NAV_ITEMS = [
  { key: 'dashboard', icon: LayoutDashboard, href: '/dashboard', labelKey: 'nav.dashboard' },
  { key: 'patients', icon: Stethoscope, href: '/dashboard/patients', labelKey: 'nav.patients' },
  { key: 'owners', icon: Users, href: '/dashboard/owners', labelKey: 'nav.owners' },
  { key: 'team', icon: User, href: '/dashboard/team', labelKey: 'nav.team' },
  { key: 'medical-records', icon: FileText, href: '/dashboard/medical-records', labelKey: 'nav.medicalRecords' },
  { key: 'prescriptions', icon: ClipboardList, href: '/dashboard/prescriptions', labelKey: 'nav.prescriptions' },
  { key: 'bulario', icon: BookOpen, href: '/dashboard/bulario', labelKey: 'nav.bulario' },
  { key: 'exams', icon: FlaskConical, href: '/dashboard/exams', labelKey: 'nav.exams' },
  { key: 'followups', icon: FileSearch, href: '/dashboard/followups', labelKey: 'nav.followups' },
  { key: 'calendar', icon: CalendarDays, href: '/dashboard/calendar', labelKey: 'nav.calendar' },
  { key: 'vaccines', icon: Syringe, href: '/dashboard/vaccines', labelKey: 'nav.vaccines' },
  { key: 'tasks', icon: ClipboardList, href: '/dashboard/tasks', labelKey: 'nav.tasks' },
  { key: 'whatsapp', icon: MessageSquare, href: '/dashboard/whatsapp', labelKey: 'nav.whatsapp' },
  { key: 'settings', icon: Settings, href: '/dashboard/settings', labelKey: 'nav.settings' },
] as const;

function getActiveKey(pathname: string): string {
  if (pathname.includes('/dashboard/profile')) return 'profile';
  if (pathname.includes('/dashboard/patients')) return 'patients';
  if (pathname.includes('/dashboard/owners')) return 'owners';
  if (pathname.includes('/dashboard/calendar')) return 'calendar';
  if (pathname.includes('/dashboard/settings')) return 'settings';
  if (pathname.includes('/dashboard/bulario')) return 'bulario';
  if (pathname.includes('/dashboard/medical-records')) return 'medical-records';
  if (pathname.includes('/dashboard/prescriptions')) return 'prescriptions';
  if (pathname.includes('/dashboard/exams')) return 'exams';
  if (pathname.includes('/dashboard/followups')) return 'followups';
  if (pathname.includes('/dashboard/vaccines')) return 'vaccines';
  if (pathname.includes('/dashboard/tasks')) return 'tasks';
  if (pathname.includes('/dashboard/whatsapp')) return 'whatsapp';
  if (pathname.includes('/dashboard/team')) return 'team';
  return 'dashboard';
}

interface SidebarNavProps {
  collapsed: boolean;
  menuAllow: Set<string>;
  activeKey: string;
  brandName: string;
  brandLogo: string | null;
  /** Painel escuro (referência estilo clínica / Mediplus) */
  variant?: 'medical' | 'light';
  onNavigate?: () => void;
}

function SidebarNav({
  collapsed,
  menuAllow,
  activeKey,
  brandName,
  brandLogo,
  variant = 'medical',
  onNavigate,
}: SidebarNavProps) {
  const { t } = useTranslation('common');
  const items = NAV_ITEMS.filter((item) => menuAllow.has(item.key));
  const visibleItems = items.length > 0 ? items : NAV_ITEMS.filter((i) => i.key === 'dashboard');
  const medical = variant === 'medical';

  return (
    <div className="flex flex-col h-full">
      <div
        className={cn(
          'flex items-center h-16 px-4 shrink-0 border-b',
          medical ? 'border-white/15' : 'border-slate-200/80',
        )}
      >
        <div className={cn('flex items-center gap-3 w-full', collapsed && 'justify-center')}>
          <Logo width={collapsed ? 36 : 44} height={collapsed ? 36 : 44} src={brandLogo} alt={brandName} />
          {!collapsed && (
            <span
              className={cn(
                'font-semibold text-lg tracking-tight truncate',
                medical ? 'text-white' : 'text-slate-800',
              )}
            >
              {brandName}
            </span>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1 py-3">
        <nav className="flex flex-col gap-0.5 px-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeKey === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => onNavigate?.()}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                  medical &&
                    (isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/85 hover:bg-white/10 hover:text-white'),
                  !medical &&
                    (isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'),
                  collapsed && 'justify-center px-2',
                )}
                title={collapsed ? t(item.labelKey) : undefined}
              >
                <Icon className={cn('shrink-0', collapsed ? 'size-5' : 'size-4')} />
                {!collapsed && <span>{t(item.labelKey)}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [brandName, setBrandName] = useState('NixVet');
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [menuAllow, setMenuAllow] = useState<Set<string>>(() => new Set(getStoredMenuKeys()));
  const [headerRole, setHeaderRole] = useState<string>(() => getStoredUserRole() || '');
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation('common');

  const activeKey = getActiveKey(pathname);

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

  const roleLabel = headerRole
    ? t(`roles.${headerRole}`, { defaultValue: headerRole })
    : t('header.roleUnknown');

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* Desktop sidebar — painel sólido (menos camadas que card + sombra) */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 bg-primary text-primary-foreground border-r border-primary/30 transition-[width] duration-200 ease-out',
          collapsed ? 'w-[var(--app-sidebar-w-collapsed)]' : 'w-[var(--app-sidebar-w)]',
          'hidden lg:flex flex-col',
        )}
      >
        <SidebarNav
          collapsed={collapsed}
          menuAllow={menuAllow}
          activeKey={activeKey}
          brandName={brandName}
          brandLogo={brandLogo}
          variant="medical"
        />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-[min(100%,280px)] p-0 border-0 bg-primary text-primary-foreground shadow-none [&>button]:text-white [&>button]:ring-offset-primary"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>Navegação principal</SheetDescription>
          </SheetHeader>
          <SidebarNav
            collapsed={false}
            menuAllow={menuAllow}
            activeKey={activeKey}
            brandName={brandName}
            brandLogo={brandLogo}
            variant="medical"
            onNavigate={() => setMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div
        className={cn(
          'flex flex-col flex-1 min-w-0 transition-[margin-left] duration-200 ease-out',
          collapsed ? 'lg:ml-[var(--app-sidebar-w-collapsed)]' : 'lg:ml-[var(--app-sidebar-w)]',
        )}
      >
        {/* Header — só borda, sem sombra (composição mais leve) */}
        <header
          className="sticky top-0 z-40 flex h-[var(--app-header-h)] items-center justify-between gap-2 px-4 lg:px-6 bg-white/95 backdrop-blur-sm border-b border-border supports-[backdrop-filter]:bg-white/80"
        >
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-slate-600"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:inline-flex text-slate-600 hover:text-primary"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {collapsed ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <NotificationsBell />
            <span className="text-slate-600 text-sm hidden sm:inline">
              {t('header.greeting')}{' '}
              <strong className="text-slate-800">{roleLabel}</strong>
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="cursor-pointer size-8 border border-border hover:ring-2 hover:ring-primary/25">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {roleLabel.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="flex items-center gap-2">
                    <User className="size-4" />
                    {t('userMenu.profile')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="flex items-center gap-2">
                    <Settings className="size-4" />
                    {t('userMenu.settings')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 flex items-center gap-2"
                  onClick={handleLogout}
                >
                  <LogOut className="size-4" />
                  {t('userMenu.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="app-dashboard-main flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
