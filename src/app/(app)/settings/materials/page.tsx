'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import api from '@/lib/axios';
import { API_PAGE_SIZE, listQueryParams, parseListResponse } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';

interface Material {
  id: number;
  name: string;
  private_price?: number | null;
  cost_price?: number | null;
  tax_percentage?: number | null;
}

type FormValues = {
  name: string;
  private_price?: string;
  cost_price?: string;
  tax_percentage?: string;
};

function fmtBRL(v?: number | null) {
  if (v == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export default function SettingsMaterialsPage() {
  const [list, setList] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [listTotal, setListTotal] = useState(0);
  const [listTotalPages, setListTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>();

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const res = await api.get('/catalog/materials', { params: listQueryParams(listPage) });
      const p = parseListResponse<Material>(res.data, listPage);
      setList(p.items);
      setListTotal(p.total);
      setListTotalPages(p.totalPages);
    } catch {
      toast.error('Erro ao carregar materiais');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [listPage]);

  const openCreate = () => {
    setEditingId(null);
    reset({ name: '', private_price: '', cost_price: '', tax_percentage: '' });
    setModalOpen(true);
  };

  const openEdit = (row: Material) => {
    setEditingId(row.id);
    reset({
      name: row.name,
      private_price: row.private_price != null ? String(row.private_price) : '',
      cost_price: row.cost_price != null ? String(row.cost_price) : '',
      tax_percentage: row.tax_percentage != null ? String(row.tax_percentage) : '',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/catalog/materials/${id}`);
      toast.success('Removido');
      fetchMaterials();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao remover'));
    }
  };

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      private_price: values.private_price ? parseFloat(values.private_price) : undefined,
      cost_price: values.cost_price ? parseFloat(values.cost_price) : undefined,
      tax_percentage: values.tax_percentage ? parseFloat(values.tax_percentage) : 0,
    };
    try {
      if (editingId) {
        await api.put(`/catalog/materials/${editingId}`, payload);
        toast.success('Atualizado');
      } else {
        await api.post('/catalog/materials', payload);
        toast.success('Criado');
      }
      setModalOpen(false);
      fetchMaterials();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar'));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-primary mb-6">Materiais</h1>
      <Card>
        <CardContent className="pt-6">
          <Button onClick={openCreate} className="mb-4 bg-primary">
            <Plus className="w-4 h-4 mr-2" /> Novo material
          </Button>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead className="text-right">Imposto</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => (
                  <TableRow className="border-b border-gray-300 h-15" key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtBRL(r.cost_price)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtBRL(r.private_price)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.tax_percentage != null ? `${Number(r.tax_percentage)}%` : '—'}</TableCell>
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
            <ListPagination
              page={listPage}
              totalPages={listTotalPages}
              total={listTotal}
              pageSize={API_PAGE_SIZE}
              onPageChange={setListPage}
              disabled={loading}
            />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar material' : 'Novo material'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" placeholder="Nome do material" {...register('name', { required: true })} />
              {errors.name && <p className="text-red-500 text-xs mt-1">Campo obrigatório</p>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="cost_price">Custo (R$)</Label>
                <Input id="cost_price" type="number" step="0.01" min="0" placeholder="0,00" {...register('cost_price')} />
              </div>
              <div>
                <Label htmlFor="private_price">Venda (R$)</Label>
                <Input id="private_price" type="number" step="0.01" min="0" placeholder="0,00" {...register('private_price')} />
              </div>
              <div>
                <Label htmlFor="tax_percentage">Imposto (%)</Label>
                <Input id="tax_percentage" type="number" step="0.01" min="0" max="100" placeholder="0" {...register('tax_percentage')} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Imposto é adicionado por cima do preço de venda. Margem = venda − custo.
            </p>
            <DialogFooter>
              <Button type="submit" className="bg-primary">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
