'use client';

import React, { Suspense, useEffect, useState } from 'react';
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
import { Plus, FlaskConical, Loader2, X } from 'lucide-react';
import api from '@/lib/axios';
import dayjs from 'dayjs';
import { useSearchParams } from 'next/navigation';

interface ExamRequest {
  id: string;
  createdAt: string;
  consultation?: { patient?: { name: string; id: string; tutor?: { name: string } } };
  patient?: { name: string; id: string; tutor?: { name: string } };
  veterinarian: { name: string };
  requested_exams: string[];
}

interface ExamOption {
  id: number;
  name: string;
  area?: { name: string };
}

interface ExamAreaOption {
  id: number;
  name: string;
}

type FormValues = {
  patient_id: string;
  consultation_id?: string;
  request_date?: string;
  clinical_notes?: string;
};

function ExamRequestsContent() {
  const searchParams = useSearchParams();
  const preselectedPatientId = searchParams.get('patientId');

  const [examRequests, setExamRequests] = useState<ExamRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [consultationsByPatient, setConsultationsByPatient] = useState<any[]>([]);
  const [examsFromCatalog, setExamsFromCatalog] = useState<ExamOption[]>([]);
  const [examAreas, setExamAreas] = useState<ExamAreaOption[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [examInput, setExamInput] = useState('');
  const [showExamDropdown, setShowExamDropdown] = useState(false);

  const { control, handleSubmit, reset, setValue } = useForm<FormValues>();

  const fetchExamRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/exam-requests');
      setExamRequests(response.data);
    } catch {
      toast.error('Erro ao carregar solicitações de exames');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await api.get('/patients');
      setPatients(response.data ?? []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchExamsAndAreas = async () => {
    try {
      const [examsRes, areasRes] = await Promise.all([
        api.get<ExamOption[]>('/catalog/exams'),
        api.get<ExamAreaOption[]>('/catalog/exam-areas'),
      ]);
      setExamsFromCatalog(examsRes.data ?? []);
      setExamAreas(areasRes.data ?? []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchConsultationsForPatient = async (patientId: string) => {
    try {
      const response = await api.get('/consultations');
      const all = (response.data ?? []).filter(
        (c: any) => c.patient_id === patientId || c.patient?.id === patientId,
      );
      setConsultationsByPatient(all);
    } catch {
      setConsultationsByPatient([]);
    }
  };

  useEffect(() => {
    fetchExamRequests();
    fetchPatients();
    fetchExamsAndAreas();
  }, []);

  useEffect(() => {
    if (preselectedPatientId && modalVisible) {
      setValue('patient_id', preselectedPatientId);
      setSelectedPatientId(preselectedPatientId);
      fetchConsultationsForPatient(preselectedPatientId);
    }
  }, [preselectedPatientId, modalVisible]);

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
      const response = await api.get(`/exam-requests/${id}/pdf`, { responseType: 'blob' });
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

  const onSubmit = async (values: FormValues) => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        toast.error('Usuário não autenticado');
        return;
      }
      const user = JSON.parse(userStr);

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
            await api.post('/catalog/exams', { name: trimmed, area_id: defaultAreaId });
            catalogNames.add(trimmed);
          } catch {
            console.warn('Não foi possível adicionar exame ao catálogo:', trimmed);
          }
        }
      }

      const payload: any = {
        veterinarian_id: user.id,
        requested_exams: selectedExams.map((n) => n.trim()),
        clinical_notes: values.clinical_notes,
      };

      if (values.consultation_id) {
        payload.consultation_id = values.consultation_id;
      } else {
        payload.patient_id = values.patient_id;
        payload.request_date = values.request_date
          ? dayjs(values.request_date).format('YYYY-MM-DD')
          : null;
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
    (o) =>
      o.label.toLowerCase().includes(examInput.toLowerCase()) &&
      !selectedExams.includes(o.value),
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
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-heading font-bold text-primary flex items-center gap-2">
          <FlaskConical className="w-6 h-6" /> Solicitações de Exames
        </h1>
        <Button onClick={handleAdd} className="bg-primary hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-1" /> Nova Solicitação
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin w-6 h-6" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
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
              <TableRow key={record.id}>
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
      )}

      <Dialog open={modalVisible} onOpenChange={setModalVisible}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Solicitação de Exames</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Paciente *</Label>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.species}) - {p.tutor?.name ?? ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {selectedPatientId && (
              <>
                <div>
                  <Label>Consulta (opcional)</Label>
                  <p className="text-xs text-muted-foreground mb-1">
                    Se não houver consulta, preencha a data abaixo
                  </p>
                  <Controller
                    control={control}
                    name="consultation_id"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ''}
                        onValueChange={(v) => field.onChange(v || undefined)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a consulta ou deixe em branco" />
                        </SelectTrigger>
                        <SelectContent>
                          {consultationsByPatient.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {new Date(c.consultation_date).toLocaleDateString('pt-BR')} - Dr.{' '}
                              {c.veterinarian?.name ?? ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label>Data da solicitação (quando não houver consulta)</Label>
                  <Controller
                    control={control}
                    name="request_date"
                    render={({ field }) => <Input type="date" {...field} />}
                  />
                </div>
              </>
            )}

            <div>
              <Label>Exames *</Label>
              <div className="border rounded p-2 min-h-[40px] flex flex-wrap gap-1 mb-1">
                {selectedExams.map((exam) => (
                  <Badge key={exam} variant="secondary" className="flex items-center gap-1">
                    {exam}
                    <button type="button" onClick={() => removeExamTag(exam)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="relative">
                <Input
                  placeholder="Selecione da lista ou digite um novo exame"
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
                {showExamDropdown &&
                  (filteredExamOptions.length > 0 || examInput.trim()) && (
                    <div className="absolute z-10 top-full left-0 right-0 bg-white border rounded shadow-md max-h-48 overflow-y-auto">
                      {filteredExamOptions.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                          onClick={() => addExamTag(o.value)}
                        >
                          {o.label}
                        </button>
                      ))}
                      {examInput.trim() &&
                        !examsFromCatalog.find((e) => e.name === examInput.trim()) && (
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 text-primary"
                            onClick={() => addExamTag(examInput)}
                          >
                            + Adicionar &quot;{examInput.trim()}&quot;
                          </button>
                        )}
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 text-primary border-t"
                        onClick={() => {
                          setShowExamDropdown(false);
                          setAddExamModalVisible(true);
                        }}
                      >
                        + Cadastrar novo exame (escolher área)
                      </button>
                    </div>
                  )}
              </div>
            </div>

            <div>
              <Label>Suspeita Clínica / Observações</Label>
              <Controller
                control={control}
                name="clinical_notes"
                render={({ field }) => <Textarea rows={4} {...field} />}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalVisible(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-blue-700 text-white">
                Gerar solicitação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addExamModalVisible} onOpenChange={setAddExamModalVisible}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar exame ao catálogo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome do exame *</Label>
              <Input
                placeholder="Ex: Hemograma completo"
                value={newExamName}
                onChange={(e) => setNewExamName(e.target.value)}
              />
            </div>
            <div>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddExamModalVisible(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-primary hover:bg-blue-700 text-white"
              onClick={handleAddExamToCatalog}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
