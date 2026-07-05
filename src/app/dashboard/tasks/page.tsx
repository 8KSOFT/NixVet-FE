'use client';

import React, { useEffect, useState } from 'react';
import type { ApiRequestError } from '@/app/types/api-error';
import { Button } from '@/components/ui/button';
import { DashboardCreateFormDialog } from '@/components/dashboard-create-form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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

function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  const typedError = error as ApiRequestError;
  const responseMessage = typedError.response?.data?.message;

  if (Array.isArray(responseMessage)) {
    return responseMessage[0] ?? fallbackMessage;
  }

  return responseMessage ?? typedError.message ?? fallbackMessage;
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
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao criar'));
    }
  };

  const markDone = async (id: string) => {
    try {
      await api.put(`/clinical-tasks/${id}/status`, { status: 'completed' });
      toast.success('Tarefa concluída');
      fetchData();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro'));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-8">
        <h1 className="text-2xl font-extrabold font-['InterDoFigma'] flex items-center gap-2">Tarefas clínicas</h1>
        <Button onClick={() => setModalOpen(true)} className="bg-primary">
          <Plus className="w-4 h-4 mr-2" /> Nova tarefa
        </Button>
      </div>
      <div className="bg-transparent border-none shadow-none">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div>
            <div className="rounded-md border border-gray-300 overflow-hidden">
              <Table>
                <TableHeader className="h-15">
                  <TableRow className="border-b border-gray-300">
                    <TableHead>Paciente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-30">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((task) => (
                    <TableRow className="border-b border-gray-300 h-15" key={task.id}>
                      <TableCell>{task.Patient?.name}</TableCell>
                      <TableCell>{task.task_type}</TableCell>
                      <TableCell>{task.due_date}</TableCell>
                      <TableCell>
                        <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>{task.status}</Badge>
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
            </div>
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
      </div>

      <DashboardCreateFormDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Nova tarefa"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="task-create-form" className="bg-primary">
              Criar
            </Button>
          </div>
        }
      >
        <form id="task-create-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
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
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Input type="date" {...register('due_date')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Input {...register('task_type', { required: true })} placeholder="Ex.: Retorno, Ligar para tutor" />
          </div>
        </form>
      </DashboardCreateFormDialog>
    </div>
  );
}
