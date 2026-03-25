'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import api from '@/lib/axios';

interface Area {
  id: number;
  name: string;
}

interface Exam {
  id: number;
  name: string;
  exam_area_id?: number;
  exam_area?: Area;
}

type FormValues = { name: string; area_id?: string };

export default function SettingsExamsPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [list, setList] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>();

  const fetchAreas = async () => {
    try {
      const res = await api.get<Area[]>('/catalog/exam-areas');
      setAreas(res.data ?? []);
    } catch {
      toast.error('Erro ao carregar áreas');
    }
  };

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await api.get<Exam[]>('/catalog/exams');
      setList(res.data ?? []);
    } catch {
      toast.error('Erro ao carregar exames');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
    fetchExams();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    reset({ name: '', area_id: undefined });
    setModalOpen(true);
  };

  const openEdit = (row: Exam) => {
    setEditingId(row.id);
    const areaId = row.exam_area_id ?? row.exam_area?.id;
    reset({ name: row.name, area_id: areaId ? String(areaId) : undefined });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/catalog/exams/${id}`);
      toast.success('Removido');
      fetchExams();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao remover');
    }
  };

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      area_id: values.area_id ? Number(values.area_id) : undefined,
    };
    try {
      if (editingId) {
        await api.put(`/catalog/exams/${editingId}`, payload);
        toast.success('Atualizado');
      } else {
        await api.post('/catalog/exams', payload);
        toast.success('Criado');
      }
      setModalOpen(false);
      fetchExams();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao salvar');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-600 mb-6">Exames</h1>
      <Card>
        <CardContent className="pt-6">
          <Button onClick={openCreate} className="mb-4 bg-blue-600">
            <Plus className="w-4 h-4 mr-2" /> Novo exame
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
                  <TableHead>Área</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.exam_area?.name ?? r.exam_area_id ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar exame' : 'Novo exame'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Área de exame</Label>
              <Controller
                name="area_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" placeholder="Nome do exame" {...register('name', { required: true })} />
              {errors.name && <p className="text-red-500 text-xs mt-1">Campo obrigatório</p>}
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-blue-600">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
