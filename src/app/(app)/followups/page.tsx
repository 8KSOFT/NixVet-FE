'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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

function FollowupsContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [awaitingPage, setAwaitingPage] = useState(1);
  const [allPage, setAllPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const { register, handleSubmit, reset, control } = useForm<FollowupFormValues>();

  // Entrada vinda do "+ Novo" (Command Palette / menu global) — abre o dialog de
  // criação já existente e limpa o parâmetro da URL logo em seguida.
  useEffect(() => {
    if (searchParams?.get('create') === '1') {
      setModalOpen(true);
      router.replace(pathname ?? '/followups', { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
      setModalOpen(false);
      reset();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('followups.createError')));
    }
  };

  const updateStatus = async (id: string, followup_status: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id, followupStatus: followup_status });
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('followups.genericError')));
    }
  };

  const markResultAvailable = async (id: string) => {
    try {
      await markResultAvailableMutation.mutateAsync(id);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('followups.notifyError')));
    }
  };

  const followupStatusLabels: Record<string, string> = {
    pending_result: t('followups.statusPendingResult'),
    awaiting_followup: t('followups.statusAwaitingFollowup'),
    result_available: t('followups.statusResultAvailable'),
    closed: t('followups.statusClosed'),
  };
  const followupStatusLabel = (status: string) => followupStatusLabels[status] ?? status;

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-8">
        <h1 className="text-2xl font-extrabold font-['interDoFigma'] flex items-center gap-2">
          {t('followups.title')}
        </h1>
        <Button onClick={() => setModalOpen(true)} className="w-full bg-primary sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> {t('followups.newFollowup')}
        </Button>
      </div>

      <h3 className="font-medium text-foreground mb-2">{t('followups.awaitingReturn')}</h3>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : awaiting.length === 0 ? (
        <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
          {t('followups.noAwaiting')}
        </div>
      ) : (
        <div>
          {/* Desktop / tablet: tabela */}
          <div className="hidden overflow-x-auto rounded-lg border border-gray-300 md:block">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>{t('followups.patient')}</TableHead>
                  <TableHead>{t('followups.request')}</TableHead>
                  <TableHead>{t('followups.expectedResultDate')}</TableHead>
                  <TableHead>{t('followups.status')}</TableHead>
                  <TableHead>{t('followups.actions')}</TableHead>
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
                    <TableCell>{followupStatusLabel(item.followup_status)}</TableCell>
                    <TableCell className="space-x-1">
                      {item.followup_status === 'pending_result' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="p-0"
                          title={t('followups.resultAvailable')}
                          aria-label={t('followups.resultAvailable')}
                          onClick={() => markResultAvailable(item.id)}
                        >
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="p-0"
                        title={t('followups.close')}
                        aria-label={t('followups.close')}
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
                    <p className="text-xs text-muted-foreground">{t('followups.expectedLabel')}: {item.expected_result_date || '—'}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">{followupStatusLabel(item.followup_status)}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-200 pt-2">
                  {item.followup_status === 'pending_result' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="p-0"
                      title={t('followups.resultAvailable')}
                      aria-label={t('followups.resultAvailable')}
                      onClick={() => markResultAvailable(item.id)}
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="p-0"
                    title={t('followups.close')}
                    aria-label={t('followups.close')}
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

      <h3 className="font-medium text-foreground mt-6 mb-2">{t('followups.all')}</h3>
      {all.length === 0 ? (
        <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
          {t('followups.noneRegistered')}
        </div>
      ) : (
        <>
          {/* Desktop / tablet: tabela */}
          <div className="hidden overflow-x-auto rounded-lg border border-gray-300 md:block">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>{t('followups.patient')}</TableHead>
                  <TableHead>{t('followups.expectedDate')}</TableHead>
                  <TableHead>{t('followups.status')}</TableHead>
                  <TableHead>{t('followups.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {all.map((item) => (
                  <TableRow className="cursor-pointer hover:bg-muted/50 border-b border-gray-300 h-15" key={item.id}>
                    <TableCell>{item.Patient?.name}</TableCell>
                    <TableCell>{item.expected_result_date}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{followupStatusLabel(item.followup_status)}</Badge>
                    </TableCell>
                    <TableCell className="space-x-1">
                      {item.followup_status === 'pending_result' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="p-0"
                          title={t('followups.resultAvailable')}
                          aria-label={t('followups.resultAvailable')}
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
                          title={t('followups.close')}
                          aria-label={t('followups.close')}
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
                    <p className="text-xs text-muted-foreground">{t('followups.expectedLabel')}: {item.expected_result_date || '—'}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">{followupStatusLabel(item.followup_status)}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-200 pt-2">
                  {item.followup_status === 'pending_result' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="p-0"
                      title={t('followups.resultAvailable')}
                      aria-label={t('followups.resultAvailable')}
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
                      title={t('followups.close')}
                      aria-label={t('followups.close')}
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
        title={t('followups.newFollowup')}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              {t('followups.cancel')}
            </Button>
            <Button type="submit" form="followup-create-form" className="bg-primary">
              {t('followups.create')}
            </Button>
          </div>
        }
      >
        <form id="followup-create-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
          <div className="space-y-2">
            <Label>{t('followups.examRequest')}</Label>
            <Controller
              name="exam_request_id"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('followups.select')} />
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
              <Label>{t('followups.patient')}</Label>
              <Controller
                name="patient_id"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('followups.select')} />
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
              <Label>{t('followups.expectedResultDate')}</Label>
              <Input type="date" {...register('expected_result_date')} />
            </div>
          </div>
        </form>
      </DashboardCreateFormDialog>
    </div>
  );
}

export default function FollowupsPage() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<div className="p-6">{t('followups.loading')}</div>}>
      <FollowupsContent />
    </Suspense>
  );
}
