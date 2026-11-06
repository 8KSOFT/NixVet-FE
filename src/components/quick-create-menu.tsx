"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QUICK_CREATE_ACTIONS } from "@/config/quick-create";
import { cn } from "@/lib/utils";

interface QuickCreateMenuProps {
  menuAllow: Set<string>;
  /** "sidebar": botão de destaque no topo do menu lateral. "header": ícone discreto para o header mobile. */
  variant?: "sidebar" | "header";
  collapsed?: boolean;
}

export function QuickCreateMenu({ menuAllow, variant = "sidebar", collapsed = false }: QuickCreateMenuProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const actions = useMemo(
    () => QUICK_CREATE_ACTIONS.filter((action) => menuAllow.has(action.menuKey)),
    [menuAllow],
  );

  if (actions.length === 0) return null;

  const go = (href: string) => {
    router.push(href);
  };

  if (variant === "header") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="size-8.5 rounded-wa border-wa-line bg-white text-wa-ink-2 shadow-none hover:bg-wa-line-2 hover:text-wa-ink"
            aria-label={t("quickCreate.menuTitle")}
          >
            <Plus className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>{t("quickCreate.menuTitle")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {actions.map((action) => (
            <DropdownMenuItem key={action.key} onClick={() => go(action.href)} className="gap-2">
              <action.icon className="size-4" />
              {t(action.labelKey)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-center gap-1.5 rounded-wa border border-white/7 bg-white/5 py-1.75 text-[13.5px] font-semibold text-white hover:bg-white/10 hover:text-white md:py-2.25",
            collapsed && "px-0",
          )}
          title={collapsed ? t("quickCreate.new") : undefined}
        >
          <Plus className="size-3.5 shrink-0" />
          {!collapsed && <span>{t("quickCreate.new")}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>{t("quickCreate.menuTitle")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((action) => (
          <DropdownMenuItem key={action.key} onClick={() => go(action.href)} className="gap-2">
            <action.icon className="size-4" />
            {t(action.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
