'use client';

import React, { useState } from 'react';
import type { ApiRequestError } from '@/app/types/api-error';
import type { FollowupFormValues } from '@/app/types/exam-followup';
import { Button } from '@/components/ui/button';
import { DashboardCreateFormDialog } from '@/components/dashboard-create-form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { Loader2, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { API_PAGE_SIZE } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';
import {
  useAwaitingFollowupsQuery,
  useCreateFollowupMutation,
  useFollowupsQuery,
  useMarkFollowupResultAvailableMutation,
  useUpdateFollowupStatusMutation,
} from '@/hooks/apiHooks/useExamFollowups';
import { useExamRequestsListQuery } from '@/hooks/apiHooks/useExamRequests';
import { usePatientsListQuery } from '@/hooks/apiHooks/usePatients';

function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  const typedError = error as ApiRequestError;
  const responseMessage = typedError.response?.data?.message;

  if (Array.isArray(responseMessage)) {
    return responseMessage[0] ?? fallbackMessage;
  }

  return responseMessage ?? fallbackMessage;
}

export default function FollowupsPage() {
  const [awaitingPage, setAwaitingPage] = useState(1);
  const [allPage, setAllPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const { register, handleSubmit, reset, control } = useForm<FollowupFormValues>();

  const { data: awaitingPageData, isLoading: loadingAwaiting } = useAwaitingFollowupsQuery(awaitingPage);
  const { data: allPageData, isLoading: loadingAll } = useFollowupsQuery(allPage);
  const { data: examRequests = [] } = useExamRequestsListQuery();
  const { data: patients = [] } = usePatientsListQuery();
  const loading = loadingAwaiting || loadingAll;

  const awaiting = awaitingPageData?.items ?? [];
  const awaitingTotal = awaitingPageData?.total ?? 0;
  const awaitingTotalPages = awaitingPageData?.totalPages ?? 1;
  const all = allPageData?.items ?? [];
  const allTotal = allPageData?.total ?? 0;
  const allTotalPages = allPageData?.totalPages ?? 1;

  const createFollowup = useCreateFollowupMutation();
  const updateStatusMutation = useUpdateFollowupStatusMutation();
  const markResultAvailableMutation = useMarkFollowupResultAvailableMutation();

  const onSubmit = async (values: FollowupFormValues) => {
    try {
      await createFollowup.mutateAsync(values);
      toast.success('Acompanhamento criado');
      setModalOpen(false);
      reset();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao criar'));
    }
  };

  const updateStatus = async (id: string, followup_status: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id, followupStatus: followup_status });
      toast.success('Atualizado');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro'));
    }
  };

  const markResultAvailable = async (id: string) => {
    try {
      await markResultAvailableMutation.mutateAsync(id);
      toast.success('Tutor notificado sobre resultado disponível');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao notificar'));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-8">
        <h1 className="text-2xl font-extrabold font-['interDoFigma'] flex items-center gap-2">
          Acompanhamento de exames
        </h1>
        <Button onClick={() => setModalOpen(true)} className="w-full bg-primary sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> Novo acompanhamento
        </Button>
      </div>

      <h3 className="font-medium text-foreground mb-2">Aguardando retorno</h3>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : awaiting.length === 0 ? (
        <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
          Nenhum acompanhamento aguardando retorno.
        </div>
      ) : (
        <div>
          {/* Desktop / tablet: tabela */}
          <div className="hidden overflow-x-auto rounded-lg border border-gray-300 md:block">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>Paciente</TableHead>
                  <TableHead>Solicitação</TableHead>
                  <TableHead>Previsão resultado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {awaiting.map((item) => (
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50 border-b border-gray-300 h-15"
                    key={item.id}
                  >
                    <TableCell>{item.Patient?.name}</TableCell>
                    <TableCell>{item.exam_request_id}</TableCell>
                    <TableCell>{item.expected_result_date}</TableCell>
                    <TableCell>{item.followup_status}</TableCell>
                    <TableCell className="space-x-1">
                      {item.followup_status === 'pending_result' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="p-0"
                          title="Resultado Disponível"
                          aria-label="Resultado Disponível"
                          onClick={() => markResultAvailable(item.id)}
                        >
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="p-0"
                        title="Fechar"
                        aria-label="Fechar"
                        onClick={() => updateStatus(item.id, 'closed')}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {awaiting.map((item) => (
              <div key={item.id} className="rounded-lg border border-gray-300 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.Patient?.name}</p>
                    <p className="text-xs text-muted-foreground">Previsão: {item.expected_result_date || '—'}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">{item.followup_status}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-200 pt-2">
                  {item.followup_status === 'pending_result' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="p-0"
                      title="Resultado Disponível"
                      aria-label="Resultado Disponível"
                      onClick={() => markResultAvailable(item.id)}
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="p-0"
                    title="Fechar"
                    aria-label="Fechar"
                    onClick={() => updateStatus(item.id, 'closed')}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <ListPagination
            page={awaitingPage}
            totalPages={awaitingTotalPages}
            total={awaitingTotal}
            pageSize={API_PAGE_SIZE}
            onPageChange={setAwaitingPage}
            disabled={loading}
          />
        </div>
      )}

      <h3 className="font-medium text-foreground mt-6 mb-2">Todos</h3>
      {all.length === 0 ? (
        <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
          Nenhum acompanhamento cadastrado.
        </div>
      ) : (
        <>
          {/* Desktop / tablet: tabela */}
          <div className="hidden overflow-x-auto rounded-lg border border-gray-300 md:block">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>Paciente</TableHead>
                  <TableHead>Previsão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {all.map((item) => (
                  <TableRow className="cursor-pointer hover:bg-muted/50 border-b border-gray-300 h-15" key={item.id}>
                    <TableCell>{item.Patient?.name}</TableCell>
                    <TableCell>{item.expected_result_date}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.followup_status}</Badge>
                    </TableCell>
                    <TableCell className="space-x-1">
                      {item.followup_status === 'pending_result' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="p-0"
                          title="Resultado Disponível"
                          aria-label="Resultado Disponível"
                          onClick={() => markResultAvailable(item.id)}
                        >
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </Button>
                      )}
                      {item.followup_status !== 'closed' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="p-0"
                          title="Fechar"
                          aria-label="Fechar"
                          onClick={() => updateStatus(item.id, 'closed')}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {all.map((item) => (
              <div key={item.id} className="rounded-lg border border-gray-300 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.Patient?.name}</p>
                    <p className="text-xs text-muted-foreground">Previsão: {item.expected_result_date || '—'}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">{item.followup_status}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-200 pt-2">
                  {item.followup_status === 'pending_result' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="p-0"
                      title="Resultado Disponível"
                      aria-label="Resultado Disponível"
                      onClick={() => markResultAvailable(item.id)}
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </Button>
                  )}
                  {item.followup_status !== 'closed' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="p-0"
                      title="Fechar"
                      aria-label="Fechar"
                      onClick={() => updateStatus(item.id, 'closed')}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <ListPagination
        page={allPage}
        totalPages={allTotalPages}
        total={allTotal}
        pageSize={API_PAGE_SIZE}
        onPageChange={setAllPage}
        disabled={loading}
      />

      <DashboardCreateFormDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Novo acompanhamento"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="followup-create-form" className="bg-primary">
              Criar
            </Button>
          </div>
        }
      >
        <form id="followup-create-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
          <div className="space-y-2">
            <Label>Solicitação de exame</Label>
            <Controller
              name="exam_request_id"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {examRequests.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
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
              <Label>Previsão do resultado</Label>
              <Input type="date" {...register('expected_result_date')} />
            </div>
          </div>
        </form>
      </DashboardCreateFormDialog>
    </div>
  );
}
