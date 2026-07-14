'use client';

import React, { useState } from 'react';
import { Plus, Pencil, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
        toast.success('Plano atualizado');
      } else {
        await createMutation.mutateAsync(form);
        toast.success('Plano criado');
      }
      setModalOpen(false);
    } catch {
      toast.error('Erro ao salvar');
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await deactivateMutation.mutateAsync(id);
      toast.success('Plano desativado');
    } catch {
      toast.error('Erro ao desativar');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Planos de Saúde</h2>
          <p className="text-sm text-muted-foreground">Convênios e planos veterinários cadastrados</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} />
            Mostrar inativos
          </label>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            Novo Plano
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                {plans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
                      Nenhum plano cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  plans.map((p) => (
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
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Plano' : 'Novo Plano de Saúde'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Petlove Saúde" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>CNPJ</Label>
                <Input value={form.document} onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))} placeholder="00.000.000/0001-00" />
              </div>
              <div className="space-y-1">
                <Label>Prazo de Repasse (dias)</Label>
                <Input type="number" value={form.reimbursement_days} onChange={(e) => setForm((f) => ({ ...f, reimbursement_days: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input value={form.contact_phone} onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>E-mail</Label>
                <Input type="email" value={form.contact_email} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
