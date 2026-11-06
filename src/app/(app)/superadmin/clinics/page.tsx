"use client";

import React, { useEffect, useState } from "react";
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Loader2,
  KeyRound,
  Plus,
  Settings2,
  Save,
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
import { DashboardCreateFormDialog } from "@/components/dashboard-create-form-dialog";
import {
  useSuperadminTenantsQuery,
  useCreateSuperadminTenantMutation,
  usePatchSuperadminTenantMutation,
  useResetSuperadminTenantAdminPasswordMutation,
} from "@/hooks/apiHooks/useSuperadminTenants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TelefoneInput } from "@/components/telefone-input";
import { exibirTelefone, somenteDigitos, telefoneValido } from "@/lib/telefone";
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
import { usePlanOptions, usePlanShortLabel } from "@/lib/i18n/plans";
import type { SuperadminTenantRow as ClinicRow } from "@/app/types/tenant";

const STATUS_VALUES = [
  "active",
  "trial",
  "trial_expired",
  "overdue",
  "suspended",
  "cancelled",
  "exempt",
] as const;

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
  const { t } = useTranslation();
  const PLAN_OPTIONS = usePlanOptions();
  const planShortLabel = usePlanShortLabel();
  const statusLabel = (status: string | null) =>
    status ? t(`subscriptionStatus.${status}`, { defaultValue: status }) : "—";
  const router = useRouter();
  const [listPage, setListPage] = useState(1);

  const [resetTenantId, setResetTenantId] = useState<string | null>(null);
  const [resetClinicName, setResetClinicName] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreate());

  const [editRow, setEditRow] = useState<ClinicRow | null>(null);
  const [editForm, setEditForm] = useState<Partial<ClinicRow>>({});

  const { data, isLoading: loading, error } = useSuperadminTenantsQuery(listPage);
  const rows = data?.items ?? [];
  const listTotal = data?.total ?? 0;
  const listTotalPages = data?.totalPages ?? 1;
  const createMutation = useCreateSuperadminTenantMutation();
  const patchMutation = usePatchSuperadminTenantMutation();
  const resetPasswordMutation = useResetSuperadminTenantAdminPasswordMutation();
  const creating = createMutation.isPending;
  const editing = patchMutation.isPending;
  const resetting = resetPasswordMutation.isPending;

  useEffect(() => {
    const role = getStoredUserRole();
    if (role !== "superadmin") {
      toast.error(
        t("superadminClinics.toasts.loggedAs", { role: role ?? t("superadminClinics.toasts.roleUnknown") }),
      );
      router.replace("/dashboard");
    }
  }, [router, t]);

  useEffect(() => {
    if (!error) return;
    const err = error as { response?: { status?: number } };
    if (err.response?.status === 403) {
      toast.error(t("superadminClinics.toasts.superadminOnly"));
      router.replace("/dashboard");
      return;
    }
    toast.error(t("superadminClinics.toasts.loadFail"));
  }, [error, router, t]);

  const openReset = (row: ClinicRow) => {
    setResetTenantId(row.id);
    setResetClinicName(row.name);
    setNewPassword("");
  };

  const submitReset = async () => {
    if (!resetTenantId || newPassword.trim().length < 8) {
      toast.error(t("superadminClinics.toasts.passwordMin8"));
      return;
    }
    try {
      await resetPasswordMutation.mutateAsync({
        id: resetTenantId,
        payload: { newPassword: newPassword.trim() },
      });
      setResetTenantId(null);
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, t("superadminClinics.toasts.error")));
    }
  };

  const submitCreate = async () => {
    if (!createForm.name.trim() || !createForm.code.trim()) {
      toast.error(t("superadminClinics.toasts.nameCodeRequired"));
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
      toast.error(getApiErrorMessage(e, t("superadminClinics.toasts.createError")));
    }
  };

  const openEdit = (row: ClinicRow) => {
    setEditRow(row);
    setEditForm({
      name: row.name,
      email: row.email,
      phone: exibirTelefone(row.phone),
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
      toast.error(t("superadminClinics.toasts.updateFail"));
    }
  };

  const submitEdit = async () => {
    if (!editRow) return;
    const telefone = (editForm.phone as string | null | undefined) ?? "";
    if (telefone && !telefoneValido(telefone)) {
      toast.error(t("superadminClinics.toasts.phoneInvalid"));
      return;
    }
    try {
      await patchMutation.mutateAsync({
        id: editRow.id,
        payload: { ...editForm, phone: somenteDigitos(telefone) },
      });
      setEditRow(null);
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, t("superadminClinics.toasts.error")));
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
      toast.error(t("superadminClinics.toasts.updateFailReload"));
    }
  };

  const renderRowActions = (row: ClinicRow) => (
    <div className="flex flex-nowrap items-center justify-end gap-1">
      {row.subscription_status !== "active" &&
        row.subscription_status !== "exempt" && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="p-0"
            title={t("superadminClinics.actions.release")}
            aria-label={t("superadminClinics.actions.release")}
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
          title={t("superadminClinics.actions.suspend")}
          aria-label={t("superadminClinics.actions.suspend")}
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
        title={t("superadminClinics.actions.edit")}
        aria-label={t("superadminClinics.actions.edit")}
        onClick={() => openEdit(row)}
      >
        <Settings2 className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="p-0"
        title={t("superadminClinics.actions.resetPassword")}
        aria-label={t("superadminClinics.actions.resetPassword")}
        onClick={() => openReset(row)}
        disabled={!row.admin_email}
      >
        <KeyRound className="size-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="p-0"
            title={t("superadminClinics.actions.more")}
            aria-label={t("superadminClinics.actions.more")}
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
            {t("superadminClinics.actions.trial14")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              void quickPatch(row.id, {
                subscription_status: "trial",
                trial_ends_at: addDays(30),
              })
            }
          >
            {t("superadminClinics.actions.trial30")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              void quickPatch(row.id, {
                subscription_status: "exempt",
                trial_ends_at: addMonths(3),
              })
            }
          >
            {t("superadminClinics.actions.exempt3")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              void quickPatch(row.id, {
                subscription_status: "exempt",
                trial_ends_at: addMonths(6),
              })
            }
          >
            {t("superadminClinics.actions.exempt6")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              router.push(`/superadmin/clinics/${row.id}`)
            }
          >
            <ExternalLink className="size-3.5 mr-2" /> {t("superadminClinics.actions.viewDetails")}
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
            {t("nav.clinicsAdmin")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("superadminClinics.pageSubtitle")}
          </p>
        </div>
        <Button
          className="w-full bg-primary sm:w-auto"
          onClick={() => {
            setCreateForm(emptyCreate());
            setCreateOpen(true);
          }}
        >
          <Plus className="size-4 mr-1" /> {t("superadminClinics.newClinic")}
        </Button>
      </div>

      <div className="rounded-xl bg-card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="size-5 animate-spin" /> {t("superadminClinics.loadingShort")}
          </div>
        ) : (
          <>
            {/* Desktop / tablet: tabela */}
            <div className="hidden overflow-x-auto rounded-lg border border-gray-300 md:block">
              <Table className="min-w-full border-collapse bg-white text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-300 h-15">
                    <TableHead>{t("superadminClinics.cols.clinic")}</TableHead>
                    <TableHead>{t("superadminClinics.cols.code")}</TableHead>
                    <TableHead>{t("superadminClinics.cols.admin")}</TableHead>
                    <TableHead>{t("superadminClinics.cols.chatbot")}</TableHead>
                    <TableHead>{t("superadminClinics.cols.ai")}</TableHead>
                    <TableHead>{t("superadminClinics.cols.plan")}</TableHead>
                    <TableHead>{t("superadminClinics.cols.status")}</TableHead>
                    <TableHead className="text-right">{t("superadminClinics.cols.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="border-t border-slate-200 py-8 text-center text-sm text-slate-500"
                      >
                        {t("superadminClinics.emptyList")}
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
                            {planShortLabel(row.billing_plan?.trim())}
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
                                  {t("superadminClinics.until", { date: new Date(row.trial_ends_at).toLocaleDateString("pt-BR") })}
                                </span>
                              )}
                            {row.cancel_at && (
                              <span className="text-xs text-orange-600">
                                ⚠️ {t("superadminClinics.cancelShort", { date: new Date(row.cancel_at).toLocaleDateString("pt-BR") })}
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
                  {t("superadminClinics.emptyList")}
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
                          {planShortLabel(row.billing_plan?.trim())}
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
                              {t("superadminClinics.until", { date: new Date(row.trial_ends_at).toLocaleDateString("pt-BR") })}
                            </span>
                          )}
                        {row.cancel_at && (
                          <span className="ml-2 text-orange-600">
                            ⚠️ {t("superadminClinics.cancelShort", { date: new Date(row.cancel_at).toLocaleDateString("pt-BR") })}
                          </span>
                        )}
                      </div>
                    ) : null}

                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">{t("superadminClinics.cols.admin")}</p>
                        <p className="truncate">{row.admin_name ?? "—"}</p>
                        <p className="truncate text-xs text-muted-foreground">{row.admin_email ?? ""}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{t("superadminClinics.cols.chatbot")}</span>
                        <Switch
                          checked={row.whatsapp_ai_chatbot_enabled}
                          onCheckedChange={(v) => quickToggle(row, "whatsapp_ai_chatbot_enabled", v)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{t("superadminClinics.cols.ai")}</span>
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
        <DialogContent className="md:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("superadminClinics.resetDialog.title")}</DialogTitle>
            <DialogDescription>
              <Trans i18nKey="superadminClinics.resetDialog.clinic" values={{ name: resetClinicName }} components={{ b: <strong /> }} />
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-admin-pw">{t("superadminClinics.resetDialog.newPassword")}</Label>
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
              {t("superadminClinics.resetDialog.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void submitReset()}
              disabled={resetting}
            >
              {resetting && <Loader2 className="size-4 animate-spin mr-1" />}{" "}
              {t("superadminClinics.resetDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create clinic */}
      <DashboardCreateFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t("superadminClinics.createDialog.title")}
        description={t("superadminClinics.createDialog.description")}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="border border-gray-300"
              onClick={() => setCreateOpen(false)}
            >
              {t("superadminClinics.createDialog.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void submitCreate()}
              disabled={creating}
            >
              {creating && <Loader2 className="size-4 animate-spin mr-1" />}{" "}
              {t("superadminClinics.createDialog.create")}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>{t("superadminClinics.createDialog.name")}</Label>
            <Input
              value={createForm.name}
              onChange={(e) =>
                setCreateForm((p) => ({ ...p, name: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>{t("superadminClinics.createDialog.code")}</Label>
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
          <div className="space-y-1 sm:col-span-2 border-t pt-3 mt-1">
            <p className="text-xs text-muted-foreground">
              {t("superadminClinics.createDialog.adminOptional")}
            </p>
          </div>
          <div className="space-y-1">
            <Label>{t("superadminClinics.createDialog.adminName")}</Label>
            <Input
              value={createForm.adminName}
              onChange={(e) =>
                setCreateForm((p) => ({ ...p, adminName: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label>{t("superadminClinics.createDialog.adminEmail")}</Label>
            <Input
              type="email"
              value={createForm.adminEmail}
              onChange={(e) =>
                setCreateForm((p) => ({ ...p, adminEmail: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>{t("superadminClinics.createDialog.password")}</Label>
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
          <div className="space-y-1 sm:col-span-2 border-t pt-3 mt-1">
            <p className="text-xs text-muted-foreground">{t("superadminClinics.createDialog.planAndResources")}</p>
          </div>
          <div className="space-y-1">
            <Label>{t("superadminClinics.createDialog.plan")}</Label>
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
              {t("superadminClinics.cols.chatbot")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={createForm.ai_platform_enabled}
                onCheckedChange={(v) =>
                  setCreateForm((p) => ({ ...p, ai_platform_enabled: v }))
                }
              />
              {t("superadminClinics.cols.ai")}
            </label>
          </div>
        </div>
      </DashboardCreateFormDialog>

      {/* Edit clinic */}
      <Dialog
        open={Boolean(editRow)}
        onOpenChange={(o) => !o && setEditRow(null)}
      >
        <DialogContent className="md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("superadminClinics.editDialog.title")}</DialogTitle>
            <DialogDescription>
              {editRow?.name} —{" "}
              <span className="font-mono text-xs">{editRow?.code}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-2 md:grid-cols-2">
            <div className="space-y-1 col-span-2">
              <Label>{t("superadminClinics.fields.name")}</Label>
              <Input
                value={(editForm.name as string) ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>{t("superadminClinics.fields.email")}</Label>
              <Input
                type="email"
                value={(editForm.email as string) ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>{t("superadminClinics.fields.phone")}</Label>
              <TelefoneInput
                value={(editForm.phone as string) ?? ""}
                onValueChange={(phone) => setEditForm((p) => ({ ...p, phone }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("superadminClinics.editDialog.plan")}</Label>
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
              <Label>{t("superadminClinics.editDialog.accessStatus")}</Label>
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
                  {STATUS_VALUES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {statusLabel(v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {["trial", "exempt"].includes(
              editForm.subscription_status as string,
            ) && (
              <div className="space-y-1 col-span-2">
                <Label>{t("superadminClinics.editDialog.validUntil")}</Label>
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
                ⚠️ {t("superadminClinics.editDialog.cancelScheduled", { date: new Date(editRow.cancel_at).toLocaleDateString("pt-BR") })}
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
                {t("superadminClinics.cols.chatbot")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={Boolean(editForm.ai_platform_enabled)}
                  onCheckedChange={(v) =>
                    setEditForm((p) => ({ ...p, ai_platform_enabled: v }))
                  }
                />
                {t("superadminClinics.cols.ai")}
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditRow(null)}>
              {t("superadminClinics.editDialog.cancel")}
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
              {t("superadminClinics.editDialog.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
