'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { Plus, CheckCircle2, Loader2 } from 'lucide-react';
import api from '@/lib/axios';
import { API_PAGE_SIZE, fetchAllListPages, listQueryParams, parseListResponse } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';

interface ClinicalTask {
  id: string;
  patient_id: string;
  consultation_id: string | null;
  task_type: string;
  due_date: string | null;
  status: string;
  Patient?: { name: string };
}

interface TaskFormValues {
  patient_id: string;
  task_type: string;
  due_date?: string;
}

export default function TasksPage() {
  const [list, setList] = useState<ClinicalTask[]>([]);
  const [listPage, setListPage] = useState(1);
  const [listTotal, setListTotal] = useState(0);
  const [listTotalPages, setListTotalPages] = useState(1);
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { register, handleSubmit, reset, control } = useForm<TaskFormValues>();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, patientsList] = await Promise.all([
        api.get('/clinical-tasks', { params: listQueryParams(listPage) }),
        fetchAllListPages<{ id: string; name: string }>('/patients'),
      ]);
      const p = parseListResponse<ClinicalTask>(tasksRes.data, listPage);
      setList(p.items);
      setListTotal(p.total);
      setListTotalPages(p.totalPages);
      setPatients(patientsList);
    } catch {
      toast.error('Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [listPage]);

  const onSubmit = async (values: TaskFormValues) => {
    try {
      await api.post('/clinical-tasks', values);
      toast.success('Tarefa criada');
      setModalOpen(false);
      reset();
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao criar');
    }
  };

  const markDone = async (id: string) => {
    try {
      await api.put(`/clinical-tasks/${id}/status`, { status: 'completed' });
      toast.success('Tarefa concluída');
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-primary mb-6 flex items-center gap-2">
        Tarefas clínicas
      </h1>
      <Card>
        <CardContent className="pt-6">
          <Button onClick={() => setModalOpen(true)} className="mb-4 bg-primary">
            <Plus className="w-4 h-4 mr-2" /> Nova tarefa
          </Button>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>{task.Patient?.name}</TableCell>
                    <TableCell>{task.task_type}</TableCell>
                    <TableCell>{task.due_date}</TableCell>
                    <TableCell>
                      <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.status !== 'completed' ? (
                        <Button size="sm" onClick={() => markDone(task.id)}>
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Concluir
                        </Button>
                      ) : (
                        '—'
                      )}
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
            <DialogTitle>Nova tarefa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Paciente</Label>
              <Controller
                name="patient_id"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Input {...register('task_type', { required: true })} placeholder="Ex.: Retorno, Ligar para tutor" />
            </div>
            <div>
              <Label>Vencimento</Label>
              <Input type="date" {...register('due_date')} />
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-primary">Criar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
