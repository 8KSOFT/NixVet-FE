'use client';

import React, { useEffect, useState } from 'react';
import type { StoredUser } from '@/app/types/exam-request';
import { Button } from '@/components/ui/button';
import { DashboardCreateFormDialog } from '@/components/dashboard-create-form-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { Plus, BookOpen, Loader2, X, Info, Search, FileText, Mail, FlaskConical } from 'lucide-react';
import api from '@/lib/axios';
import { API_PAGE_SIZE, fetchAllListPages, listQueryParams, parseListResponse } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';

const FORM_ADMIN_OPTIONS = [
  { value: 'oral', label: 'Oral' },
  { value: 'topica', label: 'Tópica' },
  { value: 'colirio', label: 'Colírio' },
  { value: 'spray', label: 'Spray' },
  { value: 'injetavel', label: 'Injetável' },
  { value: 'outro', label: 'Outro' },
];
const USE_TYPE_OPTIONS = [
  { value: 'veterinario', label: 'Uso veterinário' },
  { value: 'humano', label: 'Uso humano' },
];
const FREQUENCY_UNIT_OPTIONS = [
  { value: 'minutos', label: 'minutos' },
  { value: 'horas', label: 'horas' },
  { value: 'dias', label: 'dias' },
];
const DURATION_UNIT_OPTIONS = [
  { value: 'dias', label: 'dias' },
  { value: 'semanas', label: 'semanas' },
  { value: 'meses', label: 'meses' },
];

const COMMON_VACCINES = [
  {
    group: 'Caninos',
    items: ['V8', 'V10', 'Antirrábica', 'Gripe Canina (Bordetella)', 'Giardíase', 'Leishmaniose (Leishmania)'],
  },
  {
    group: 'Felinos',
    items: ['Tríplice Felina (HVC, HCC, Panleucopenia)', 'Quádrupla Felina', 'Antirrábica (felino)', 'FIV/FeLV'],
  },
  {
    group: 'Equinos',
    items: ['Tétano', 'Influenza Equina', 'Herpesvírus Equino'],
  },
  { group: 'Outros', items: ['Raiva (Outros)', 'Leptospirose'] },
];

interface Prescription {
  id: string;
  createdAt: string;
  consultation?: {
    patient?: { id: string; name: string; tutor?: { name: string } };
  };
  patient?: { id: string; name: string; tutor?: { name: string } };
  patient_id?: string;
  veterinarian: { name: string };
  prescription_type?: string;
}

interface BularioItem {
  id: string;
  title: string;
  subtitle?: string | null;
  details?: Array<{
    title: string;
    data: Array<{ title: string | null; data: string }>;
  }> | null;
  link_details?: string | null;
}

interface PatientOption {
  id: string;
  name: string;
  species: string;
  tutor?: { name: string };
}

interface ConsultationOption {
  id: string;
  consultation_date: string;
  patient?: { name: string };
  veterinarian?: { name: string };
}

interface SurgicalProcedureOption {
  id: number;
  name: string;
}

type MedicationField = {
  name: string;
  bulario_item_id?: string;
  via?: string;
  concentration?: string;
  use_type?: string;
  form_of_administration?: string;
  dosage?: string;
  frequency_value?: string;
  frequency_unit?: string;
  duration_value?: string;
  duration_unit?: string;
  usage_description?: string;
  observations?: string;
};

type FormValues = {
  patient_id: string;
  consultation_id?: string;
  prescription_date?: string;
  prescription_type: string;
  medications: MedicationField[];
  observations?: string;
};

type CreatePrescriptionPayload = {
  veterinarian_id: string;
  prescription_type: string;
  observations?: string;
  consultation_id?: string;
  patient_id?: string;
  prescription_date?: string | null;
  medications?: Array<Record<string, unknown>>;
  surgical_procedure_ids?: number[];
};

export default function PrescriptionsPage() {
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [listTotal, setListTotal] = useState(0);
  const [listTotalPages, setListTotalPages] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [consultationsByPatient, setConsultationsByPatient] = useState<ConsultationOption[]>([]);
  const [surgicalProcedures, setSurgicalProcedures] = useState<SurgicalProcedureOption[]>([]);
  const [selectedProcedureIds, setSelectedProcedureIds] = useState<number[]>([]);
  const [procedureSearch, setProcedureSearch] = useState('');

  const [bularioOptions, setBularioOptions] = useState<BularioItem[]>([]);
  const [searchingBulario, setSearchingBulario] = useState(false);
  const [activeMedIndex, setActiveMedIndex] = useState<number | null>(null);
  const [medInputValues, setMedInputValues] = useState<Record<number, string>>({});

  const [prescriptionType, setPrescriptionType] = useState<'receita' | 'solicitacao_cirurgia' | 'vacinas'>('receita');
  const [vaccineInput, setVaccineInput] = useState('');
  const [selectedVaccines, setSelectedVaccines] = useState<string[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const { control, register, handleSubmit, reset, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      prescription_type: 'receita',
      medications: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'medications',
  });

  const watchPatientId = watch('patient_id');

  const searchBulario = async (value: string) => {
    if (!value || value.length < 2) {
      setBularioOptions([]);
      return;
    }
    setSearchingBulario(true);
    try {
      const response = await api.get('/bulario', {
        params: { q: value, ...listQueryParams(1, 20) },
      });
      const p = parseListResponse<BularioItem>(response.data, 1, 20);
      setBularioOptions(p.items);
    } catch {
      toast.error('Erro ao buscar no bulário');
    } finally {
      setSearchingBulario(false);
    }
  };

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/prescriptions', {
        params: listQueryParams(listPage),
      });
      const p = parseListResponse<Prescription>(response.data, listPage);
      setPrescriptions(p.items);
      setListTotal(p.total);
      setListTotalPages(p.totalPages);
    } catch {
      toast.error('Erro ao carregar prescrições');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const all = await fetchAllListPages<PatientOption>('/patients');
      setPatients(all);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchConsultationsForPatient = async (patientId: string) => {
    try {
      const raw = await fetchAllListPages<ConsultationOption & { patient_id?: string }>('/consultations');
      const all = raw.filter(
        (c) => c.patient_id === patientId || (c as { patient?: { id?: string } }).patient?.id === patientId,
      );
      setConsultationsByPatient(all);
    } catch {
      setConsultationsByPatient([]);
    }
  };

  const fetchSurgicalProcedures = async () => {
    try {
      const all = await fetchAllListPages<SurgicalProcedureOption>('/catalog/surgical-procedures');
      setSurgicalProcedures(all);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchSurgicalProcedures();
  }, []);

  useEffect(() => {
    fetchPrescriptions();
  }, [listPage]);

  const handleAdd = () => {
    reset({ prescription_type: 'receita', medications: [] });
    setPrescriptionType('receita');
    setSelectedPatientId(null);
    setSelectedProcedureIds([]);
    setProcedureSearch('');
    setConsultationsByPatient([]);
    setMedInputValues({});
    setBularioOptions([]);
    setSelectedVaccines([]);
    setVaccineInput('');
    setModalVisible(true);
  };

  const handlePatientChange = (patientId: string) => {
    setSelectedPatientId(patientId || null);
    setValue('consultation_id', undefined);
    setValue('prescription_date', undefined);
    if (patientId) fetchConsultationsForPatient(patientId);
    else setConsultationsByPatient([]);
  };

  const handleDownloadPdf = async (id: string) => {
    try {
      const response = await api.get(`/prescriptions/${id}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `prescricao-${id}.pdf`);
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
      const user = JSON.parse(userStr) as StoredUser;

      if (!values.consultation_id && !values.prescription_date) {
        toast.error('Selecione uma consulta ou informe a data da prescrição');
        return;
      }

      const payload: CreatePrescriptionPayload = {
        veterinarian_id: user.id,
        prescription_type: prescriptionType,
        observations: values.observations,
      };

      if (values.consultation_id) {
        payload.consultation_id = values.consultation_id;
      } else {
        payload.patient_id = values.patient_id;
        payload.prescription_date = values.prescription_date
          ? dayjs(values.prescription_date).format('YYYY-MM-DD')
          : null;
      }

      if (prescriptionType === 'receita') {
        payload.medications = (values.medications ?? []).map((m) => ({
          name: m.name,
          ...(m.bulario_item_id ? { bulario_item_id: m.bulario_item_id } : {}),
          via: m.via || undefined,
          concentration: m.concentration || undefined,
          use_type: m.use_type || undefined,
          form_of_administration: m.form_of_administration || undefined,
          dosage: m.dosage || undefined,
          frequency_value: m.frequency_value ? Number(m.frequency_value) : undefined,
          frequency_unit: m.frequency_unit || undefined,
          duration_value: m.duration_value ? Number(m.duration_value) : undefined,
          duration_unit: m.duration_unit || undefined,
          usage_description: m.usage_description || undefined,
          observations: m.observations || undefined,
        }));
      } else if (prescriptionType === 'vacinas') {
        if (!selectedVaccines.length) {
          toast.error('Selecione ao menos uma vacina');
          return;
        }
        payload.medications = selectedVaccines.map((name) => ({
          name,
          via: 'Subcutânea',
        }));
      } else {
        payload.medications = [];
        if (selectedProcedureIds.length) {
          payload.surgical_procedure_ids = selectedProcedureIds;
        }
      }

      await api.post('/prescriptions', payload);
      toast.success('Prescrição gerada com sucesso');
      setModalVisible(false);
      fetchPrescriptions();
    } catch {
      toast.error('Erro ao gerar prescrição');
    }
  };

  const getPatient = (record: Prescription) => record.consultation?.patient ?? record.patient;
  const getTutorName = (record: Prescription) => getPatient(record)?.tutor?.name ?? '—';

  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [bularioDetailVisible, setBularioDetailVisible] = useState(false);
  const [bularioDetail, setBularioDetail] = useState<BularioItem | null>(null);
  const [bularioDetailLoading, setBularioDetailLoading] = useState(false);

  const openBularioDetail = async (id: string) => {
    setBularioDetailVisible(true);
    setBularioDetailLoading(true);
    setBularioDetail(null);
    try {
      const response = await api.get<BularioItem>(`/bulario/${id}`);
      setBularioDetail(response.data);
    } catch {
      toast.error('Erro ao carregar detalhes do medicamento');
    } finally {
      setBularioDetailLoading(false);
    }
  };

  const handleOpenEmailModal = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setEmailModalVisible(true);
  };

  const handleSendEmail = async () => {
    if (!selectedPrescription) return;
    try {
      await api.post(`/prescriptions/${selectedPrescription.id}/email`);
      toast.success('Email enviado com sucesso');
      setEmailModalVisible(false);
    } catch {
      toast.error('Erro ao enviar email');
    }
  };

  const handleSolicitarExame = (record: Prescription) => {
    const patientId = record.consultation?.patient?.id ?? record.patient?.id ?? record.patient_id;
    if (patientId) router.push(`/dashboard/exams?patientId=${patientId}`);
    else router.push('/dashboard/exams');
  };

  const toggleProcedure = (id: number) => {
    setSelectedProcedureIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-8">
        <h1 className="text-2xl font-extrabold font-['InterDoFigma'] flex items-center gap-2">Prescrição</h1>
        <Button onClick={handleAdd} className="bg-primary hover:bg-primary/70 text-white">
          <Plus className="w-4 h-4 mr-1" /> Nova Prescrição
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
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.map((record) => (
                  <TableRow className="cursor-pointer hover:bg-muted/50 h-15 border-b border-gray-300" key={record.id}>
                    <TableCell>{new Date(record.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{getPatient(record)?.name ?? '—'}</TableCell>
                    <TableCell>{getTutorName(record)}</TableCell>
                    <TableCell>{record.veterinarian?.name ?? '—'}</TableCell>
                    <TableCell>
                      {record.prescription_type === 'solicitacao_cirurgia' ? 'Cirurgia' : 'Receita'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 border-red-500 hover:bg-red-50"
                          onClick={() => handleDownloadPdf(record.id)}
                        >
                          <FileText className="w-3 h-3 mr-1" /> PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-primary border-blue-500 hover:bg-primary/10"
                          onClick={() => handleOpenEmailModal(record)}
                        >
                          <Mail className="w-3 h-3 mr-1" /> Email
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => handleSolicitarExame(record)}
                        >
                          <FlaskConical className="w-3 h-3 mr-1" /> Exame
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
        title="Nova Prescrição"
        containerClassName="mx-auto max-w-2xl"
        bodyClassName="px-6 py-4"
        preventOutsideClose
        preventEscapeClose
        footer={
          <div className="flex flex-row justify-end gap-3">
            <Button type="button" variant="outline" className="h-10" onClick={() => setModalVisible(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="prescription-form" className="h-10 bg-primary hover:bg-blue-700 text-white">
              Gerar prescrição
            </Button>
          </div>
        }
      >
        <form id="prescription-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
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

          {watchPatientId && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="space-y-2 md:col-span-8">
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
              <div className="space-y-2 md:col-span-4">
                <Label className="text-sm font-medium">Data (sem consulta)</Label>
                <Controller
                  control={control}
                  name="prescription_date"
                  render={({ field }) => <Input type="date" className="h-10" {...field} />}
                />
              </div>
            </div>
          )}

          {/* Tipo */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo</Label>
            <div className="flex flex-wrap gap-4">
              {[
                { value: 'receita', label: 'Receita / Medicamentos' },
                { value: 'vacinas', label: 'Vacinação' },
                {
                  value: 'solicitacao_cirurgia',
                  label: 'Solicitação de cirurgia',
                },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="prescription_type"
                    value={opt.value}
                    checked={prescriptionType === opt.value}
                    onChange={() => setPrescriptionType(opt.value as 'receita' | 'solicitacao_cirurgia' | 'vacinas')}
                    className="accent-primary w-4 h-4"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Vacinação */}
          {prescriptionType === 'vacinas' && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">Vacinas administradas *</Label>

              {/* Tags selecionadas */}
              {selectedVaccines.length > 0 && (
                <div className="border rounded-lg p-3 flex flex-wrap gap-2 bg-muted/30">
                  {selectedVaccines.map((v) => (
                    <Badge key={v} variant="secondary" className="flex items-center gap-1.5 py-1 px-2 text-sm">
                      {v}
                      <button
                        type="button"
                        onClick={() => setSelectedVaccines((prev) => prev.filter((x) => x !== v))}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Lista agrupada de vacinas comuns */}
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto bg-background">
                {COMMON_VACCINES.map((group) => (
                  <div key={group.group}>
                    <div className="px-4 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {group.group}
                    </div>
                    {group.items.map((vac) => (
                      <label
                        key={vac}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/50 text-sm transition-colors ${selectedVaccines.includes(vac) ? 'bg-primary/5' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedVaccines.includes(vac)}
                          onChange={() =>
                            setSelectedVaccines((prev) =>
                              prev.includes(vac) ? prev.filter((x) => x !== vac) : [...prev, vac],
                            )
                          }
                          className="accent-primary w-4 h-4 shrink-0"
                        />
                        {vac}
                      </label>
                    ))}
                  </div>
                ))}
              </div>

              {/* Vacina personalizada / texto livre */}
              <div className="flex gap-2">
                <Input
                  placeholder="Outra vacina / lote / marca comercial (texto livre)"
                  className="h-10 flex-1"
                  value={vaccineInput}
                  onChange={(e) => setVaccineInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const t = vaccineInput.trim();
                      if (t && !selectedVaccines.includes(t)) setSelectedVaccines((p) => [...p, t]);
                      setVaccineInput('');
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 shrink-0"
                  onClick={() => {
                    const t = vaccineInput.trim();
                    if (t && !selectedVaccines.includes(t)) setSelectedVaccines((p) => [...p, t]);
                    setVaccineInput('');
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Adicione o número do lote, fabricante ou nome comercial no campo acima se necessário.
              </p>
            </div>
          )}

          {/* Cirurgia */}
          {prescriptionType === 'solicitacao_cirurgia' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Procedimentos cirúrgicos *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar procedimento..."
                  className="pl-9 h-10"
                  value={procedureSearch}
                  onChange={(e) => setProcedureSearch(e.target.value)}
                />
              </div>
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto bg-background">
                {surgicalProcedures
                  .filter((s) => !procedureSearch || s.name.toLowerCase().includes(procedureSearch.toLowerCase()))
                  .map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/50 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProcedureIds.includes(s.id)}
                        onChange={() => toggleProcedure(s.id)}
                        className="accent-primary w-4 h-4 shrink-0"
                      />
                      {s.name}
                    </label>
                  ))}
              </div>
            </div>
          )}

          {/* Medicamentos (apenas tipo receita) */}
          {prescriptionType === 'receita' && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">Medicamentos</Label>
              {fields.map((field, index) => {
                const bularioId = watch(`medications.${index}.bulario_item_id`);
                return (
                  <div key={field.id} className="border rounded-xl p-4 bg-muted/30 space-y-4">
                    <input type="hidden" {...register(`medications.${index}.bulario_item_id`)} />

                    {/* Nome + ações */}
                    <div className="flex gap-2 items-start">
                      <div className="relative flex-1">
                        <Input
                          placeholder="Nome do medicamento"
                          className="h-10"
                          value={medInputValues[index] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMedInputValues((prev) => ({
                              ...prev,
                              [index]: val,
                            }));
                            setValue(`medications.${index}.name`, val);
                            setValue(`medications.${index}.bulario_item_id`, undefined);
                            setActiveMedIndex(index);
                            searchBulario(val);
                          }}
                          onFocus={() => setActiveMedIndex(index)}
                        />
                        {activeMedIndex === index && bularioOptions.length > 0 && (
                          <div className="absolute z-20 top-full left-0 right-0 bg-white border rounded-lg shadow-lg max-h-44 overflow-y-auto mt-1">
                            {searchingBulario ? (
                              <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                                <Loader2 className="w-3 h-3 animate-spin" /> Buscando...
                              </div>
                            ) : (
                              bularioOptions.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted border-b last:border-0"
                                  onClick={() => {
                                    setValue(`medications.${index}.name`, item.title);
                                    setValue(`medications.${index}.bulario_item_id`, item.id);
                                    setMedInputValues((prev) => ({
                                      ...prev,
                                      [index]: item.title,
                                    }));
                                    setActiveMedIndex(null);
                                    setBularioOptions([]);
                                  }}
                                >
                                  <span className="font-medium">{item.title}</span>
                                  {item.subtitle && (
                                    <span className="text-muted-foreground ml-2 text-xs">{item.subtitle}</span>
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      {bularioId && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-10 shrink-0"
                          onClick={() => openBularioDetail(bularioId)}
                        >
                          <Info className="w-4 h-4 mr-1" /> Bula
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-destructive shrink-0"
                        onClick={() => remove(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Via / Concentração / Uso / Forma */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs text-muted-foreground">Via</Label>
                        <Controller
                          control={control}
                          name={`medications.${index}.via`}
                          render={({ field }) => <Input className="h-9" placeholder="Ex: IV" {...field} />}
                        />
                      </div>
                      <div className="space-y-1 md:col-span-3">
                        <Label className="text-xs text-muted-foreground">Concentração</Label>
                        <Controller
                          control={control}
                          name={`medications.${index}.concentration`}
                          render={({ field }) => <Input className="h-9" placeholder="10mg/ml" {...field} />}
                        />
                      </div>
                      <div className="space-y-1 md:col-span-3">
                        <Label className="text-xs text-muted-foreground">Tipo de uso</Label>
                        <Controller
                          control={control}
                          name={`medications.${index}.use_type`}
                          render={({ field }) => (
                            <Select value={field.value ?? ''} onValueChange={field.onChange}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Uso" />
                              </SelectTrigger>
                              <SelectContent>
                                {USE_TYPE_OPTIONS.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>
                                    {o.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <div className="space-y-1 md:col-span-4">
                        <Label className="text-xs text-muted-foreground">Administração</Label>
                        <Controller
                          control={control}
                          name={`medications.${index}.form_of_administration`}
                          render={({ field }) => (
                            <Select value={field.value ?? ''} onValueChange={field.onChange}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Forma" />
                              </SelectTrigger>
                              <SelectContent>
                                {FORM_ADMIN_OPTIONS.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>
                                    {o.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </div>

                    {/* Dose / Frequência / Duração */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs text-muted-foreground">Dose</Label>
                        <Controller
                          control={control}
                          name={`medications.${index}.dosage`}
                          render={({ field }) => <Input className="h-9" placeholder="Ex: 1 comp." {...field} />}
                        />
                      </div>
                      <div className="space-y-1 md:col-span-5">
                        <Label className="text-xs text-muted-foreground">Frequência</Label>
                        <div className="flex gap-1">
                          <Controller
                            control={control}
                            name={`medications.${index}.frequency_value`}
                            render={({ field }) => (
                              <Input type="number" min="1" className="h-9 w-16 shrink-0" placeholder="12" {...field} />
                            )}
                          />
                          <Controller
                            control={control}
                            name={`medications.${index}.frequency_unit`}
                            render={({ field }) => (
                              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                                <SelectTrigger className="h-9 flex-1">
                                  <SelectValue placeholder="Un." />
                                </SelectTrigger>
                                <SelectContent>
                                  {FREQUENCY_UNIT_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                      {o.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                      </div>
                      <div className="space-y-1 md:col-span-5">
                        <Label className="text-xs text-muted-foreground">Duração</Label>
                        <div className="flex gap-1">
                          <Controller
                            control={control}
                            name={`medications.${index}.duration_value`}
                            render={({ field }) => (
                              <Input type="number" min="1" className="h-9 w-16 shrink-0" placeholder="7" {...field} />
                            )}
                          />
                          <Controller
                            control={control}
                            name={`medications.${index}.duration_unit`}
                            render={({ field }) => (
                              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                                <SelectTrigger className="h-9 flex-1">
                                  <SelectValue placeholder="Un." />
                                </SelectTrigger>
                                <SelectContent>
                                  {DURATION_UNIT_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                      {o.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Descrição / Obs */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Como usar</Label>
                        <Controller
                          control={control}
                          name={`medications.${index}.usage_description`}
                          render={({ field }) => (
                            <Textarea
                              rows={2}
                              placeholder="Ex: Administrar com alimento."
                              className="resize-none"
                              {...field}
                            />
                          )}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Observações</Label>
                        <Controller
                          control={control}
                          name={`medications.${index}.observations`}
                          render={({ field }) => (
                            <Textarea rows={2} placeholder="Obs. adicionais" className="resize-none" {...field} />
                          )}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 border-dashed text-muted-foreground hover:text-foreground"
                onClick={() =>
                  append({
                    name: '',
                    via: '',
                    concentration: '',
                    use_type: '',
                    form_of_administration: '',
                    dosage: '',
                    frequency_value: '',
                    frequency_unit: 'horas',
                    duration_value: '',
                    duration_unit: 'dias',
                    usage_description: '',
                    observations: '',
                  })
                }
              >
                <Plus className="w-4 h-4 mr-2" /> Adicionar medicamento
              </Button>
            </div>
          )}

          {/* Recomendações gerais */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Recomendações gerais</Label>
            <Controller
              control={control}
              name="observations"
              render={({ field }) => (
                <Textarea
                  rows={3}
                  placeholder="Orientações adicionais ao tutor..."
                  className="resize-none"
                  {...field}
                />
              )}
            />
          </div>
        </form>
      </DashboardCreateFormDialog>

      <Dialog open={emailModalVisible} onOpenChange={setEmailModalVisible}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Envio de Email</DialogTitle>
          </DialogHeader>
          <p>
            Enviar prescrição por email para o tutor de{' '}
            <strong>{selectedPrescription && getPatient(selectedPrescription)?.name}</strong>?
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

      <Dialog open={bularioDetailVisible} onOpenChange={setBularioDetailVisible}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{bularioDetail?.title ?? 'Detalhes do medicamento'}</DialogTitle>
          </DialogHeader>
          {bularioDetailLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin w-6 h-6 text-muted-foreground/60" />
            </div>
          )}
          {!bularioDetailLoading && bularioDetail && (
            <div className="max-h-[60vh] overflow-y-auto">
              {bularioDetail.subtitle && <p className="text-muted-foreground mb-2">{bularioDetail.subtitle}</p>}
              {/* link externo removido */}
              {bularioDetail.details?.length ? (
                bularioDetail.details.map((section, idx) => (
                  <div key={idx} className="mb-3">
                    <h4 className="font-semibold text-primary text-sm mb-1">{section.title}</h4>
                    <div className="border rounded divide-y text-sm">
                      {section.data?.map((entry, i) => (
                        <div key={i} className="grid grid-cols-3 px-3 py-2">
                          <span className="font-medium text-muted-foreground">{entry.title ?? '—'}</span>
                          <span className="col-span-2">{entry.data || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">Sem detalhes cadastrados.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
