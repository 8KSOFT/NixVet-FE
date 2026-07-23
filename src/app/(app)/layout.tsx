"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Settings,
  LogOut,
  Bell,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Menu,
  User,
  Syringe,
  Wallet,
  Bot,
  BarChart2,
  BedDouble,
  FileCheck,
  TrendingUp,
  CreditCard,
  ChevronDown,
  Package,
  Lock,
} from "lucide-react";
import { MenuIconsWhite } from "@/components/MenuIconsWhite";
import { planMeetsRequirement, type PlanId } from "@/lib/plans";
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

// Seções abaixo da linha divisória do menu (superadmin + configurações)
const BOTTOM_SECTION_KEYS = new Set(["superadmin", "admin"]);

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
      {
        key: "products",
        icon: Package,
        href: "/produtos",
        labelKey: "nav.financeiroProdutos",
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
        href: "/patients",
        labelKey: "nav.patients",
      },
      {
        key: "owners",
        icon: MenuIconsWhite.tutores,
        href: "/owners",
        labelKey: "nav.owners",
      },
      {
        key: "team",
        icon: MenuIconsWhite.equipe,
        href: "/team",
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
        href: "/calendar",
        labelKey: "nav.calendar",
      },
      {
        key: "vaccines",
        icon: Syringe,
        href: "/vaccines",
        labelKey: "nav.vaccines",
      },
      {
        key: "tasks",
        icon: MenuIconsWhite.tarefas,
        href: "/tasks",
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
        href: "/medical-records",
        labelKey: "nav.medicalRecords",
      },
      {
        key: "prescriptions",
        icon: MenuIconsWhite.prescricao,
        href: "/prescriptions",
        labelKey: "nav.prescriptions",
      },
      {
        key: "bulario",
        icon: MenuIconsWhite.bulario,
        href: "/bulario",
        labelKey: "nav.bulario",
      },
      {
        key: "exams",
        icon: MenuIconsWhite.exames,
        href: "/exams",
        labelKey: "nav.exams",
      },
      {
        key: "followups",
        icon: MenuIconsWhite.acompanhamento,
        href: "/followups",
        labelKey: "nav.followups",
      },
      {
        key: "hospitalizations",
        icon: BedDouble,
        href: "/internacoes",
        labelKey: "nav.hospitalizations",
      },
      {
        key: "clinical-terms",
        icon: FileCheck,
        href: "/termos",
        labelKey: "nav.clinicalTerms",
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
        href: "/financeiro",
        labelKey: "nav.financeiro",
        children: [
          {
            // Reusa a chave 'financeiro' (já liberada no RBAC) — o header do
            // grupo só expande/recolhe; o DRE abre por este subitem (mockup).
            key: "financeiro",
            icon: BarChart2,
            href: "/financeiro",
            labelKey: "nav.financeiroDre",
          },
          {
            key: "financeiro-lancamentos",
            icon: Wallet,
            href: "/financeiro/lancamentos",
            labelKey: "nav.financeiroLancamentos",
          },
          {
            key: "financeiro-contas-pagar",
            icon: CreditCard,
            href: "/financeiro/contas-pagar",
            labelKey: "nav.financeiroContasPagar",
          },
          {
            key: "financeiro-receitas",
            icon: TrendingUp,
            href: "/financeiro/receitas",
            labelKey: "nav.financeiroReceitas",
          },
          {
            key: "financeiro-custos",
            icon: CreditCard,
            href: "/financeiro/custos-pagamento",
            labelKey: "nav.financeiroCustos",
          },
          {
            key: "budgets",
            icon: FileCheck,
            href: "/financeiro/orcamentos",
            labelKey: "nav.budgets",
          },
          {
            key: "financeiro-receita",
            icon: BarChart2,
            href: "/financeiro/receita",
            labelKey: "nav.financeiroReceita",
          },
          {
            key: "financeiro-planos-saude",
            icon: TrendingUp,
            href: "/financeiro/planos-saude",
            labelKey: "nav.financeiroPlanosSaude",
          },
          {
            key: "financeiro-fluxo",
            icon: TrendingUp,
            href: "/financeiro/fluxo",
            labelKey: "nav.financeiroFluxo",
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
        href: "/whatsapp",
        labelKey: "nav.whatsapp",
      },
      {
        key: "chatbot",
        icon: Bot,
        href: "/chatbot-workflows",
        labelKey: "nav.chatbot",
      },
    ],
  },
  {
    sectionKey: "superadmin",
    items: [
      {
        key: "clinics-admin",
        icon: MenuIconsWhite.clinicas,
        href: "/superadmin/clinics",
        labelKey: "nav.clinicsAdmin",
      },
      {
        key: "finance-admin",
        icon: Wallet,
        href: "/superadmin/finance",
        labelKey: "nav.financeAdmin",
      },
    ],
  },
  {
    sectionKey: "admin",
    items: [
      {
        key: "settings",
        icon: MenuIconsWhite.configuracoes,
        href: "/settings",
        labelKey: "nav.settings",
      },
    ],
  },
];

// Chaves de nav que exigem um plano mínimo (espelha @RequirePlan() no backend).
// Itens fora deste mapa ficam liberados para qualquer plano.
const NAV_PLAN_REQUIREMENTS: Record<string, PlanId> = {
  hospitalizations: "clinica",
  "financeiro-receitas": "clinica",
  "financeiro-custos": "clinica",
  "financeiro-receita": "clinica",
  chatbot: "clinica",
};

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
  if (pathname.includes("/bulario")) return "bulario";
  if (pathname.includes("/medical-records")) return "medical-records";
  if (pathname.includes("/prescriptions")) return "prescriptions";
  if (pathname.includes("/exams")) return "exams";
  if (pathname.includes("/followups")) return "followups";
  if (pathname.includes("/internacoes")) return "hospitalizations";
  if (pathname.includes("/financeiro/produtos"))
    return "financeiro-produtos";
  if (pathname.includes("/produtos")) return "products";
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
  if (pathname.includes("/vaccines")) return "vaccines";
  if (pathname.includes("/tasks")) return "tasks";
  if (pathname.includes("/whatsapp")) return "whatsapp";
  if (
    pathname.includes("/chatbot-workflows") ||
    pathname.includes("/settings/chatbot")
  )
    return "chatbot";
  if (pathname.includes("/team")) return "team";
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
  billingPlan: string | null;
  isSuperAdmin: boolean;
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
        {/* pb generoso + safe-area p/ o último item não ficar sob a barra do navegador/home indicator */}
        <nav className="flex flex-col px-4 pt-10 pb-10 [padding-bottom:calc(2.5rem+env(safe-area-inset-bottom))]">
          {visibleSections.map((section, si) => (
            <div key={section.sectionKey}>
              {/* separador antes do bloco superadmin/configurações (só uma vez, mesmo se superadmin estiver oculto).
                  Leva o rótulo "Admin" em vez de duplicar linha com o divisor entre itens. */}
              {BOTTOM_SECTION_KEYS.has(section.sectionKey) &&
                !BOTTOM_SECTION_KEYS.has(
                  visibleSections[si - 1]?.sectionKey ?? "",
                ) && (
                <div className="mx-3 my-2 flex items-center gap-2">
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

              <div className="flex flex-col">
                {section.items.map((item, itemIdx) => {
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
                        {itemIdx > 0 && <ItemDivider />}
                      <div className="my-1">
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
                      {itemIdx > 0 && <ItemDivider />}
                      <Link
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
                          <span className="flex-1 text-[12px]">{t(item.labelKey)}</span>
                        )}
                        {!collapsed && isNavItemLocked(item.key) && (
                          <Lock className="size-3 shrink-0 opacity-60" />
                        )}
                      </Link>
                    </React.Fragment>
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

        <main className="flex-1 p-5 lg:p-8">
          <TrialBanner billing={billing} />
          {children}
        </main>
      </div>
    </div>
  );
}
