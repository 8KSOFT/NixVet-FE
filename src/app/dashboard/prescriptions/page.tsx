'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
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

interface Prescription {
  id: string;
  createdAt: string;
  consultation?: { patient?: { id: string; name: string; tutor?: { name: string } } };
  patient?: { id: string; name: string; tutor?: { name: string } };
  patient_id?: string;
  veterinarian: { name: string };
  prescription_type?: string;
}

interface BularioItem {
  id: string;
  title: string;
  subtitle?: string | null;
  details?: Array<{ title: string; data: Array<{ title: string | null; data: string }> }> | null;
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

export default function PrescriptionsPage() {
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [consultationsByPatient, setConsultationsByPatient] = useState<ConsultationOption[]>([]);
  const [surgicalProcedures, setSurgicalProcedures] = useState<SurgicalProcedureOption[]>([]);
  const [selectedProcedureIds, setSelectedProcedureIds] = useState<number[]>([]);

  const [bularioOptions, setBularioOptions] = useState<BularioItem[]>([]);
  const [searchingBulario, setSearchingBulario] = useState(false);
  const [activeMedIndex, setActiveMedIndex] = useState<number | null>(null);
  const [medInputValues, setMedInputValues] = useState<Record<number, string>>({});

  const [prescriptionType, setPrescriptionType] = useState<'receita' | 'solicitacao_cirurgia'>(
    'receita',
  );
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const { control, handleSubmit, reset, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      prescription_type: 'receita',
      medications: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'medications' });

  const watchPatientId = watch('patient_id');

  const searchBulario = async (value: string) => {
    if (!value || value.length < 2) {
      setBularioOptions([]);
      return;
    }
    setSearchingBulario(true);
    try {
      const response = await api.get('/bulario', { params: { q: value, limit: 20 } });
      setBularioOptions(response.data);
    } catch {
      toast.error('Erro ao buscar no bulário');
    } finally {
      setSearchingBulario(false);
    }
  };

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/prescriptions');
      setPrescriptions(response.data);
    } catch {
      toast.error('Erro ao carregar prescrições');
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

  const fetchSurgicalProcedures = async () => {
    try {
      const response = await api.get('/catalog/surgical-procedures');
      setSurgicalProcedures(response.data ?? []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
    fetchPatients();
    fetchSurgicalProcedures();
  }, []);

  const handleAdd = () => {
    reset({ prescription_type: 'receita', medications: [] });
    setPrescriptionType('receita');
    setSelectedPatientId(null);
    setSelectedProcedureIds([]);
    setConsultationsByPatient([]);
    setMedInputValues({});
    setBularioOptions([]);
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
      const response = await api.get(`/prescriptions/${id}/pdf`, { responseType: 'blob' });
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
      const user = JSON.parse(userStr);

      if (!values.consultation_id && !values.prescription_date) {
        toast.error('Selecione uma consulta ou informe a data da prescrição');
        return;
      }

      const payload: any = {
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
          via: m.via,
          concentration: m.concentration,
          use_type: m.use_type,
          form_of_administration: m.form_of_administration,
          dosage: m.dosage,
          frequency_value: m.frequency_value,
          frequency_unit: m.frequency_unit,
          duration_value: m.duration_value,
          duration_unit: m.duration_unit,
          usage_description: m.usage_description,
          observations: m.observations,
          bulario_item_id: m.bulario_item_id,
        }));
      } else {
        payload.medications = [];
        if (selectedProcedureIds.length) {
          payload.surgical_procedures = selectedProcedureIds.map((id) => {
            const p = surgicalProcedures.find((s) => s.id === id);
            return { id, name: p?.name ?? `ID ${id}` };
          });
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
    const patientId =
      record.consultation?.patient?.id ?? record.patient?.id ?? record.patient_id;
    if (patientId) router.push(`/dashboard/exams?patientId=${patientId}`);
    else router.push('/dashboard/exams');
  };

  const toggleProcedure = (id: number) => {
    setSelectedProcedureIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
          <BookOpen className="w-6 h-6" /> Prescrição
        </h1>
        <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-1" /> Nova Prescrição
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
              <TableHead>Tipo</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prescriptions.map((record) => (
              <TableRow key={record.id}>
                <TableCell>
                  {new Date(record.createdAt).toLocaleDateString('pt-BR')}
                </TableCell>
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
                      className="text-blue-500 border-blue-500 hover:bg-blue-50"
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
      )}

      <Dialog open={modalVisible} onOpenChange={setModalVisible}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Prescrição</DialogTitle>
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
                      <SelectValue placeholder="Buscar paciente" />
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

            {watchPatientId && (
              <>
                <div>
                  <Label>Consulta (opcional)</Label>
                  <p className="text-xs text-gray-500 mb-1">
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
                  <Label>Data da prescrição (quando não houver consulta)</Label>
                  <p className="text-xs text-gray-500 mb-1">
                    Obrigatório se não selecionar uma consulta
                  </p>
                  <Controller
                    control={control}
                    name="prescription_date"
                    render={({ field }) => <Input type="date" {...field} />}
                  />
                </div>
              </>
            )}

            <div>
              <Label>Tipo</Label>
              <div className="flex gap-4 mt-1">
                {[
                  { value: 'receita', label: 'Receita / Medicamentos' },
                  { value: 'solicitacao_cirurgia', label: 'Solicitação de cirurgia' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="prescription_type"
                      value={opt.value}
                      checked={prescriptionType === opt.value}
                      onChange={() =>
                        setPrescriptionType(opt.value as 'receita' | 'solicitacao_cirurgia')
                      }
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {prescriptionType === 'solicitacao_cirurgia' && (
              <div>
                <Label>Procedimentos cirúrgicos *</Label>
                <div className="border rounded p-3 space-y-2 max-h-48 overflow-y-auto mt-1">
                  {surgicalProcedures.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedProcedureIds.includes(s.id)}
                        onChange={() => toggleProcedure(s.id)}
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {prescriptionType === 'receita' && (
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-bold mb-2">Medicamentos</h3>
                <div className="space-y-3">
                  {fields.map((field, index) => {
                    const bularioId = watch(`medications.${index}.bulario_item_id`);
                    return (
                      <div key={field.id} className="border rounded p-3 bg-white">
                        <input
                          type="hidden"
                          {...(control.register(`medications.${index}.bulario_item_id`))}
                        />
                        <div className="flex flex-wrap gap-2 items-start mb-2">
                          <div className="relative flex-1 min-w-[200px]">
                            <Input
                              placeholder="Medicamento"
                              value={medInputValues[index] ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMedInputValues((prev) => ({ ...prev, [index]: val }));
                                setValue(`medications.${index}.name`, val);
                                setValue(`medications.${index}.bulario_item_id`, undefined);
                                setActiveMedIndex(index);
                                searchBulario(val);
                              }}
                              onFocus={() => setActiveMedIndex(index)}
                            />
                            {activeMedIndex === index && bularioOptions.length > 0 && (
                              <div className="absolute z-10 top-full left-0 right-0 bg-white border rounded shadow-md max-h-40 overflow-y-auto">
                                {searchingBulario ? (
                                  <div className="px-3 py-2 text-sm text-gray-500">
                                    Buscando...
                                  </div>
                                ) : (
                                  bularioOptions.map((item) => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                                      onClick={() => {
                                        setValue(`medications.${index}.name`, item.title);
                                        setValue(
                                          `medications.${index}.bulario_item_id`,
                                          item.id,
                                        );
                                        setMedInputValues((prev) => ({
                                          ...prev,
                                          [index]: item.title,
                                        }));
                                        setActiveMedIndex(null);
                                        setBularioOptions([]);
                                      }}
                                    >
                                      {item.title}
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                          {bularioId && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => openBularioDetail(bularioId)}
                            >
                              <Info className="w-4 h-4 mr-1" /> Detalhes
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-500"
                            onClick={() => remove(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                          <div>
                            <Label className="text-xs">Via</Label>
                            <Controller
                              control={control}
                              name={`medications.${index}.via`}
                              render={({ field }) => (
                                <Input placeholder="Via" {...field} />
                              )}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Concentração</Label>
                            <Controller
                              control={control}
                              name={`medications.${index}.concentration`}
                              render={({ field }) => (
                                <Input placeholder="ex: 10mg/ml" {...field} />
                              )}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Uso</Label>
                            <Controller
                              control={control}
                              name={`medications.${index}.use_type`}
                              render={({ field }) => (
                                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                                  <SelectTrigger>
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
                          <div>
                            <Label className="text-xs">Forma de administração</Label>
                            <Controller
                              control={control}
                              name={`medications.${index}.form_of_administration`}
                              render={({ field }) => (
                                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                                  <SelectTrigger>
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                          <div>
                            <Label className="text-xs">Dose</Label>
                            <Controller
                              control={control}
                              name={`medications.${index}.dosage`}
                              render={({ field }) => (
                                <Input placeholder="Dose" {...field} />
                              )}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Frequência (valor)</Label>
                            <Controller
                              control={control}
                              name={`medications.${index}.frequency_value`}
                              render={({ field }) => (
                                <Input type="number" min="1" placeholder="Ex: 12" {...field} />
                              )}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Frequência (unidade)</Label>
                            <Controller
                              control={control}
                              name={`medications.${index}.frequency_unit`}
                              render={({ field }) => (
                                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Unidade" />
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
                          <div>
                            <Label className="text-xs">Duração (valor)</Label>
                            <Controller
                              control={control}
                              name={`medications.${index}.duration_value`}
                              render={({ field }) => (
                                <Input type="number" min="1" placeholder="Ex: 7" {...field} />
                              )}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Duração (unidade)</Label>
                            <Controller
                              control={control}
                              name={`medications.${index}.duration_unit`}
                              render={({ field }) => (
                                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Unidade" />
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
                        <div className="mb-2">
                          <Label className="text-xs">Descrição de como usar</Label>
                          <Controller
                            control={control}
                            name={`medications.${index}.usage_description`}
                            render={({ field }) => (
                              <Textarea
                                rows={2}
                                placeholder="Ex: Administrar com alimento. Manter na geladeira."
                                {...field}
                              />
                            )}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Observações</Label>
                          <Controller
                            control={control}
                            name={`medications.${index}.observations`}
                            render={({ field }) => <Input placeholder="Obs." {...field} />}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed"
                    onClick={() =>
                      append({
                        name: '',
                        via: '',
                        concentration: '',
                        use_type: '',
                        form_of_administration: '',
                        dosage: '',
                        frequency_value: '',
                        frequency_unit: '',
                        duration_value: '',
                        duration_unit: '',
                        usage_description: '',
                        observations: '',
                      })
                    }
                  >
                    <Plus className="w-4 h-4 mr-1" /> Adicionar medicamento
                  </Button>
                </div>
              </div>
            )}

            <div>
              <Label>Recomendações gerais</Label>
              <Controller
                control={control}
                name="observations"
                render={({ field }) => <Textarea rows={3} {...field} />}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalVisible(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                Gerar prescrição
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={emailModalVisible} onOpenChange={setEmailModalVisible}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Envio de Email</DialogTitle>
          </DialogHeader>
          <p>
            Enviar prescrição por email para o tutor de{' '}
            <strong>{selectedPrescription && getPatient(selectedPrescription)?.name}</strong>?
          </p>
          <p className="text-gray-500 text-sm mt-2">
            O email será enviado para o endereço cadastrado no perfil do tutor.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailModalVisible(false)}>
              Cancelar
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSendEmail}>
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
              <Loader2 className="animate-spin w-6 h-6 text-gray-400" />
            </div>
          )}
          {!bularioDetailLoading && bularioDetail && (
            <div className="max-h-[60vh] overflow-y-auto">
              {bularioDetail.subtitle && (
                <p className="text-gray-600 mb-2">{bularioDetail.subtitle}</p>
              )}
              {bularioDetail.link_details && (
                <a
                  href={bularioDetail.link_details}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 text-sm block mb-3"
                >
                  Link externo
                </a>
              )}
              {bularioDetail.details?.length ? (
                bularioDetail.details.map((section, idx) => (
                  <div key={idx} className="mb-3">
                    <h4 className="font-semibold text-blue-600 text-sm mb-1">{section.title}</h4>
                    <div className="border rounded divide-y text-sm">
                      {section.data?.map((entry, i) => (
                        <div key={i} className="grid grid-cols-3 px-3 py-2">
                          <span className="font-medium text-gray-600">{entry.title ?? '—'}</span>
                          <span className="col-span-2">{entry.data || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">Sem detalhes cadastrados.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
