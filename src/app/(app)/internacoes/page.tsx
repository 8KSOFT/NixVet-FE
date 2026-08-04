'use client';

import React, { useState } from 'react';
import type { ApiRequestError } from '@/app/types/api-error';
import type { HospitalizationCreatePayload, HospitalizationFormValues } from '@/app/types/hospitalization';
import { Plus, Clock, ChevronRight } from 'lucide-react';
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

function InternacoesPageContent() {
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
    <div className="space-y-8">
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

        <TabsContent value="active" className="mt-8">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : active.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">Nenhum paciente internado no momento</div>
          ) : (
            <div className="flex flex-wrap gap-x-6 gap-y-8 pt-3">
              {active.map((h) => {
                const days = daysInternado(h.admission_date);
                const { color, label } = semaforo(days, h.status);
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
                              {h.veterinarian?.name ?? 'Sem veterinário'}
                            </p>
                            <p className="mt-0.5 truncate text-[9px] text-muted-foreground/70">
                              {[h.patient?.species, h.box_number ? `Box ${h.box_number}` : null]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            {/* Foto do pet feito uma polaroide solta, presa por
                                um clipe que agarra também a borda de cima da
                                pasta — no canto direito, pra não tapar a aba. */}
                            <div className="relative -mt-6 mb-1 inline-block">
                              {/* Clipe — espiral interna, por trás da foto. */}
                              <svg
                                viewBox="0 0 24 32"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                className="absolute -top-3 -right-2 h-7 w-5 rotate-3 text-gray-400 transition-transform duration-300 group-hover:rotate-6"
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
                                  <div className="flex size-16 shrink-0 items-center justify-center rounded-xs bg-primary/10 text-2xl">
                                    {speciesEmoji(h.patient?.species ?? '')}
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
                                className="absolute -top-3 -right-2 h-7 w-5 rotate-3 text-gray-400 drop-shadow transition-transform duration-300 group-hover:rotate-6"
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
                            {days} dia{days !== 1 ? 's' : ''}
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

export default function InternacoesPage() {
  return (
    <PlanUpgradeGate requiredPlan="clinica" feature="Internações">
      <InternacoesPageContent />
    </PlanUpgradeGate>
  );
}
