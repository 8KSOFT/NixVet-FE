'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { ApiRequestError } from '@/app/types/api-error';
import type {
  ExamFollowup,
  FollowupExamRequestOption,
  FollowupFormValues,
  FollowupPatientOption,
} from '@/app/types/exam-followup';
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
import api from '@/lib/axios';
import { API_PAGE_SIZE, fetchAllListPages, listQueryParams, parseListResponse } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';

function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  const typedError = error as ApiRequestError;
  const responseMessage = typedError.response?.data?.message;

  if (Array.isArray(responseMessage)) {
    return responseMessage[0] ?? fallbackMessage;
  }

  return responseMessage ?? fallbackMessage;
}

export default function FollowupsPage() {
  const [awaiting, setAwaiting] = useState<ExamFollowup[]>([]);
  const [all, setAll] = useState<ExamFollowup[]>([]);
  const [awaitingPage, setAwaitingPage] = useState(1);
  const [awaitingTotal, setAwaitingTotal] = useState(0);
  const [awaitingTotalPages, setAwaitingTotalPages] = useState(1);
  const [allPage, setAllPage] = useState(1);
  const [allTotal, setAllTotal] = useState(0);
  const [allTotalPages, setAllTotalPages] = useState(1);
  const [examRequests, setExamRequests] = useState<FollowupExamRequestOption[]>([]);
  const [patients, setPatients] = useState<FollowupPatientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { register, handleSubmit, reset, control } = useForm<FollowupFormValues>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [awaitRes, allRes, exams, patients] = await Promise.all([
        api.get('/exam-followups/awaiting-followup', {
          params: listQueryParams(awaitingPage),
        }),
        api.get('/exam-followups', { params: listQueryParams(allPage) }),
        fetchAllListPages<{ id: string }>('/exam-requests'),
        fetchAllListPages<{ id: string; name: string }>('/patients'),
      ]);
      const a = parseListResponse<ExamFollowup>(awaitRes.data, awaitingPage);
      setAwaiting(a.items);
      setAwaitingTotal(a.total);
      setAwaitingTotalPages(a.totalPages);
      const t = parseListResponse<ExamFollowup>(allRes.data, allPage);
      setAll(t.items);
      setAllTotal(t.total);
      setAllTotalPages(t.totalPages);
      setExamRequests(exams);
      setPatients(patients);
    } catch {
      toast.error('Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [allPage, awaitingPage]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const onSubmit = async (values: FollowupFormValues) => {
    try {
      await api.post('/exam-followups', values);
      toast.success('Acompanhamento criado');
      setModalOpen(false);
      reset();
      void fetchData();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao criar'));
    }
  };

  const updateStatus = async (id: string, followup_status: string) => {
    try {
      await api.put(`/exam-followups/${id}`, { followup_status });
      toast.success('Atualizado');
      void fetchData();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro'));
    }
  };

  const markResultAvailable = async (id: string) => {
    try {
      await api.put(`/exam-followups/${id}/result-available`);
      toast.success('Tutor notificado sobre resultado disponível');
      void fetchData();
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
        <Button onClick={() => setModalOpen(true)} className="bg-primary">
          <Plus className="w-4 h-4 mr-2" /> Novo acompanhamento
        </Button>
      </div>

      <h3 className="font-medium text-foreground mb-2">Aguardando retorno</h3>
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
      <div className="overflow-x-auto border border-gray-300 rounded-lg">
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
