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
      setModalOpen(false);
      reset();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao criar'));
    }
  };

  const markDone = async (id: string) => {
    try {
      await markDoneMutation.mutateAsync(id);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro'));
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <h1 className="text-2xl font-extrabold font-['InterDoFigma'] flex items-center gap-2">Tarefas clínicas</h1>
        <Button onClick={() => setModalOpen(true)} className="w-full bg-primary sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> Nova tarefa
        </Button>
      </div>
      <div className="bg-transparent border-none shadow-none">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
            Nenhuma tarefa cadastrada.
          </div>
        ) : (
          <div>
            {/* Desktop / tablet: tabela */}
            <div className="hidden overflow-x-auto rounded-lg border border-gray-300 md:block">
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

            {/* Mobile: cards */}
            <div className="space-y-3 md:hidden">
              {list.map((task) => (
                <div key={task.id} className="rounded-lg border border-gray-300 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{task.Patient?.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{task.task_type}</p>
                    </div>
                    <Badge variant={task.status === 'completed' ? 'default' : 'secondary'} className="shrink-0">
                      {task.status}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Vencimento</p>
                      <p>{task.due_date || '—'}</p>
                    </div>
                    {task.status !== 'completed' && (
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
                    )}
                  </div>
                </div>
              ))}
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
