'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import type {
  ConsultationOption,
  CreateExamRequestPayload,
  ExamAreaOption,
  ExamOption,
  ExamPatientOption,
  ExamRequest,
  ExamRequestFormValues,
  StoredUser,
} from '@/app/types/exam-request';
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
import { Plus, Loader2, X } from 'lucide-react';
import api from '@/lib/axios';
import { API_PAGE_SIZE, fetchAllListPages, listQueryParams, parseListResponse } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';
import dayjs from 'dayjs';
import { useSearchParams } from 'next/navigation';

function ExamRequestsContent() {
  const searchParams = useSearchParams();
  const preselectedPatientId = searchParams?.get('patientId') ?? null;

  const [examRequests, setExamRequests] = useState<ExamRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [listTotal, setListTotal] = useState(0);
  const [listTotalPages, setListTotalPages] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [patients, setPatients] = useState<ExamPatientOption[]>([]);
  const [consultationsByPatient, setConsultationsByPatient] = useState<ConsultationOption[]>([]);
  const [examsFromCatalog, setExamsFromCatalog] = useState<ExamOption[]>([]);
  const [examAreas, setExamAreas] = useState<ExamAreaOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [examInput, setExamInput] = useState('');
  const [showExamDropdown, setShowExamDropdown] = useState(false);

  const { control, handleSubmit, reset, setValue } = useForm<ExamRequestFormValues>();

  const fetchExamRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/exam-requests', {
        params: listQueryParams(listPage),
      });
      const p = parseListResponse<ExamRequest>(response.data, listPage);
      setExamRequests(p.items);
      setListTotal(p.total);
      setListTotalPages(p.totalPages);
    } catch {
      toast.error('Erro ao carregar solicitações de exames');
    } finally {
      setLoading(false);
    }
  }, [listPage]);

  const fetchPatients = async () => {
    try {
      setPatients(await fetchAllListPages<ExamPatientOption>('/patients'));
    } catch (error) {
      console.error(error);
    }
  };

  const fetchExamsAndAreas = async () => {
    try {
      const [exams, areas] = await Promise.all([
        fetchAllListPages<ExamOption>('/catalog/exams'),
        fetchAllListPages<ExamAreaOption>('/catalog/exam-areas'),
      ]);
      setExamsFromCatalog(exams);
      setExamAreas(areas);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchConsultationsForPatient = async (patientId: string) => {
    try {
      const raw = await fetchAllListPages<ConsultationOption>('/consultations');
      const all = (raw ?? []).filter(
        (consultation) => consultation.patient_id === patientId || consultation.patient?.id === patientId,
      );
      setConsultationsByPatient(all);
    } catch {
      setConsultationsByPatient([]);
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchExamsAndAreas();
  }, []);

  useEffect(() => {
    void fetchExamRequests();
  }, [fetchExamRequests]);

  useEffect(() => {
    if (preselectedPatientId && modalVisible) {
      setValue('patient_id', preselectedPatientId);
      setSelectedPatientId(preselectedPatientId);
      fetchConsultationsForPatient(preselectedPatientId);
    }
  }, [modalVisible, preselectedPatientId, setValue]);

  const handleAdd = () => {
    reset();
    setSelectedPatientId(null);
    setSelectedExams([]);
    setConsultationsByPatient([]);
    if (preselectedPatientId) {
      setValue('patient_id', preselectedPatientId);
      setSelectedPatientId(preselectedPatientId);
      fetchConsultationsForPatient(preselectedPatientId);
    }
    setModalVisible(true);
  };

  const handlePatientChange = (patientId: string) => {
    setSelectedPatientId(patientId || null);
    setValue('consultation_id', undefined);
    setValue('request_date', undefined);
    if (patientId) fetchConsultationsForPatient(patientId);
    else setConsultationsByPatient([]);
  };

  const handleDownloadPdf = async (id: string) => {
    try {
      const response = await api.get(`/exam-requests/${id}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `exames-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error('Erro ao baixar PDF');
    }
  };

  const onSubmit = async (values: ExamRequestFormValues) => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        toast.error('Usuário não autenticado');
        return;
      }
      const user = JSON.parse(userStr) as StoredUser;

      if (!values.consultation_id && !values.request_date) {
        toast.error('Selecione uma consulta ou informe a data da solicitação');
        return;
      }

      if (!selectedExams.length) {
        toast.error('Adicione ao menos um exame');
        return;
      }

      const catalogNames = new Set(examsFromCatalog.map((e) => e.name));
      const defaultAreaId = examAreas[0]?.id;

      for (const name of selectedExams) {
        const trimmed = name.trim();
        if (trimmed && !catalogNames.has(trimmed) && defaultAreaId) {
          try {
            await api.post('/catalog/exams', {
              name: trimmed,
              area_id: defaultAreaId,
            });
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

      await api.post('/exam-requests', payload);
      toast.success('Solicitação gerada com sucesso');
      setModalVisible(false);
      fetchExamRequests();
      fetchExamsAndAreas();
    } catch {
      toast.error('Erro ao gerar solicitação');
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
      await api.post(`/exam-requests/${selectedExamRequest.id}/email`);
      toast.success('Email enviado com sucesso');
      setEmailModalVisible(false);
    } catch {
      toast.error('Erro ao enviar email');
    }
  };

  const [addExamModalVisible, setAddExamModalVisible] = useState(false);
  const [newExamName, setNewExamName] = useState('');
  const [newExamAreaId, setNewExamAreaId] = useState<string>('');

  const handleAddExamToCatalog = async () => {
    if (!newExamName.trim() || !newExamAreaId) {
      toast.warning('Preencha o nome e a área do exame');
      return;
    }
    try {
      await api.post('/catalog/exams', {
        name: newExamName.trim(),
        area_id: Number(newExamAreaId),
      });
      toast.success('Exame adicionado ao catálogo da clínica');
      setAddExamModalVisible(false);
      setNewExamName('');
      setNewExamAreaId('');
      fetchExamsAndAreas();
    } catch {
      toast.error('Erro ao adicionar exame');
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-extrabold font-['interDoFigma'] flex items-center gap-2">
          Solicitações de Exames
        </h1>
        <Button onClick={handleAdd} className="bg-primary hover:bg-primary/70 text-white">
          <Plus className="w-4 h-4 mr-1" /> Nova Solicitação
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin w-6 h-6" />
        </div>
      ) : (
        <div>
          <div className="border border-gray-300 rounded-md">
            <Table>
              <TableHeader className="h-15">
                <TableRow className="border-b border-gray-300">
                  <TableHead>Data</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Tutor</TableHead>
                  <TableHead>Veterinário</TableHead>
                  <TableHead>Exames</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examRequests.map((record) => (
                  <TableRow className="cursor-pointer hover:bg-muted/50 h-15 border-b border-gray-300" key={record.id}>
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
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 border-red-500 hover:bg-red-50"
                          onClick={() => handleDownloadPdf(record.id)}
                        >
                          PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-primary border-blue-500 hover:bg-primary/10"
                          onClick={() => handleOpenEmailModal(record)}
                        >
                          Email
                        </Button>
                      </div>
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

      <DashboardCreateFormDialog
        open={modalVisible}
        onOpenChange={setModalVisible}
        title="Nova Solicitação de Exames"
        containerClassName="mx-auto max-w-2xl h-[96dvh] sm:h-[90dvh]"
        bodyClassName="px-6 py-5"
        preventOutsideClose
        preventEscapeClose
        footer={
          <div className="flex flex-row justify-end gap-3">
            <Button type="button" variant="outline" className="h-10" onClick={() => setModalVisible(false)}>
              Cancelar
            </Button>
            <Button className="h-10 bg-primary hover:bg-blue-700 text-white" onClick={handleSubmit(onSubmit)}>
              Gerar solicitação
            </Button>
          </div>
        }
      >
        <div className="space-y-4 md:space-y-6">
          {/* Paciente */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Paciente *</Label>
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
                    <SelectValue placeholder="Selecione o paciente" />
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
                <Label className="text-sm font-medium">Consulta (opcional)</Label>
                <Controller
                  control={control}
                  name="consultation_id"
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || undefined)}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Sem consulta vinculada" />
                      </SelectTrigger>
                      <SelectContent>
                        {consultationsByPatient.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {new Date(c.consultation_date).toLocaleDateString('pt-BR')} — Dr.{' '}
                            {c.veterinarian?.name ?? ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Data (sem consulta)</Label>
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
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Exames *</Label>
              <span className="text-xs text-muted-foreground">
                Selecione da lista, digite para filtrar ou adicione texto livre (Enter)
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
                placeholder="Buscar exame ou digitar nome livre (Enter para adicionar)"
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
                      + Usar &quot;{examInput.trim()}&quot; (texto livre)
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
                    Cadastrar novo exame no catálogo da clínica...
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Você pode adicionar exames não cadastrados digitando o nome e pressionando Enter.
            </p>
          </div>

          {/* Suspeita / Notas */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Suspeita clínica / Observações</Label>
            <Controller
              control={control}
              name="clinical_notes"
              render={({ field }) => (
                <Textarea
                  rows={4}
                  placeholder="Descreva a suspeita clínica, informações relevantes ou outras orientações..."
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
        title="Adicionar exame ao catálogo"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setAddExamModalVisible(false)}>
              Cancelar
            </Button>
            <Button className="bg-primary hover:bg-blue-700 text-white" onClick={handleAddExamToCatalog}>
              Adicionar
            </Button>
          </div>
        }
      >
        <div className="space-y-4 md:space-y-6">
          <div className="space-y-2">
            <Label>Nome do exame *</Label>
            <Input
              placeholder="Ex: Hemograma completo"
              value={newExamName}
              onChange={(e) => setNewExamName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Área *</Label>
            <Select value={newExamAreaId} onValueChange={setNewExamAreaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a área" />
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
            <DialogTitle>Confirmar Envio de Email</DialogTitle>
          </DialogHeader>
          <p>
            Enviar solicitação de exames por email para o tutor de{' '}
            <strong>{selectedExamRequest && getPatient(selectedExamRequest)?.name}</strong>?
          </p>
          <p className="text-muted-foreground text-sm mt-2">
            O email será enviado para o endereço cadastrado no perfil do tutor.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailModalVisible(false)}>
              Cancelar
            </Button>
            <Button className="bg-primary hover:bg-blue-700 text-white" onClick={handleSendEmail}>
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ExamRequestsPage() {
  return (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <ExamRequestsContent />
    </Suspense>
  );
}
