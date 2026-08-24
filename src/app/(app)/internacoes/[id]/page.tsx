'use client';

import { ArrowLeft, LogOut, Download, Plus, Check, X, Sparkles, Loader2, Users, ClipboardList, ChevronDown, FileText } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardCreateFormDialog } from '@/components/dashboard-create-form-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getStoredUserRole } from '@/lib/role-permissions';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import { PlanUpgradeGate } from '@/components/billing/PlanUpgradeGate';
import { useCurrencyFormatter } from '@/lib/i18n/currency';
import type { Hospitalization } from '@/app/types/hospitalization';
import {
  useAddHospitalizationCostMutation,
  useAiReviewSbarReportMutation,
  useConfirmMedicationAdministrationMutation,
  useCreateHospitalizationEvolutionMutation,
  useCreateHospitalizationSbarReportMutation,
  useCreateHospitalizationVisitMutation,
  useDeleteHospitalizationCostMutation,
  useDischargeHospitalizationMutation,
  useDownloadHospitalizationKardexPdfMutation,
  useDownloadHospitalizationProntuarioPdfMutation,
  useGenerateHospitalizationInvoiceMutation,
  useHospitalizationCostSummaryQuery,
  useHospitalizationCostsQuery,
  useHospitalizationEvolutionsQuery,
  useHospitalizationMedicationsQuery,
  useHospitalizationQuery,
  useSetSeverityMutation,
  useHospitalizationSbarReportsQuery,
  useHospitalizationVisitsQuery,
  useLinkMedicalRecordMutation,
  usePrescribeHospitalizationMedicationMutation,
} from '@/hooks/apiHooks/useHospitalizations';
import {
  useCreateMedicalRecordMutation,
  useMedicalRecordQuery,
  useUpdateMedicalRecordMutation,
} from '@/hooks/apiHooks/useMedicalRecords';

// 3.3 — Visibilidade de valores financeiros por papel do usuário
const canSeeFinancials = (role: string | null | undefined) =>
  ['admin', 'manager', 'financial'].includes((role || '').toLowerCase());

/* ---- Sub-components ---- */

function ResumoTab({ h, canSee }: { h: Hospitalization; canSee: boolean }) {
  const { t } = useTranslation();
  const fmt = useCurrencyFormatter();
  const rows: Array<[string, string | null | undefined]> = [
    [t('internacaoDetail.resumo.patient'), h.patient?.name],
    [t('internacaoDetail.resumo.species'), `${h.patient?.species ?? ''}${h.patient?.breed ? ` — ${h.patient.breed}` : ''}`],
    [t('internacaoDetail.resumo.tutor'), h.patient?.tutor?.name ?? '—'],
    [t('internacaoDetail.resumo.veterinarian'), h.veterinarian?.name],
    [t('internacaoDetail.resumo.admission'), new Date(h.admission_date).toLocaleString('pt-BR')],
    [t('internacaoDetail.resumo.box'), h.box_number ?? '—'],
    [t('internacaoDetail.resumo.reason'), h.reason],
    [t('internacaoDetail.resumo.diagnosis'), h.diagnosis ?? '—'],
    [t('internacaoDetail.resumo.payment'), h.payment_source === 'health_plan' ? t('internacaoDetail.resumo.healthPlan') : t('internacaoDetail.resumo.private')],
    // 3.3 — diária só para papéis com acesso financeiro
    ...(canSee ? ([[t('internacaoDetail.resumo.dailyRate'), fmt(Number(h.daily_rate))]] as Array<[string, string]>) : []),
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-sm">{value ?? '—'}</p>
        </div>
      ))}
      {h.belongings && (
        <div className="col-span-2 space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('internacaoDetail.resumo.belongings')}</p>
          <p className="text-sm whitespace-pre-wrap">{h.belongings}</p>
        </div>
      )}
      {h.notes && (
        <div className="col-span-2 space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('internacaoDetail.resumo.notes')}</p>
          <p className="text-sm whitespace-pre-wrap">{h.notes}</p>
        </div>
      )}
    </div>
  );
}

const SEVERITY_STYLES: Record<string, string> = {
  stable: 'bg-green-100 text-green-700 border border-green-200',
  attention: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  critical: 'bg-red-100 text-red-700 border border-red-200',
};

function CustosTab({ hospitalizationId, status }: { hospitalizationId: string; status: string }) {
  const { t } = useTranslation();
  const fmt = useCurrencyFormatter();
  const COST_TYPE_LABELS: Record<string, string> = {
    daily_rate: t('internacaoDetail.costType.dailyRate'),
    material: t('internacaoDetail.costType.material'),
    medication: t('internacaoDetail.costType.medication'),
    procedure: t('internacaoDetail.costType.procedure'),
    exam: t('internacaoDetail.costType.exam'),
    anesthesia: t('internacaoDetail.costType.anesthesia'),
    other: t('internacaoDetail.costType.other'),
  };
  const { data: costs = [], isLoading: loadingCosts } = useHospitalizationCostsQuery(hospitalizationId);
  const { data: summary } = useHospitalizationCostSummaryQuery(hospitalizationId);
  const loading = loadingCosts;
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({
    type: 'procedure',
    date: new Date().toISOString().slice(0, 10),
    description: '',
    quantity: 1,
    unit_price: 0,
    covered_by_plan: false,
    plan_coverage_amount: 0,
  });

  const addCostMutation = useAddHospitalizationCostMutation();
  const deleteCostMutation = useDeleteHospitalizationCostMutation();
  const generateInvoiceMutation = useGenerateHospitalizationInvoiceMutation();

  const addCost = async () => {
    try {
      await addCostMutation.mutateAsync({ hospitalizationId, payload: form });
      setOpenAdd(false);
    } catch {
      toast.error(t('internacaoDetail.costs.addError'));
    }
  };

  const deleteCost = async (costId: string) => {
    try {
      await deleteCostMutation.mutateAsync({ hospitalizationId, costId });
    } catch {
      toast.error(t('internacaoDetail.costs.removeError'));
    }
  };

  const generateInvoice = async () => {
    try {
      const blob = await generateInvoiceMutation.mutateAsync(hospitalizationId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fatura-${hospitalizationId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('internacaoDetail.costs.invoiceError'));
    }
  };

  if (loading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: t('internacaoDetail.costs.totalGeneral'), value: summary.total_gross, color: 'text-foreground' },
            { label: t('internacaoDetail.costs.coveredByPlan'), value: summary.plan_coverage, color: 'text-green-600' },
            { label: t('internacaoDetail.costs.dueByGuardian'), value: summary.patient_responsibility, color: 'text-blue-600' },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={cn('text-xl font-bold', color)}>{fmt(value)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between">
        <Button size="sm" variant="outline" onClick={() => setOpenAdd(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 size-4" />
          {t('internacaoDetail.costs.addItem')}
        </Button>
        {status === 'discharged' && (
          <Button size="sm" onClick={generateInvoice} className="w-full sm:w-auto">
            <Download className="mr-2 size-4" />
            {t('internacaoDetail.costs.generateInvoice')}
          </Button>
        )}
      </div>

      {costs.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t('internacaoDetail.costs.empty')}</p>
      ) : (
        <>
          {/* Desktop / tablet: tabela */}
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>{t('internacaoDetail.costs.table.type')}</TableHead>
                  <TableHead>{t('internacaoDetail.costs.table.date')}</TableHead>
                  <TableHead>{t('internacaoDetail.costs.table.description')}</TableHead>
                  <TableHead className="text-right">{t('internacaoDetail.costs.table.quantity')}</TableHead>
                  <TableHead className="text-right">{t('internacaoDetail.costs.table.unit')}</TableHead>
                  <TableHead className="text-right">{t('internacaoDetail.costs.table.total')}</TableHead>
                  <TableHead className="text-right">{t('internacaoDetail.costs.table.plan')}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs.map((c) => (
                  <TableRow className="cursor-pointer hover:bg-muted/50 border-b border-gray-300 h-15" key={c.id}>
                    <TableCell>
                      <Badge variant="outline">{COST_TYPE_LABELS[c.type] ?? c.type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(c.date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>{c.description}</TableCell>
                    <TableCell className="text-right">{c.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(Number(c.unit_price))}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{fmt(Number(c.total_price))}</TableCell>
                    <TableCell className="text-right tabular-nums text-green-600">
                      {c.covered_by_plan ? fmt(Number(c.plan_coverage_amount)) : '—'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteCost(c.id)}>
                        <X className="size-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="space-y-2 md:hidden">
            {costs.map((c) => (
              <div key={c.id} className="rounded-lg border border-gray-300 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Badge variant="outline">{COST_TYPE_LABELS[c.type] ?? c.type}</Badge>
                    <p className="mt-1 truncate text-sm">{c.description}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => deleteCost(c.id)}>
                    <X className="size-4 text-muted-foreground" />
                  </Button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('internacaoDetail.costs.table.date')}</p>
                    <p>{new Date(c.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('internacaoDetail.costs.table.quantity')}</p>
                    <p>{c.quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('internacaoDetail.costs.table.unit')}</p>
                    <p className="tabular-nums">{fmt(Number(c.unit_price))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('internacaoDetail.costs.table.total')}</p>
                    <p className="font-medium tabular-nums">{fmt(Number(c.total_price))}</p>
                  </div>
                  {c.covered_by_plan && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">{t('internacaoDetail.costs.table.plan')}</p>
                      <p className="tabular-nums text-green-600">{fmt(Number(c.plan_coverage_amount))}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <DashboardCreateFormDialog
        open={openAdd}
        onOpenChange={setOpenAdd}
        title={t('internacaoDetail.costs.dialog.title')}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="border border-gray-300" onClick={() => setOpenAdd(false)}>
              {t('internacaoDetail.costs.dialog.cancel')}
            </Button>
            <Button onClick={addCost} className="bg-primary">{t('internacaoDetail.costs.dialog.submit')}</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('internacaoDetail.costs.dialog.type')}</Label>
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(COST_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('internacaoDetail.costs.dialog.date')}</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>{t('internacaoDetail.costs.dialog.description')}</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('internacaoDetail.costs.dialog.quantity')}</Label>
            <Input
              type="number"
              step="0.001"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('internacaoDetail.costs.dialog.unitPrice')}</Label>
            <Input
              type="number"
              step="0.01"
              value={form.unit_price}
              onChange={(e) => setForm((f) => ({ ...f, unit_price: Number(e.target.value) }))}
            />
          </div>
        </div>
      </DashboardCreateFormDialog>
    </div>
  );
}

function OcorrenciasTab({ hospitalizationId }: { hospitalizationId: string }) {
  const { t } = useTranslation();
  const { data: evolutions = [], isLoading: loading } = useHospitalizationEvolutionsQuery(hospitalizationId);
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({
    evolution_type: 'clinical',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    heart_rate: '',
    temperature_c: '',
    spo2_percent: '',
  });

  const createEvolutionMutation = useCreateHospitalizationEvolutionMutation();
  const downloadProntuarioMutation = useDownloadHospitalizationProntuarioPdfMutation();

  const createOcorrencia = async () => {
    try {
      await createEvolutionMutation.mutateAsync({
        hospitalizationId,
        payload: {
          ...form,
          heart_rate: form.heart_rate ? Number(form.heart_rate) : undefined,
          temperature_c: form.temperature_c ? Number(form.temperature_c) : undefined,
          spo2_percent: form.spo2_percent ? Number(form.spo2_percent) : undefined,
        },
      });
      setOpenNew(false);
    } catch {
      toast.error(t('internacaoDetail.evolutions.registerError'));
    }
  };

  const downloadPdf = async () => {
    try {
      const blob = await downloadProntuarioMutation.mutateAsync(hospitalizationId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prontuario-${hospitalizationId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('internacaoDetail.evolutions.exportError'));
    }
  };

  if (loading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between">
        <Button size="sm" variant="outline" onClick={() => setOpenNew(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 size-4" />
          {t('internacaoDetail.evolutions.newEvolution')}
        </Button>
        <Button size="sm" variant="ghost" onClick={downloadPdf} className="w-full sm:w-auto">
          <Download className="mr-2 size-4" />
          {t('internacaoDetail.evolutions.exportRecord')}
        </Button>
      </div>

      <div className="space-y-3">
        {evolutions.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">{t('internacaoDetail.evolutions.empty')}</p>
        ) : (
          evolutions.map((e) => (
            <Card key={e.id}>
              <CardHeader className="py-3 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{e.evolution_type}</Badge>
                    <span className="text-sm font-medium">{e.veterinarian?.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(e.recorded_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {e.heart_rate && (
                    <Badge variant="secondary" className="text-xs">
                      {t('internacaoDetail.vitals.heartRate', { value: e.heart_rate })}
                    </Badge>
                  )}
                  {e.temperature_c && (
                    <Badge variant="secondary" className="text-xs">
                      {t('internacaoDetail.vitals.temperature', { value: e.temperature_c })}
                    </Badge>
                  )}
                  {e.spo2_percent && (
                    <Badge variant="secondary" className="text-xs">
                      {t('internacaoDetail.vitals.spo2', { value: e.spo2_percent })}
                    </Badge>
                  )}
                  {e.respiratory_rate && (
                    <Badge variant="secondary" className="text-xs">
                      {t('internacaoDetail.vitals.respiratoryRate', { value: e.respiratory_rate })}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              {(e.subjective || e.assessment || e.plan) && (
                <CardContent className="pt-0 space-y-1">
                  {e.subjective && (
                    <p className="text-sm">
                      <span className="font-medium">{t('internacaoDetail.evolutions.soap.subjective')}</span> {e.subjective}
                    </p>
                  )}
                  {e.assessment && (
                    <p className="text-sm">
                      <span className="font-medium">{t('internacaoDetail.evolutions.soap.assessment')}</span> {e.assessment}
                    </p>
                  )}
                  {e.plan && (
                    <p className="text-sm">
                      <span className="font-medium">{t('internacaoDetail.evolutions.soap.plan')}</span> {e.plan}
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      <DashboardCreateFormDialog
        open={openNew}
        onOpenChange={setOpenNew}
        title={t('internacaoDetail.evolutions.dialog.title')}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="border border-gray-300" onClick={() => setOpenNew(false)}>
              {t('internacaoDetail.evolutions.dialog.cancel')}
            </Button>
            <Button onClick={createOcorrencia} className="bg-primary">{t('internacaoDetail.evolutions.dialog.submit')}</Button>
          </div>
        }
      >
        <div className="space-y-4 md:space-y-6">
          <div className="space-y-2">
            <Label>{t('internacaoDetail.evolutions.dialog.type')}</Label>
            <Select value={form.evolution_type} onValueChange={(v) => setForm((f) => ({ ...f, evolution_type: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clinical">{t('internacaoDetail.evolutions.dialog.typeClinical')}</SelectItem>
                <SelectItem value="procedure">{t('internacaoDetail.evolutions.dialog.typeProcedure')}</SelectItem>
                <SelectItem value="nursing">{t('internacaoDetail.evolutions.dialog.typeNursing')}</SelectItem>
                <SelectItem value="observation">{t('internacaoDetail.evolutions.dialog.typeObservation')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>{t('internacaoDetail.evolutions.dialog.heartRate')}</Label>
              <Input
                type="number"
                value={form.heart_rate}
                onChange={(e) => setForm((f) => ({ ...f, heart_rate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('internacaoDetail.evolutions.dialog.temperature')}</Label>
              <Input
                type="number"
                step="0.1"
                value={form.temperature_c}
                onChange={(e) => setForm((f) => ({ ...f, temperature_c: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('internacaoDetail.evolutions.dialog.spo2')}</Label>
              <Input
                type="number"
                value={form.spo2_percent}
                onChange={(e) => setForm((f) => ({ ...f, spo2_percent: e.target.value }))}
              />
            </div>
          </div>
          {(['subjective', 'objective', 'assessment', 'plan'] as const).map((field) => (
            <div key={field} className="space-y-2">
              <Label>
                {field === 'subjective'
                  ? t('internacaoDetail.evolutions.dialog.subjective')
                  : field === 'objective'
                    ? t('internacaoDetail.evolutions.dialog.objective')
                    : field === 'assessment'
                      ? t('internacaoDetail.evolutions.dialog.assessment')
                      : t('internacaoDetail.evolutions.dialog.plan')}
              </Label>
              <Textarea
                rows={2}
                value={form[field]}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </DashboardCreateFormDialog>
    </div>
  );
}

function MedicacoesTab({ hospitalizationId }: { hospitalizationId: string }) {
  const { t } = useTranslation();
  const ROUTE_LABELS: Record<string, string> = {
    oral: t('internacaoDetail.medications.routes.oral'),
    iv: t('internacaoDetail.medications.routes.iv'),
    im: t('internacaoDetail.medications.routes.im'),
    sc: t('internacaoDetail.medications.routes.sc'),
    topical: t('internacaoDetail.medications.routes.topical'),
    inhalation: t('internacaoDetail.medications.routes.inhalation'),
    other: t('internacaoDetail.medications.routes.other'),
  };
  const { data: schedules = [], isLoading: loading } = useHospitalizationMedicationsQuery(hospitalizationId);
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({
    medication_name: '',
    route: 'oral',
    dose: '',
    frequency_hours: 8,
    start_datetime: new Date().toISOString().slice(0, 16),
    instructions: '',
  });

  const prescribeMutation = usePrescribeHospitalizationMedicationMutation();
  const confirmAdminMutation = useConfirmMedicationAdministrationMutation();
  const downloadKardexMutation = useDownloadHospitalizationKardexPdfMutation();

  const prescribe = async () => {
    try {
      await prescribeMutation.mutateAsync({ hospitalizationId, payload: form });
      setOpenNew(false);
    } catch {
      toast.error(t('internacaoDetail.medications.prescribeError'));
    }
  };

  const confirm = async (adminId: string) => {
    try {
      await confirmAdminMutation.mutateAsync({ hospitalizationId, adminId });
    } catch {
      toast.error(t('internacaoDetail.medications.confirmError'));
    }
  };

  const downloadKardex = async () => {
    try {
      const blob = await downloadKardexMutation.mutateAsync(hospitalizationId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kardex-${hospitalizationId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('internacaoDetail.medications.exportError'));
    }
  };

  if (loading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between">
        <Button size="sm" variant="outline" onClick={() => setOpenNew(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 size-4" />
          {t('internacaoDetail.medications.prescribe')}
        </Button>
        <Button size="sm" variant="ghost" onClick={downloadKardex} className="w-full sm:w-auto">
          <Download className="mr-2 size-4" />
          {t('internacaoDetail.medications.exportKardex')}
        </Button>
      </div>

      {schedules.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t('internacaoDetail.medications.empty')}</p>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => {
            const pending = (s.administrations ?? []).filter((a) => a.status === 'pending');
            const overdue = pending.filter((a) => new Date(a.scheduled_datetime) < new Date());
            return (
              <Card key={s.id}>
                <CardHeader className="py-3 pb-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{s.medication_name}</p>
                    {overdue.length > 0 && (
                      <Badge variant="destructive">
                        {t('internacaoDetail.medications.overdue', { count: overdue.length })}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('internacaoDetail.medications.doseRouteFrequency', { dose: s.dose, route: s.route, hours: s.frequency_hours })}
                  </p>
                </CardHeader>
                {overdue.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="space-y-1">
                      {overdue.slice(0, 3).map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between rounded bg-red-50 px-3 py-1.5 text-sm"
                        >
                          <span className="text-red-700">{new Date(a.scheduled_datetime).toLocaleString('pt-BR')}</span>
                          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => confirm(a.id)}>
                            <Check className="mr-1 size-3" />
                            {t('internacaoDetail.medications.confirm')}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <DashboardCreateFormDialog
        open={openNew}
        onOpenChange={setOpenNew}
        title={t('internacaoDetail.medications.dialog.title')}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="border border-gray-300" onClick={() => setOpenNew(false)}>
              {t('internacaoDetail.medications.dialog.cancel')}
            </Button>
            <Button onClick={prescribe} className="bg-primary">{t('internacaoDetail.medications.dialog.submit')}</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-2">
            <Label>{t('internacaoDetail.medications.dialog.medication')}</Label>
            <Input
              value={form.medication_name}
              onChange={(e) => setForm((f) => ({ ...f, medication_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('internacaoDetail.medications.dialog.dose')}</Label>
            <Input
              value={form.dose}
              onChange={(e) => setForm((f) => ({ ...f, dose: e.target.value }))}
              placeholder={t('internacaoDetail.medications.dialog.dosePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('internacaoDetail.medications.dialog.route')}</Label>
            <Select value={form.route} onValueChange={(v) => setForm((f) => ({ ...f, route: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['oral', 'iv', 'im', 'sc', 'topical', 'inhalation', 'other'].map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROUTE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('internacaoDetail.medications.dialog.frequency')}</Label>
            <Input
              type="number"
              value={form.frequency_hours}
              onChange={(e) => setForm((f) => ({ ...f, frequency_hours: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('internacaoDetail.medications.dialog.start')}</Label>
            <Input
              type="datetime-local"
              value={form.start_datetime}
              onChange={(e) => setForm((f) => ({ ...f, start_datetime: e.target.value }))}
            />
          </div>
        </div>
      </DashboardCreateFormDialog>
    </div>
  );
}

/* ---- Main Page ---- */
/* ---- SBAR (3.1) ---- */

function SbarTab({ hospitalizationId, status }: { hospitalizationId: string; status: string }) {
  const { t } = useTranslation();
  const { data: reports = [], isLoading: loading } = useHospitalizationSbarReportsQuery(hospitalizationId);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const emptyForm = () => ({ report_date: new Date().toISOString().slice(0, 10), suspicion: '', brief_history: '', assessment: '', recommendations: '' });
  const [form, setForm] = useState(emptyForm());

  const createReportMutation = useCreateHospitalizationSbarReportMutation();
  const aiReviewMutation = useAiReviewSbarReportMutation();
  const saving = createReportMutation.isPending;

  const handleCreate = async () => {
    if (!form.suspicion && !form.brief_history && !form.assessment && !form.recommendations) {
      toast.error(t('internacaoDetail.sbar.fillAtLeastOne'));
      return;
    }
    try {
      await createReportMutation.mutateAsync({ hospitalizationId, payload: form });
      setForm(emptyForm());
    } catch { toast.error(t('internacaoDetail.sbar.saveError')); }
  };

  const handleAiReview = async (id: string) => {
    setReviewingId(id);
    try {
      await aiReviewMutation.mutateAsync({ hospitalizationId, reportId: id });
    } catch { toast.error(t('internacaoDetail.sbar.aiReviewError')); } finally { setReviewingId(null); }
  };

  const toggle = (id: string) => setExpanded((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const isActive = status === 'active';

  return (
    <div className="space-y-4">
      {isActive && (
        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-semibold">{t('internacaoDetail.sbar.todayReport')}</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>{t('internacaoDetail.sbar.date')}</Label>
              <Input type="date" value={form.report_date} onChange={(e) => setForm((f) => ({ ...f, report_date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t('internacaoDetail.sbar.suspicion')}</Label>
              <Textarea rows={2} value={form.suspicion} onChange={(e) => setForm((f) => ({ ...f, suspicion: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t('internacaoDetail.sbar.briefHistory')}</Label>
              <Textarea rows={2} value={form.brief_history} onChange={(e) => setForm((f) => ({ ...f, brief_history: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t('internacaoDetail.sbar.assessment')}</Label>
              <Textarea rows={2} value={form.assessment} onChange={(e) => setForm((f) => ({ ...f, assessment: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t('internacaoDetail.sbar.recommendations')}</Label>
              <Textarea rows={2} value={form.recommendations} onChange={(e) => setForm((f) => ({ ...f, recommendations: e.target.value }))} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="mr-1 size-4 animate-spin" />} {t('internacaoDetail.sbar.save')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{t('internacaoDetail.sbar.previousReports')}</h3>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : reports.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('internacaoDetail.sbar.empty')}</p>
        ) : (
          reports.map((r) => {
            const open = expanded.has(r.id);
            return (
              <div key={r.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <button type="button" onClick={() => toggle(r.id)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
                  <span className="text-sm font-medium">{new Date(r.report_date).toLocaleDateString('pt-BR')}</span>
                  {r.author?.name && <span className="text-sm text-muted-foreground">{r.author.name}</span>}
                  {r.ai_reviewed && <Badge variant="secondary" className="gap-1"><Sparkles className="size-3" /> {t('internacaoDetail.sbar.aiBadge')}</Badge>}
                  <ChevronDown className={`ml-auto size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <div className="space-y-2 border-t border-slate-200 px-4 py-3 text-sm">
                    <div><span className="font-semibold">{t('internacaoDetail.sbar.fields.s')}</span> {r.suspicion || '—'}</div>
                    <div><span className="font-semibold">{t('internacaoDetail.sbar.fields.b')}</span> {r.brief_history || '—'}</div>
                    <div><span className="font-semibold">{t('internacaoDetail.sbar.fields.a')}</span> {r.assessment || '—'}</div>
                    <div><span className="font-semibold">{t('internacaoDetail.sbar.fields.r')}</span> {r.recommendations || '—'}</div>
                    <div className="pt-1">
                      <Button size="sm" variant="outline" onClick={() => handleAiReview(r.id)} disabled={reviewingId === r.id}>
                        {reviewingId === r.id ? <Loader2 className="mr-1 size-3 animate-spin" /> : <Sparkles className="mr-1 size-3" />}
                        {t('internacaoDetail.sbar.reviewWithAi')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ---- Visitas (3.2) ---- */

function VisitasTab({ hospitalizationId, status }: { hospitalizationId: string; status: string }) {
  const { t } = useTranslation();
  const { data: visits = [], isLoading: loading } = useHospitalizationVisitsQuery(hospitalizationId);
  const emptyForm = () => ({ visited_at: new Date().toISOString().slice(0, 16), visitor_name: '', notes: '' });
  const [form, setForm] = useState(emptyForm());

  const createVisitMutation = useCreateHospitalizationVisitMutation();
  const saving = createVisitMutation.isPending;

  const handleCreate = async () => {
    if (!form.visitor_name && !form.notes) { toast.error(t('internacaoDetail.visits.fillRequired')); return; }
    try {
      await createVisitMutation.mutateAsync({ hospitalizationId, payload: form });
      setForm(emptyForm());
    } catch { toast.error(t('internacaoDetail.visits.registerError')); }
  };

  return (
    <div className="space-y-4">
      {status === 'active' && (
        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-semibold">{t('internacaoDetail.visits.register')}</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>{t('internacaoDetail.visits.dateTime')}</Label>
                <Input type="datetime-local" value={form.visited_at} onChange={(e) => setForm((f) => ({ ...f, visited_at: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>{t('internacaoDetail.visits.visitor')}</Label>
                <Input value={form.visitor_name} onChange={(e) => setForm((f) => ({ ...f, visitor_name: e.target.value }))} placeholder={t('internacaoDetail.visits.visitorPlaceholder')} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t('internacaoDetail.visits.notes')}</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="mr-1 size-4 animate-spin" />} {t('internacaoDetail.visits.register')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{t('internacaoDetail.visits.history')}</h3>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : visits.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('internacaoDetail.visits.empty')}</p>
        ) : (
          <div className="space-y-2">
            {visits.map((v) => (
              <div key={v.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{new Date(v.visited_at).toLocaleString('pt-BR')}</span>
                  {v.visitor_name && <span className="text-muted-foreground">· {v.visitor_name}</span>}
                  {v.registrar?.name && <span className="ml-auto text-xs text-muted-foreground">{t('internacaoDetail.visits.registeredBy', { name: v.registrar.name })}</span>}
                </div>
                {v.notes && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{v.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Relatório Médico / Ficha vinculada (Grupo 6) ---- */

function RelatorioMedicoTab({
  hospitalizationId,
  medicalRecordId,
  patientId,
  veterinarianId,
  onLinked,
}: {
  hospitalizationId: string;
  medicalRecordId: string | null;
  patientId: string;
  veterinarianId: string;
  onLinked: () => void;
}) {
  const { t } = useTranslation();
  const { data: record, isLoading: loading } = useMedicalRecordQuery(medicalRecordId);
  const [form, setForm] = useState({ chief_complaint: '', anamnesis: '', diagnosis: '', observations: '' });

  const createRecordMutation = useCreateMedicalRecordMutation();
  const updateRecordMutation = useUpdateMedicalRecordMutation();
  const linkRecordMutation = useLinkMedicalRecordMutation();
  const creating = createRecordMutation.isPending || linkRecordMutation.isPending;
  const saving = updateRecordMutation.isPending;

  useEffect(() => {
    if (!record) return;
    setForm({
      chief_complaint: record.chief_complaint || '',
      anamnesis: record.anamnesis || '',
      diagnosis: record.diagnosis || '',
      observations: record.observations || '',
    });
  }, [record]);

  const handleCreate = async () => {
    try {
      const created = await createRecordMutation.mutateAsync({
        patient_id: patientId,
        veterinarian_id: veterinarianId,
        record_type: 'internacao',
      });
      await linkRecordMutation.mutateAsync({ id: hospitalizationId, medicalRecordId: created.id });
      onLinked();
    } catch { toast.error(t('internacaoDetail.medicalRecord.createError')); }
  };

  const handleSave = async () => {
    if (!medicalRecordId) return;
    try {
      await updateRecordMutation.mutateAsync({ id: medicalRecordId, payload: form });
    } catch { toast.error(t('internacaoDetail.medicalRecord.saveError')); }
  };

  if (!medicalRecordId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">{t('internacaoDetail.medicalRecord.noneLinked')}</p>
          <Button onClick={handleCreate} disabled={creating}>
            {creating && <Loader2 className="mr-1 size-4 animate-spin" />} {t('internacaoDetail.medicalRecord.create')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) return <Skeleton className="h-48 w-full" />;

  const isClosed = record?.status === 'closed';

  return (
    <Card>
      <CardHeader className="flex flex-col items-start gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold">{t('internacaoDetail.medicalRecord.linkedTitle')}</h3>
        <Button asChild size="sm" variant="outline">
          <Link href={`/medical-records/${medicalRecordId}`}>{t('internacaoDetail.medicalRecord.openFull')}</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label>{t('internacaoDetail.medicalRecord.chiefComplaint')}</Label>
          <Textarea rows={2} value={form.chief_complaint} onChange={(e) => setForm((f) => ({ ...f, chief_complaint: e.target.value }))} disabled={isClosed} />
        </div>
        <div className="space-y-1">
          <Label>{t('internacaoDetail.medicalRecord.anamnesis')}</Label>
          <Textarea rows={3} value={form.anamnesis} onChange={(e) => setForm((f) => ({ ...f, anamnesis: e.target.value }))} disabled={isClosed} />
        </div>
        <div className="space-y-1">
          <Label>{t('internacaoDetail.medicalRecord.diagnosis')}</Label>
          <Textarea rows={2} value={form.diagnosis} onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))} disabled={isClosed} />
        </div>
        <div className="space-y-1">
          <Label>{t('internacaoDetail.medicalRecord.observations')}</Label>
          <Textarea rows={2} value={form.observations} onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))} disabled={isClosed} />
        </div>
        {!isClosed && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-1 size-4 animate-spin" />} {t('internacaoDetail.medicalRecord.save')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HospitalizationDetailPageContent() {
  const { t } = useTranslation();
  const HOSP_STATUS_LABELS: Record<string, string> = {
    active: t('internacaoDetail.status.active'),
    discharged: t('internacaoDetail.status.discharged'),
    transferred: t('internacaoDetail.status.transferred'),
    deceased: t('internacaoDetail.status.deceased'),
  };
  const SEVERITY_LABELS: Record<string, string> = {
    stable: t('internacaoDetail.severity.stable'),
    attention: t('internacaoDetail.severity.attention'),
    critical: t('internacaoDetail.severity.critical'),
  };
  const params = useParams<{ id: string }>();
  const hospitalizationId = typeof params?.id === 'string' ? params.id : '';
  const { data: h, isLoading: loading } = useHospitalizationQuery(hospitalizationId);
  const setSeverity = useSetSeverityMutation();
  const [openDischarge, setOpenDischarge] = useState(false);
  const [dischargeForm, setDischargeForm] = useState({
    actual_discharge_date: new Date().toISOString().slice(0, 16),
    discharge_condition: 'improved',
    discharge_instructions: '',
  });

  const dischargeMutation = useDischargeHospitalizationMutation();

  useEffect(() => {
    if (!hospitalizationId) toast.error(t('internacaoDetail.header.invalid'));
  }, [hospitalizationId, t]);

  const handleDischarge = async () => {
    if (!hospitalizationId) return;

    try {
      await dischargeMutation.mutateAsync({ id: hospitalizationId, payload: dischargeForm });
      setOpenDischarge(false);
    } catch {
      toast.error(t('internacaoDetail.discharge.error'));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!h) return <p className="py-16 text-center text-muted-foreground">{t('internacaoDetail.header.notFound')}</p>;

  const canSee = canSeeFinancials(getStoredUserRole());

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/internacoes">
          <ArrowLeft className="size-4 mr-1" /> {t('internacaoDetail.back')}
        </Link>
      </Button>

      <Card>
        <CardHeader className="pb-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold sm:text-xl">{h.patient?.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant={h.status === 'active' ? 'default' : 'secondary'}>
                {HOSP_STATUS_LABELS[h.status] ?? h.status}
              </Badge>
              {h.status === 'active' && (
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', SEVERITY_STYLES[h.severity ?? 'stable'])}>
                  {SEVERITY_LABELS[h.severity ?? 'stable']}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="font-normal text-muted-foreground">
              {h.patient?.species}
            </Badge>
            <Badge variant="secondary" className="font-normal text-muted-foreground">
              {t('internacaoDetail.header.admission', { date: new Date(h.admission_date).toLocaleDateString('pt-BR') })}
            </Badge>
          </div>
          {h.status === 'active' && (
            <div className="flex flex-col gap-3 border-t border-border/60 pt-3 sm:flex-row sm:items-end sm:justify-between">
              {/* Gravidade é avaliação clínica: quem está cuidando define, e o
                  backend carimba autor e data para a passagem de plantão. */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{t('internacaoDetail.header.clinicalSeverity')}</label>
                <div className="flex items-center gap-2">
                  <Select
                    value={h.severity ?? 'stable'}
                    onValueChange={(v) =>
                      setSeverity.mutate(
                        { id: hospitalizationId, severity: v as 'stable' | 'attention' | 'critical' },
                        {
                          onSuccess: () => toast.success(t('internacaoDetail.header.severityUpdated')),
                          onError: (e) => toast.error(getApiErrorMessage(e, t('internacaoDetail.header.severityUpdateError'))),
                        },
                      )
                    }
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SEVERITY_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {h.severity_updated_at && (
                    <span className="text-[11px] text-muted-foreground">
                      {t('internacaoDetail.header.since', { date: new Date(h.severity_updated_at).toLocaleString('pt-BR') })}
                    </span>
                  )}
                </div>
              </div>
              <Button variant="destructive" onClick={() => setOpenDischarge(true)} className="w-full sm:w-auto">
                <LogOut className="mr-2 size-4" />
                {t('internacaoDetail.header.registerDischarge')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="resumo">
        <TabsList className="grid h-auto! w-full grid-cols-1 gap-1 sm:grid-cols-3 lg:grid-cols-7">
          <TabsTrigger value="resumo" className="h-auto! w-full justify-start whitespace-normal px-3 py-2 text-left leading-snug sm:justify-center sm:text-center">
            {t('internacaoDetail.tabs.resumo')}
          </TabsTrigger>
          <TabsTrigger value="ocorrencias" className="h-auto! w-full justify-start whitespace-normal px-3 py-2 text-left leading-snug sm:justify-center sm:text-center">
            {t('internacaoDetail.tabs.ocorrencias')}
          </TabsTrigger>
          <TabsTrigger value="relatorio-medico" className="h-auto! w-full justify-start whitespace-normal px-3 py-2 text-left leading-snug sm:justify-center sm:text-center">
            <FileText className="mr-1 size-4 shrink-0" /> {t('internacaoDetail.tabs.relatorioMedico')}
          </TabsTrigger>
          <TabsTrigger value="sbar" className="h-auto! w-full justify-start whitespace-normal px-3 py-2 text-left leading-snug sm:justify-center sm:text-center">
            <ClipboardList className="mr-1 size-4 shrink-0" /> {t('internacaoDetail.tabs.sbar')}
          </TabsTrigger>
          <TabsTrigger value="visitas" className="h-auto! w-full justify-start whitespace-normal px-3 py-2 text-left leading-snug sm:justify-center sm:text-center">
            <Users className="mr-1 size-4 shrink-0" /> {t('internacaoDetail.tabs.visitas')}
          </TabsTrigger>
          <TabsTrigger value="medicacoes" className="h-auto! w-full justify-start whitespace-normal px-3 py-2 text-left leading-snug sm:justify-center sm:text-center">
            {t('internacaoDetail.tabs.medicacoes')}
          </TabsTrigger>
          {canSee && (
            <TabsTrigger value="custos" className="h-auto! w-full justify-start whitespace-normal px-3 py-2 text-left leading-snug sm:justify-center sm:text-center">
              {t('internacaoDetail.tabs.custos')}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="resumo" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <ResumoTab h={h} canSee={canSee} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ocorrencias" className="mt-4">
          <OcorrenciasTab hospitalizationId={hospitalizationId} />
        </TabsContent>

        <TabsContent value="relatorio-medico" className="mt-4">
          <RelatorioMedicoTab
            hospitalizationId={hospitalizationId}
            medicalRecordId={h.medical_record_id ?? null}
            patientId={h.patient?.id}
            veterinarianId={h.veterinarian?.id}
            onLinked={() => {}}
          />
        </TabsContent>

        <TabsContent value="sbar" className="mt-4">
          <SbarTab hospitalizationId={hospitalizationId} status={h.status} />
        </TabsContent>

        <TabsContent value="visitas" className="mt-4">
          <VisitasTab hospitalizationId={hospitalizationId} status={h.status} />
        </TabsContent>

        <TabsContent value="medicacoes" className="mt-4">
          <MedicacoesTab hospitalizationId={hospitalizationId} />
        </TabsContent>

        {canSee && (
          <TabsContent value="custos" className="mt-4">
            <CustosTab hospitalizationId={hospitalizationId} status={h.status} />
          </TabsContent>
        )}
      </Tabs>

      <DashboardCreateFormDialog
        open={openDischarge}
        onOpenChange={setOpenDischarge}
        title={t('internacaoDetail.discharge.title')}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="border border-gray-300" onClick={() => setOpenDischarge(false)}>
              {t('internacaoDetail.discharge.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDischarge}>
              {t('internacaoDetail.discharge.confirm')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 md:space-y-6">
          <div className="space-y-2">
            <Label>{t('internacaoDetail.discharge.dateTime')}</Label>
            <Input
              type="datetime-local"
              value={dischargeForm.actual_discharge_date}
              onChange={(e) => setDischargeForm((f) => ({ ...f, actual_discharge_date: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('internacaoDetail.discharge.condition')}</Label>
            <Select
              value={dischargeForm.discharge_condition}
              onValueChange={(v) => setDischargeForm((f) => ({ ...f, discharge_condition: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="improved">{t('internacaoDetail.discharge.conditionImproved')}</SelectItem>
                <SelectItem value="cured">{t('internacaoDetail.discharge.conditionCured')}</SelectItem>
                <SelectItem value="referred">{t('internacaoDetail.discharge.conditionReferred')}</SelectItem>
                <SelectItem value="deceased">{t('internacaoDetail.discharge.conditionDeceased')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('internacaoDetail.discharge.instructions')}</Label>
            <Textarea
              rows={3}
              value={dischargeForm.discharge_instructions}
              onChange={(e) => setDischargeForm((f) => ({ ...f, discharge_instructions: e.target.value }))}
            />
          </div>
        </div>
      </DashboardCreateFormDialog>
    </div>
  );
}

export default function HospitalizationDetailPage() {
  const { t } = useTranslation();
  return (
    <PlanUpgradeGate requiredPlan="clinica" feature={t('internacaoDetail.pageTitle')}>
      <HospitalizationDetailPageContent />
    </PlanUpgradeGate>
  );
}
