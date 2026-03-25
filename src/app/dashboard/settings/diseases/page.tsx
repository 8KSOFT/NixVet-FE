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

interface Category {
  id: number;
  name: string;
}

interface Disease {
  id: number;
  name: string;
  disease_category_id?: number;
  disease_category?: Category;
}

type FormValues = { name: string; category_id?: string };

export default function SettingsDiseasesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [list, setList] = useState<Disease[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>();

  const fetchCategories = async () => {
    try {
      const res = await api.get<Category[]>('/catalog/disease-categories');
      setCategories(res.data ?? []);
    } catch {
      toast.error('Erro ao carregar categorias');
    }
  };

  const fetchDiseases = async () => {
    setLoading(true);
    try {
      const res = await api.get<Disease[]>('/catalog/diseases');
      setList(res.data ?? []);
    } catch {
      toast.error('Erro ao carregar doenças');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchDiseases();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    reset({ name: '', category_id: undefined });
    setModalOpen(true);
  };

  const openEdit = (row: Disease) => {
    setEditingId(row.id);
    const catId = row.disease_category_id ?? row.disease_category?.id;
    reset({ name: row.name, category_id: catId ? String(catId) : undefined });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/catalog/diseases/${id}`);
      toast.success('Removido');
      fetchDiseases();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao remover');
    }
  };

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      category_id: values.category_id ? Number(values.category_id) : undefined,
    };
    try {
      if (editingId) {
        await api.put(`/catalog/diseases/${editingId}`, payload);
        toast.success('Atualizado');
      } else {
        await api.post('/catalog/diseases', payload);
        toast.success('Criado');
      }
      setModalOpen(false);
      fetchDiseases();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao salvar');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-600 mb-6">Doenças</h1>
      <Card>
        <CardContent className="pt-6">
          <Button onClick={openCreate} className="mb-4 bg-blue-600">
            <Plus className="w-4 h-4 mr-2" /> Nova doença
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
                  <TableHead>Categoria</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.disease_category?.name ?? r.disease_category_id ?? '—'}</TableCell>
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
            <DialogTitle>{editingId ? 'Editar doença' : 'Nova doença'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Categoria</Label>
              <Controller
                name="category_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" placeholder="Nome da doença" {...register('name', { required: true })} />
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
