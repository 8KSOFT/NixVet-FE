'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import { toast } from 'sonner';
import Link from 'next/link';

interface Hospitalization {
  id: string;
  reason: string;
  admission_date: string;
  status: string;
  box_number: string | null;
  payment_source: string;
  daily_rate: number;
  patient: { id: string; name: string; species: string };
  veterinarian: { id: string; name: string };
}

interface Patient {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

function daysInternado(admissionDate: string): number {
  const ms = Date.now() - new Date(admissionDate).getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function semaforo(days: number, status: string): { color: string; label: string } {
  if (status !== 'active') return { color: 'bg-gray-200 text-gray-600', label: 'Alta' };
  if (days > 7) return { color: 'bg-red-100 text-red-700 border border-red-200', label: 'Crítico' };
  if (days >= 3) return { color: 'bg-yellow-100 text-yellow-700 border border-yellow-200', label: 'Atenção' };
  return { color: 'bg-green-100 text-green-700 border border-green-200', label: 'Estável' };
}

function speciesEmoji(species: string) {
  const s = species.toLowerCase();
  if (s.includes('can') || s.includes('dog') || s.includes('cachorro')) return '🐕';
  if (s.includes('fel') || s.includes('cat') || s.includes('gato')) return '🐈';
  if (s.includes('rab') || s.includes('coelho')) return '🐇';
  return '🐾';
}

export default function InternacoesPage() {
  const [active, setActive] = useState<Hospitalization[]>([]);
  const [all, setAll] = useState<Hospitalization[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [healthPlans, setHealthPlans] = useState<{ id: string; name: string }[]>([]);

  const [form, setForm] = useState({
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
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [activeRes, allRes] = await Promise.all([
        api.get<Hospitalization[]>('/hospitalizations/active'),
        api.get<Hospitalization[]>('/hospitalizations'),
      ]);
      setActive(Array.isArray(activeRes.data) ? activeRes.data : []);
      setAll(Array.isArray(allRes.data) ? allRes.data : []);
    } catch {
      toast.error('Erro ao carregar internações');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    api.get('/patients').then((r) => setPatients(Array.isArray(r.data) ? r.data : (r.data as any)?.data ?? [])).catch(() => {});
    api.get('/users').then((r) => setUsers(Array.isArray(r.data) ? r.data : (r.data as any)?.data ?? [])).catch(() => {});
    api.get('/health-plans').then((r) => setHealthPlans(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, [fetchData]);

  const handleCreate = async () => {
    try {
      await api.post('/hospitalizations', {
        ...form,
        health_plan_id: form.health_plan_id || undefined,
      });
      toast.success('Internação aberta');
      setOpenNew(false);
      fetchData();
    } catch {
      toast.error('Erro ao abrir internação');
    }
  };

  const discharged = all.filter((h) => h.status !== 'active');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Internações</h1>
          <p className="text-sm text-muted-foreground">Painel de pacientes internados</p>
        </div>
        <Button onClick={() => setOpenNew(true)}>
          <Plus className="mr-2 size-4" />
          Nova Internação
        </Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Ativos ({active.length})</TabsTrigger>
          <TabsTrigger value="history">Histórico ({discharged.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
            </div>
          ) : active.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              Nenhum paciente internado no momento
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {active.map((h) => {
                const days = daysInternado(h.admission_date);
                const { color, label } = semaforo(days, h.status);
                return (
                  <Link key={h.id} href={`/dashboard/internacoes/${h.id}`}>
                    <Card className="cursor-pointer transition-shadow hover:shadow-md">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-2xl">{speciesEmoji(h.patient?.species ?? '')}</p>
                            <p className="font-semibold">{h.patient?.name}</p>
                            <p className="text-xs text-muted-foreground">{h.patient?.species}</p>
                          </div>
                          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', color)}>
                            {label}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm">
                          {h.box_number && (
                            <p className="text-muted-foreground">Box {h.box_number}</p>
                          )}
                          <p className="text-muted-foreground">{h.veterinarian?.name}</p>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="size-3" />
                            <span>{days} dia{days !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Admissão</TableHead>
                    <TableHead>Alta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vet.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discharged.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                        Nenhum histórico
                      </TableCell>
                    </TableRow>
                  ) : (
                    discharged.map((h) => (
                      <TableRow key={h.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <Link href={`/dashboard/internacoes/${h.id}`} className="font-medium hover:underline">
                            {h.patient?.name}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">{h.reason}</TableCell>
                        <TableCell>{new Date(h.admission_date).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {h.status === 'discharged' ? '—' : ''}
                        </TableCell>
                        <TableCell>
                          <Badge variant={h.status === 'discharged' ? 'secondary' : 'default'}>
                            {h.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{h.veterinarian?.name}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Nova Internação */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Internação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Paciente *</Label>
                <Select value={form.patient_id} onValueChange={(v) => setForm((f) => ({ ...f, patient_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Veterinário *</Label>
                <Select value={form.veterinarian_id} onValueChange={(v) => setForm((f) => ({ ...f, veterinarian_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Motivo *</Label>
                <Textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-1">
                <Label>Data/Hora de Admissão *</Label>
                <Input type="datetime-local" value={form.admission_date} onChange={(e) => setForm((f) => ({ ...f, admission_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Box / Baia</Label>
                <Input value={form.box_number} onChange={(e) => setForm((f) => ({ ...f, box_number: e.target.value }))} placeholder="Ex: B-03" />
              </div>
              <div className="space-y-1">
                <Label>Forma de Pagamento</Label>
                <Select value={form.payment_source} onValueChange={(v) => setForm((f) => ({ ...f, payment_source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="particular">Particular</SelectItem>
                    <SelectItem value="health_plan">Plano de Saúde</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.payment_source === 'health_plan' && (
                <div className="space-y-1">
                  <Label>Plano de Saúde</Label>
                  <Select value={form.health_plan_id} onValueChange={(v) => setForm((f) => ({ ...f, health_plan_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {healthPlans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <Label>Diária (R$)</Label>
                <Input type="number" value={form.daily_rate} onChange={(e) => setForm((f) => ({ ...f, daily_rate: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
              <Button onClick={handleCreate}>Abrir Internação</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
