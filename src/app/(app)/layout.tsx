"use client";

import React, { useLayoutEffect, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Settings,
  LogOut,
  Bell,
  AlertOctagon,
  UserRound,
  MessageSquare,
  Menu,
  User,
  ChevronDown,
  Lock,
  Search,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { planMeetsRequirement } from "@/lib/plans";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { fetchPublicBranding } from "@/lib/branding";
import {
  getStoredMenuKeys,
  getStoredUserRole,
  menuKeysForRole,
} from "@/lib/role-permissions";
import { useBillingStatus } from "@/hooks/useBillingStatus";
import { TrialBanner } from "@/components/billing/TrialBanner";
import { LogoCompactoDynamic } from "@/components/shared/componentizedImages/LogoCompactoDynamic";
import {
  useUnreadNotificationsCountQuery,
  useNotificationsListQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from "@/hooks/apiHooks/useNotifications";
import {
  BOTTOM_SECTION_KEYS,
  NAV_PLAN_REQUIREMENTS,
  NAV_SECTIONS,
  getVisibleNavSections,
} from "@/config/navigation";
import { CommandPalette } from "@/components/command-palette";
import { QuickCreateMenu } from "@/components/quick-create-menu";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "nixvet:sidebar-collapsed";

function notificationTypeMeta(type: string): {
  label: string;
  icon: React.ElementType;
  badgeClass: string;
} {
  if (type === "emergency") {
    return { label: "Emergência", icon: AlertOctagon, badgeClass: "bg-red-100 text-red-600" };
  }
  if (type === "human_attention") {
    return { label: "Atendimento humano", icon: UserRound, badgeClass: "bg-amber-100 text-amber-600" };
  }
  if (type === "conversation_alert") {
    return {
      label: "Conversa aguardando resposta",
      icon: MessageSquare,
      badgeClass: "bg-amber-100 text-amber-600",
    };
  }
  return { label: "Notificação", icon: Bell, badgeClass: "bg-primary/10 text-primary" };
}

function NotificationsBell() {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);

  const { data: unreadCount = 0 } = useUnreadNotificationsCountQuery();
  const { data: list = [], isLoading: loading } = useNotificationsListQuery(open);
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();

  const markRead = async (id: string) => {
    try {
      await markReadMutation.mutateAsync(id);
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await markAllReadMutation.mutateAsync();
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
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-card">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-105">
          <SheetHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b p-4 pr-14">
            <div className="min-w-0">
              <SheetTitle className="text-base">
                {t("notifications.title")}
              </SheetTitle>
              <SheetDescription className="sr-only">
                Painel de notificações
              </SheetDescription>
            </div>
            {list.some((n) => !n.is_read) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto shrink-0 py-1 text-xs text-primary hover:text-[color:var(--primary-hover)]"
                onClick={() => void markAllRead()}
              >
                {t("notifications.markAllRead")}
              </Button>
            )}
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1 bg-muted/40">
            {loading ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {t("notifications.loading")}
              </p>
            ) : list.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {t("notifications.empty")}
              </p>
            ) : (
              <div className="flex flex-col gap-2 p-3">
                {list.map((n) => {
                  const meta = notificationTypeMeta(n.type);
                  const Icon = meta.icon;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left text-sm transition-colors duration-150",
                        n.is_read
                          ? "border-border bg-card hover:bg-muted/60"
                          : "border-primary/20 bg-primary/4 hover:bg-primary/8",
                      )}
                      onClick={() => void markRead(n.id)}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                          meta.badgeClass,
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {meta.label}
                          </span>
                          {!n.is_read && (
                            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="mt-1 whitespace-pre-wrap break-words text-foreground">
                          {n.message}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

// NAV_SECTIONS, NAV_PLAN_REQUIREMENTS e os tipos NavLeaf/NavGroup/NavItem/NavSection
// vivem em src/config/navigation.ts — fonte única compartilhada pela Sidebar,
// pelo Command Palette e pelo menu "+ Novo".

function getActiveKey(pathname: string): string {
  if (pathname.includes("/profile")) return "profile";
  if (pathname.includes("/superadmin/finance"))
    return "finance-admin";
  if (pathname.includes("/superadmin/clinics"))
    return "clinics-admin";
  if (pathname.includes("/patients")) return "patients";
  if (pathname.includes("/owners")) return "owners";
  if (pathname.includes("/calendar")) return "calendar";
  if (pathname.includes("/settings")) return "settings";
  if (pathname.includes("/medical-records")) return "medical-records";
  if (pathname.includes("/prescriptions")) return "prescriptions";
  if (pathname.includes("/exams")) return "exams";
  if (pathname.includes("/internacoes")) return "hospitalizations";
  if (pathname.includes("/financeiro/orcamentos")) return "budgets";
  if (pathname.includes("/financeiro/lancamentos"))
    return "financeiro-lancamentos";
  if (pathname.includes("/financeiro/contas-pagar"))
    return "financeiro-contas-pagar";
  if (pathname.includes("/financeiro/planos-saude"))
    return "financeiro-planos-saude";
  if (pathname.includes("/financeiro/fluxo"))
    return "financeiro-fluxo";
  if (pathname.includes("/financeiro/receitas"))
    return "financeiro-receitas";
  if (pathname.includes("/financeiro/custos-pagamento"))
    return "financeiro-custos";
  if (pathname.includes("/financeiro/receita"))
    return "financeiro-receita";
  if (pathname.includes("/financeiro")) return "financeiro";
  if (pathname.includes("/whatsapp")) return "whatsapp";
  if (
    pathname.includes("/chatbot-workflows") ||
    pathname.includes("/settings/chatbot")
  )
    return "chatbot";
  return "dashboard";
}

// Tooltip elegante (Radix) só quando a sidebar está recolhida — expandida já
// mostra o rótulo por extenso, então o tooltip nativo/duplicado seria ruído.
function NavTooltip({
  collapsed,
  label,
  children,
}: {
  collapsed: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (!collapsed) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
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
  billingPlan: string | null;
  isSuperAdmin: boolean;
  /** Drawer mobile (Sheet): mostra rodapé com idioma, já que ali some do header. */
  isMobile?: boolean;
}

function SidebarNav({
  collapsed,
  setCollapsed,
  menuAllow,
  activeKey,
  brandName,
  variant = "medical",
  onNavigate,
  billingPlan,
  isSuperAdmin,
  isMobile = false,
}: SidebarNavProps) {
  const isNavItemLocked = (key: string) => {
    if (isSuperAdmin) return false;
    const requiredPlan = NAV_PLAN_REQUIREMENTS[key];
    return !!requiredPlan && !planMeetsRequirement(billingPlan, requiredPlan);
  };
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

  // Divisor reto e discreto ENTRE opções consecutivas (não uma borda no próprio
  // item, que herdava o rounded-sm e virava um arco em vez de linha reta).
  // Some sozinho antes do 1º item de cada lista, então nunca "separa o nada".
  const ItemDivider = () => (
    <div className={cn("mx-3 h-px", medical ? "bg-white/8" : "bg-border")} />
  );

  // filtra seções e itens por permissão (mesma checagem usada no Command Palette e no "+ Novo")
  const visibleSections = getVisibleNavSections(NAV_SECTIONS, menuAllow);

  // Cada seção "de contexto" (não-superadmin) agora vira seu próprio bloco com
  // fundo discreto — o próprio fundo já separa um contexto do outro, então o
  // divisor entre itens reseta a cada bloco (não precisa de linha na borda).
  // O cluster superadmin/admin continua sem fundo próprio ("separadinho" mas
  // como uma lista só), então mantém o divisor contínuo entre suas seções.
  const noLeadingDividerKeys = new Set<string>();
  visibleSections.forEach((section, si) => {
    const isBottom = BOTTOM_SECTION_KEYS.has(section.sectionKey);
    const prevIsBottom = BOTTOM_SECTION_KEYS.has(visibleSections[si - 1]?.sectionKey ?? "");
    section.items.forEach((item, itemIdx) => {
      if (itemIdx === 0 && !(isBottom && prevIsBottom)) {
        noLeadingDividerKeys.add(item.key);
      }
    });
  });

  return (
    <div className="flex flex-col h-full">
      <div className={cn("flex items-center h-16 px-4 shrink-0")}>
        <div
          className={cn(
            "flex w-full items-center",
            collapsed ? "justify-center" : "justify-between gap-2",
          )}
        >
          {!collapsed && (
            <div className="flex min-w-0 items-center gap-2">
              <LogoCompactoDynamic width="30" height="30" />
              <h1 className="h-6 font-heading leading-7 text-[25px] tracking-tight scale-y-85">
                <span className="text-white">{brandName.substring(0, 6)}</span>
                <span className="text-white/60">
                  {brandName.substring(6, 9)}
                </span>
              </h1>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white/70 transition-colors duration-200 hover:bg-white/10 hover:text-white md:inline-flex"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? (
              <ChevronsRight className="size-5" />
            ) : (
              <ChevronsLeft className="size-5" />
            )}
          </Button>
        </div>
      </div>

      <div className={cn("px-4 pb-2", collapsed && "px-2")}>
        <QuickCreateMenu menuAllow={menuAllow} collapsed={collapsed} />
      </div>

      <ScrollArea className="flex-1 min-h-0 overflow-y-auto py-2 ">
        {/* pb generoso + safe-area p/ o último item não ficar sob a barra do navegador/home indicator */}
        <nav className="flex flex-col gap-2 px-4 pt-2 pb-10 [padding-bottom:calc(2.5rem+env(safe-area-inset-bottom))]">
          {visibleSections.map((section, si) => {
            const isBottom = BOTTOM_SECTION_KEYS.has(section.sectionKey);
            const isFirstBottomSection =
              isBottom && !BOTTOM_SECTION_KEYS.has(visibleSections[si - 1]?.sectionKey ?? "");
            return (
            <div key={section.sectionKey}>
              {/* separador antes do bloco superadmin/configurações (só uma vez, mesmo se superadmin estiver oculto).
                  Leva o rótulo "Admin" em vez de duplicar linha com o divisor entre itens. */}
              {isFirstBottomSection && (
                <div className="mx-3 mb-2 flex items-center gap-2">
                  {!collapsed && (
                    <span
                      className={cn(
                        "text-[10px] font-semibold tracking-wide uppercase",
                        medical ? "text-white/40" : "text-muted-foreground/60",
                      )}
                    >
                      Admin
                    </span>
                  )}
                  <div
                    className={cn(
                      "h-px flex-1",
                      medical ? "bg-white/10" : "bg-border",
                    )}
                  />
                </div>
              )}

              {/* Cada contexto (não-superadmin) ganha um fundo discreto — mesma
                  cor da sidebar, só um pouco mais claro — pra "agrupar"
                  visualmente sem introduzir uma cor nova. */}
              <div
                className={cn(
                  "flex flex-col",
                  !isBottom && "rounded-lg p-1",
                  !isBottom && (medical ? "bg-white/5" : "bg-black/3"),
                )}
              >
                {section.items.map((item) => {
                  const showLeadingDivider = !noLeadingDividerKeys.has(item.key);
                  if (item.type === "group") {
                    const isOpen = openGroups.has(item.key);
                    const groupActive =
                      activeKey === item.key ||
                      item.children.some((c) => c.key === activeKey);
                    const visibleChildren = item.children.filter((c) =>
                      menuAllow.has(c.key),
                    );

                    return (
                      <React.Fragment key={item.key}>
                        {showLeadingDivider && <ItemDivider />}
                      <div className="my-1">
                        {/* cabeçalho do grupo */}
                        <NavTooltip collapsed={collapsed} label={t(item.labelKey)}>
                          <button
                            type="button"
                            onClick={() => toggleGroup(item.key)}
                            className={cn(
                              linkClass(groupActive && !isOpen),
                              "w-full",
                              collapsed && "justify-center",
                            )}
                          >
                            <item.icon
                              className={cn(
                                "shrink-0 stroke-[1.5]",
                                collapsed ? "size-5" : "size-5",
                              )}
                            />
                            {!collapsed && (
                              <>
                                <span className="flex-1 text-left text-xs">
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
                        </NavTooltip>

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
                            {visibleChildren.map((child, childIdx) => (
                              <React.Fragment key={child.key}>
                                {childIdx > 0 && <ItemDivider />}
                                <Link
                                  href={child.href}
                                  onClick={() => onNavigate?.()}
                                  className={linkClass(
                                    activeKey === child.key,
                                    true,
                                  )}
                                >
                                  <child.icon className="size-3.5 shrink-0 stroke-[1.5]" />
                                  <span className="flex-1">{t(child.labelKey)}</span>
                                  {isNavItemLocked(child.key) && (
                                    <Lock className="size-3 shrink-0 opacity-60" />
                                  )}
                                </Link>
                              </React.Fragment>
                            ))}
                          </div>
                        )}
                      </div>
                      </React.Fragment>
                    );
                  }

                  const Icon = item.icon;
                  const isActive = activeKey === item.key;
                  return (
                    <React.Fragment key={item.key}>
                      {showLeadingDivider && <ItemDivider />}
                      <NavTooltip collapsed={collapsed} label={t(item.labelKey)}>
                        <Link
                          href={item.href}
                          onClick={() => onNavigate?.()}
                          className={cn("my-1", linkClass(isActive))}
                        >
                          <Icon
                            className={cn(
                              "shrink-0 stroke-[1.5]",
                              collapsed ? "size-5" : "size-5",
                            )}
                          />
                          {!collapsed && (
                            <span className="flex-1 text-[12px]">{t(item.labelKey)}</span>
                          )}
                          {!collapsed && isNavItemLocked(item.key) && (
                            <Lock className="size-3 shrink-0 opacity-60" />
                          )}
                        </Link>
                      </NavTooltip>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* No mobile o LanguageSwitcher some do header (evita estourar a largura da
          tela) — reaparece aqui, no rodapé do drawer. */}
      {isMobile && (
        <div
          className={cn(
            "flex shrink-0 items-center justify-between gap-2 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
            medical ? "bg-black/10" : "border-t border-border",
          )}
        >
          <span
            className={cn(
              "text-xs font-medium",
              medical ? "text-white/60" : "text-muted-foreground",
            )}
          >
            Idioma
          </span>
          <LanguageSwitcher variant={medical ? "subtle" : "default"} />
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsedState] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [brandName, setBrandName] = useState("NixVet");
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  // inicia vazio (igual no server e no primeiro paint do client) e só lê
  // localStorage no useEffect abaixo — ler localStorage no initializer do
  // useState quebra a hidratação, pois o server nunca tem acesso a ele.
  const [menuAllow, setMenuAllow] = useState<Set<string>>(() => new Set());
  const [headerRole, setHeaderRole] = useState<string>("");
  const router = useRouter();
  const pathname = usePathname();
  const currentPathname = pathname ?? "";
  const { t } = useTranslation("common");
  const billing = useBillingStatus();

  const activeKey = getActiveKey(currentPathname);

  const setCollapsed = (value: boolean) => {
    setCollapsedState(value);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  // useLayoutEffect (não useEffect) para aplicar o valor salvo antes do browser
  // pintar a tela — evita o "flash" de sidebar expandida por um frame antes de
  // recolher. É um valor puramente cosmético (largura), então o pequeno
  // mismatch de hidratação é aceitável (mesmo trade-off de um toggle de tema).
  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
      if (stored === "1") setCollapsedState(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (headerRole === "superadmin") return;
    if (
      !billing.loading &&
      (billing.status === "trial_expired" || billing.status === "suspended") &&
      !currentPathname.includes("/billing/upgrade")
    ) {
      router.replace("/billing/upgrade");
    }
  }, [billing.loading, billing.status, currentPathname, router, headerRole]);

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
    <div className="flex min-h-screen bg-background">
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        menuAllow={menuAllow}
      />

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
          billingPlan={billing.billingPlan}
          isSuperAdmin={headerRole === "superadmin"}
        />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          // h-dvh (viewport dinâmico): 100vh no mobile inclui a área atrás da
          // barra do navegador e cortava o final do menu.
          className="w-[min(100%,280px)] h-dvh border-0 bg-brand-deep p-0 text-sidebar-foreground shadow-none [&>button]:text-white [&>button]:ring-offset-sidebar"
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
            billingPlan={billing.billingPlan}
            isSuperAdmin={headerRole === "superadmin"}
            isMobile
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
              className="text-muted-foreground lg:hidden md:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="hidden items-center gap-2 text-muted-foreground transition-colors duration-200 hover:text-primary sm:inline-flex"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <Search className="size-4" />
              <span className="text-sm">Buscar</span>
              <kbd className="ml-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Ctrl+K
              </kbd>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground transition-colors duration-200 hover:text-primary sm:hidden"
              onClick={() => setCommandPaletteOpen(true)}
              aria-label="Buscar"
            >
              <Search className="size-5" />
            </Button>
            <QuickCreateMenu menuAllow={menuAllow} variant="header" />
            {/* Some do header no mobile (evita estourar a largura da tela) —
                reaparece no rodapé do drawer de navegação mobile. */}
            <LanguageSwitcher className="hidden sm:flex" />
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
                    href="/profile"
                    className="flex items-center gap-2"
                  >
                    <User className="size-4" />
                    {t("userMenu.profile")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/settings"
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

        <TrialBanner billing={billing} />

        <main className="flex-1 p-5 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
