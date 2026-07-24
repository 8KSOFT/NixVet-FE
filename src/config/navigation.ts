import type React from "react";
import {
  Syringe,
  Wallet,
  Bot,
  BarChart2,
  BedDouble,
  FileCheck,
  TrendingUp,
  CreditCard,
  Package,
} from "lucide-react";
import { MenuIconsWhite } from "@/components/MenuIconsWhite";
import type { PlanId } from "@/lib/plans";

export type NavLeaf = {
  type?: "leaf";
  key: string;
  icon: React.ElementType;
  href: string;
  labelKey: string;
};
export type NavGroup = {
  type: "group";
  key: string;
  icon: React.ElementType;
  labelKey: string;
  href: string;
  children: NavLeaf[];
};
export type NavItem = NavLeaf | NavGroup;
export type NavSection = { sectionKey: string; labelKey?: string; items: NavItem[] };

// Seções abaixo da linha divisória do menu (superadmin + configurações)
export const BOTTOM_SECTION_KEYS = new Set(["superadmin", "admin"]);

export const NAV_SECTIONS: NavSection[] = [
  {
    sectionKey: "main",
    items: [
      {
        key: "dashboard",
        icon: MenuIconsWhite.dashboard,
        href: "/dashboard",
        labelKey: "nav.dashboard",
      },
      {
        key: "calendar",
        icon: MenuIconsWhite.agenda,
        href: "/calendar",
        labelKey: "nav.calendar",
      },
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
        key: "exams",
        icon: MenuIconsWhite.exames,
        href: "/exams",
        labelKey: "nav.exams",
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
export const NAV_PLAN_REQUIREMENTS: Record<string, PlanId> = {
  hospitalizations: "clinica",
  "financeiro-receitas": "clinica",
  "financeiro-custos": "clinica",
  "financeiro-receita": "clinica",
  chatbot: "clinica",
};

// Telas que saíram da sidebar fixa (Fase 2 — "movidas de contexto": Bulário
// vive na Prescrição, Vacinas/Acompanhamento ganharam aba no Prontuário,
// Tarefas virou widget do Dashboard, Produtos/Equipe moraram para
// Configurações). Continuam existindo e são buscáveis no Command Palette —
// só não competem mais por espaço fixo no menu.
export const CONTEXTUAL_NAV_ITEMS: NavLeaf[] = [
  {
    key: "bulario",
    icon: MenuIconsWhite.bulario,
    href: "/bulario",
    labelKey: "nav.bulario",
  },
  {
    key: "vaccines",
    icon: Syringe,
    href: "/vaccines",
    labelKey: "nav.vaccines",
  },
  {
    key: "followups",
    icon: MenuIconsWhite.acompanhamento,
    href: "/followups",
    labelKey: "nav.followups",
  },
  {
    key: "tasks",
    icon: MenuIconsWhite.tarefas,
    href: "/tasks",
    labelKey: "nav.tasks",
  },
  {
    key: "products",
    icon: Package,
    href: "/settings/produtos",
    labelKey: "nav.financeiroProdutos",
  },
  {
    key: "team",
    icon: MenuIconsWhite.equipe,
    href: "/settings/team",
    labelKey: "nav.team",
  },
];

/** Achata grupos (ex.: financeiro) em uma lista plana de folhas navegáveis. */
export function flattenNavItems(sections: NavSection[]): NavLeaf[] {
  const leaves: NavLeaf[] = [];
  for (const section of sections) {
    for (const item of section.items) {
      if (item.type === "group") {
        leaves.push(...item.children);
      } else {
        leaves.push(item);
      }
    }
  }
  return leaves;
}

/**
 * Filtra seções e itens por permissão (menuAllow) — mesma checagem usada pela
 * Sidebar, pelo Command Palette e pelo menu "+ Novo", para os três nunca
 * divergirem sobre o que o usuário pode ver.
 */
export function getVisibleNavSections(
  sections: NavSection[],
  menuAllow: Set<string>,
): NavSection[] {
  return sections
    .map((section) => {
      const visibleItems = section.items.filter((item) => {
        if (item.type === "group") {
          const visibleChildren = item.children.filter((c) => menuAllow.has(c.key));
          return menuAllow.has(item.key) || visibleChildren.length > 0;
        }
        return menuAllow.has(item.key);
      });
      return { ...section, items: visibleItems };
    })
    .filter((s) => s.items.length > 0);
}

/**
 * Todas as telas que o usuário pode abrir — as visíveis na sidebar mais as
 * "de contexto" (item acima). Usado pelo Command Palette, para que remover um
 * item da sidebar nunca signifique perder a busca por ele no Ctrl/Cmd+K.
 */
export function getSearchableNavItems(menuAllow: Set<string>): NavLeaf[] {
  return [
    ...flattenNavItems(getVisibleNavSections(NAV_SECTIONS, menuAllow)),
    ...CONTEXTUAL_NAV_ITEMS.filter((item) => menuAllow.has(item.key)),
  ];
}
