"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

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
            variant="ghost"
            size="icon"
            className="text-muted-foreground transition-colors duration-200 hover:text-primary"
            aria-label="Criar novo"
          >
            <Plus className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Criar novo</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {actions.map((action) => (
            <DropdownMenuItem key={action.key} onClick={() => go(action.href)} className="gap-2">
              <action.icon className="size-4" />
              {action.label}
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
            "w-full justify-center gap-2 text-white/70 hover:bg-white/10 hover:text-white",
            collapsed && "px-0",
          )}
          title={collapsed ? "Novo" : undefined}
        >
          <Plus className="size-4 shrink-0" />
          {!collapsed && <span className="text-sm">Novo</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Criar novo</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((action) => (
          <DropdownMenuItem key={action.key} onClick={() => go(action.href)} className="gap-2">
            <action.icon className="size-4" />
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
