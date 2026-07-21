"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  KeyRound,
  Plus,
  Settings2,
  Save,
  MessageCircle,
  ShieldCheck,
  ShieldOff,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { API_PAGE_SIZE } from "@/lib/pagination";
import { ListPagination } from "@/components/list-pagination";
import {
  useSuperadminTenantsQuery,
  useCreateSuperadminTenantMutation,
  usePatchSuperadminTenantMutation,
  useResetSuperadminTenantAdminPasswordMutation,
  useProvisionSuperadminWhatsappMutation,
} from "@/hooks/apiHooks/useSuperadminTenants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { getStoredUserRole } from "@/lib/role-permissions";
import type { SuperadminTenantRow as ClinicRow } from "@/app/types/tenant";

const PLAN_OPTIONS = [
  { value: "essencial", label: "Essencial — R$179/mês" },
  { value: "clinica", label: "Clínica — R$299/mês" },
  { value: "hospital", label: "Hospital — R$499/mês" },
  { value: "enterprise", label: "Enterprise (manual)" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Ativo" },
  { value: "trial", label: "Trial" },
  { value: "trial_expired", label: "Trial Expirado" },
  { value: "overdue", label: "Em Atraso" },
  { value: "suspended", label: "Suspenso" },
  { value: "cancelled", label: "Cancelado" },
  { value: "exempt", label: "Isento (cortesia)" },
];

const addDays = (d: number) =>
  new Date(Date.now() + d * 86400000).toISOString();
const addMonths = (m: number) => {
  const dt = new Date();
  dt.setMonth(dt.getMonth() + m);
  return dt.toISOString();
};

function statusBadgeVariant(
  status: string | null,
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "active":
      return "default";
    case "exempt":
      return "secondary";
    case "trial":
      return "secondary";
    case "overdue":
      return "outline";
    default:
      return "destructive";
  }
}

function statusBadgeClass(status: string | null): string {
  if (status === "exempt")
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status === "active")
    return "bg-green-100 text-green-800 border-green-200";
  return "";
}

function statusLabel(status: string | null) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status ?? "—";
}

const emptyCreate = () => ({
  name: "",
  code: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
  whatsapp_ai_chatbot_enabled: false,
  ai_platform_enabled: false,
  billing_plan: "basic",
});

export default function SuperadminClinicsPage() {
  const router = useRouter();
  const [listPage, setListPage] = useState(1);

  const [resetTenantId, setResetTenantId] = useState<string | null>(null);
  const [resetClinicName, setResetClinicName] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreate());

  const [editRow, setEditRow] = useState<ClinicRow | null>(null);
  const [editForm, setEditForm] = useState<Partial<ClinicRow>>({});

  // WhatsApp provisioning
  const [whatsappTenantId, setWhatsappTenantId] = useState<string | null>(null);
  const [whatsappClinicName, setWhatsappClinicName] = useState("");

  const { data, isLoading: loading, error } = useSuperadminTenantsQuery(listPage);
  const rows = data?.items ?? [];
  const listTotal = data?.total ?? 0;
  const listTotalPages = data?.totalPages ?? 1;
  const createMutation = useCreateSuperadminTenantMutation();
  const patchMutation = usePatchSuperadminTenantMutation();
  const resetPasswordMutation = useResetSuperadminTenantAdminPasswordMutation();
  const provisionWhatsappMutation = useProvisionSuperadminWhatsappMutation();
  const creating = createMutation.isPending;
  const editing = patchMutation.isPending;
  const resetting = resetPasswordMutation.isPending;
  const whatsappProvisioning = provisionWhatsappMutation.isPending;

  useEffect(() => {
    const role = getStoredUserRole();
    if (role !== "superadmin") {
      toast.error(
        `Você está logado como "${role ?? "desconhecido"}". Faça logout e logue como superadmin.`,
      );
      router.replace("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    if (!error) return;
    const err = error as { response?: { status?: number } };
    if (err.response?.status === 403) {
      toast.error(
        "Apenas superadmin pode acessar. Faça logout e entre com uma conta superadmin.",
      );
      router.replace("/dashboard");
      return;
    }
    toast.error("Falha ao carregar clínicas");
  }, [error, router]);

  const openReset = (row: ClinicRow) => {
    setResetTenantId(row.id);
    setResetClinicName(row.name);
    setNewPassword("");
  };

  const submitReset = async () => {
    if (!resetTenantId || newPassword.trim().length < 8) {
      toast.error("Senha precisa ter no mínimo 8 caracteres");
      return;
    }
    try {
      await resetPasswordMutation.mutateAsync({
        id: resetTenantId,
        payload: { newPassword: newPassword.trim() },
      });
      setResetTenantId(null);
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { message?: string | string[] } };
      };
      const msg = err.response?.data?.message;
      const text = Array.isArray(msg)
        ? msg.join(" | ")
        : (msg as string) || "Erro";
      toast.error(text);
    }
  };

  const submitCreate = async () => {
    if (!createForm.name.trim() || !createForm.code.trim()) {
      toast.error("Informe nome e código");
      return;
    }
    try {
      await createMutation.mutateAsync({
        ...createForm,
        name: createForm.name.trim(),
        code: createForm.code.trim().toLowerCase(),
        adminEmail: createForm.adminEmail.trim().toLowerCase() || undefined,
        adminPassword: createForm.adminPassword || undefined,
        adminName: createForm.adminName.trim() || undefined,
      });
      setCreateOpen(false);
      setCreateForm(emptyCreate());
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { message?: string | string[] } };
      };
      const msg = err.response?.data?.message;
      const text = Array.isArray(msg)
        ? msg.join(" | ")
        : (msg as string) || "Erro ao criar";
      toast.error(text);
    }
  };

  const openEdit = (row: ClinicRow) => {
    setEditRow(row);
    setEditForm({
      name: row.name,
      email: row.email,
      phone: row.phone,
      whatsapp_ai_chatbot_enabled: row.whatsapp_ai_chatbot_enabled,
      ai_platform_enabled: row.ai_platform_enabled,
      billing_plan: row.billing_plan ?? "essencial",
      subscription_status: row.subscription_status ?? "trial",
    });
  };

  const quickPatch = async (
    tenantId: string,
    payload: Record<string, unknown>,
  ) => {
    try {
      await patchMutation.mutateAsync({ id: tenantId, payload });
    } catch {
      toast.error("Falha ao atualizar");
    }
  };

  const submitEdit = async () => {
    if (!editRow) return;
    try {
      await patchMutation.mutateAsync({ id: editRow.id, payload: editForm });
      setEditRow(null);
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { message?: string | string[] } };
      };
      const msg = err.response?.data?.message;
      const text = Array.isArray(msg)
        ? msg.join(" | ")
        : (msg as string) || "Erro";
      toast.error(text);
    }
  };

  const submitProvisionWhatsapp = async () => {
    if (!whatsappTenantId) return;
    try {
      await provisionWhatsappMutation.mutateAsync({
        tenantId: whatsappTenantId,
        instanceName: `NixVet - ${whatsappClinicName}`,
      });
      setWhatsappTenantId(null);
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { message?: string | string[] } };
      };
      const msg = err.response?.data?.message;
      const text = Array.isArray(msg)
        ? msg.join(" | ")
        : (msg as string) || "Erro ao provisionar";
      toast.error(text);
    }
  };

  const quickToggle = async (
    row: ClinicRow,
    field: "whatsapp_ai_chatbot_enabled" | "ai_platform_enabled",
    value: boolean,
  ) => {
    try {
      await patchMutation.mutateAsync({ id: row.id, payload: { [field]: value } });
    } catch {
      toast.error("Falha ao atualizar — recarregue");
    }
  };

  const renderRowActions = (row: ClinicRow) => (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {row.subscription_status !== "active" &&
        row.subscription_status !== "exempt" && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="p-0"
            title="Liberar"
            aria-label="Liberar"
            onClick={() =>
              void quickPatch(row.id, {
                subscription_status: "active",
              })
            }
          >
            <ShieldCheck className="size-4 text-emerald-700" />
          </Button>
        )}
      {(row.subscription_status === "active" ||
        row.subscription_status === "exempt") && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="p-0"
          title="Suspender"
          aria-label="Suspender"
          onClick={() =>
            void quickPatch(row.id, {
              subscription_status: "suspended",
            })
          }
        >
          <ShieldOff className="size-4 text-red-600" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="p-0"
        title="Editar"
        aria-label="Editar"
        onClick={() => openEdit(row)}
      >
        <Settings2 className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="p-0"
        title="Redefinir senha"
        aria-label="Redefinir senha"
        onClick={() => openReset(row)}
        disabled={!row.admin_email}
      >
        <KeyRound className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="p-0"
        title="WhatsApp"
        aria-label="WhatsApp"
        onClick={() => {
          setWhatsappTenantId(row.id);
          setWhatsappClinicName(row.name);
        }}
      >
        <MessageCircle className="size-4 text-green-700" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="p-0"
            title="Mais ações"
            aria-label="Mais ações"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() =>
              void quickPatch(row.id, {
                subscription_status: "trial",
                trial_ends_at: addDays(14),
              })
            }
          >
            Trial 14 dias
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              void quickPatch(row.id, {
                subscription_status: "trial",
                trial_ends_at: addDays(30),
              })
            }
          >
            Trial 30 dias
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              void quickPatch(row.id, {
                subscription_status: "exempt",
                trial_ends_at: addMonths(3),
              })
            }
          >
            Isentar 3 meses
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              void quickPatch(row.id, {
                subscription_status: "exempt",
                trial_ends_at: addMonths(6),
              })
            }
          >
            Isentar 6 meses
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              router.push(`/superadmin/clinics/${row.id}`)
            }
          >
            <ExternalLink className="size-3.5 mr-2" /> Ver detalhes
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Clínicas (global)
          </h1>
          <p className="text-muted-foreground mt-1">
            Painel exclusivo do superadmin — crie, edite e gerencie os tenants.
          </p>
        </div>
        <Button
          className="w-full bg-primary sm:w-auto"
          onClick={() => {
            setCreateForm(emptyCreate());
            setCreateOpen(true);
          }}
        >
          <Plus className="size-4 mr-1" /> Nova clínica
        </Button>
      </div>

      <div className="rounded-xl bg-card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="size-5 animate-spin" /> Carregando...
          </div>
        ) : (
          <>
            {/* Desktop / tablet: tabela */}
            <div className="hidden overflow-x-auto rounded-lg border border-gray-300 md:block">
              <Table className="min-w-full border-collapse bg-white text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-300 h-15">
                    <TableHead>Clínica</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Chatbot WhatsApp</TableHead>
                    <TableHead>Plataforma IA</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="border-t border-slate-200 py-8 text-center text-sm text-slate-500"
                      >
                        Nenhuma clínica cadastrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow
                        className="border-b border-gray-300 h-15"
                        key={row.id}
                      >
                        <TableCell>
                          <div className="font-medium">{row.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.email ?? ""}{" "}
                            {row.phone ? `· ${row.phone}` : ""}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {row.code}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{row.admin_name ?? "—"}</div>
                          <div className="text-muted-foreground text-xs">
                            {row.admin_email ?? ""}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={row.whatsapp_ai_chatbot_enabled}
                            onCheckedChange={(v) =>
                              quickToggle(row, "whatsapp_ai_chatbot_enabled", v)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={row.ai_platform_enabled}
                            onCheckedChange={(v) =>
                              quickToggle(row, "ai_platform_enabled", v)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize w-fit">
                            {row.billing_plan?.trim() || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={statusBadgeVariant(
                                row.subscription_status,
                              )}
                              className={`capitalize w-fit text-xs ${statusBadgeClass(row.subscription_status)}`}
                            >
                              {statusLabel(row.subscription_status)}
                            </Badge>
                            {row.trial_ends_at &&
                              (row.subscription_status === "trial" ||
                                row.subscription_status === "exempt") && (
                                <span className="text-xs text-muted-foreground">
                                  até{" "}
                                  {new Date(
                                    row.trial_ends_at,
                                  ).toLocaleDateString("pt-BR")}
                                </span>
                              )}
                            {row.cancel_at && (
                              <span className="text-xs text-orange-600">
                                ⚠️ cancel.{" "}
                                {new Date(row.cancel_at).toLocaleDateString(
                                  "pt-BR",
                                )}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {renderRowActions(row)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: cards */}
            <div className="space-y-3 md:hidden">
              {rows.length === 0 ? (
                <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
                  Nenhuma clínica cadastrada.
                </div>
              ) : (
                rows.map((row) => (
                  <div key={row.id} className="rounded-lg border border-gray-300 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.email ?? ""}{row.phone ? ` · ${row.phone}` : ""}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">{row.code}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge
                          variant={statusBadgeVariant(row.subscription_status)}
                          className={`capitalize text-xs ${statusBadgeClass(row.subscription_status)}`}
                        >
                          {statusLabel(row.subscription_status)}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {row.billing_plan?.trim() || "—"}
                        </Badge>
                      </div>
                    </div>

                    {(row.trial_ends_at &&
                      (row.subscription_status === "trial" || row.subscription_status === "exempt")) ||
                    row.cancel_at ? (
                      <div className="mt-1 text-xs">
                        {row.trial_ends_at &&
                          (row.subscription_status === "trial" || row.subscription_status === "exempt") && (
                            <span className="text-muted-foreground">
                              até {new Date(row.trial_ends_at).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        {row.cancel_at && (
                          <span className="ml-2 text-orange-600">
                            ⚠️ cancel. {new Date(row.cancel_at).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                    ) : null}

                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Admin</p>
                        <p className="truncate">{row.admin_name ?? "—"}</p>
                        <p className="truncate text-xs text-muted-foreground">{row.admin_email ?? ""}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Chatbot WhatsApp</span>
                        <Switch
                          checked={row.whatsapp_ai_chatbot_enabled}
                          onCheckedChange={(v) => quickToggle(row, "whatsapp_ai_chatbot_enabled", v)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Plataforma IA</span>
                        <Switch
                          checked={row.ai_platform_enabled}
                          onCheckedChange={(v) => quickToggle(row, "ai_platform_enabled", v)}
                        />
                      </div>
                    </div>

                    <div className="mt-3 border-t border-gray-200 pt-2">
                      {renderRowActions(row)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <ListPagination
              page={listPage}
              totalPages={listTotalPages}
              total={listTotal}
              pageSize={API_PAGE_SIZE}
              onPageChange={setListPage}
              disabled={loading}
            />
          </>
        )}
      </div>

      {/* Reset password */}
      <Dialog
        open={Boolean(resetTenantId)}
        onOpenChange={(o) => !o && setResetTenantId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redefinir senha do admin</DialogTitle>
            <DialogDescription>
              Clínica: <strong>{resetClinicName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-admin-pw">Nova senha</Label>
            <Input
              id="new-admin-pw"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setResetTenantId(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void submitReset()}
              disabled={resetting}
            >
              {resetting && <Loader2 className="size-4 animate-spin mr-1" />}{" "}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create clinic */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova clínica</DialogTitle>
            <DialogDescription>
              Cria o tenant e, opcionalmente, o primeiro administrador.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Código *</Label>
              <Input
                value={createForm.code}
                onChange={(e) =>
                  setCreateForm((p) => ({
                    ...p,
                    code: e.target.value.toLowerCase(),
                  }))
                }
                placeholder="ex: vetazul"
              />
            </div>
            <div className="space-y-1 col-span-2 border-t pt-3 mt-1">
              <p className="text-xs text-muted-foreground">
                Admin inicial (opcional)
              </p>
            </div>
            <div className="space-y-1">
              <Label>Nome do admin</Label>
              <Input
                value={createForm.adminName}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, adminName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Email do admin</Label>
              <Input
                type="email"
                value={createForm.adminEmail}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, adminEmail: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Senha (mín 8)</Label>
              <Input
                type="password"
                value={createForm.adminPassword}
                onChange={(e) =>
                  setCreateForm((p) => ({
                    ...p,
                    adminPassword: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1 col-span-2 border-t pt-3 mt-1">
              <p className="text-xs text-muted-foreground">Plano & recursos</p>
            </div>
            <div className="space-y-1">
              <Label>Plano</Label>
              <Select
                value={createForm.billing_plan}
                onValueChange={(v) =>
                  setCreateForm((p) => ({ ...p, billing_plan: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={createForm.whatsapp_ai_chatbot_enabled}
                  onCheckedChange={(v) =>
                    setCreateForm((p) => ({
                      ...p,
                      whatsapp_ai_chatbot_enabled: v,
                    }))
                  }
                />
                Chatbot WhatsApp
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={createForm.ai_platform_enabled}
                  onCheckedChange={(v) =>
                    setCreateForm((p) => ({ ...p, ai_platform_enabled: v }))
                  }
                />
                Plataforma IA
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-primary"
              onClick={() => void submitCreate()}
              disabled={creating}
            >
              {creating && <Loader2 className="size-4 animate-spin mr-1" />}{" "}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit clinic */}
      <Dialog
        open={Boolean(editRow)}
        onOpenChange={(o) => !o && setEditRow(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar clínica</DialogTitle>
            <DialogDescription>
              {editRow?.name} —{" "}
              <span className="font-mono text-xs">{editRow?.code}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2">
            <div className="space-y-1 col-span-2">
              <Label>Nome</Label>
              <Input
                value={(editForm.name as string) ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={(editForm.email as string) ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input
                value={(editForm.phone as string) ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Plano</Label>
              <Select
                value={(editForm.billing_plan as string) || "essencial"}
                onValueChange={(v) =>
                  setEditForm((p) => ({ ...p, billing_plan: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status de Acesso</Label>
              <Select
                value={(editForm.subscription_status as string) || "trial"}
                onValueChange={(v) =>
                  setEditForm((p) => ({ ...p, subscription_status: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {["trial", "exempt"].includes(
              editForm.subscription_status as string,
            ) && (
              <div className="space-y-1 col-span-2">
                <Label>Válido até</Label>
                <Input
                  type="date"
                  value={((editForm.trial_ends_at as string) ?? "").slice(
                    0,
                    10,
                  )}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      trial_ends_at: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : undefined,
                    }))
                  }
                />
              </div>
            )}
            {editRow?.cancel_at && (
              <div className="col-span-2 text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-md px-3 py-2">
                ⚠️ Cancelamento agendado:{" "}
                {new Date(editRow.cancel_at).toLocaleDateString("pt-BR")}
              </div>
            )}
            <div className="space-y-3 pt-2 col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={Boolean(editForm.whatsapp_ai_chatbot_enabled)}
                  onCheckedChange={(v) =>
                    setEditForm((p) => ({
                      ...p,
                      whatsapp_ai_chatbot_enabled: v,
                    }))
                  }
                />
                Chatbot WhatsApp
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={Boolean(editForm.ai_platform_enabled)}
                  onCheckedChange={(v) =>
                    setEditForm((p) => ({ ...p, ai_platform_enabled: v }))
                  }
                />
                Plataforma IA
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditRow(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-primary"
              onClick={() => void submitEdit()}
              disabled={editing}
            >
              {editing ? (
                <Loader2 className="size-4 animate-spin mr-1" />
              ) : (
                <Save className="size-4 mr-1" />
              )}{" "}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp provisioning */}
      <Dialog
        open={Boolean(whatsappTenantId)}
        onOpenChange={(o) => !o && setWhatsappTenantId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="size-5 text-green-600" /> Provisionar
              WhatsApp
            </DialogTitle>
            <DialogDescription>
              Cria uma instância Z-API para{" "}
              <strong>{whatsappClinicName}</strong> e salva as credenciais no
              tenant. A clínica verá o QR Code em{" "}
              <strong>Configurações → WhatsApp</strong>.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Requer <code className="text-xs">ZAPI_PARTNER_TOKEN</code>{" "}
            configurado no servidor. Se a clínica já tiver uma instância, uma
            segunda será criada.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setWhatsappTenantId(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => void submitProvisionWhatsapp()}
              disabled={whatsappProvisioning}
            >
              {whatsappProvisioning && (
                <Loader2 className="size-4 animate-spin mr-1" />
              )}
              Provisionar instância
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
