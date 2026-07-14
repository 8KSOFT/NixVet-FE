'use client';

import React, { useState } from 'react';
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
import { API_PAGE_SIZE } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';
import type { ClinicalTaskPayload } from '@/app/types/clinical-task';
import {
  useClinicalTasksQuery,
  useCreateClinicalTaskMutation,
  useMarkClinicalTaskDoneMutation,
} from '@/hooks/apiHooks/useClinicalTasks';
import { usePatientsListQuery } from '@/hooks/apiHooks/usePatients';

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
  const [listPage, setListPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const { register, handleSubmit, reset, control } = useForm<TaskFormValues>();

  const { data: tasksPage, isLoading: loading } = useClinicalTasksQuery(listPage);
  const list = tasksPage?.items ?? [];
  const listTotal = tasksPage?.total ?? 0;
  const listTotalPages = tasksPage?.totalPages ?? 1;

  const { data: patients = [] } = usePatientsListQuery();

  const createTask = useCreateClinicalTaskMutation();
  const markDoneMutation = useMarkClinicalTaskDoneMutation();

  const onSubmit = async (values: TaskFormValues) => {
    try {
      const payload: ClinicalTaskPayload = values;
      await createTask.mutateAsync(payload);
      toast.success('Tarefa criada');
      setModalOpen(false);
      reset();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao criar'));
    }
  };

  const markDone = async (id: string) => {
    try {
      await markDoneMutation.mutateAsync(id);
      toast.success('Tarefa concluída');
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
            <div className="overflow-x-auto border border-gray-300 rounded-lg">
              <Table className="min-w-full border-collapse bg-white text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-300 h-15">
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="p-0"
                            title="Concluir"
                            aria-label="Concluir"
                            onClick={() => markDone(task.id)}
                          >
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
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
