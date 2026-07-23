'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
import {
  Plus,
  BookOpen,
  Loader2,
  X,
  Info,
  Search,
  FileText,
  Mail,
  FlaskConical,
  Eye,
  ShieldCheck,
  ShieldX,
  Copy,
  Download,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { API_PAGE_SIZE } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CreatePrescriptionPayload, PrescriptionLegalModel, Prescription } from '@/app/types/prescription';
import type { BularioItem } from '@/app/types/bulario';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import {
  fetchPrescriptionSignatureStatus,
  useCreatePrescriptionMutation,
  useDownloadPrescriptionPdfMutation,
  useDownloadSignedPrescriptionPdfMutation,
  usePrescriptionsQuery,
  useRevokeSignatureMutation,
  useSendPrescriptionEmailMutation,
  useSignPrescriptionMutation,
  useSignatureStatusQuery,
} from '@/hooks/apiHooks/usePrescriptions';
import { useProfileQuery } from '@/hooks/apiHooks/useUsers';
import { useBularioItemQuery, useBularioSearchMutation } from '@/hooks/apiHooks/useBulario';
import { useSurgicalProceduresListQuery } from '@/hooks/apiHooks/useSurgicalProcedures';
import { usePatientsListQuery } from '@/hooks/apiHooks/usePatients';
import { useConsultationsQuery } from '@/hooks/apiHooks/useConsultations';

const LEGAL_MODEL_OPTIONS: {
  value: PrescriptionLegalModel;
  label: string;
  legalBasis: string;
  vias: string;
}[] = [
  {
    value: 'SIMPLE',
    label: 'Receituário simples',
    legalBasis: 'Uso veterinário · medicamento sob prescrição',
    vias: '1 via — Tutor(a) · 30 dias',
  },
  {
    value: 'SPECIAL_CONTROL',
    label: 'Controle especial',
    legalBasis: 'Portaria SVS/MS 344/98 · listas C1/C5, fenobarbital',
    vias: '2 vias — 1ª Farmácia (retenção) · 2ª Tutor(a) · 30 dias',
  },
  {
    value: 'VET_NOTIFICATION',
    label: 'Notificação veterinária',
    legalBasis: 'IN MAPA 35/2017 · produto de uso veterinário controlado',
    vias: '3 vias — Tutor(a), Estabelecimento, Veterinário · exige Nº SIPEAGRO',
  },
];

/**
 * A resposta de sign/status não devolve `prescription_type` — só `is_controlled` + `serial_number`.
 * Como só VET_NOTIFICATION gera numeração, infere-se o modelo a partir desses dois campos.
 */
function inferLegalModel(sig: { is_controlled?: boolean; serial_number?: string | null } | undefined | null): PrescriptionLegalModel | null {
  if (!sig) return null;
  if (!sig.is_controlled) return 'SIMPLE';
  return sig.serial_number ? 'VET_NOTIFICATION' : 'SPECIAL_CONTROL';
}

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
  continuous_use?: boolean;
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
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [listPage, setListPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);

  const { data: prescriptionsPage, isLoading: loading } = usePrescriptionsQuery(listPage);
  const prescriptions = prescriptionsPage?.items ?? [];
  const listTotal = prescriptionsPage?.total ?? 0;
  const listTotalPages = prescriptionsPage?.totalPages ?? 1;

  const { data: patients = [] } = usePatientsListQuery();
  const { data: allConsultations = [] } = useConsultationsQuery();
  const { data: surgicalProcedures = [] } = useSurgicalProceduresListQuery();
  const [selectedProcedureIds, setSelectedProcedureIds] = useState<number[]>([]);
  const [procedureSearch, setProcedureSearch] = useState('');

  const [bularioOptions, setBularioOptions] = useState<BularioItem[]>([]);
  const bularioSearch = useBularioSearchMutation();
  const searchingBulario = bularioSearch.isPending;
  const [activeMedIndex, setActiveMedIndex] = useState<number | null>(null);
  const [medInputValues, setMedInputValues] = useState<Record<number, string>>({});

  const [prescriptionType, setPrescriptionType] = useState<'receita' | 'solicitacao_cirurgia' | 'vacinas'>('receita');
  const [vaccineInput, setVaccineInput] = useState('');
  const [selectedVaccines, setSelectedVaccines] = useState<string[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const createPrescription = useCreatePrescriptionMutation();
  const downloadPdf = useDownloadPrescriptionPdfMutation();
  const downloadSignedPdf = useDownloadSignedPrescriptionPdfMutation();
  const sendEmailMutation = useSendPrescriptionEmailMutation();
  const pdfPreviewLoading = downloadPdf.isPending || downloadSignedPdf.isPending;

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
  const consultationsByPatient = useMemo(
    () => (watchPatientId ? allConsultations.filter((c) => c.patient?.id === watchPatientId) : []),
    [allConsultations, watchPatientId],
  );

  const searchBulario = async (value: string) => {
    if (!value || value.length < 2) {
      setBularioOptions([]);
      return;
    }
    try {
      const items = await bularioSearch.mutateAsync(value);
      setBularioOptions(items);
    } catch {
      toast.error('Erro ao buscar no bulário');
    }
  };

  const handleAdd = () => {
    reset({ prescription_type: 'receita', medications: [] });
    setPrescriptionType('receita');
    setSelectedPatientId(null);
    setSelectedProcedureIds([]);
    setProcedureSearch('');
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
  };

  const handleDownloadPdf = async (id: string) => {
    try {
      const blob = await downloadPdf.mutateAsync(id);
      const url = window.URL.createObjectURL(blob);
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

  // GRUPO 4 — preview do PDF sem download. Se a prescrição já estiver assinada, mostra o PDF
  // assinado (3 vias, endpoint autenticado) em vez do rascunho não assinado.
  const handlePreviewPdf = async (id: string) => {
    setPdfPreviewOpen(true);
    try {
      const signature = await fetchPrescriptionSignatureStatus(id);
      const blob =
        signature?.status === 'SIGNED'
          ? await downloadSignedPdf.mutateAsync(id)
          : await downloadPdf.mutateAsync(id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      setPdfPreviewUrl((prev) => {
        if (prev) window.URL.revokeObjectURL(prev);
        return url;
      });
    } catch {
      toast.error('Erro ao carregar PDF');
      setPdfPreviewOpen(false);
    }
  };

  const closePdfPreview = () => {
    setPdfPreviewOpen(false);
    setPdfPreviewUrl((prev) => {
      if (prev) window.URL.revokeObjectURL(prev);
      return null;
    });
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
          duration_value: m.continuous_use ? undefined : m.duration_value ? Number(m.duration_value) : undefined,
          duration_unit: m.continuous_use ? undefined : m.duration_unit || undefined,
          continuous_use: m.continuous_use || undefined,
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

      await createPrescription.mutateAsync(payload);
      setModalVisible(false);
    } catch {
      toast.error('Erro ao gerar prescrição');
    }
  };

  const getPatient = (record: Prescription) => record.consultation?.patient ?? record.patient;
  const getTutorName = (record: Prescription) => getPatient(record)?.tutor?.name ?? '—';

  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [bularioDetailVisible, setBularioDetailVisible] = useState(false);
  const [bularioDetailId, setBularioDetailId] = useState<string | null>(null);
  const {
    data: bularioDetail,
    isFetching: bularioDetailLoading,
    error: bularioDetailError,
  } = useBularioItemQuery(bularioDetailVisible ? bularioDetailId : null);

  useEffect(() => {
    if (bularioDetailError) toast.error('Erro ao carregar detalhes do medicamento');
  }, [bularioDetailError]);

  const openBularioDetail = (id: string) => {
    setBularioDetailId(id);
    setBularioDetailVisible(true);
  };

  const handleOpenEmailModal = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setEmailModalVisible(true);
  };

  const handleSendEmail = async () => {
    if (!selectedPrescription) return;
    try {
      await sendEmailMutation.mutateAsync(selectedPrescription.id);
      setEmailModalVisible(false);
    } catch {
      toast.error('Erro ao enviar email');
    }
  };

  const handleSolicitarExame = (record: Prescription) => {
    const patientId = record.consultation?.patient?.id ?? record.patient?.id ?? record.patient_id;
    if (patientId) router.push(`/exams?patientId=${patientId}`);
    else router.push('/exams');
  };

  const toggleProcedure = (id: number) => {
    setSelectedProcedureIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  // Assinatura digital (3 modelos de receituário — Portaria 837/25, Portaria SVS/MS 344/98, IN MAPA 35/2017)
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);
  const [signaturePrescriptionId, setSignaturePrescriptionId] = useState<string | null>(null);
  const [legalModel, setLegalModel] = useState<PrescriptionLegalModel>('SIMPLE');
  const [isHumanAntibacterial, setIsHumanAntibacterial] = useState(false);
  const [revokeFormOpen, setRevokeFormOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');

  const { data: myProfile } = useProfileQuery();
  const { data: signatureStatus, isLoading: signatureLoading } = useSignatureStatusQuery(
    signaturePrescriptionId,
    signatureModalVisible,
  );
  const signMutation = useSignPrescriptionMutation();
  const revokeMutation = useRevokeSignatureMutation();

  const openSignatureModal = (id: string) => {
    setSignaturePrescriptionId(id);
    setLegalModel('SIMPLE');
    setIsHumanAntibacterial(false);
    setRevokeFormOpen(false);
    setRevokeReason('');
    setSignatureModalVisible(true);
  };

  const closeSignatureModal = (open: boolean) => {
    setSignatureModalVisible(open);
    if (!open) setSignaturePrescriptionId(null);
  };

  const sipeagroMissing = legalModel === 'VET_NOTIFICATION' && !myProfile?.sipeagro_number;

  const handleSign = async () => {
    if (!signaturePrescriptionId || sipeagroMissing) return;
    try {
      await signMutation.mutateAsync({
        id: signaturePrescriptionId,
        payload: {
          prescription_type: legalModel,
          ...(legalModel === 'SIMPLE' ? { is_human_antibacterial: isHumanAntibacterial } : {}),
        },
      });
      toast.success('Prescrição assinada com sucesso.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao assinar prescrição'));
    }
  };

  const handleRevoke = async () => {
    if (!signaturePrescriptionId || !revokeReason.trim()) return;
    try {
      await revokeMutation.mutateAsync({ id: signaturePrescriptionId, reason: revokeReason.trim() });
      toast.success('Assinatura revogada.');
      setRevokeFormOpen(false);
      setRevokeReason('');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao revogar assinatura'));
    }
  };

  const handleDownloadSignedPdf = async () => {
    if (!signaturePrescriptionId) return;
    try {
      const blob = await downloadSignedPdf.mutateAsync(signaturePrescriptionId);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Erro ao baixar PDF assinado');
    }
  };

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copiado para a área de transferência.');
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  const canSign = (record: Prescription) => record.prescription_type === 'receita' || !record.prescription_type;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <h1 className="text-2xl font-extrabold font-['InterDoFigma'] flex items-center gap-2">Prescrição</h1>
        <Button onClick={handleAdd} className="w-full bg-primary hover:bg-primary/70 text-white sm:w-auto">
          <Plus className="w-4 h-4 mr-1" /> Nova Prescrição
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin w-6 h-6" />
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
          Nenhuma prescrição encontrada.
        </div>
      ) : (
        <div>
          {/* Desktop / tablet: tabela */}
          <div className="hidden overflow-x-auto rounded-lg border border-gray-300 md:block">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
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
                  <TableRow className="cursor-pointer hover:bg-muted/50 border-b border-gray-300 h-15" key={record.id}>
                    <TableCell>{new Date(record.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{getPatient(record)?.name ?? '—'}</TableCell>
                    <TableCell>{getTutorName(record)}</TableCell>
                    <TableCell>{record.veterinarian?.name ?? '—'}</TableCell>
                    <TableCell>
                      {record.prescription_type === 'solicitacao_cirurgia' ? 'Cirurgia' : 'Receita'}
                    </TableCell>
                    <TableCell className="w-32">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="p-0"
                          title="Visualizar"
                          aria-label="Visualizar"
                          onClick={() => handlePreviewPdf(record.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="p-0"
                          title="Baixar PDF"
                          aria-label="Baixar PDF"
                          onClick={() => handleDownloadPdf(record.id)}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="p-0"
                          title="Enviar por e-mail"
                          aria-label="Enviar por e-mail"
                          onClick={() => handleOpenEmailModal(record)}
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="p-0"
                          title="Solicitar exame"
                          aria-label="Solicitar exame"
                          onClick={() => handleSolicitarExame(record)}
                        >
                          <FlaskConical className="w-4 h-4" />
                        </Button>
                        {canSign(record) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="p-0"
                            title="Assinatura digital"
                            aria-label="Assinatura digital"
                            onClick={() => openSignatureModal(record.id)}
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {prescriptions.map((record) => (
              <div key={record.id} className="rounded-lg border border-gray-300 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{getPatient(record)?.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(record.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {record.prescription_type === 'solicitacao_cirurgia' ? 'Cirurgia' : 'Receita'}
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Tutor</p>
                    <p className="truncate">{getTutorName(record)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Veterinário</p>
                    <p className="truncate">{record.veterinarian?.name ?? '—'}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-200 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="p-0"
                    title="Visualizar"
                    aria-label="Visualizar"
                    onClick={() => handlePreviewPdf(record.id)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="p-0"
                    title="Baixar PDF"
                    aria-label="Baixar PDF"
                    onClick={() => handleDownloadPdf(record.id)}
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="p-0"
                    title="Enviar por e-mail"
                    aria-label="Enviar por e-mail"
                    onClick={() => handleOpenEmailModal(record)}
                  >
                    <Mail className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="p-0"
                    title="Solicitar exame"
                    aria-label="Solicitar exame"
                    onClick={() => handleSolicitarExame(record)}
                  >
                    <FlaskConical className="w-4 h-4" />
                  </Button>
                  {canSign(record) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="p-0"
                      title="Assinatura digital"
                      aria-label="Assinatura digital"
                      onClick={() => openSignatureModal(record.id)}
                    >
                      <ShieldCheck className="w-4 h-4" />
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
                const isContinuousUse = watch(`medications.${index}.continuous_use`);
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
                              <Input
                                type="number"
                                min="1"
                                className="h-9 w-16 shrink-0"
                                placeholder="7"
                                disabled={!!isContinuousUse}
                                {...field}
                              />
                            )}
                          />
                          <Controller
                            control={control}
                            name={`medications.${index}.duration_unit`}
                            render={({ field }) => (
                              <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={!!isContinuousUse}>
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
                        <label className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                          <Controller
                            control={control}
                            name={`medications.${index}.continuous_use`}
                            render={({ field }) => (
                              <input
                                type="checkbox"
                                checked={!!field.value}
                                onChange={(e) => field.onChange(e.target.checked)}
                                className="accent-primary w-3.5 h-3.5"
                              />
                            )}
                          />
                          Uso contínuo (imprime &quot;USO CONTÍNUO&quot; no lugar da duração)
                        </label>
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
                    continuous_use: false,
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

      {/* GRUPO 4 — Preview de PDF */}
      <Dialog
        open={pdfPreviewOpen}
        onOpenChange={(o) => {
          if (!o) closePdfPreview();
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Visualizar prescrição</DialogTitle>
          </DialogHeader>
          {pdfPreviewLoading || !pdfPreviewUrl ? (
            <div className="flex h-[75vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/60" />
            </div>
          ) : (
            <iframe
              src={pdfPreviewUrl}
              className="w-full h-[75vh] rounded"
              title="Visualizar prescrição"
            />
          )}
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

      <Dialog open={signatureModalVisible} onOpenChange={closeSignatureModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assinatura digital</DialogTitle>
          </DialogHeader>

          {signatureLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin w-6 h-6 text-muted-foreground/60" />
            </div>
          ) : signatureStatus?.status === 'SIGNED' ? (
            <div className="space-y-4">
              {(() => {
                const model = inferLegalModel(signatureStatus);
                const modelInfo = LEGAL_MODEL_OPTIONS.find((o) => o.value === model);
                return (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5" />
                      <span className="font-semibold">Assinatura válida</span>
                    </div>
                    {modelInfo && (
                      <p className="text-sm mt-1">
                        {modelInfo.label}
                        {signatureStatus.serial_number ? ` — Nº ${signatureStatus.serial_number}` : ''}
                      </p>
                    )}
                    {signatureStatus.signed_at && (
                      <p className="text-xs mt-1 text-emerald-700">
                        Assinado em {new Date(signatureStatus.signed_at).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                );
              })()}

              {signatureStatus.verification_url && (
                <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
                  <QRCode value={signatureStatus.verification_url} size={160} />
                  <p className="text-xs text-muted-foreground text-center break-all">
                    {signatureStatus.verification_url}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {signatureStatus.public_token && (
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Token (farmácia)</p>
                      <p className="font-mono">{signatureStatus.public_token}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="p-0"
                      onClick={() => handleCopy(signatureStatus.public_token!)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {signatureStatus.private_code && (
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Código (tutor)</p>
                      <p className="font-mono">{signatureStatus.private_code}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="p-0"
                      onClick={() => handleCopy(signatureStatus.private_code!)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleDownloadSignedPdf}
                  disabled={downloadSignedPdf.isPending}
                >
                  {downloadSignedPdf.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Baixar PDF assinado
                </Button>
                {!revokeFormOpen && (
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setRevokeFormOpen(true)}
                  >
                    Revogar assinatura
                  </Button>
                )}
              </div>

              {revokeFormOpen && (
                <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <Label className="text-sm">Motivo da revogação *</Label>
                  <Textarea
                    rows={3}
                    maxLength={500}
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    placeholder="Descreva o motivo da revogação..."
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setRevokeFormOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={!revokeReason.trim() || revokeMutation.isPending}
                      onClick={handleRevoke}
                    >
                      {revokeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirmar
                      revogação
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : signatureStatus?.status === 'REVOKED' ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              <div className="flex items-center gap-2">
                <ShieldX className="w-5 h-5" />
                <span className="font-semibold">Assinatura revogada</span>
              </div>
              {signatureStatus.revoked_at && (
                <p className="text-xs mt-1">
                  Revogada em {new Date(signatureStatus.revoked_at).toLocaleString('pt-BR')}
                </p>
              )}
              {signatureStatus.revoke_reason && <p className="text-sm mt-2">{signatureStatus.revoke_reason}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Modelo do receituário</Label>
                <div className="mt-2 space-y-2">
                  {LEGAL_MODEL_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                        legalModel === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="legal_model"
                        className="mt-1 accent-primary w-4 h-4"
                        checked={legalModel === opt.value}
                        onChange={() => setLegalModel(opt.value)}
                      />
                      <div>
                        <p className="font-medium">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.legalBasis}</p>
                        <p className="text-xs text-muted-foreground">{opt.vias}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {legalModel === 'SIMPLE' && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-primary w-4 h-4"
                    checked={isHumanAntibacterial}
                    onChange={(e) => setIsHumanAntibacterial(e.target.checked)}
                  />
                  Antibacteriano de uso humano (RDC 471/2021 — força 2 vias e validade de 10 dias)
                </label>
              )}

              {sipeagroMissing && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                  Você precisa cadastrar seu Nº SIPEAGRO antes de assinar este modelo.{' '}
                  <Link href="/profile" className="font-medium underline">
                    Ir para o perfil
                  </Link>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => closeSignatureModal(false)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="bg-primary hover:bg-blue-700 text-white"
                  disabled={sipeagroMissing || signMutation.isPending}
                  onClick={handleSign}
                >
                  {signMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Assinar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
