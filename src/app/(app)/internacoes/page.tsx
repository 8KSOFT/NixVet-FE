'use client';

import React, { useState } from 'react';
import type { ApiRequestError } from '@/app/types/api-error';
import type { HospitalizationCreatePayload, HospitalizationFormValues } from '@/app/types/hospitalization';
import { Plus, Clock } from 'lucide-react';
import { DashboardCreateFormDialog } from '@/components/dashboard-create-form-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  useActiveHospitalizationsListQuery,
  useCreateHospitalizationMutation,
  useHospitalizationsQuery,
} from '@/hooks/apiHooks/useHospitalizations';
import { usePatientsListQuery } from '@/hooks/apiHooks/usePatients';
import { useStaffUsersListQuery, useVeterinariansQuery } from '@/hooks/apiHooks/useUsers';
import { useHealthPlansListQuery } from '@/hooks/apiHooks/useHealthPlans';

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

function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  const typedError = error as ApiRequestError;
  const responseMessage = typedError.response?.data?.message;

  if (Array.isArray(responseMessage)) {
    return responseMessage[0] ?? fallbackMessage;
  }

  return responseMessage ?? typedError.message ?? fallbackMessage;
}

export default function InternacoesPage() {
  const [openNew, setOpenNew] = useState(false);

  const { data: active = [], isLoading: loadingActive } = useActiveHospitalizationsListQuery();
  const { data: all = [], isLoading: loadingAll } = useHospitalizationsQuery();
  const loading = loadingActive || loadingAll;

  const { data: patients = [] } = usePatientsListQuery();
  const { data: veterinarians = [] } = useVeterinariansQuery();
  const { data: staffUsers = [] } = useStaffUsersListQuery();
  const users = veterinarians.length > 0 ? veterinarians : staffUsers;
  const { data: healthPlans = [] } = useHealthPlansListQuery();

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
      toast.error('Selecione o paciente');
      return;
    }
    if (!form.veterinarian_id) {
      toast.error('Selecione o veterinário');
      return;
    }
    if (!form.reason.trim()) {
      toast.error('Informe o motivo');
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
      toast.error(getApiErrorMessage(error, 'Erro ao abrir internação'));
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
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : active.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">Nenhum paciente internado no momento</div>
          ) : (
            // <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="flex flex-wrap gap-4">
              {active.map((h) => {
                const days = daysInternado(h.admission_date);
                const { color, label } = semaforo(days, h.status);
                return (
                  <Link key={h.id} href={`/internacoes/${h.id}`}>
                    <Card className="cursor-pointer transition-shadow hover:shadow-md w-100 h-55">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="">
                            <p className="text-2xl">{speciesEmoji(h.patient?.species ?? '')}</p>
                            <p className="font-semibold">{h.patient?.name}</p>
                            <p className="text-xs text-muted-foreground">{h.patient?.species}</p>
                          </div>
                          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', color)}>{label}</span>
                        </div>
                        <div className="space-y-1 text-sm">
                          {h.box_number && <p className="text-muted-foreground">Box {h.box_number}</p>}
                          <p className="text-muted-foreground">{h.veterinarian?.name}</p>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="size-3" />
                            <span>
                              {days} dia{days !== 1 ? 's' : ''}
                            </span>
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
          <div className="overflow-x-auto border border-gray-300 rounded-lg">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
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
                    <TableCell colSpan={6} className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
                      Nenhum histórico
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
                        <Badge variant={h.status === 'discharged' ? 'secondary' : 'default'}>{h.status}</Badge>
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
        title="Nova Internação"
        containerClassName="max-w-2xl mx-auto"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setOpenNew(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>Abrir Internação</Button>
          </div>
        }
      >
        <div className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-2 gap-4 md:gap-4 max-md:grid-cols-2">
            <div className="space-y-1">
              <Label>Paciente *</Label>
              <Select value={form.patient_id} onValueChange={(v) => setForm((f) => ({ ...f, patient_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
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
              <Label>Veterinário *</Label>
              <Select
                value={form.veterinarian_id}
                onValueChange={(v) => setForm((f) => ({ ...f, veterinarian_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
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
              <Label>Motivo *</Label>
              <Textarea
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label>Data/Hora de Admissão *</Label>
              <Input
                type="datetime-local"
                value={form.admission_date}
                onChange={(e) => setForm((f) => ({ ...f, admission_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Box / Baia</Label>
              <Input
                value={form.box_number}
                onChange={(e) => setForm((f) => ({ ...f, box_number: e.target.value }))}
                placeholder="Ex: B-03"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Forma de Pagamento</Label>
              <Select value={form.payment_source} onValueChange={(v) => setForm((f) => ({ ...f, payment_source: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="particular">Particular</SelectItem>
                  <SelectItem value="health_plan">Plano de Saúde</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.payment_source === 'health_plan' && (
              <div className="space-y-1 col-span-2">
                <Label>Plano de Saúde</Label>
                <Select
                  value={form.health_plan_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, health_plan_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
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
              <Label>Diária (R$)</Label>
              <Input
                type="number"
                value={form.daily_rate}
                onChange={(e) => setForm((f) => ({ ...f, daily_rate: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Pertences</Label>
            <Textarea
              rows={2}
              value={form.belongings}
              onChange={(e) => setForm((f) => ({ ...f, belongings: e.target.value }))}
              placeholder="Ex.: coleira azul, ração Hills, cobertinha xadrez"
            />
          </div>
        </div>
      </DashboardCreateFormDialog>
    </div>
  );
}
