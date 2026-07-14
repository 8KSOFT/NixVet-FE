'use client';

import React, { useState } from 'react';
import type { ApiRequestError } from '@/app/types/api-error';
import { Button } from '@/components/ui/button';
import { DashboardCreateFormDialog } from '@/components/dashboard-create-form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { Plus, Loader2 } from 'lucide-react';
import { API_PAGE_SIZE } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';
import type { VaccineReminder, VaccineReminderPayload } from '@/app/types/vaccine-reminder';
import {
  useCreateVaccineReminderMutation,
  useDueVaccineRemindersQuery,
  useVaccineRemindersQuery,
} from '@/hooks/apiHooks/useVaccineReminders';
import { usePatientsListQuery } from '@/hooks/apiHooks/usePatients';

interface VaccineFormValues {
  patient_id: string;
  vaccine_name: string;
  next_due_date: string;
}

function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  const typedError = error as ApiRequestError;
  const responseMessage = typedError.response?.data?.message;

  if (Array.isArray(responseMessage)) {
    return responseMessage[0] ?? fallbackMessage;
  }

  return responseMessage ?? typedError.message ?? fallbackMessage;
}

function ReminderTable({ data, loading }: { data: VaccineReminder[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  return (
    <div className="overflow-x-auto border border-gray-300 rounded-lg">
      <Table className="min-w-full border-collapse bg-white text-sm">
        <TableHeader>
          <TableRow className="border-b border-gray-300 h-15">
            <TableHead>Paciente</TableHead>
            <TableHead>Vacina</TableHead>
            <TableHead>Próxima dose</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((r) => (
            <TableRow className="border-b border-gray-300 h-15" key={r.id}>
              <TableCell>{r.patient?.name}</TableCell>
              <TableCell>{r.vaccine_name}</TableCell>
              <TableCell>{r.next_due_date}</TableCell>
              <TableCell>{r.reminder_status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function VaccinesPage() {
  const [duePage, setDuePage] = useState(1);
  const [allPage, setAllPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const { register, handleSubmit, reset, control } = useForm<VaccineFormValues>();

  const { data: allPageData, isLoading: loadingAll } = useVaccineRemindersQuery(allPage);
  const { data: duePageData, isLoading: loadingDue } = useDueVaccineRemindersQuery(duePage, 30);
  const { data: patients = [] } = usePatientsListQuery();
  const loading = loadingAll || loadingDue;

  const allReminders = allPageData?.items ?? [];
  const allTotal = allPageData?.total ?? 0;
  const allTotalPages = allPageData?.totalPages ?? 1;
  const dueSoon = duePageData?.items ?? [];
  const dueTotal = duePageData?.total ?? 0;
  const dueTotalPages = duePageData?.totalPages ?? 1;

  const createReminder = useCreateVaccineReminderMutation();

  const onSubmit = async (values: VaccineFormValues) => {
    try {
      const payload: VaccineReminderPayload = values;
      await createReminder.mutateAsync(payload);
      toast.success('Lembrete criado');
      setModalOpen(false);
      reset();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao criar'));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-8">
        <h1 className="text-2xl font-extrabold font-['InterDoFigma']">Vacinas</h1>
        <Button onClick={() => setModalOpen(true)} className="bg-primary">
          <Plus className="w-4 h-4 mr-2" /> Novo lembrete
        </Button>
      </div>

      <div className="bg-transparent border-none shadow-none">
        <Tabs defaultValue="due">
          <TabsList>
            <TabsTrigger value="due">Próximos 30 dias</TabsTrigger>
            <TabsTrigger value="all">Todos os lembretes</TabsTrigger>
          </TabsList>
          <TabsContent value="due">
            <div className="rounded-md overflow-hidden border-none">
              <ReminderTable data={dueSoon} loading={loading} />
              <ListPagination
                page={duePage}
                totalPages={dueTotalPages}
                total={dueTotal}
                pageSize={API_PAGE_SIZE}
                onPageChange={setDuePage}
                disabled={loading}
              />
            </div>
          </TabsContent>
          <TabsContent value="all">
            <div className="rounded-md overflow-hidden border-none">
              <ReminderTable data={allReminders} loading={loading} />
              <ListPagination
                page={allPage}
                totalPages={allTotalPages}
                total={allTotal}
                pageSize={API_PAGE_SIZE}
                onPageChange={setAllPage}
                disabled={loading}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <DashboardCreateFormDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Novo lembrete de vacina"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="vaccine-reminder-form" className="bg-primary">
              Criar
            </Button>
          </div>
        }
      >
        <form id="vaccine-reminder-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
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
              <Label>Próxima dose</Label>
              <Input type="date" {...register('next_due_date', { required: true })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Vacina</Label>
            <Input {...register('vaccine_name', { required: true })} placeholder="Ex.: Antirrábica" />
          </div>
        </form>
      </DashboardCreateFormDialog>
    </div>
  );
}
