'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { Plus, Loader2 } from 'lucide-react';
import api from '@/lib/axios';

interface Resource {
  id: string;
  name: string;
  type: string;
}

interface ResourceFormValues {
  name: string;
  type: string;
}

const TYPES = [
  { value: 'room', label: 'Sala' },
  { value: 'surgery_room', label: 'Sala cirúrgica' },
  { value: 'equipment', label: 'Equipamento' },
];

export default function SettingsResourcesPage() {
  const [list, setList] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const form = useForm<ResourceFormValues>();

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await api.get<Resource[]>('/resources');
      setList(res.data ?? []);
    } catch {
      toast.error('Erro ao carregar recursos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const onFinish = async (values: ResourceFormValues) => {
    try {
      await api.post('/resources', values);
      toast.success('Recurso cadastrado');
      setModalOpen(false);
      form.reset();
      fetchList();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao salvar');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-primary mb-6">Recursos</h1>
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground mb-4">Salas e equipamentos para agendamento (opcional na agenda).</p>
          <Button
            onClick={() => {
              form.reset();
              setModalOpen(true);
            }}
            className="mb-4 bg-primary"
          >
            <Plus className="w-4 h-4 mr-2" /> Novo recurso
          </Button>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{TYPES.find((x) => x.value === r.type)?.label ?? r.type}</TableCell>
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
            <DialogTitle>Novo recurso</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onFinish)} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Nome</Label>
              <Input {...form.register('name', { required: true })} placeholder="Ex.: Sala 1, Raio-X" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <Controller
                name="type"
                control={form.control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <Button type="submit" className="bg-primary">
              Salvar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
