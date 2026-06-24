'use client';

import { ArrowLeft, LogOut, Download, Plus, Check, X } from 'lucide-react';
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
import { toast } from 'sonner';

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

function ResumoTab({ h }: { h: Hospitalization }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[
        ['Paciente', h.patient?.name],
        ['Espécie', `${h.patient?.species ?? ''}${h.patient?.breed ? ` — ${h.patient.breed}` : ''}`],
        ['Tutor', h.patient?.tutor?.name ?? '—'],
        ['Veterinário', h.veterinarian?.name],
        ['Admissão', new Date(h.admission_date).toLocaleString('pt-BR')],
        ['Box', h.box_number ?? '—'],
        ['Motivo', h.reason],
        ['Diagnóstico', h.diagnosis ?? '—'],
        ['Pagamento', h.payment_source === 'health_plan' ? 'Plano de Saúde' : 'Particular'],
        ['Diária', fmt(Number(h.daily_rate))],
      ].map(([label, value]) => (
        <div key={label} className="space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-sm">{value ?? '—'}</p>
        </div>
      ))}
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
            { label: 'Resp. do Tutor', value: summary.patient_responsibility, color: 'text-blue-600' },
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

function EvolucaoTab({ hospitalizationId }: { hospitalizationId: string }) {
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
      toast.error('Erro ao carregar evoluções');
    } finally {
      setLoading(false);
    }
  }, [hospitalizationId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const createEvolution = async () => {
    try {
      await api.post(`/hospitalizations/${hospitalizationId}/evolutions`, {
        ...form,
        heart_rate: form.heart_rate ? Number(form.heart_rate) : undefined,
        temperature_c: form.temperature_c ? Number(form.temperature_c) : undefined,
        spo2_percent: form.spo2_percent ? Number(form.spo2_percent) : undefined,
      });
      toast.success('Evolução registrada');
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
          Nova Evolução
        </Button>
        <Button size="sm" variant="ghost" onClick={downloadPdf}>
          <Download className="mr-2 size-4" />
          Exportar Prontuário PDF
        </Button>
      </div>

      <div className="space-y-3">
        {evolutions.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">Nenhuma evolução registrada</p>
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
            <DialogTitle>Nova Evolução</DialogTitle>
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
              <Button onClick={createEvolution}>Registrar</Button>
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
          <TabsTrigger value="prontuario">Prontuário</TabsTrigger>
          <TabsTrigger value="medicacoes">Medicações</TabsTrigger>
          <TabsTrigger value="custos">Custos</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <ResumoTab h={h} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prontuario" className="mt-4">
          <EvolucaoTab hospitalizationId={hospitalizationId} />
        </TabsContent>

        <TabsContent value="medicacoes" className="mt-4">
          <MedicacoesTab hospitalizationId={hospitalizationId} />
        </TabsContent>

        <TabsContent value="custos" className="mt-4">
          <CustosTab hospitalizationId={hospitalizationId} status={h.status} />
        </TabsContent>
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
