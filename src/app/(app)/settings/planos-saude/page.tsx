'use client';

import React, { useState } from 'react';
import { Plus, Pencil, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardCreateFormDialog } from '@/components/dashboard-create-form-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  useHealthPlansQuery,
  useCreateHealthPlanMutation,
  useUpdateHealthPlanMutation,
  useDeactivateHealthPlanMutation,
} from '@/hooks/apiHooks/useHealthPlans';
import type { HealthPlan } from '@/app/types/health-plan';

const EMPTY_FORM = {
  name: '',
  document: '',
  contact_phone: '',
  contact_email: '',
  reimbursement_days: 30,
  active: true,
};

export default function PlanosSaudePage() {
  const [includeInactive, setIncludeInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HealthPlan | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: plans = [], isLoading: loading } = useHealthPlansQuery(includeInactive);
  const createMutation = useCreateHealthPlanMutation();
  const updateMutation = useUpdateHealthPlanMutation();
  const deactivateMutation = useDeactivateHealthPlanMutation();

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (plan: HealthPlan) => {
    setEditing(plan);
    setForm({
      name: plan.name,
      document: plan.document ?? '',
      contact_phone: plan.contact_phone ?? '',
      contact_email: plan.contact_email ?? '',
      reimbursement_days: plan.reimbursement_days ?? 30,
      active: plan.active ?? true,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload: form });
      } else {
        await createMutation.mutateAsync(form);
      }
      setModalOpen(false);
    } catch {
      toast.error('Erro ao salvar');
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await deactivateMutation.mutateAsync(id);
    } catch {
      toast.error('Erro ao desativar');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Planos de Saúde</h2>
          <p className="text-sm text-muted-foreground">Convênios e planos veterinários cadastrados</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} />
            Mostrar inativos
          </label>
          <Button size="sm" onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="mr-2 size-4" />
            Novo Plano
          </Button>
        </div>
      </div>

      <Card className="rounded-none border-0 bg-transparent py-0 shadow-none sm:rounded-xl sm:border sm:border-border/80 sm:bg-card sm:py-6 sm:shadow-(--shadow-card)">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : plans.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">Nenhum plano cadastrado</div>
          ) : (
            <>
              {/* Desktop / tablet: tabela */}
              <div className="hidden overflow-x-auto md:block">
              <Table className="min-w-full border-collapse bg-white text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-300 h-15">
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead className="text-right">Prazo Repasse</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((p) => (
                    <TableRow className="border-b border-gray-300 h-15" key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.document ?? '—'}</TableCell>
                      <TableCell>{p.contact_phone ?? p.contact_email ?? '—'}</TableCell>
                      <TableCell className="text-right">{p.reimbursement_days}d</TableCell>
                      <TableCell>
                        <Badge variant={p.active ? 'default' : 'secondary'}>
                          {p.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                            <Pencil className="size-4" />
                          </Button>
                          {p.active && (
                            <Button variant="ghost" size="icon" onClick={() => handleDeactivate(p.id)}>
                              <PowerOff className="size-4 text-orange-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>

              {/* Mobile: cards */}
              <div className="space-y-3 p-4 md:hidden">
                {plans.map((p) => (
                  <div key={p.id} className="rounded-lg border border-gray-300 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.document ?? '—'}</p>
                      </div>
                      <Badge variant={p.active ? 'default' : 'secondary'} className="shrink-0">
                        {p.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Contato</p>
                        <p className="truncate">{p.contact_phone ?? p.contact_email ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Prazo Repasse</p>
                        <p>{p.reimbursement_days}d</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-200 pt-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                        <Pencil className="size-4" />
                      </Button>
                      {p.active && (
                        <Button variant="ghost" size="icon" onClick={() => handleDeactivate(p.id)}>
                          <PowerOff className="size-4 text-orange-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <DashboardCreateFormDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editing ? 'Editar Plano' : 'Novo Plano de Saúde'}
        contentClassName="modal-responsive"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="border border-gray-300"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-primary">
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 md:space-y-6">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Petlove Saúde" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input value={form.document} onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))} placeholder="00.000.000/0001-00" />
            </div>
            <div className="space-y-2">
              <Label>Prazo de Repasse (dias)</Label>
              <Input type="number" value={form.reimbursement_days} onChange={(e) => setForm((f) => ({ ...f, reimbursement_days: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.contact_phone} onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={form.contact_email} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} />
            </div>
          </div>
        </div>
      </DashboardCreateFormDialog>
    </div>
  );
}
