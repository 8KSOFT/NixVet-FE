'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import api from '@/lib/axios';

interface AppointmentType {
  id: string;
  name: string;
  duration_minutes: number;
  color: string | null;
  is_active: boolean;
}

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#64748b',
];

type FormValues = { name: string; duration_minutes: number; color?: string };

export default function AppointmentTypesPage() {
  const [list, setList] = useState<AppointmentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentType | null>(null);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: { duration_minutes: 30, color: '#3b82f6' },
  });

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await api.get<AppointmentType[]>('/appointment-types');
      setList(res.data ?? []);
    } catch {
      toast.error('Erro ao carregar tipos de procedimento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const openNew = () => {
    setEditing(null);
    reset({ name: '', duration_minutes: 30, color: '#3b82f6' });
    setModalOpen(true);
  };

  const openEdit = (row: AppointmentType) => {
    setEditing(row);
    reset({ name: row.name, duration_minutes: row.duration_minutes, color: row.color ?? '#3b82f6' });
    setModalOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (editing) {
        await api.put(`/appointment-types/${editing.id}`, values);
        toast.success('Atualizado');
      } else {
        await api.post('/appointment-types', values);
        toast.success('Tipo criado');
      }
      setModalOpen(false);
      reset();
      setEditing(null);
      fetchList();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao salvar');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/appointment-types/${id}`);
      toast.success('Removido');
      fetchList();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao remover');
    }
  };

  const formatDuration = (d: number) => {
    if (d < 60) return `${d} min`;
    const h = Math.floor(d / 60);
    const m = d % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-600 mb-6">Tipos de Procedimento</h1>
      <Card>
        <CardContent className="pt-6">
          <p className="text-slate-600 mb-4">
            Defina os tipos de procedimento com sua duração padrão. O sistema usará essa duração ao calcular
            os slots disponíveis na agenda.
          </p>
          <Button onClick={openNew} className="mb-4 bg-blue-600">
            <Plus className="w-4 h-4 mr-2" /> Novo tipo
          </Button>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Cor no calendário</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {r.color && (
                          <span
                            style={{ background: r.color, width: 14, height: 14, borderRadius: 3, display: 'inline-block' }}
                          />
                        )}
                        {r.name}
                      </div>
                    </TableCell>
                    <TableCell>{formatDuration(r.duration_minutes)}</TableCell>
                    <TableCell>
                      {r.color ? (
                        <Badge style={{ background: r.color, color: '#fff', borderColor: r.color }}>{r.color}</Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover este tipo?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(r.id)}>Remover</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar tipo de procedimento' : 'Novo tipo de procedimento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do procedimento</Label>
              <Input id="name" placeholder="Ex.: Consulta, Vacina, Cirurgia, Retorno..." {...register('name', { required: true })} />
              {errors.name && <p className="text-red-500 text-xs mt-1">Campo obrigatório</p>}
            </div>
            <div>
              <Label htmlFor="duration_minutes">Duração padrão (minutos)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="duration_minutes"
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  {...register('duration_minutes', { required: true, valueAsNumber: true })}
                />
                <span className="text-sm text-gray-500">min</span>
              </div>
              {errors.duration_minutes && <p className="text-red-500 text-xs mt-1">Campo obrigatório</p>}
            </div>
            <div>
              <Label htmlFor="color">Cor no calendário</Label>
              <Input id="color" type="color" className="w-24 h-10 p-1 cursor-pointer" {...register('color')} />
              <div className="flex flex-wrap gap-2 mt-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setValue('color', c)}
                    style={{ background: c, width: 28, height: 28, borderRadius: 4, border: '2px solid #e5e7eb', cursor: 'pointer' }}
                    title={c}
                  />
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-blue-600">
                {editing ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
