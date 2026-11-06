import type React from "react";
import {
  PawPrint,
  User,
  UserPlus,
  CalendarPlus,
  Stethoscope,
  Pill,
  Package,
  Syringe,
  CalendarClock,
  ListChecks,
} from "lucide-react";

export type QuickCreateAction = {
  key: string;
  /** Chave de RBAC (mesma usada em menuAllow/NAV_SECTIONS) que precisa estar liberada para o item aparecer. */
  menuKey: string;
  /** Chave de tradução (`common`) do rótulo. */
  labelKey: string;
  icon: React.ElementType;
  /** Rota de destino, já com o parâmetro que a página-alvo lê para abrir seu próprio dialog de criação. */
  href: string;
};

// Espelha as 6 categorias do spec de criação rápida; "Paciente / Tutor" vira
// dois itens (cada um mapeado 1:1 a uma chave de RBAC própria — patients e
// owners não são sempre liberados juntos). Depois da Fase 2 (Vacinas,
// Acompanhamento e Tarefas saíram da sidebar fixa), ganharam entrada aqui
// também — sem isso não haveria nenhum jeito rápido de criar um novo registro
// desses tipos a partir de outra tela.
export const QUICK_CREATE_ACTIONS: QuickCreateAction[] = [
  {
    key: "patient",
    menuKey: "patients",
    labelKey: "quickCreate.patient",
    icon: PawPrint,
    href: "/patients?create=1",
  },
  {
    key: "owner",
    menuKey: "owners",
    labelKey: "quickCreate.owner",
    icon: User,
    href: "/owners?create=1",
  },
  {
    key: "appointment",
    menuKey: "calendar",
    labelKey: "quickCreate.appointment",
    icon: CalendarPlus,
    href: "/calendar?create=1",
  },
  {
    key: "medical-record",
    menuKey: "medical-records",
    labelKey: "quickCreate.medicalRecord",
    icon: Stethoscope,
    href: "/patients?intent=start-atendimento",
  },
  {
    key: "prescription",
    menuKey: "prescriptions",
    labelKey: "quickCreate.prescription",
    icon: Pill,
    href: "/prescriptions?create=1",
  },
  {
    key: "team-member",
    menuKey: "team",
    labelKey: "quickCreate.teamMember",
    icon: UserPlus,
    href: "/settings/team?create=1",
  },
  {
    key: "product",
    menuKey: "products",
    labelKey: "quickCreate.product",
    icon: Package,
    href: "/settings/produtos?create=1",
  },
  {
    key: "vaccine",
    menuKey: "vaccines",
    labelKey: "quickCreate.vaccine",
    icon: Syringe,
    href: "/vaccines?create=1",
  },
  {
    key: "followup",
    menuKey: "followups",
    labelKey: "quickCreate.followup",
    icon: CalendarClock,
    href: "/followups?create=1",
  },
  {
    key: "task",
    menuKey: "tasks",
    labelKey: "quickCreate.task",
    icon: ListChecks,
    href: "/tasks?create=1",
  },
];
