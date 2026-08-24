'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CreateExamRequestPayload, ExamRequest, ExamRequestFormValues, StoredUser } from '@/app/types/exam-request';
import { DashboardCreateFormDialog } from '@/components/dashboard-create-form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { Plus, Loader2, X, FileText, Mail } from 'lucide-react';
import { API_PAGE_SIZE } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';
import dayjs from 'dayjs';
import { useSearchParams } from 'next/navigation';
import {
  useCreateExamRequestMutation,
  useDownloadExamRequestPdfMutation,
  useExamRequestsQuery,
  useSendExamRequestEmailMutation,
} from '@/hooks/apiHooks/useExamRequests';
import {
  useCreateExamCatalogItemMutation,
  useExamAreasQuery,
  useExamCatalogQuery,
} from '@/hooks/apiHooks/useExamCatalog';
import { usePatientsListQuery } from '@/hooks/apiHooks/usePatients';
import { useConsultationsQuery } from '@/hooks/apiHooks/useConsultations';

function ExamRequestsContent() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const preselectedPatientId = searchParams?.get('patientId') ?? null;

  const [listPage, setListPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [examInput, setExamInput] = useState('');
  const [showExamDropdown, setShowExamDropdown] = useState(false);

  const { control, handleSubmit, reset, setValue } = useForm<ExamRequestFormValues>();

  const { data: examRequestsPage, isLoading: loading } = useExamRequestsQuery(listPage);
  const examRequests = examRequestsPage?.items ?? [];
  const listTotal = examRequestsPage?.total ?? 0;
  const listTotalPages = examRequestsPage?.totalPages ?? 1;

  const { data: patients = [] } = usePatientsListQuery();
  const { data: allConsultations = [] } = useConsultationsQuery();
  const { data: examsFromCatalog = [] } = useExamCatalogQuery();
  const { data: examAreas = [] } = useExamAreasQuery();
  const consultationsByPatient = useMemo(
    () => (selectedPatientId ? allConsultations.filter((c) => c.patient?.id === selectedPatientId) : []),
    [allConsultations, selectedPatientId],
  );

  const createExamRequest = useCreateExamRequestMutation();
  const downloadPdf = useDownloadExamRequestPdfMutation();
  const sendEmailMutation = useSendExamRequestEmailMutation();
  const createExamCatalogItem = useCreateExamCatalogItemMutation();

  useEffect(() => {
    if (preselectedPatientId && modalVisible) {
      setValue('patient_id', preselectedPatientId);
      setSelectedPatientId(preselectedPatientId);
    }
  }, [modalVisible, preselectedPatientId, setValue]);

  const handleAdd = () => {
    reset();
    setSelectedPatientId(null);
    setSelectedExams([]);
    if (preselectedPatientId) {
      setValue('patient_id', preselectedPatientId);
      setSelectedPatientId(preselectedPatientId);
    }
    setModalVisible(true);
  };

  const handlePatientChange = (patientId: string) => {
    setSelectedPatientId(patientId || null);
    setValue('consultation_id', undefined);
    setValue('request_date', undefined);
  };

  const handleDownloadPdf = async (id: string) => {
    try {
      const blob = await downloadPdf.mutateAsync(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `exames-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error(t('exams.downloadPdfError'));
    }
  };

  const onSubmit = async (values: ExamRequestFormValues) => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        toast.error(t('exams.userNotAuthenticated'));
        return;
      }
      const user = JSON.parse(userStr) as StoredUser;

      if (!values.consultation_id && !values.request_date) {
        toast.error(t('exams.selectConsultationOrDate'));
        return;
      }

      if (!selectedExams.length) {
        toast.error(t('exams.addAtLeastOneExam'));
        return;
      }

      const catalogNames = new Set(examsFromCatalog.map((e) => e.name));
      const defaultAreaId = examAreas[0]?.id;

      for (const name of selectedExams) {
        const trimmed = name.trim();
        if (trimmed && !catalogNames.has(trimmed) && defaultAreaId) {
          try {
            await createExamCatalogItem.mutateAsync({ name: trimmed, areaId: defaultAreaId });
            catalogNames.add(trimmed);
          } catch {
            console.warn('Não foi possível adicionar exame ao catálogo:', trimmed);
          }
        }
      }

      const payload: CreateExamRequestPayload = {
        veterinarian_id: user.id,
        requested_exams: selectedExams.map((n) => n.trim()),
        clinical_notes: values.clinical_notes,
      };

      if (values.consultation_id) {
        payload.consultation_id = values.consultation_id;
      } else {
        payload.patient_id = values.patient_id;
        payload.request_date = values.request_date ? dayjs(values.request_date).format('YYYY-MM-DD') : null;
      }

      await createExamRequest.mutateAsync(payload);
      setModalVisible(false);
    } catch {
      toast.error(t('exams.createRequestError'));
    }
  };

  const getPatient = (record: ExamRequest) => record.consultation?.patient ?? record.patient;

  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [selectedExamRequest, setSelectedExamRequest] = useState<ExamRequest | null>(null);

  const handleOpenEmailModal = (examRequest: ExamRequest) => {
    setSelectedExamRequest(examRequest);
    setEmailModalVisible(true);
  };

  const handleSendEmail = async () => {
    if (!selectedExamRequest) return;
    try {
      await sendEmailMutation.mutateAsync(selectedExamRequest.id);
      setEmailModalVisible(false);
    } catch {
      toast.error(t('exams.sendEmailError'));
    }
  };

  const [addExamModalVisible, setAddExamModalVisible] = useState(false);
  const [newExamName, setNewExamName] = useState('');
  const [newExamAreaId, setNewExamAreaId] = useState<string>('');

  const handleAddExamToCatalog = async () => {
    if (!newExamName.trim() || !newExamAreaId) {
      toast.warning(t('exams.fillNameAndArea'));
      return;
    }
    try {
      await createExamCatalogItem.mutateAsync({ name: newExamName.trim(), areaId: Number(newExamAreaId) });
      setAddExamModalVisible(false);
      setNewExamName('');
      setNewExamAreaId('');
    } catch {
      toast.error(t('exams.addExamError'));
    }
  };

  const examOptions = examsFromCatalog.map((e) => ({
    value: e.name,
    label: e.area?.name ? `${e.area.name}: ${e.name}` : e.name,
  }));

  const filteredExamOptions = examOptions.filter(
    (o) => o.label.toLowerCase().includes(examInput.toLowerCase()) && !selectedExams.includes(o.value),
  );

  const addExamTag = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !selectedExams.includes(trimmed)) {
      setSelectedExams([...selectedExams, trimmed]);
    }
    setExamInput('');
    setShowExamDropdown(false);
  };

  const removeExamTag = (name: string) => {
    setSelectedExams(selectedExams.filter((e) => e !== name));
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <h1 className="text-2xl font-extrabold font-['interDoFigma'] flex items-center gap-2">
          {t('exams.pageTitle')}
        </h1>
        <Button onClick={handleAdd} className="w-full bg-primary hover:bg-primary/70 text-white sm:w-auto">
          <Plus className="w-4 h-4 mr-1" /> {t('exams.newRequest')}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin w-6 h-6" />
        </div>
      ) : examRequests.length === 0 ? (
        <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
          {t('exams.emptyState')}
        </div>
      ) : (
        <div>
          {/* Desktop / tablet: tabela */}
          <div className="hidden overflow-x-auto rounded-lg border border-gray-300 md:block">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>{t('exams.columnDate')}</TableHead>
                  <TableHead>{t('exams.columnPatient')}</TableHead>
                  <TableHead>{t('exams.columnTutor')}</TableHead>
                  <TableHead>{t('exams.columnVeterinarian')}</TableHead>
                  <TableHead>{t('exams.columnExams')}</TableHead>
                  <TableHead>{t('exams.columnActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examRequests.map((record) => (
                  <TableRow className="cursor-pointer hover:bg-muted/50 border-b border-gray-300 h-15" key={record.id}>
                    <TableCell>{new Date(record.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{getPatient(record)?.name ?? '—'}</TableCell>
                    <TableCell>{getPatient(record)?.tutor?.name ?? '—'}</TableCell>
                    <TableCell>{record.veterinarian?.name ?? '—'}</TableCell>
                    <TableCell>
                      {record.requested_exams?.length
                        ? record.requested_exams
                            .map((name) => {
                              const catalog = examsFromCatalog.find((e) => e.name === name);
                              return catalog?.area?.name ? `${catalog.area.name} - ${name}` : name;
                            })
                            .join(', ')
                        : '—'}
                    </TableCell>
                    <TableCell className="w-24">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="p-0"
                          title={t('exams.downloadPdfTooltip')}
                          aria-label={t('exams.downloadPdfTooltip')}
                          onClick={() => handleDownloadPdf(record.id)}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="p-0"
                          title={t('exams.sendEmailTooltip')}
                          aria-label={t('exams.sendEmailTooltip')}
                          onClick={() => handleOpenEmailModal(record)}
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {examRequests.map((record) => (
              <div key={record.id} className="rounded-lg border border-gray-300 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{getPatient(record)?.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(record.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('exams.columnTutor')}</p>
                    <p className="truncate">{getPatient(record)?.tutor?.name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('exams.columnVeterinarian')}</p>
                    <p className="truncate">{record.veterinarian?.name ?? '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">{t('exams.columnExams')}</p>
                    <p className="truncate">
                      {record.requested_exams?.length
                        ? record.requested_exams
                            .map((name) => {
                              const catalog = examsFromCatalog.find((e) => e.name === name);
                              return catalog?.area?.name ? `${catalog.area.name} - ${name}` : name;
                            })
                            .join(', ')
                        : '—'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-200 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="p-0"
                    title={t('exams.downloadPdfTooltip')}
                    aria-label={t('exams.downloadPdfTooltip')}
                    onClick={() => handleDownloadPdf(record.id)}
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="p-0"
                    title={t('exams.sendEmailTooltip')}
                    aria-label={t('exams.sendEmailTooltip')}
                    onClick={() => handleOpenEmailModal(record)}
                  >
                    <Mail className="w-4 h-4" />
                  </Button>
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

      <DashboardCreateFormDialog
        open={modalVisible}
        onOpenChange={setModalVisible}
        title={t('exams.newRequestModalTitle')}
        containerClassName="max-h-[96dvh] md:max-h-[90dvh]"
        bodyClassName="px-6 py-5"
        preventOutsideClose
        preventEscapeClose
        footer={
          <div className="flex flex-row justify-end gap-3">
            <Button type="button" variant="outline" className="h-10" onClick={() => setModalVisible(false)}>
              {t('exams.cancel')}
            </Button>
            <Button className="h-10 bg-primary hover:bg-blue-700 text-white" onClick={handleSubmit(onSubmit)}>
              {t('exams.generateRequest')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 md:space-y-6">
          {/* Paciente */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('exams.patientLabel')}</Label>
            <Controller
              control={control}
              name="patient_id"
              rules={{ required: true }}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    handlePatientChange(v);
                  }}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder={t('exams.selectPatientPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.species}){p.tutor?.name ? ` — ${p.tutor.name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Consulta + Data */}
          {selectedPatientId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('exams.consultationLabel')}</Label>
                <Controller
                  control={control}
                  name="consultation_id"
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || undefined)}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={t('exams.noConsultationLinked')} />
                      </SelectTrigger>
                      <SelectContent>
                        {consultationsByPatient.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {new Date(c.consultation_date).toLocaleDateString('pt-BR')} —{' '}
                            {t('exams.doctorPrefix', { name: c.veterinarian?.name ?? '' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('exams.dateWithoutConsultationLabel')}</Label>
                <Controller
                  control={control}
                  name="request_date"
                  render={({ field }) => <Input type="date" className="h-10" {...field} />}
                />
              </div>
            </div>
          )}

          {/* Exames */}
          <div className="space-y-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <Label className="text-sm font-medium">{t('exams.examsLabel')}</Label>
              <span className="text-xs text-muted-foreground">
                {t('exams.examsHint')}
              </span>
            </div>

            {/* Tags selecionadas */}
            {selectedExams.length > 0 && (
              <div className="border rounded-lg p-3 flex flex-wrap gap-2 bg-muted/30">
                {selectedExams.map((exam) => (
                  <Badge key={exam} variant="secondary" className="flex items-center gap-1.5 py-1 px-2 text-sm">
                    {exam}
                    <button type="button" onClick={() => removeExamTag(exam)} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Input de busca / texto livre */}
            <div className="relative">
              <Input
                placeholder={t('exams.searchExamPlaceholder')}
                className="h-10"
                value={examInput}
                onChange={(e) => {
                  setExamInput(e.target.value);
                  setShowExamDropdown(true);
                }}
                onFocus={() => setShowExamDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (examInput.trim()) addExamTag(examInput);
                  }
                  if (e.key === 'Escape') setShowExamDropdown(false);
                }}
              />
              {showExamDropdown && (filteredExamOptions.length > 0 || examInput.trim()) && (
                <div className="absolute z-20 top-full left-0 right-0 bg-white border rounded-lg shadow-lg max-h-52 overflow-y-auto mt-1">
                  {/* Lista do catálogo */}
                  {filteredExamOptions.slice(0, 12).map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted border-b last:border-0"
                      onClick={() => addExamTag(o.value)}
                    >
                      {o.label}
                    </button>
                  ))}
                  {/* Adicionar texto livre */}
                  {examInput.trim() && !examsFromCatalog.find((e) => e.name === examInput.trim()) && (
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-sm bg-primary/5 hover:bg-primary/10 text-primary font-medium border-t"
                      onClick={() => addExamTag(examInput)}
                    >
                      {t('exams.useFreeTextExam', { name: examInput.trim() })}
                    </button>
                  )}
                  {/* Cadastrar no catálogo */}
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-xs text-muted-foreground hover:bg-muted border-t"
                    onClick={() => {
                      setShowExamDropdown(false);
                      setAddExamModalVisible(true);
                    }}
                  >
                    {t('exams.registerNewExamInCatalog')}
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('exams.freeTextExamHint')}
            </p>
          </div>

          {/* Suspeita / Notas */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('exams.clinicalNotesLabel')}</Label>
            <Controller
              control={control}
              name="clinical_notes"
              render={({ field }) => (
                <Textarea
                  rows={4}
                  placeholder={t('exams.clinicalNotesPlaceholder')}
                  className="resize-none"
                  {...field}
                />
              )}
            />
          </div>
        </div>
      </DashboardCreateFormDialog>

      <DashboardCreateFormDialog
        open={addExamModalVisible}
        onOpenChange={setAddExamModalVisible}
        title={t('exams.addExamToCatalogModalTitle')}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setAddExamModalVisible(false)}>
              {t('exams.cancel')}
            </Button>
            <Button className="bg-primary hover:bg-blue-700 text-white" onClick={handleAddExamToCatalog}>
              {t('exams.add')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 md:space-y-6">
          <div className="space-y-2">
            <Label>{t('exams.examNameLabel')}</Label>
            <Input
              placeholder={t('exams.examNamePlaceholder')}
              value={newExamName}
              onChange={(e) => setNewExamName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('exams.areaLabel')}</Label>
            <Select value={newExamAreaId} onValueChange={setNewExamAreaId}>
              <SelectTrigger>
                <SelectValue placeholder={t('exams.selectAreaPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {examAreas.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </DashboardCreateFormDialog>

      <Dialog open={emailModalVisible} onOpenChange={setEmailModalVisible}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('exams.confirmSendEmailTitle')}</DialogTitle>
          </DialogHeader>
          <p>
            {t('exams.confirmSendEmailQuestion')}{' '}
            <strong>{selectedExamRequest && getPatient(selectedExamRequest)?.name}</strong>?
          </p>
          <p className="text-muted-foreground text-sm mt-2">
            {t('exams.confirmSendEmailHint')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailModalVisible(false)}>
              {t('exams.cancel')}
            </Button>
            <Button className="bg-primary hover:bg-blue-700 text-white" onClick={handleSendEmail}>
              {t('exams.send')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ExamRequestsPage() {
  const { t } = useTranslation();
  return (
    <Suspense fallback={<div className="p-6">{t('exams.loading')}</div>}>
      <ExamRequestsContent />
    </Suspense>
  );
}
