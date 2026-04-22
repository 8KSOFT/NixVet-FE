'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import api from '@/lib/axios';

interface WorkflowConfig {
  id: string;
  event_name: string;
  action_type: string;
  delay_minutes: number;
  channel: string | null;
  template_message: string | null;
  description: string | null;
  is_active: boolean;
}

const ACTION_TYPES = [
  { value: 'send_whatsapp', label: 'Enviar WhatsApp' },
  { value: 'send_email', label: 'Enviar e-mail' },
  { value: 'create_task', label: 'Criar tarefa' },
  { value: 'create_notification', label: 'Criar notificação' },
];

type FormValues = {
  event_name: string;
  action_type: string;
  delay_minutes: number;
  channel?: string;
  template_message?: string;
  description?: string;
  is_active: boolean;
};

export default function SettingsAutomationsPage() {
  const [list, setList] = useState<WorkflowConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    defaultValues: { delay_minutes: 0, is_active: true },
  });

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await api.get<WorkflowConfig[]>('/workflow-configs');
      setList(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Erro ao carregar automações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const onSubmit = async (values: FormValues) => {
    try {
      await api.post('/workflow-configs', {
        event_name: values.event_name,
        action_type: values.action_type,
        delay_minutes: Number(values.delay_minutes) || 0,
        channel: values.channel || undefined,
        template_message: values.template_message || undefined,
        description: values.description || undefined,
        is_active: values.is_active !== false,
      });
      toast.success('Regra salva');
      setModalOpen(false);
      reset();
      fetchList();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao salvar');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/workflow-configs/${id}`);
      toast.success('Removido');
      fetchList();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao remover');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-primary mb-6">Automações</h1>
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground mb-4">Regras por evento (ex.: ao criar consulta → enviar lembrete WhatsApp).</p>
          <Button onClick={() => setModalOpen(true)} className="mb-4 bg-primary">
            <Plus className="w-4 h-4 mr-2" /> Nova regra
          </Button>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead className="w-[100px]">Atraso (min)</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.event_name}</TableCell>
                    <TableCell>{r.action_type}</TableCell>
                    <TableCell>{r.delay_minutes}</TableCell>
                    <TableCell>{r.channel}</TableCell>
                    <TableCell>{r.is_active ? 'Sim' : 'Não'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova regra de automação</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="event_name">Nome do evento</Label>
              <Input id="event_name" placeholder="Ex.: consultation.created.v1" {...register('event_name', { required: true })} />
              {errors.event_name && <p className="text-red-500 text-xs mt-1">Campo obrigatório</p>}
            </div>
            <div>
              <Label>Tipo de ação</Label>
              <Controller
                name="action_type"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.action_type && <p className="text-red-500 text-xs mt-1">Campo obrigatório</p>}
            </div>
            <div>
              <Label htmlFor="delay_minutes">Atraso (minutos)</Label>
              <Input id="delay_minutes" type="number" min={0} {...register('delay_minutes', { required: true })} />
            </div>
            <div>
              <Label htmlFor="channel">Canal</Label>
              <Input id="channel" placeholder="Ex.: whatsapp" {...register('channel')} />
            </div>
            <div>
              <Label htmlFor="template_message">Mensagem modelo</Label>
              <Textarea id="template_message" rows={2} placeholder="Texto da mensagem (placeholders conforme evento)" {...register('template_message')} />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" placeholder="Descrição da regra" {...register('description')} />
            </div>
            <div className="flex items-center gap-2">
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <Switch id="is_active" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label htmlFor="is_active">Ativo</Label>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-primary">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
