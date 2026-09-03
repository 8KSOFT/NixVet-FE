'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ApiRequestError } from '@/app/types/api-error';
import type { HospitalizationCreatePayload, HospitalizationFormValues } from '@/app/types/hospitalization';
import { Plus, Clock, ChevronRight, PawPrint } from 'lucide-react';
import { DashboardCreateFormDialog } from '@/components/dashboard-create-form-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ProfilePhoto } from '@/components/shared/profile-photo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { PlanUpgradeGate } from '@/components/billing/PlanUpgradeGate';
import { CURRENCY_BY_LANGUAGE, resolveAppLanguage } from '@/lib/i18n/currency';
import {
  useActiveHospitalizationsListQuery,
  useCreateHospitalizationMutation,
  useHospitalizationsQuery,
} from '@/hooks/apiHooks/useHospitalizations';
import { usePatientsListQuery } from '@/hooks/apiHooks/usePatients';
import { useStaffUsersListQuery, useVeterinariansQuery } from '@/hooks/apiHooks/useUsers';
import { useHealthPlansListQuery } from '@/hooks/apiHooks/useHealthPlans';
import { useHasPermission } from '@/hooks/useHasPermission';

function daysInternado(admissionDate: string): number {
  const ms = Date.now() - new Date(admissionDate).getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

const SEVERITY_STYLES: Record<string, string> = {
  stable: 'bg-green-100 text-green-700 border border-green-200',
  attention: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  critical: 'bg-red-100 text-red-700 border border-red-200',
};

/**
 * Selo de gravidade — vem do campo `severity`, informado pelo veterinário.
 *
 * Antes isto era calculado só pelos dias desde a admissão, o que dizia o
 * oposto da realidade com frequência: recuperação tranquila no oitavo dia
 * aparecia "Crítico", e um caso grave admitido hoje aparecia "Estável". Tempo
 * de internação continua na tela, mas como informação neutra no rodapé.
 */
function severityBadge(
  severity: string | undefined,
  status: string,
  statusLabels: Record<string, string>,
  severityLabels: Record<string, string>,
): { color: string; label: string } {
  if (status !== 'active') {
    return { color: 'bg-gray-200 text-gray-600', label: statusLabels[status] ?? status };
  }
  const key = severity ?? 'stable';
  return { color: SEVERITY_STYLES[key] ?? SEVERITY_STYLES.stable, label: severityLabels[key] ?? key };
}

function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  const typedError = error as ApiRequestError;
  const responseMessage = typedError.response?.data?.message;

  if (Array.isArray(responseMessage)) {
    return responseMessage[0] ?? fallbackMessage;
  }

  return responseMessage ?? typedError.message ?? fallbackMessage;
}

function InternacoesPageContent() {
  const { t, i18n } = useTranslation();
  const currencySymbol = CURRENCY_BY_LANGUAGE[resolveAppLanguage(i18n.language)].symbol;
  const [openNew, setOpenNew] = useState(false);

  /** Rótulos dos status vindos do enum do backend. */
  const STATUS_LABELS: Record<string, string> = {
    active: t('internacoes.statusActive'),
    discharged: t('internacoes.statusDischarged'),
    transferred: t('internacoes.statusTransferred'),
    deceased: t('internacoes.statusDeceased'),
  };

  const SEVERITY_LABELS: Record<string, string> = {
    stable: t('internacoes.severityStable'),
    attention: t('internacoes.severityAttention'),
    critical: t('internacoes.severityCritical'),
  };

  const { data: active = [], isLoading: loadingActive } = useActiveHospitalizationsListQuery();
  const { data: all = [], isLoading: loadingAll } = useHospitalizationsQuery();
  const loading = loadingActive || loadingAll;

  const { data: patients = [] } = usePatientsListQuery();
  const vetsQuery = useVeterinariansQuery();
  const veterinarians = vetsQuery.data ?? [];

  // Internações está no menu do veterinário, mas `/users/staff` exige
  // `users.read` e `/health-plans` exige `health_plans.read` — chaves que só
  // admin e gestor têm. A lista de equipe aqui é só o plano B de quando
  // `/users/veterinarians` (rota sem `@Permissions`) volta vazia: agora ela só
  // é buscada quando esse plano B é mesmo necessário e o papel a alcança.
  const podeLerEquipe = useHasPermission('users.read');
  const podeLerPlanos = useHasPermission('health_plans.read');
  const precisaFallbackEquipe = vetsQuery.isSuccess && veterinarians.length === 0;
  const { data: staffUsers = [] } = useStaffUsersListQuery(precisaFallbackEquipe && podeLerEquipe);
  const users = veterinarians.length > 0 ? veterinarians : staffUsers;
  const { data: healthPlans = [] } = useHealthPlansListQuery(podeLerPlanos);

  const createHospitalization = useCreateHospitalizationMutation();

  const [form, setForm] = useState<HospitalizationFormValues>({
    patient_id: '',
    veterinarian_id: '',
    reason: '',
    diagnosis: '',
    admission_date: new Date().toISOString().slice(0, 16),
    box_number: '',
    payment_source: 'particular',
    health_plan_id: '',
    daily_rate: 0,
    notes: '',
    belongings: '',
  });

  const handleCreate = async () => {
    if (!form.patient_id) {
      toast.error(t('internacoes.validationSelectPatient'));
      return;
    }
    if (!form.veterinarian_id) {
      toast.error(t('internacoes.validationSelectVeterinarian'));
      return;
    }
    if (!form.reason.trim()) {
      toast.error(t('internacoes.validationEnterReason'));
      return;
    }
    try {
      const payload: HospitalizationCreatePayload = {
        ...form,
        veterinarian_id: form.veterinarian_id || undefined,
        health_plan_id: form.health_plan_id || undefined,
      };
      await createHospitalization.mutateAsync(payload);
      setOpenNew(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('internacoes.createError')));
    }
  };

  const discharged = all.filter((h) => h.status !== 'active');

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-auto">
          <h1 className="text-2xl font-bold">{t('internacoes.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('internacoes.subtitle')}</p>
        </div>
        <Button onClick={() => setOpenNew(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 size-4" />
          {t('internacoes.newButton')}
        </Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="active">{t('internacoes.tabActive', { count: active.length })}</TabsTrigger>
          <TabsTrigger value="history">{t('internacoes.tabHistory', { count: discharged.length })}</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-8">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : active.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">{t('internacoes.emptyActive')}</div>
          ) : (
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-8 pt-3 sm:justify-start">
              {active.map((h) => {
                const days = daysInternado(h.admission_date);
                const { color, label } = severityBadge(h.severity, h.status, STATUS_LABELS, SEVERITY_LABELS);
                const photoUrl = h.patient?.photo_url;
                return (
                  <Link
                    key={h.id}
                    href={`/internacoes/${h.id}`}
                    className="group relative block w-72 perspective-[900px] focus-visible:outline-none"
                  >
                    {/* Aba da pasta — o nome do pet mora nela, como numa pasta
                        de arquivo de verdade. Gradiente simulando luz vindo de
                        cima: mais clara no topo, mais escura perto da borda da
                        pasta (onde ela "entra" por baixo, fazendo sombra). */}
                    <div className="absolute -top-3.5 left-2 flex h-4 w-3/8 items-center rounded-t-2xl border border-b-0 border-gray-400 bg-linear-to-b from-gray-100 from-45% to-gray-300 px-3 transition-colors duration-200 group-hover:border-primary/40 group-hover:from-primary/15 group-hover:to-primary/30">
                      <p className="truncate text-xs font-bold text-foreground transition-colors duration-200 group-hover:text-primary">
                        {h.patient?.name}
                      </p>
                    </div>

                    {/* Corpo da pasta — dossiê de um caso único, sem fichas
                        empilhadas (cada internação já é uma pasta por si só).
                        A capa tomba pra frente no hover, como se abrisse. */}
                    <div className="relative flex h-64 origin-bottom flex-col justify-between rounded-xl rounded-tl-none border border-gray-300 bg-white p-3.5 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-y-0.5 group-hover:-rotate-x-14 group-hover:border-primary/40 group-hover:shadow-xl group-focus-visible:ring-2 group-focus-visible:ring-primary/50">
                      <div>
                        {/* Etiqueta do veterinário (esquerda, no topo) e foto
                            (direita, com o status logo abaixo dela) —
                            items-start pra a etiqueta não ser empurrada pra
                            baixo pela altura da foto. O nome do pet já está na
                            aba, então não repete aqui. */}
                        <div className="flex items-start justify-between gap-2">
                          {/* Etiqueta — largura fixa (não cresce com o
                              nome), nomes grandes truncam. Veterinário é a
                              linha "escrita" na régua; espécie + box vão
                              juntos embaixo. */}
                          <div className="w-40 min-w-0 rounded-[3px] border border-gray-200 bg-white px-2 pt-1.5 pb-1 shadow-sm">
                            <p
                              className="truncate border-b border-dashed border-gray-300 pb-0.5 text-[10px] font-medium text-muted-foreground"
                              title={h.veterinarian?.name}
                            >
                              {h.veterinarian?.name ?? t('internacoes.noVeterinarian')}
                            </p>
                            <p className="mt-0.5 truncate text-[9px] text-muted-foreground/70">
                              {[h.patient?.species, h.box_number ? t('internacoes.boxLabel', { box: h.box_number }) : null]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            {/* Foto do pet feito uma polaroide solta, presa por
                                um clipe que agarra também a borda de cima da
                                pasta — no canto direito, pra não tapar a aba. */}
                            <div className="relative -mt-4 mb-1 inline-block">
                              {/* Clipe — espiral interna, por trás da foto. */}
                              <svg
                                viewBox="0 0 24 32"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                className="absolute -top-3 right-1 h-7 w-5 rotate-3 text-gray-400 transition-transform duration-300 group-hover:rotate-6"
                              >
                                <rect x="7" y="7" width="8" height="16" rx="4" />
                              </svg>

                              <div className="-rotate-4 rounded-sm bg-white p-1.5 pb-3 shadow-lg ring-1 ring-black/20 transition-transform duration-300 group-hover:-rotate-2">
                                {photoUrl ? (
                                  <ProfilePhoto
                                    url={photoUrl}
                                    name={h.patient?.name}
                                    className="size-16 shrink-0 rounded-xs shadow-none ring-0 saturate-[.85] contrast-105 sepia-[0.08]"
                                  />
                                ) : (
                                  <div
                                    className="flex size-16 shrink-0 items-center justify-center rounded-xs"
                                    style={{
                                      backgroundImage:
                                        'repeating-linear-gradient(45deg,#eef2f0,#eef2f0 6px,#e2e8e5 6px,#e2e8e5 12px)',
                                    }}
                                  >
                                    <PawPrint className="size-6 text-wa-ink-3" />
                                  </div>
                                )}
                              </div>

                              {/* Clipe — espiral externa, por cima da foto e da
                                  borda da pasta. */}
                              <svg
                                viewBox="0 0 24 32"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                className="absolute -top-3 right-1 h-7 w-5 rotate-3 text-gray-400 drop-shadow transition-transform duration-300 group-hover:rotate-6"
                              >
                                <rect x="3" y="3" width="14" height="27" rx="7" />
                              </svg>
                            </div>

                            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', color)}>
                              {label}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Rodapé em forma de etiqueta da pasta — veterinário e
                          box já estão na etiqueta lá em cima, então aqui só os
                          dias internado. */}
                      <div className="mt-3 space-y-1 border-t border-dashed border-gray-200 pt-2 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {t('internacoes.daysCount', { count: days })}
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-8">
          <div className="overflow-x-auto border border-gray-300 rounded-lg">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>{t('internacoes.tableHeaderPatient')}</TableHead>
                  <TableHead>{t('internacoes.tableHeaderReason')}</TableHead>
                  <TableHead>{t('internacoes.tableHeaderAdmission')}</TableHead>
                  <TableHead>{t('internacoes.tableHeaderDischarge')}</TableHead>
                  <TableHead>{t('internacoes.tableHeaderStatus')}</TableHead>
                  <TableHead>{t('internacoes.tableHeaderVet')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discharged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
                      {t('internacoes.emptyHistory')}
                    </TableCell>
                  </TableRow>
                ) : (
                  discharged.map((h) => (
                    <TableRow key={h.id} className="cursor-pointer hover:bg-muted/50 border-b border-gray-300 h-15">
                      <TableCell>
                        <Link href={`/internacoes/${h.id}`} className="font-medium hover:underline">
                          {h.patient?.name}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">{h.reason}</TableCell>
                      <TableCell>{new Date(h.admission_date).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="text-muted-foreground">{h.status === 'discharged' ? '—' : ''}</TableCell>
                      <TableCell>
                        <Badge variant={h.status === 'discharged' ? 'secondary' : 'default'}>
                          {STATUS_LABELS[h.status] ?? h.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{h.veterinarian?.name}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Nova Internação */}
      <DashboardCreateFormDialog
        open={openNew}
        onOpenChange={setOpenNew}
        title={t('internacoes.newButton')}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setOpenNew(false)}>
              {t('internacoes.cancel')}
            </Button>
            <Button onClick={handleCreate}>{t('internacoes.openButton')}</Button>
          </div>
        }
      >
        <div className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-2 gap-4 md:gap-4 max-md:grid-cols-2">
            <div className="space-y-1">
              <Label>{t('internacoes.fieldPatient')}</Label>
              <Select value={form.patient_id} onValueChange={(v) => setForm((f) => ({ ...f, patient_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('internacoes.selectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('internacoes.fieldVeterinarian')}</Label>
              <Select
                value={form.veterinarian_id}
                onValueChange={(v) => setForm((f) => ({ ...f, veterinarian_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('internacoes.selectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>{t('internacoes.fieldReason')}</Label>
              <Textarea
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('internacoes.fieldAdmissionDate')}</Label>
              <Input
                type="datetime-local"
                value={form.admission_date}
                onChange={(e) => setForm((f) => ({ ...f, admission_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('internacoes.fieldBox')}</Label>
              <Input
                value={form.box_number}
                onChange={(e) => setForm((f) => ({ ...f, box_number: e.target.value }))}
                placeholder={t('internacoes.boxPlaceholder')}
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>{t('internacoes.fieldPaymentSource')}</Label>
              <Select value={form.payment_source} onValueChange={(v) => setForm((f) => ({ ...f, payment_source: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="particular">{t('internacoes.paymentParticular')}</SelectItem>
                  <SelectItem value="health_plan">{t('internacoes.paymentHealthPlan')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.payment_source === 'health_plan' && (
              <div className="space-y-1 col-span-2">
                <Label>{t('internacoes.fieldHealthPlan')}</Label>
                <Select
                  value={form.health_plan_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, health_plan_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('internacoes.selectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {healthPlans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1 col-span-2">
              <Label>{t('internacoes.fieldDailyRate', { symbol: currencySymbol })}</Label>
              <Input
                type="number"
                value={form.daily_rate}
                onChange={(e) => setForm((f) => ({ ...f, daily_rate: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t('internacoes.fieldBelongings')}</Label>
            <Textarea
              rows={2}
              value={form.belongings}
              onChange={(e) => setForm((f) => ({ ...f, belongings: e.target.value }))}
              placeholder={t('internacoes.belongingsPlaceholder')}
            />
          </div>
        </div>
      </DashboardCreateFormDialog>
    </div>
  );
}

export default function InternacoesPage() {
  const { t } = useTranslation();
  return (
    <PlanUpgradeGate requiredPlan="clinica" feature={t('internacoes.featureName')}>
      <InternacoesPageContent />
    </PlanUpgradeGate>
  );
}
