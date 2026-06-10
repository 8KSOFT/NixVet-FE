"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
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
  Landmark,
  Wallet,
  Bot,
  BarChart2,
  BedDouble,
  FileCheck,
  TrendingUp,
  CreditCard,
  ChevronDown,
} from "lucide-react";
import { MenuIconsWhite } from "@/components/MenuIconsWhite";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import api from "@/lib/axios";
import { fetchPublicBranding } from "@/lib/branding";
import {
  getStoredMenuKeys,
  getStoredUserRole,
  menuKeysForRole,
} from "@/lib/role-permissions";
import { useBillingStatus } from "@/hooks/useBillingStatus";
import { TrialBanner } from "@/components/billing/TrialBanner";
import { LogoCompactoDynamic } from "@/components/shared/componentizedImages/LogoCompactoDynamic";

interface ClinicNotification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  createdAt?: string;
}

type NotificationsPaged = {
  data: ClinicNotification[];
  total: number;
  page: number;
  totalPages: number;
};

function notificationTypeLabel(type: string): string {
  if (type === "emergency") return "Emergência";
  if (type === "human_attention") return "Atendimento humano";
  if (type === "conversation_alert") return "Conversa aguardando resposta";
  return "Notificação";
}

function NotificationsBell() {
  const isUrgent = (type: string) =>
    type === "emergency" ||
    type === "human_attention" ||
    type === "conversation_alert";

  const { t } = useTranslation("common");
  const [unreadCount, setUnreadCount] = useState(0);
  const [list, setList] = useState<ClinicNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchUnread = () => {
    api
      .get<number>("/notifications/unread-count", {
        params: { attention_only: true },
      })
      .then((r) => setUnreadCount(Number(r.data ?? 0)))
      .catch(() => {});
  };

  const fetchList = () => {
    setLoading(true);
    api
      .get<NotificationsPaged | ClinicNotification[]>("/notifications", {
        params: { attention_only: true, limit: 50, page: 1 },
      })
      .then((r) => {
        const body = r.data;
        if (Array.isArray(body)) setList(body);
        else if (body && Array.isArray(body.data)) setList(body.data);
        else setList([]);
      })
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
      setList((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.post("/notifications/read-all");
      setUnreadCount(0);
      setList((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative text-muted-foreground transition-colors duration-200 hover:text-primary"
        onClick={() => setOpen(true)}
        aria-label={t("notifications.title")}
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        {list.some((n) => !n.is_read && isUrgent(n.type)) && (
          <AlertTriangle className="absolute -bottom-0.5 -left-0.5 size-3 text-amber-500" />
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[420px] p-0 flex flex-col">
          <SheetHeader className="flex flex-row items-center justify-between p-4 border-b space-y-0">
            <SheetTitle className="text-base">
              {t("notifications.title")}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Painel de notificações
            </SheetDescription>
            {list.some((n) => !n.is_read) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto py-1 text-xs text-primary hover:text-[color:var(--primary-hover)]"
                onClick={() => void markAllRead()}
              >
                {t("notifications.markAllRead")}
              </Button>
            )}
          </SheetHeader>
          <ScrollArea className="flex-1 bg-muted/60 p-3">
            {loading ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {t("notifications.loading")}
              </p>
            ) : list.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {t("notifications.empty")}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {list.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={cn(
                      "w-full rounded-lg border p-4 text-left text-sm shadow-[var(--shadow-card)] transition-colors duration-200",
                      n.is_read
                        ? "border-border bg-card"
                        : "border-primary/25 bg-primary/5",
                      !n.is_read &&
                        n.type === "human_attention" &&
                        "border-amber-200/80 bg-amber-50/90",
                      !n.is_read &&
                        n.type === "conversation_alert" &&
                        "border-amber-200/80 bg-amber-50/90",
                      !n.is_read &&
                        n.type === "emergency" &&
                        "border-red-200/80 bg-red-50/90",
                      "hover:bg-muted/80",
                    )}
                    onClick={() => void markRead(n.id)}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {notificationTypeLabel(n.type)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-foreground">
                      {n.message}
                    </p>
                    {!n.is_read && (
                      <div className="mt-2 flex justify-end">
                        <span
                          className={cn(
                            "text-xs font-medium",
                            n.type === "emergency"
                              ? "text-red-600"
                              : n.type === "human_attention" ||
                                  n.type === "conversation_alert"
                                ? "text-amber-800"
                                : "text-primary",
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

type NavLeaf = {
  type?: "leaf";
  key: string;
  icon: React.ElementType;
  href: string;
  labelKey: string;
};
type NavGroup = {
  type: "group";
  key: string;
  icon: React.ElementType;
  labelKey: string;
  href: string;
  children: NavLeaf[];
};
type NavItem = NavLeaf | NavGroup;
type NavSection = { sectionKey: string; labelKey?: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    sectionKey: "general",
    items: [
      {
        key: "dashboard",
        icon: MenuIconsWhite.dashboard,
        href: "/dashboard",
        labelKey: "nav.dashboard",
      },
    ],
  },
  {
    sectionKey: "superadmin",
    items: [
      {
        key: "clinics-admin",
        icon: MenuIconsWhite.clinicas,
        href: "/dashboard/superadmin/clinics",
        labelKey: "nav.clinicsAdmin",
      },
      {
        key: "finance-admin",
        icon: Wallet,
        href: "/dashboard/superadmin/finance",
        labelKey: "nav.financeAdmin",
      },
    ],
  },
  {
    sectionKey: "clinic",
    labelKey: "nav.sectionClinic",
    items: [
      {
        key: "patients",
        icon: MenuIconsWhite.pacientes,
        href: "/dashboard/patients",
        labelKey: "nav.patients",
      },
      {
        key: "owners",
        icon: MenuIconsWhite.tutores,
        href: "/dashboard/owners",
        labelKey: "nav.owners",
      },
      {
        key: "team",
        icon: MenuIconsWhite.equipe,
        href: "/dashboard/team",
        labelKey: "nav.team",
      },
    ],
  },
  {
    sectionKey: "schedule",
    labelKey: "nav.sectionSchedule",
    items: [
      {
        key: "calendar",
        icon: MenuIconsWhite.agenda,
        href: "/dashboard/calendar",
        labelKey: "nav.calendar",
      },
      {
        key: "vaccines",
        icon: Syringe,
        href: "/dashboard/vaccines",
        labelKey: "nav.vaccines",
      },
      {
        key: "tasks",
        icon: MenuIconsWhite.tarefas,
        href: "/dashboard/tasks",
        labelKey: "nav.tasks",
      },
    ],
  },
  {
    sectionKey: "clinical",
    labelKey: "nav.sectionClinical",
    items: [
      {
        key: "medical-records",
        icon: MenuIconsWhite.prontuarios,
        href: "/dashboard/medical-records",
        labelKey: "nav.medicalRecords",
      },
      {
        key: "prescriptions",
        icon: MenuIconsWhite.prescricao,
        href: "/dashboard/prescriptions",
        labelKey: "nav.prescriptions",
      },
      {
        key: "bulario",
        icon: MenuIconsWhite.bulario,
        href: "/dashboard/bulario",
        labelKey: "nav.bulario",
      },
      {
        key: "exams",
        icon: MenuIconsWhite.exames,
        href: "/dashboard/exams",
        labelKey: "nav.exams",
      },
      {
        key: "followups",
        icon: MenuIconsWhite.acompanhamento,
        href: "/dashboard/followups",
        labelKey: "nav.followups",
      },
      {
        key: "hospitalizations",
        icon: BedDouble,
        href: "/dashboard/internacoes",
        labelKey: "nav.hospitalizations",
      },
    ],
  },
  {
    sectionKey: "finance",
    labelKey: "nav.sectionFinance",
    items: [
      {
        type: "group",
        key: "financeiro",
        icon: BarChart2,
        href: "/dashboard/financeiro",
        labelKey: "nav.financeiro",
        children: [
          {
            key: "financeiro-receitas",
            icon: TrendingUp,
            href: "/dashboard/financeiro/receitas",
            labelKey: "nav.financeiroReceitas",
          },
          {
            key: "financeiro-custos",
            icon: CreditCard,
            href: "/dashboard/financeiro/custos-pagamento",
            labelKey: "nav.financeiroCustos",
          },
          {
            key: "budgets",
            icon: FileCheck,
            href: "/dashboard/financeiro/orcamentos",
            labelKey: "nav.budgets",
          },
          {
            key: "financeiro-receita",
            icon: BarChart2,
            href: "/dashboard/financeiro/receita",
            labelKey: "nav.financeiroReceita",
          },
        ],
      },
    ],
  },
  {
    sectionKey: "comms",
    labelKey: "nav.sectionComms",
    items: [
      {
        key: "whatsapp",
        icon: MenuIconsWhite.whatsapp,
        href: "/dashboard/whatsapp",
        labelKey: "nav.whatsapp",
      },
      {
        key: "chatbot",
        icon: Bot,
        href: "/dashboard/chatbot-workflows",
        labelKey: "nav.chatbot",
      },
    ],
  },
  {
    sectionKey: "admin",
    items: [
      {
        key: "settings",
        icon: MenuIconsWhite.configuracoes,
        href: "/dashboard/settings",
        labelKey: "nav.settings",
      },
    ],
  },
];

function getActiveKey(pathname: string): string {
  if (pathname.includes("/dashboard/profile")) return "profile";
  if (pathname.includes("/dashboard/superadmin/finance"))
    return "finance-admin";
  if (pathname.includes("/dashboard/superadmin/clinics"))
    return "clinics-admin";
  if (pathname.includes("/dashboard/patients")) return "patients";
  if (pathname.includes("/dashboard/owners")) return "owners";
  if (pathname.includes("/dashboard/calendar")) return "calendar";
  if (pathname.includes("/dashboard/settings")) return "settings";
  if (pathname.includes("/dashboard/bulario")) return "bulario";
  if (pathname.includes("/dashboard/medical-records")) return "medical-records";
  if (pathname.includes("/dashboard/prescriptions")) return "prescriptions";
  if (pathname.includes("/dashboard/exams")) return "exams";
  if (pathname.includes("/dashboard/followups")) return "followups";
  if (pathname.includes("/dashboard/internacoes")) return "hospitalizations";
  if (pathname.includes("/dashboard/financeiro/orcamentos")) return "budgets";
  if (pathname.includes("/dashboard/financeiro/receitas"))
    return "financeiro-receitas";
  if (pathname.includes("/dashboard/financeiro/custos-pagamento"))
    return "financeiro-custos";
  if (pathname.includes("/dashboard/financeiro/receita"))
    return "financeiro-receita";
  if (pathname.includes("/dashboard/financeiro")) return "financeiro";
  if (pathname.includes("/dashboard/vaccines")) return "vaccines";
  if (pathname.includes("/dashboard/tasks")) return "tasks";
  if (pathname.includes("/dashboard/whatsapp")) return "whatsapp";
  if (
    pathname.includes("/dashboard/chatbot-workflows") ||
    pathname.includes("/dashboard/settings/chatbot")
  )
    return "chatbot";
  if (pathname.includes("/dashboard/team")) return "team";
  return "dashboard";
}

interface SidebarNavProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  menuAllow: Set<string>;
  activeKey: string;
  brandName: string;
  brandLogo: string | null;
  variant?: "medical" | "light";
  onNavigate?: () => void;
}

function SidebarNav({
  collapsed,
  setCollapsed,
  menuAllow,
  activeKey,
  brandName,
  brandLogo,
  variant = "medical",
  onNavigate,
}: SidebarNavProps) {
  const { t } = useTranslation("common");
  const medical = variant === "medical";

  // grupos colapsáveis — auto-abre se algum filho estiver ativo
  const financeChildKeys = [
    "financeiro-receitas",
    "financeiro-custos",
    "budgets",
    "financeiro-receita",
  ];
  const financeActive =
    financeChildKeys.includes(activeKey) || activeKey === "financeiro";
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(financeActive ? ["financeiro"] : []),
  );

  // auto-abre o grupo quando um filho se torna ativo
  React.useEffect(() => {
    if (financeChildKeys.includes(activeKey)) {
      setOpenGroups((prev) => new Set([...prev, "financeiro"]));
    }
  }, [activeKey]);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const linkClass = (isActive: boolean, isChild = false) =>
    cn(
      "flex items-center gap-2.5 rounded-sm px-3 transition-colors duration-150",
      isChild ? "py-1.5 text-xs" : "py-2 text-sm font-medium",
      medical
        ? isActive
          ? "bg-black/20 text-white"
          : isChild
            ? "text-white/55 hover:bg-white/10 hover:text-white"
            : "text-white/80 hover:bg-white/10 hover:text-white"
        : isActive
          ? "bg-primary/12 text-primary font-medium"
          : isChild
            ? "text-muted-foreground/70 hover:bg-muted hover:text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
      collapsed && "justify-center px-2",
    );

  // filtra seções e itens por permissão
  const visibleSections = NAV_SECTIONS.map((section) => {
    const visibleItems = section.items.filter((item) => {
      if (item.type === "group") {
        const visibleChildren = item.children.filter((c) =>
          menuAllow.has(c.key),
        );
        return menuAllow.has(item.key) || visibleChildren.length > 0;
      }
      return menuAllow.has(item.key);
    });
    return { ...section, items: visibleItems };
  }).filter((s) => s.items.length > 0);

  return (
    <div className="flex flex-col h-full">
      <div className={cn("flex items-center h-16 px-4 shrink-0")}>
        <div
          className={cn(
            "flex items-center gap-3 w-full",
            collapsed && "justify-center",
          )}
        >
          <div className="w-full flex h-10 items-end justify-between">
            <div
              className={`w-full flex items-end gap-2 ${collapsed ? "hidden" : "block"}`}
            >
              <LogoCompactoDynamic width="30" height="30" />
              <h1
                className={`h-6 font-heading leading-7 text-[25px] tracking-tight scale-y-85 ${collapsed ? "hidden" : "block"}`}
              >
                <span className="text-white">{brandName.substring(0, 6)}</span>
                <span className="text-white/60">
                  {brandName.substring(6, 9)}
                </span>
              </h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className={`w-6 h-6 rounded-full border border-white items-center justify-center hidden text-white transition-colors duration-200 lg:inline-flex ${collapsed ? 'ml-2.5': ''}`}
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            >
              {collapsed ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronLeft className="size-4" />
              )}
            </Button>
          </div>
          {!collapsed && <span></span>}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 overflow-y-auto py-2 ">
        <nav className="flex flex-col px-4 pt-10">
          {visibleSections.map((section, si) => (
            <div key={section.sectionKey}>
              {/* separador apenas antes de Configurações */}
              {section.sectionKey === "admin" && si > 0 && (
                <div
                  className={cn(
                    "mx-3 my-2 border-t",
                    medical ? "border-white/10" : "border-border",
                  )}
                />
              )}

              <div className="flex flex-col">
                {section.items.map((item) => {
                  if (item.type === "group") {
                    const isOpen = openGroups.has(item.key);
                    const groupActive =
                      activeKey === item.key ||
                      item.children.some((c) => c.key === activeKey);
                    const visibleChildren = item.children.filter((c) =>
                      menuAllow.has(c.key),
                    );

                    return (
                      <div key={item.key} className="my-1">
                        {/* cabeçalho do grupo */}
                        <button
                          type="button"
                          onClick={() => toggleGroup(item.key)}
                          className={cn(
                            linkClass(groupActive && !isOpen),
                            "w-full",
                            collapsed && "justify-center",
                          )}
                          title={collapsed ? t(item.labelKey) : undefined}
                        >
                          <item.icon
                            className={cn(
                              "shrink-0 stroke-[1.5]",
                              collapsed ? "size-5" : "size-4",
                            )}
                          />
                          {!collapsed && (
                            <>
                              <span className="flex-1 text-left">
                                {t(item.labelKey)}
                              </span>
                              <ChevronDown
                                className={cn(
                                  "size-3.5 shrink-0 transition-transform duration-300 ease-out",
                                  isOpen && "rotate-180",
                                )}
                              />
                            </>
                          )}
                        </button>

                        {/* filhos */}
                        {!collapsed && (
                          <div
                            className={cn(
                              "ml-3 mt-0.5 overflow-hidden border-l pl-2.5 border-white/10 transition-[max-height,opacity] duration-500 ease-in-out will-change-[max-height,opacity]",
                              isOpen
                                ? "max-h-[999px] opacity-100 pointer-events-auto"
                                : "max-h-0 opacity-0 pointer-events-none",
                            )}
                          >
                            {visibleChildren.map((child) => (
                              <Link
                                key={child.key}
                                href={child.href}
                                onClick={() => onNavigate?.()}
                                className={linkClass(
                                  activeKey === child.key,
                                  true,
                                )}
                              >
                                <child.icon className="size-3.5 shrink-0 stroke-[1.5]" />
                                <span>{t(child.labelKey)}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const Icon = item.icon;
                  const isActive = activeKey === item.key;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={() => onNavigate?.()}
                      className={cn("my-1", linkClass(isActive))}
                      title={collapsed ? t(item.labelKey) : undefined}
                    >
                      <Icon
                        className={cn(
                          "shrink-0 stroke-[1.5]",
                          collapsed ? "size-5" : "size-5",
                        )}
                      />
                      {!collapsed && (
                        <span className="text-[12px]">{t(item.labelKey)}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [brandName, setBrandName] = useState("NixVet");
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [menuAllow, setMenuAllow] = useState<Set<string>>(
    () => new Set(getStoredMenuKeys()),
  );
  const [headerRole, setHeaderRole] = useState<string>(
    () => getStoredUserRole() || "",
  );
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation("common");
  const billing = useBillingStatus();

  const activeKey = getActiveKey(pathname);

  useEffect(() => {
    if (headerRole === "superadmin") return;
    if (
      !billing.loading &&
      (billing.status === "trial_expired" || billing.status === "suspended") &&
      !pathname.includes("/billing/upgrade")
    ) {
      router.replace("/dashboard/billing/upgrade");
    }
  }, [billing.loading, billing.status, pathname, router, headerRole]);

  useEffect(() => {
    fetchPublicBranding().then((branding) => {
      setBrandName(branding.appName || "NixVet");
      setBrandLogo(branding.logoUrl);
    });
  }, []);

  useEffect(() => {
    const role = getStoredUserRole() || "";
    const keys =
      role === "superadmin"
        ? menuKeysForRole("superadmin")
        : getStoredMenuKeys();
    setMenuAllow(new Set(keys));
    setHeaderRole(role);
  }, [pathname]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("tenantId");
    }
    router.push("/login");
  };

  const roleLabel = headerRole
    ? t(`roles.${headerRole}`, { defaultValue: headerRole })
    : t("header.roleUnknown");

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* Desktop sidebar — painel sólido (menos camadas que card + sombra) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 border-r border-brand-deep bg-brand-deep text-sidebar-foreground transition-[width] duration-200 ease-out",
          collapsed ? "w-(--app-sidebar-w-collapsed)" : "w-(--app-sidebar-w)",
          "hidden md:flex flex-col",
        )}
      >
        <SidebarNav
          collapsed={collapsed}
          setCollapsed={setCollapsed}
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
          className="w-[min(100%,280px)] h-screen border-0 bg-brand-deep p-0 text-sidebar-foreground shadow-none [&>button]:text-white [&>button]:ring-offset-sidebar"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>Navegação principal</SheetDescription>
          </SheetHeader>
          <SidebarNav
            collapsed={false}
            setCollapsed={setCollapsed}
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
          "flex flex-col flex-1 min-w-0 transition-[margin-left] duration-200 ease-out",
          collapsed
            ? "md:ml-(--app-sidebar-w-collapsed)"
            : "md:ml-(--app-sidebar-w)",
        )}
      >
        {/* Header — só borda, sem sombra (composição mais leve) */}
        <header className="sticky top-0 z-40 flex h-(--app-header-h) items-center justify-between gap-2 border-b-2 border-border bg-card/95 px-4 backdrop-blur-sm supports-backdrop-filter:bg-card/90 lg:px-6">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <NotificationsBell />
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {t("header.greeting")}{" "}
              <strong className="font-medium text-foreground">
                {roleLabel}
              </strong>
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Avatar className="size-9 cursor-pointer border border-border transition-shadow duration-200 hover:ring-2 hover:ring-primary/20">
                    <AvatarFallback className="bg-brand-deep text-xs font-semibold text-white">
                      {roleLabel.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard/profile"
                    className="flex items-center gap-2"
                  >
                    <User className="size-4" />
                    {t("userMenu.profile")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-2"
                  >
                    <Settings className="size-4 text-black" />
                    {t("userMenu.settings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="flex items-center gap-2"
                  onClick={handleLogout}
                >
                  <LogOut className="size-4" />
                  {t("userMenu.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-8">
          <TrialBanner billing={billing} />
          {children}
        </main>
      </div>
    </div>
  );
}
