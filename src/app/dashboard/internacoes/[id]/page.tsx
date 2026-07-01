'use client';

import { ArrowLeft, LogOut, Download, Plus, Check, X, Sparkles, Loader2, Users, ClipboardList, ChevronDown, FileText } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import { getStoredUserRole } from '@/lib/role-permissions';
import { toast } from 'sonner';

// 3.3 — Visibilidade de valores financeiros por papel do usuário
const canSeeFinancials = (role: string | null | undefined) =>
  ['admin', 'manager', 'financial'].includes((role || '').toLowerCase());

/* ---- Types ---- */
interface Hospitalization {
  id: string;
  reason: string;
  diagnosis: string | null;
  admission_date: string;
  actual_discharge_date: string | null;
  status: string;
  box_number: string | null;
  payment_source: string;
  daily_rate: number;
  notes: string | null;
  belongings: string | null;
  medical_record_id: string | null;
  patient: { id: string; name: string; species: string; breed: string | null; tutor?: { name: string } };
  veterinarian: { id: string; name: string };
}

interface Cost {
  id: string;
  type: string;
  date: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  covered_by_plan: boolean;
  plan_coverage_amount: number;
  patient_responsibility_amount: number;
}

interface CostSummary {
  total_gross: number;
  plan_coverage: number;
  patient_responsibility: number;
  breakdown: Record<string, number>;
}

interface Evolution {
  id: string;
  recorded_at: string;
  evolution_type: string;
  heart_rate: number | null;
  temperature_c: number | null;
  spo2_percent: number | null;
  respiratory_rate: number | null;
  subjective: string | null;
  assessment: string | null;
  plan: string | null;
  veterinarian: { name: string };
}

interface MedSchedule {
  id: string;
  medication_name: string;
  dose: string;
  route: string;
  frequency_hours: number;
  active: boolean;
  administrations: MedAdmin[];
}

interface MedAdmin {
  id: string;
  scheduled_datetime: string;
  administered_datetime: string | null;
  status: string;
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const COST_TYPE_LABELS: Record<string, string> = {
  daily_rate: 'Diária',
  material: 'Material',
  medication: 'Medicação',
  procedure: 'Procedimento',
  exam: 'Exame',
  anesthesia: 'Anestesia',
  other: 'Outro',
};

/* ---- Sub-components ---- */

function ResumoTab({ h, canSee }: { h: Hospitalization; canSee: boolean }) {
  const rows: Array<[string, string | null | undefined]> = [
    ['Paciente', h.patient?.name],
    ['Espécie', `${h.patient?.species ?? ''}${h.patient?.breed ? ` — ${h.patient.breed}` : ''}`],
    ['Tutor', h.patient?.tutor?.name ?? '—'],
    ['Veterinário', h.veterinarian?.name],
    ['Admissão', new Date(h.admission_date).toLocaleString('pt-BR')],
    ['Box', h.box_number ?? '—'],
    ['Motivo', h.reason],
    ['Diagnóstico Presuntivo', h.diagnosis ?? '—'],
    ['Pagamento', h.payment_source === 'health_plan' ? 'Plano de Saúde' : 'Particular'],
    // 3.3 — diária só para papéis com acesso financeiro
    ...(canSee ? ([['Diária', fmt(Number(h.daily_rate))]] as Array<[string, string]>) : []),
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
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pertences</p>
          <p className="text-sm whitespace-pre-wrap">{h.belongings}</p>
        </div>
      )}
      {h.notes && (
        <div className="col-span-2 space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observações</p>
          <p className="text-sm whitespace-pre-wrap">{h.notes}</p>
        </div>
      )}
    </div>
  );
}

function CustosTab({ hospitalizationId, status }: { hospitalizationId: string; status: string }) {
  const [costs, setCosts] = useState<Cost[]>([]);
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);
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

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [costsRes, summaryRes] = await Promise.all([
        api.get<Cost[]>(`/hospitalizations/${hospitalizationId}/costs`),
        api.get<CostSummary>(`/hospitalizations/${hospitalizationId}/costs/summary`),
      ]);
      setCosts(Array.isArray(costsRes.data) ? costsRes.data : []);
      setSummary(summaryRes.data);
    } catch {
      toast.error('Erro ao carregar custos');
    } finally {
      setLoading(false);
    }
  }, [hospitalizationId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const addCost = async () => {
    try {
      await api.post(`/hospitalizations/${hospitalizationId}/costs`, form);
      toast.success('Custo adicionado');
      setOpenAdd(false);
      fetch();
    } catch {
      toast.error('Erro ao adicionar');
    }
  };

  const deleteCost = async (costId: string) => {
    try {
      await api.delete(`/hospitalizations/${hospitalizationId}/costs/${costId}`);
      toast.success('Removido');
      fetch();
    } catch {
      toast.error('Erro ao remover');
    }
  };

  const generateInvoice = async () => {
    try {
      const res = await api.post(`/hospitalizations/${hospitalizationId}/costs/invoice`, {}, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fatura-${hospitalizationId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao gerar fatura');
    }
  };

  if (loading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Total Geral', value: summary.total_gross, color: 'text-foreground' },
            { label: 'Coberto pelo Plano', value: summary.plan_coverage, color: 'text-green-600' },
            { label: 'Devido pelo Responsável', value: summary.patient_responsibility, color: 'text-blue-600' },
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

      <div className="flex justify-between">
        <Button size="sm" variant="outline" onClick={() => setOpenAdd(true)}>
          <Plus className="mr-2 size-4" />
          Adicionar Item
        </Button>
        {status === 'discharged' && (
          <Button size="sm" onClick={generateInvoice}>
            <Download className="mr-2 size-4" />
            Gerar Fatura
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="text-right">Qtd</TableHead>
            <TableHead className="text-right">Unit.</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Plano</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {costs.map((c) => (
            <TableRow key={c.id}>
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

      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Item de Custo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo</Label>
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
              <div className="space-y-1">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Descrição</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Valor Unitário</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.unit_price}
                  onChange={(e) => setForm((f) => ({ ...f, unit_price: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenAdd(false)}>
                Cancelar
              </Button>
              <Button onClick={addCost}>Adicionar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OcorrenciasTab({ hospitalizationId }: { hospitalizationId: string }) {
  const [evolutions, setEvolutions] = useState<Evolution[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Evolution[]>(`/hospitalizations/${hospitalizationId}/evolutions`);
      setEvolutions(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Erro ao carregar ocorrências');
    } finally {
      setLoading(false);
    }
  }, [hospitalizationId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const createOcorrencia = async () => {
    try {
      await api.post(`/hospitalizations/${hospitalizationId}/evolutions`, {
        ...form,
        heart_rate: form.heart_rate ? Number(form.heart_rate) : undefined,
        temperature_c: form.temperature_c ? Number(form.temperature_c) : undefined,
        spo2_percent: form.spo2_percent ? Number(form.spo2_percent) : undefined,
      });
      toast.success('Ocorrência registrada');
      setOpenNew(false);
      fetch();
    } catch {
      toast.error('Erro ao registrar');
    }
  };

  const downloadPdf = async () => {
    try {
      const res = await api.get(`/hospitalizations/${hospitalizationId}/evolutions/prontuario/pdf`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prontuario-${hospitalizationId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao exportar');
    }
  };

  if (loading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Button size="sm" variant="outline" onClick={() => setOpenNew(true)}>
          <Plus className="mr-2 size-4" />
          Nova Ocorrência
        </Button>
        <Button size="sm" variant="ghost" onClick={downloadPdf}>
          <Download className="mr-2 size-4" />
          Exportar Ficha PDF
        </Button>
      </div>

      <div className="space-y-3">
        {evolutions.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">Nenhuma ocorrência registrada</p>
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
                      FC: {e.heart_rate}bpm
                    </Badge>
                  )}
                  {e.temperature_c && (
                    <Badge variant="secondary" className="text-xs">
                      Temp: {e.temperature_c}°C
                    </Badge>
                  )}
                  {e.spo2_percent && (
                    <Badge variant="secondary" className="text-xs">
                      SpO2: {e.spo2_percent}%
                    </Badge>
                  )}
                  {e.respiratory_rate && (
                    <Badge variant="secondary" className="text-xs">
                      FR: {e.respiratory_rate}mpm
                    </Badge>
                  )}
                </div>
              </CardHeader>
              {(e.subjective || e.assessment || e.plan) && (
                <CardContent className="pt-0 space-y-1">
                  {e.subjective && (
                    <p className="text-sm">
                      <span className="font-medium">S:</span> {e.subjective}
                    </p>
                  )}
                  {e.assessment && (
                    <p className="text-sm">
                      <span className="font-medium">A:</span> {e.assessment}
                    </p>
                  )}
                  {e.plan && (
                    <p className="text-sm">
                      <span className="font-medium">P:</span> {e.plan}
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Ocorrência</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={form.evolution_type} onValueChange={(v) => setForm((f) => ({ ...f, evolution_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clinical">Clínica</SelectItem>
                  <SelectItem value="procedure">Procedimento</SelectItem>
                  <SelectItem value="nursing">Enfermagem</SelectItem>
                  <SelectItem value="observation">Observação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label>FC (bpm)</Label>
                <Input
                  type="number"
                  value={form.heart_rate}
                  onChange={(e) => setForm((f) => ({ ...f, heart_rate: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Temp. (°C)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.temperature_c}
                  onChange={(e) => setForm((f) => ({ ...f, temperature_c: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>SpO2 (%)</Label>
                <Input
                  type="number"
                  value={form.spo2_percent}
                  onChange={(e) => setForm((f) => ({ ...f, spo2_percent: e.target.value }))}
                />
              </div>
            </div>
            {(['subjective', 'objective', 'assessment', 'plan'] as const).map((field) => (
              <div key={field} className="space-y-1">
                <Label>
                  {field === 'subjective'
                    ? 'Subjetivo'
                    : field === 'objective'
                      ? 'Objetivo'
                      : field === 'assessment'
                        ? 'Avaliação'
                        : 'Plano'}
                </Label>
                <Textarea
                  rows={2}
                  value={form[field]}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                />
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenNew(false)}>
                Cancelar
              </Button>
              <Button onClick={createOcorrencia}>Registrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MedicacoesTab({ hospitalizationId }: { hospitalizationId: string }) {
  const [schedules, setSchedules] = useState<MedSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({
    medication_name: '',
    route: 'oral',
    dose: '',
    frequency_hours: 8,
    start_datetime: new Date().toISOString().slice(0, 16),
    instructions: '',
  });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<MedSchedule[]>(`/hospitalizations/${hospitalizationId}/medications`);
      setSchedules(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Erro ao carregar medicações');
    } finally {
      setLoading(false);
    }
  }, [hospitalizationId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const prescribe = async () => {
    try {
      await api.post(`/hospitalizations/${hospitalizationId}/medications`, form);
      toast.success('Medicação prescrita');
      setOpenNew(false);
      fetch();
    } catch {
      toast.error('Erro ao prescrever');
    }
  };

  const confirm = async (adminId: string) => {
    try {
      await api.patch(`/hospitalizations/${hospitalizationId}/medications/administrations/${adminId}/confirm`, {});
      toast.success('Administração confirmada');
      fetch();
    } catch {
      toast.error('Erro ao confirmar');
    }
  };

  const downloadKardex = async () => {
    try {
      const res = await api.get(`/hospitalizations/${hospitalizationId}/medications/kardex/pdf`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kardex-${hospitalizationId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao exportar kardex');
    }
  };

  if (loading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Button size="sm" variant="outline" onClick={() => setOpenNew(true)}>
          <Plus className="mr-2 size-4" />
          Prescrever Medicação
        </Button>
        <Button size="sm" variant="ghost" onClick={downloadKardex}>
          <Download className="mr-2 size-4" />
          Exportar Kardex PDF
        </Button>
      </div>

      {schedules.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">Nenhuma medicação prescrita</p>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => {
            const pending = (s.administrations ?? []).filter((a) => a.status === 'pending');
            const overdue = pending.filter((a) => new Date(a.scheduled_datetime) < new Date());
            return (
              <Card key={s.id}>
                <CardHeader className="py-3 pb-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{s.medication_name}</p>
                    {overdue.length > 0 && (
                      <Badge variant="destructive">
                        {overdue.length} atrasada{overdue.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {s.dose} — {s.route} — cada {s.frequency_hours}h
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
                            Confirmar
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

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prescrever Medicação</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Medicamento *</Label>
                <Input
                  value={form.medication_name}
                  onChange={(e) => setForm((f) => ({ ...f, medication_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Dose *</Label>
                <Input
                  value={form.dose}
                  onChange={(e) => setForm((f) => ({ ...f, dose: e.target.value }))}
                  placeholder="Ex: 10mg/kg"
                />
              </div>
              <div className="space-y-1">
                <Label>Via</Label>
                <Select value={form.route} onValueChange={(v) => setForm((f) => ({ ...f, route: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['oral', 'iv', 'im', 'sc', 'topical', 'inhalation', 'other'].map((r) => (
                      <SelectItem key={r} value={r}>
                        {r.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Frequência (a cada X horas)</Label>
                <Input
                  type="number"
                  value={form.frequency_hours}
                  onChange={(e) => setForm((f) => ({ ...f, frequency_hours: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Início</Label>
                <Input
                  type="datetime-local"
                  value={form.start_datetime}
                  onChange={(e) => setForm((f) => ({ ...f, start_datetime: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenNew(false)}>
                Cancelar
              </Button>
              <Button onClick={prescribe}>Prescrever</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---- Main Page ---- */
/* ---- SBAR (3.1) ---- */
interface SbarReport {
  id: string;
  report_date: string;
  suspicion: string | null;
  brief_history: string | null;
  assessment: string | null;
  recommendations: string | null;
  ai_reviewed: boolean;
  ai_reviewed_at: string | null;
  author?: { id: string; name: string };
}

function SbarTab({ hospitalizationId, status }: { hospitalizationId: string; status: string }) {
  const [reports, setReports] = useState<SbarReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const emptyForm = () => ({ report_date: new Date().toISOString().slice(0, 10), suspicion: '', brief_history: '', assessment: '', recommendations: '' });
  const [form, setForm] = useState(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<SbarReport[]>(`/hospitalizations/${hospitalizationId}/reports`);
      setReports(Array.isArray(r.data) ? r.data : []);
    } catch { setReports([]); } finally { setLoading(false); }
  }, [hospitalizationId]);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.suspicion && !form.brief_history && !form.assessment && !form.recommendations) {
      toast.error('Preencha ao menos um campo do SBAR');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/hospitalizations/${hospitalizationId}/reports`, form);
      toast.success('Relatório SBAR salvo');
      setForm(emptyForm());
      load();
    } catch { toast.error('Erro ao salvar relatório'); } finally { setSaving(false); }
  };

  const handleAiReview = async (id: string) => {
    setReviewingId(id);
    try {
      await api.post(`/hospitalizations/${hospitalizationId}/reports/${id}/ai-review`);
      toast.success('Relatório revisado com IA');
      load();
    } catch { toast.error('Erro ao revisar com IA'); } finally { setReviewingId(null); }
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
            <h3 className="text-sm font-semibold">Relatório SBAR do dia</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Data</Label>
              <Input type="date" value={form.report_date} onChange={(e) => setForm((f) => ({ ...f, report_date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>S — Suspeita / hipótese diagnóstica</Label>
              <Textarea rows={2} value={form.suspicion} onChange={(e) => setForm((f) => ({ ...f, suspicion: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>B — Breve histórico</Label>
              <Textarea rows={2} value={form.brief_history} onChange={(e) => setForm((f) => ({ ...f, brief_history: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>A — Atualização / evolução do dia</Label>
              <Textarea rows={2} value={form.assessment} onChange={(e) => setForm((f) => ({ ...f, assessment: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>R — Recomendações / próximos passos</Label>
              <Textarea rows={2} value={form.recommendations} onChange={(e) => setForm((f) => ({ ...f, recommendations: e.target.value }))} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="mr-1 size-4 animate-spin" />} Salvar relatório
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Relatórios anteriores</h3>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : reports.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum relatório registrado.</p>
        ) : (
          reports.map((r) => {
            const open = expanded.has(r.id);
            return (
              <div key={r.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <button type="button" onClick={() => toggle(r.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
                  <span className="text-sm font-medium">{new Date(r.report_date).toLocaleDateString('pt-BR')}</span>
                  {r.author?.name && <span className="text-sm text-muted-foreground">{r.author.name}</span>}
                  {r.ai_reviewed && <Badge variant="secondary" className="gap-1"><Sparkles className="size-3" /> IA</Badge>}
                  <ChevronDown className={`ml-auto size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <div className="space-y-2 border-t border-slate-200 px-4 py-3 text-sm">
                    <div><span className="font-semibold">S:</span> {r.suspicion || '—'}</div>
                    <div><span className="font-semibold">B:</span> {r.brief_history || '—'}</div>
                    <div><span className="font-semibold">A:</span> {r.assessment || '—'}</div>
                    <div><span className="font-semibold">R:</span> {r.recommendations || '—'}</div>
                    <div className="pt-1">
                      <Button size="sm" variant="outline" onClick={() => handleAiReview(r.id)} disabled={reviewingId === r.id}>
                        {reviewingId === r.id ? <Loader2 className="mr-1 size-3 animate-spin" /> : <Sparkles className="mr-1 size-3" />}
                        Revisar com IA
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
interface Visit {
  id: string;
  visited_at: string;
  visitor_name: string | null;
  notes: string | null;
  registrar?: { id: string; name: string };
}

function VisitasTab({ hospitalizationId, status }: { hospitalizationId: string; status: string }) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const emptyForm = () => ({ visited_at: new Date().toISOString().slice(0, 16), visitor_name: '', notes: '' });
  const [form, setForm] = useState(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<Visit[]>(`/hospitalizations/${hospitalizationId}/visits`);
      setVisits(Array.isArray(r.data) ? r.data : []);
    } catch { setVisits([]); } finally { setLoading(false); }
  }, [hospitalizationId]);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.visitor_name && !form.notes) { toast.error('Informe o visitante ou uma observação'); return; }
    setSaving(true);
    try {
      await api.post(`/hospitalizations/${hospitalizationId}/visits`, form);
      toast.success('Visita registrada');
      setForm(emptyForm());
      load();
    } catch { toast.error('Erro ao registrar visita'); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {status === 'active' && (
        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-sm font-semibold">Registrar visita</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Data/Hora</Label>
                <Input type="datetime-local" value={form.visited_at} onChange={(e) => setForm((f) => ({ ...f, visited_at: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Visitante</Label>
                <Input value={form.visitor_name} onChange={(e) => setForm((f) => ({ ...f, visitor_name: e.target.value }))} placeholder="Nome do tutor/visitante" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>O que foi conversado</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="mr-1 size-4 animate-spin" />} Registrar visita
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Histórico de visitas</h3>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : visits.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma visita registrada.</p>
        ) : (
          <div className="space-y-2">
            {visits.map((v) => (
              <div key={v.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{new Date(v.visited_at).toLocaleString('pt-BR')}</span>
                  {v.visitor_name && <span className="text-muted-foreground">· {v.visitor_name}</span>}
                  {v.registrar?.name && <span className="ml-auto text-xs text-muted-foreground">registrado por {v.registrar.name}</span>}
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
interface LinkedRecord {
  id: string;
  chief_complaint: string | null;
  anamnesis: string | null;
  diagnosis: string | null;
  observations: string | null;
  status: string;
}

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
  const [record, setRecord] = useState<LinkedRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ chief_complaint: '', anamnesis: '', diagnosis: '', observations: '' });

  const load = useCallback(async () => {
    if (!medicalRecordId) { setRecord(null); return; }
    setLoading(true);
    try {
      const r = await api.get<LinkedRecord>(`/medical-records/${medicalRecordId}`);
      setRecord(r.data);
      setForm({
        chief_complaint: r.data.chief_complaint || '',
        anamnesis: r.data.anamnesis || '',
        diagnosis: r.data.diagnosis || '',
        observations: r.data.observations || '',
      });
    } catch { setRecord(null); } finally { setLoading(false); }
  }, [medicalRecordId]);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const created = await api.post<{ id: string }>('/medical-records', {
        patient_id: patientId,
        veterinarian_id: veterinarianId,
        record_type: 'internacao',
      });
      await api.patch(`/hospitalizations/${hospitalizationId}`, { medical_record_id: created.data.id });
      toast.success('Ficha de internação criada');
      onLinked();
    } catch { toast.error('Erro ao criar ficha de internação'); } finally { setCreating(false); }
  };

  const handleSave = async () => {
    if (!medicalRecordId) return;
    setSaving(true);
    try {
      await api.put(`/medical-records/${medicalRecordId}`, form);
      toast.success('Ficha salva');
      load();
    } catch { toast.error('Erro ao salvar ficha'); } finally { setSaving(false); }
  };

  if (!medicalRecordId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma ficha vinculada a esta internação.</p>
          <Button onClick={handleCreate} disabled={creating}>
            {creating && <Loader2 className="mr-1 size-4 animate-spin" />} Criar ficha de internação
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) return <Skeleton className="h-48 w-full" />;

  const isClosed = record?.status === 'closed';

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <h3 className="text-sm font-semibold">Ficha vinculada</h3>
        <Button asChild size="sm" variant="outline">
          <Link href={`/dashboard/medical-records/${medicalRecordId}`}>Abrir ficha completa</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label>Queixa principal</Label>
          <Textarea rows={2} value={form.chief_complaint} onChange={(e) => setForm((f) => ({ ...f, chief_complaint: e.target.value }))} disabled={isClosed} />
        </div>
        <div className="space-y-1">
          <Label>Anamnese</Label>
          <Textarea rows={3} value={form.anamnesis} onChange={(e) => setForm((f) => ({ ...f, anamnesis: e.target.value }))} disabled={isClosed} />
        </div>
        <div className="space-y-1">
          <Label>Diagnóstico Presuntivo</Label>
          <Textarea rows={2} value={form.diagnosis} onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))} disabled={isClosed} />
        </div>
        <div className="space-y-1">
          <Label>Observações</Label>
          <Textarea rows={2} value={form.observations} onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))} disabled={isClosed} />
        </div>
        {!isClosed && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-1 size-4 animate-spin" />} Salvar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function HospitalizationDetailPage() {
  const params = useParams<{ id: string }>();
  const hospitalizationId = typeof params?.id === 'string' ? params.id : '';
  const [h, setH] = useState<Hospitalization | null>(null);
  const [loading, setLoading] = useState(true);
  const [openDischarge, setOpenDischarge] = useState(false);
  const [dischargeForm, setDischargeForm] = useState({
    actual_discharge_date: new Date().toISOString().slice(0, 16),
    discharge_condition: 'improved',
    discharge_instructions: '',
  });

  const fetch = useCallback(async () => {
    if (!hospitalizationId) {
      setLoading(false);
      toast.error('Internação inválida');
      return;
    }

    setLoading(true);
    try {
      const res = await api.get<Hospitalization>(`/hospitalizations/${hospitalizationId}`);
      setH(res.data);
    } catch {
      toast.error('Erro ao carregar internação');
    } finally {
      setLoading(false);
    }
  }, [hospitalizationId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleDischarge = async () => {
    if (!hospitalizationId) return;

    try {
      await api.patch(`/hospitalizations/${hospitalizationId}/discharge`, dischargeForm);
      toast.success('Alta registrada');
      setOpenDischarge(false);
      fetch();
    } catch {
      toast.error('Erro ao registrar alta');
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

  if (!h) return <p className="py-16 text-center text-muted-foreground">Internação não encontrada</p>;

  const canSee = canSeeFinancials(getStoredUserRole());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/internacoes">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">{h.patient?.name}</h1>
            <p className="text-sm text-muted-foreground">
              {h.patient?.species} · Admissão: {new Date(h.admission_date).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <Badge variant={h.status === 'active' ? 'default' : 'secondary'}>{h.status}</Badge>
        </div>
        {h.status === 'active' && (
          <Button variant="destructive" onClick={() => setOpenDischarge(true)}>
            <LogOut className="mr-2 size-4" />
            Registrar Alta
          </Button>
        )}
      </div>

      <Tabs defaultValue="resumo">
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="ocorrencias">Ocorrências</TabsTrigger>
          <TabsTrigger value="relatorio-medico"><FileText className="mr-1 size-4" /> Relatório Médico</TabsTrigger>
          <TabsTrigger value="sbar"><ClipboardList className="mr-1 size-4" /> Relatório SBAR</TabsTrigger>
          <TabsTrigger value="visitas"><Users className="mr-1 size-4" /> Visitas</TabsTrigger>
          <TabsTrigger value="medicacoes">Medicações</TabsTrigger>
          {canSee && <TabsTrigger value="custos">Custos</TabsTrigger>}
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
            medicalRecordId={h.medical_record_id}
            patientId={h.patient?.id}
            veterinarianId={h.veterinarian?.id}
            onLinked={fetch}
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

      <Dialog open={openDischarge} onOpenChange={setOpenDischarge}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Alta</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Data/Hora de Alta</Label>
              <Input
                type="datetime-local"
                value={dischargeForm.actual_discharge_date}
                onChange={(e) => setDischargeForm((f) => ({ ...f, actual_discharge_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Condição de Alta</Label>
              <Select
                value={dischargeForm.discharge_condition}
                onValueChange={(v) => setDischargeForm((f) => ({ ...f, discharge_condition: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="improved">Melhorado</SelectItem>
                  <SelectItem value="cured">Curado</SelectItem>
                  <SelectItem value="referred">Encaminhado</SelectItem>
                  <SelectItem value="deceased">Óbito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Instruções de Alta</Label>
              <Textarea
                rows={3}
                value={dischargeForm.discharge_instructions}
                onChange={(e) => setDischargeForm((f) => ({ ...f, discharge_instructions: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenDischarge(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDischarge}>
                Confirmar Alta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
