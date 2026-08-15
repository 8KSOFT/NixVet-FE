'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DashboardCreateFormDialog } from '@/components/dashboard-create-form-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Loader2, ChevronLeft, Save, Lock, Syringe, Paperclip, FileText, Pill, FlaskConical, Activity, ImageIcon, AlertTriangle, AlertCircle, Sparkles, Info, Plus, ChevronDown, Undo2, Trash2, Stethoscope, Calendar, User, PawPrint, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import {
  medicalRecordKeys,
  useAddVaccineToRecordMutation,
  useMedicalRecordQuery,
  useRecordExamRequestsQuery,
  useRecordPrescriptionsQuery,
  useRecordVaccineHistoryQuery,
  useUpdateMedicalRecordMutation,
} from '@/hooks/apiHooks/useMedicalRecords';
import { useActiveHospitalizationQuery } from '@/hooks/apiHooks/useHospitalizations';
import {
  useCreatePatientFileMutation,
  useDownloadPatientFileUrlMutation,
  usePatientFilesQuery,
  useRequestPatientFileUploadUrlMutation,
} from '@/hooks/apiHooks/usePatientFiles';
import { useFormatTextMutation } from '@/hooks/apiHooks/useAi';
import { useCreatePrescriptionMutation } from '@/hooks/apiHooks/usePrescriptions';

/** A API retorna `medications` ora como string formatada, ora como array de objetos ({ name, ... }) — nunca renderizar direto. */
function formatMedicationsSummary(medications: unknown): string {
  if (!medications) return '—';
  if (typeof medications === 'string') return medications;
  if (Array.isArray(medications)) {
    const names = medications
      .map((m) => (m && typeof m === 'object' && 'name' in m ? String((m as { name?: unknown }).name ?? '') : String(m)))
      .filter(Boolean);
    return names.length > 0 ? names.join(', ') : '—';
  }
  return '—';
}

const CLINICAL_TABS = [
  { value: 'clinical', label: 'Clínico', icon: Activity },
  { value: 'prescriptions', label: 'Prescrições', icon: Pill },
  { value: 'exams', label: 'Exames', icon: FlaskConical },
  { value: 'vaccines', label: 'Vacinas', icon: Syringe },
  { value: 'attachments', label: 'Anexos', icon: ImageIcon },
] as const;

/** Rótulo pequeno maiúsculo acima de cada seção da ficha — dá pro olho
 * escanear rapidamente o que é o quê, em vez de tudo com o mesmo peso. */
function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 pl-0.5 text-[11px] font-bold tracking-[.06em] text-wa-ink-3 uppercase">
      {children}
    </div>
  );
}

/** Campo numérico com unidade sufixa dentro do próprio input (kg, °C, bpm...)
 * em vez de label separado — reduz ruído visual no card de Exame físico. */
function UnitField({
  label,
  unit,
  value,
  onChange,
  disabled,
  step,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  step?: string;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="pr-11"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
  );
}

export default function MedicalRecordDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';

  const queryClient = useQueryClient();
  const { data: record, isLoading: loading } = useMedicalRecordQuery(id);
  const patientId = record?.patient_id ?? null;

  const { data: prescriptions = [] } = useRecordPrescriptionsQuery(patientId);
  const { data: examRequests = [] } = useRecordExamRequestsQuery(patientId);
  const { data: vaccineRecords = [] } = useRecordVaccineHistoryQuery(patientId);
  const { data: activeHosp } = useActiveHospitalizationQuery(patientId);
  const { data: patientFiles = [] } = usePatientFilesQuery(patientId);

  const updateRecord = useUpdateMedicalRecordMutation();
  const addVaccine = useAddVaccineToRecordMutation();
  const requestUploadUrl = useRequestPatientFileUploadUrlMutation();
  const createPatientFile = useCreatePatientFileMutation();
  const downloadFileUrl = useDownloadPatientFileUrlMutation();
  const formatTextMutation = useFormatTextMutation();
  const createPrescription = useCreatePrescriptionMutation();
  const saving = updateRecord.isPending;
  const formattingAi = formatTextMutation.isPending;

  const [vaccineModal, setVaccineModal] = useState(false);
  const [vaccineForm, setVaccineForm] = useState({ name: '', date: dayjs().format('YYYY-MM-DD'), batch: '', next_dose: '' });
  const [attachModal, setAttachModal] = useState(false);
  const [attachForm, setAttachForm] = useState<{ name: string; category: string; file: File | null }>({ name: '', category: 'exame', file: null });
  const [attachUploading, setAttachUploading] = useState(false);

  const [form, setForm] = useState({
    chief_complaint: '', anamnesis: '', diagnosis: '',
    observations: '', weight_kg: '', temperature_c: '',
    lymph_nodes: '', hydration: '', mucous_membranes: '',
    heart_rate: '', respiratory_rate: '', capillary_refill_time: '',
    team_notes: '',
  });

  // Aba ativa (Clínico/Prescrições/Exames/Vacinas/Anexos) — controlada pra
  // poder ser trocada tanto pela linha de tabs (desktop) quanto pelo
  // dropdown (mobile, onde 5 abas não cabem numa tela estreita sem cortar).
  const [clinicalTab, setClinicalTab] = useState('clinical');
  const activeTabMeta = CLINICAL_TABS.find(t => t.value === clinicalTab) ?? CLINICAL_TABS[0];

  // Card de exame físico colapsável (2.4)
  const [examOpen, setExamOpen] = useState(true);
  // Formatação de anamnese por IA (2.6)
  const [originalAnamnese, setOriginalAnamnese] = useState<string | null>(null);

  // Nova prescrição inline (2.3)
  const emptyMed = () => ({ name: '', via: '', dosage: '', frequency_value: '', frequency_unit: 'horas', duration_value: '', duration_unit: 'dias' });
  const [presModal, setPresModal] = useState(false);
  const presSaving = createPrescription.isPending;
  const [presForm, setPresForm] = useState<{ prescription_type: string; observations: string; medications: ReturnType<typeof emptyMed>[] }>({
    prescription_type: 'receita', observations: '', medications: [emptyMed()],
  });

  useEffect(() => {
    if (!id) toast.error('Ficha inválida');
  }, [id]);

  useEffect(() => {
    if (!record) return;
    setForm({
      chief_complaint: record.chief_complaint || '',
      anamnesis: record.anamnesis || '',
      diagnosis: record.diagnosis || '',
      observations: record.observations || '',
      weight_kg: record.weight_kg != null ? String(record.weight_kg) : '',
      temperature_c: record.temperature_c != null ? String(record.temperature_c) : '',
      lymph_nodes: record.lymph_nodes || '',
      hydration: record.hydration || '',
      mucous_membranes: record.mucous_membranes || '',
      heart_rate: record.heart_rate != null ? String(record.heart_rate) : '',
      respiratory_rate: record.respiratory_rate != null ? String(record.respiratory_rate) : '',
      capillary_refill_time: record.capillary_refill_time != null ? String(record.capillary_refill_time) : '',
      team_notes: record.team_notes || '',
    });
    setOriginalAnamnese(null);
  }, [record]);

  const handleSave = async () => {
    if (!record) return;
    try {
      await updateRecord.mutateAsync({
        id,
        payload: {
          ...form,
          weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
          temperature_c: form.temperature_c ? parseFloat(form.temperature_c) : null,
          heart_rate: form.heart_rate ? parseInt(form.heart_rate, 10) : null,
          respiratory_rate: form.respiratory_rate ? parseInt(form.respiratory_rate, 10) : null,
          capillary_refill_time: form.capillary_refill_time ? parseFloat(form.capillary_refill_time) : null,
        },
      });
    } catch { toast.error('Erro ao salvar'); }
  };

  const handleClose = async () => {
    if (!record) return;
    try {
      await updateRecord.mutateAsync({ id, payload: { status: 'closed' } });
    } catch { toast.error('Erro ao fechar'); }
  };

  const handleAddVaccine = async () => {
    if (!vaccineForm.name) { toast.error('Informe o nome da vacina'); return; }
    try {
      await addVaccine.mutateAsync({ id, payload: vaccineForm });
      setVaccineModal(false);
    } catch { toast.error('Erro ao adicionar vacina'); }
  };

  // 8.7 — upload de anexo via OCI (patient_files)
  const handleAddAttachment = async () => {
    if (!attachForm.file) { toast.error('Selecione um arquivo'); return; }
    if (!record) return;
    setAttachUploading(true);
    try {
      const file = attachForm.file;
      const par = await requestUploadUrl.mutateAsync({
        patient_id: record.patient_id,
        category: attachForm.category,
        filename: file.name,
        mime_type: file.type,
      });
      const put = await fetch(par.upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      if (!put.ok) throw new Error('upload falhou');
      await createPatientFile.mutateAsync({
        patient_id: record.patient_id,
        category: attachForm.category,
        original_filename: attachForm.name || file.name,
        storage_path: par.storage_path,
        mime_type: file.type,
        size_bytes: file.size,
      });
      setAttachModal(false);
      setAttachForm({ name: '', category: 'exame', file: null });
    } catch { toast.error('Erro ao enviar anexo'); } finally { setAttachUploading(false); }
  };

  const handleOpenPatientFile = async (fileId: string) => {
    try {
      const url = await downloadFileUrl.mutateAsync(fileId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch { toast.error('Erro ao abrir arquivo'); }
  };

  // 2.6 — Formatar anamnese com IA
  const handleFormatAnamnese = async () => {
    if (!form.anamnesis.trim()) return;
    try {
      const prev = form.anamnesis;
      const result = await formatTextMutation.mutateAsync({ text: prev, context: 'veterinary_anamnesis' });
      setOriginalAnamnese(prev);
      setForm(p => ({ ...p, anamnesis: result.formatted || prev }));
    } catch { toast.error('Não foi possível formatar com IA'); }
  };
  const handleUndoAnamnese = () => {
    if (originalAnamnese == null) return;
    setForm(p => ({ ...p, anamnesis: originalAnamnese }));
    setOriginalAnamnese(null);
  };

  // 2.3 — Nova prescrição inline
  const addMed = () => setPresForm(p => ({ ...p, medications: [...p.medications, emptyMed()] }));
  const removeMed = (i: number) => setPresForm(p => ({ ...p, medications: p.medications.filter((_, idx) => idx !== i) }));
  const updateMed = (i: number, patch: Partial<ReturnType<typeof emptyMed>>) =>
    setPresForm(p => ({ ...p, medications: p.medications.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) }));

  const handleCreatePrescription = async () => {
    if (!record) return;
    if (!record.veterinarian_id) { toast.error('Defina um veterinário na ficha antes de prescrever'); return; }
    const meds = presForm.medications.filter(m => m.name.trim());
    if (meds.length === 0) { toast.error('Adicione ao menos um medicamento'); return; }
    try {
      await createPrescription.mutateAsync({
        patient_id: record.patient_id,
        veterinarian_id: record.veterinarian_id,
        prescription_date: dayjs().format('YYYY-MM-DD'),
        prescription_type: presForm.prescription_type,
        observations: presForm.observations || undefined,
        medications: meds.map(m => ({
          name: m.name,
          via: m.via || undefined,
          dosage: m.dosage || undefined,
          frequency_value: m.frequency_value ? Number(m.frequency_value) : undefined,
          frequency_unit: m.frequency_value ? m.frequency_unit : undefined,
          duration_value: m.duration_value ? Number(m.duration_value) : undefined,
          duration_unit: m.duration_value ? m.duration_unit : undefined,
        })),
      });
      setPresModal(false);
      setPresForm({ prescription_type: 'receita', observations: '', medications: [emptyMed()] });
      queryClient.invalidateQueries({ queryKey: medicalRecordKeys.relatedPrescriptions(record.patient_id) });
    } catch { toast.error('Erro ao criar prescrição'); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground/60" /></div>;
  if (!record) return (
    <div>
      <Button asChild variant="ghost"><Link href="/medical-records"><ChevronLeft className="w-4 h-4 mr-1" /> Voltar</Link></Button>
      <p className="text-muted-foreground mt-4">Ficha não encontrada.</p>
    </div>
  );

  const isClosed = record.status === 'closed';

  return (
    <div className="space-y-4 pb-24 sm:pb-4">
      {/* Banner de internação ativa (2.2) */}
      {activeHosp && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 sm:px-4 sm:py-3 sm:text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">Este animal está internado na clínica.</span>
          <Link href={`/internacoes/${activeHosp.id}`} className="shrink-0 whitespace-nowrap font-medium underline">
            Ver internação →
          </Link>
        </div>
      )}

      {/* Back — volta pro prontuário do paciente (a "pasta" de onde a ficha
          foi aberta), não pra listagem geral de prontuários. */}
      <Button asChild variant="ghost" size="sm">
        <Link href={record.patient_id ? `/medical-records/prontuario/${record.patient_id}` : '/medical-records'}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Link>
      </Button>

      {/* Header — card de identidade da ficha: ícone de documento (não a foto
          do pet, que já é o protagonista do cabeçalho do Prontuário), nome +
          badge de status, pills de metadados com ícone, ações à direita. */}
      <div className="rounded-2xl border border-wa-line bg-white p-4.5 sm:p-6.5">
        <div className="flex flex-wrap items-start justify-between gap-3.5">
          <div className="flex min-w-0 items-center gap-2.75 sm:items-start sm:gap-3">
            <div className="flex size-9.5 shrink-0 items-center justify-center rounded-[11px] bg-wa-brand-50 sm:size-10.5">
              <FileText className="size-4.5 text-wa-brand-700 sm:size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-lg font-extrabold tracking-[-0.01em] text-wa-ink sm:text-xl">
                  {record.patient?.name || `Ficha #${id.substring(0, 8)}`}
                </span>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.75 py-0.75 text-xs font-bold whitespace-nowrap',
                    isClosed ? 'bg-wa-line-2 text-wa-ink-2' : 'bg-wa-in-bg text-wa-in',
                  )}
                >
                  {isClosed ? 'Fechado' : 'Aberto'}
                </span>
              </div>
              <div className="mt-0.5 text-[12.5px] text-wa-ink-3">Ficha de atendimento</div>
            </div>
          </div>

          {/* Desktop: ações no cabeçalho. No mobile viram a barra fixa no rodapé. */}
          {!isClosed && (
            <div className="hidden shrink-0 gap-2.5 sm:flex">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="rounded-[10px] bg-wa-brand-600 font-bold shadow-[0_8px_18px_-6px_rgba(18,179,127,0.4)] hover:bg-wa-brand-700"
              >
                {saving ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Save className="mr-1 size-4" />} Salvar
              </Button>
              <Button
                size="sm"
                onClick={handleClose}
                disabled={saving}
                variant="outline"
                className="rounded-[10px] border-[1.5px] border-wa-line text-wa-ink"
              >
                <Lock className="mr-1 size-4" /> Fechar ficha
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-4.5">
          <span className="inline-flex items-center gap-1.75 rounded-[9px] border border-wa-line-2 bg-wa-bg px-3 py-1.75 text-[12.5px] font-semibold text-wa-ink-2">
            <PawPrint className="size-3.5 shrink-0 text-wa-ink-3" />
            {record.patient?.species || '—'}
            {record.patient?.breed ? ` · ${record.patient.breed}` : ''}
          </span>
          <span className="inline-flex items-center gap-1.75 rounded-[9px] border border-wa-line-2 bg-wa-bg px-3 py-1.75 text-[12.5px] font-semibold text-wa-ink-2">
            <Calendar className="size-3.5 shrink-0 text-wa-ink-3" />
            {dayjs(record.record_date).format('DD/MM/YYYY')}
          </span>
          <span className="inline-flex max-w-52 items-center gap-1.75 rounded-[9px] border border-wa-line-2 bg-wa-bg px-3 py-1.75 text-[12.5px] font-semibold text-wa-ink-2">
            <User className="size-3.5 shrink-0 text-wa-ink-3" />
            <span className="truncate">{record.veterinarian?.name || 'Sem veterinário'}</span>
          </span>
        </div>
      </div>

      <Tabs value={clinicalTab} onValueChange={setClinicalTab}>
        {/* Desktop: mesma grade que preenche a largura toda usada no
            prontuário (abas viram colunas iguais em vez de ficarem
            agrupadas à esquerda). */}
        <TabsList className="mb-1 hidden h-auto! w-full grid-cols-5 gap-1 sm:grid">
          {CLINICAL_TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="w-full justify-center gap-1.5 px-4 py-2.25 text-[13.5px] whitespace-nowrap">
              <Icon className="size-3.75 shrink-0" /> {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Mobile: dropdown estilizado no lugar do scroll horizontal — 5
            abas com ícone+texto não cabem numa tela de ~400px sem cortar. */}
        <div className="mb-4 sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-wa-line bg-white px-4 py-3"
              >
                <span className="flex items-center gap-2 text-[13.5px] font-bold text-wa-ink">
                  <activeTabMeta.icon className="size-4 shrink-0 text-wa-brand-600" />
                  {activeTabMeta.label}
                </span>
                <ChevronDown className="size-4 shrink-0 text-wa-ink-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
              {CLINICAL_TABS.map(({ value, label, icon: Icon }) => (
                <DropdownMenuItem key={value} onClick={() => setClinicalTab(value)} className="gap-2 py-2.25 text-[13.5px]">
                  <Icon className="size-4 shrink-0 text-wa-ink-3" /> {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Clinical */}
        <TabsContent value="clinical" className="space-y-5">
          {/* Motivo da consulta */}
          <div>
            <SectionEyebrow>Motivo da consulta</SectionEyebrow>
            <div className="rounded-2xl border border-wa-line bg-white p-4.5 sm:p-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Queixa principal</Label>
                  <Input value={form.chief_complaint} onChange={e => setForm(p => ({ ...p, chief_complaint: e.target.value }))} disabled={isClosed} />
                </div>

                {/* Anamnese + Formatar com IA (2.6) */}
                <div className="space-y-1.5">
                  <Label>Anamnese</Label>
                  <Textarea rows={3} value={form.anamnesis} onChange={e => setForm(p => ({ ...p, anamnesis: e.target.value }))} disabled={isClosed} placeholder="Histórico do paciente, evolução dos sintomas..." />
                  {!isClosed && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleFormatAnamnese}
                        disabled={formattingAi || !form.anamnesis}
                        className="inline-flex items-center gap-1.75 rounded-[9px] border border-wa-brand-100 bg-wa-brand-50 px-3.5 py-2 text-[12.5px] font-bold text-wa-brand-700 transition-colors hover:bg-wa-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {formattingAi ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                        Formatar com IA
                      </button>
                      {originalAnamnese != null && (
                        <Button type="button" variant="ghost" size="sm" onClick={handleUndoAnamnese}>
                          <Undo2 className="h-3 w-3 mr-1" /> Desfazer
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Exame físico — cabeçalho tintado pra destacar como bloco de dados
              estruturados, colapsável (2.4) */}
          <div>
            <SectionEyebrow>Exame físico</SectionEyebrow>
            <div className="overflow-hidden rounded-2xl border border-wa-line bg-white">
              <button
                type="button"
                onClick={() => setExamOpen(o => !o)}
                className="flex w-full items-center justify-between border-b border-wa-brand-100 bg-wa-brand-50 px-4.5 py-3.25 text-left sm:px-6"
              >
                <span className="flex items-center gap-2.25 text-sm font-bold text-wa-brand-700">
                  <Stethoscope className="size-4 shrink-0" /> Sinais vitais e avaliação
                </span>
                <ChevronDown className={cn('size-3.75 shrink-0 text-wa-brand-600 transition-transform', examOpen && 'rotate-180')} />
              </button>
              {examOpen && (
                <div className="grid grid-cols-2 gap-4 p-4.5 sm:grid-cols-4 sm:gap-4.5 sm:p-6">
                  <UnitField label="Peso" unit="kg" step="0.01" value={form.weight_kg} onChange={v => setForm(p => ({ ...p, weight_kg: v }))} disabled={isClosed} />
                  <UnitField label="Temperatura" unit="°C" step="0.1" value={form.temperature_c} onChange={v => setForm(p => ({ ...p, temperature_c: v }))} disabled={isClosed} />
                  <UnitField label="Freq. cardíaca" unit="bpm" value={form.heart_rate} onChange={v => setForm(p => ({ ...p, heart_rate: v }))} disabled={isClosed} />
                  <UnitField label="Freq. respiratória" unit="mpm" value={form.respiratory_rate} onChange={v => setForm(p => ({ ...p, respiratory_rate: v }))} disabled={isClosed} />
                  <UnitField label="TPC" unit="s" step="0.1" value={form.capillary_refill_time} onChange={v => setForm(p => ({ ...p, capillary_refill_time: v }))} disabled={isClosed} />
                  <div className="space-y-1">
                    <Label>Hidratação</Label>
                    <Select value={form.hydration || '_none'} onValueChange={v => setForm(p => ({ ...p, hydration: v === '_none' ? '' : v }))} disabled={isClosed}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">—</SelectItem>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="Leve">Leve</SelectItem>
                        <SelectItem value="Moderada">Moderada</SelectItem>
                        <SelectItem value="Grave">Grave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Descritivos — precisam de mais espaço, meia linha (linha inteira em telas menores) */}
                  <div className="col-span-2 space-y-1">
                    <Label>Linfonodos</Label>
                    <Input value={form.lymph_nodes} onChange={e => setForm(p => ({ ...p, lymph_nodes: e.target.value }))} disabled={isClosed} placeholder="—" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label>Mucosas</Label>
                    <Input value={form.mucous_membranes} onChange={e => setForm(p => ({ ...p, mucous_membranes: e.target.value }))} disabled={isClosed} placeholder="ex.: róseas, pálidas" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Avaliação — diagnóstico presuntivo em destaque: é a conclusão clínica da ficha */}
          <div>
            <SectionEyebrow>Avaliação</SectionEyebrow>
            <div className="rounded-2xl border-[1.5px] border-wa-brand-100 bg-linear-to-b from-wa-brand-50 to-white p-4.5 sm:p-6">
              <Label className="mb-2 flex items-center gap-1.75 text-wa-brand-700">
                <AlertCircle className="size-3.75 shrink-0" /> Diagnóstico presuntivo
              </Label>
              <Textarea rows={2} className="bg-white" value={form.diagnosis} onChange={e => setForm(p => ({ ...p, diagnosis: e.target.value }))} disabled={isClosed} />
            </div>
          </div>

          {/* Complementar — notas internas / observações pro tutor: cards
              tracejados sinalizam que são secundários em relação ao resto */}
          <div>
            <SectionEyebrow>Complementar</SectionEyebrow>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              <div className="rounded-2xl border border-dashed border-wa-line bg-[#fbfcfb] p-4.5 sm:p-5">
                <div className="mb-2 flex items-center gap-1.25">
                  <Label className="mb-0 flex items-center gap-1.25 font-semibold text-wa-ink-2">
                    <Info className="size-3.25 shrink-0 text-wa-ink-3" /> Notas da equipe (interno)
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 shrink-0 cursor-help text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Espaço para registrar observações internas importantes, recomendações operacionais
                        ou informações úteis para a equipe clínica.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Textarea rows={3} className="bg-white" value={form.team_notes} onChange={e => setForm(p => ({ ...p, team_notes: e.target.value }))} disabled={isClosed} placeholder="Visível apenas para a equipe" />
              </div>

              <div className="rounded-2xl border border-dashed border-wa-line bg-[#fbfcfb] p-4.5 sm:p-5">
                <Label className="mb-2 flex items-center gap-1.25 font-semibold text-wa-ink-2">
                  <MessageCircle className="size-3.25 shrink-0 text-wa-ink-3" /> Observações para o tutor
                </Label>
                <Textarea rows={3} className="bg-white" value={form.observations} onChange={e => setForm(p => ({ ...p, observations: e.target.value }))} disabled={isClosed} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Prescriptions */}
        <TabsContent value="prescriptions">
          <Card className="rounded-none border-0 bg-transparent py-0 shadow-none sm:rounded-xl sm:border sm:border-border/80 sm:bg-card sm:py-6 sm:shadow-(--shadow-card)">
            <CardHeader className="flex flex-col items-start gap-2 space-y-0 px-0 pb-2 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <CardTitle className="text-base">Prescrições do paciente</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {!isClosed && (
                  <Button
                    size="sm"
                    onClick={() => { setPresForm({ prescription_type: 'receita', observations: '', medications: [emptyMed()] }); setPresModal(true); }}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Nova prescrição
                  </Button>
                )}
                <Button asChild size="sm" variant="outline"><Link href="/prescriptions">Ver todas</Link></Button>
              </div>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              {prescriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Nenhuma prescrição registrada.</p>
              ) : (
                <>
                  {/* Desktop / tablet: tabela */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Medicamentos</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {prescriptions.map(p => (
                          <TableRow key={p.id}>
                            <TableCell>{dayjs(p.prescription_date).format('DD/MM/YYYY')}</TableCell>
                            <TableCell><Badge variant="outline">{p.prescription_type}</Badge></TableCell>
                            <TableCell className="max-w-[300px] truncate">{formatMedicationsSummary(p.medications)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile: cards */}
                  <div className="space-y-2 md:hidden">
                    {prescriptions.map(p => (
                      <div key={p.id} className="rounded-lg bg-muted/40 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{dayjs(p.prescription_date).format('DD/MM/YYYY')}</span>
                          <Badge variant="outline">{p.prescription_type}</Badge>
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{formatMedicationsSummary(p.medications)}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exams */}
        <TabsContent value="exams">
          <Card className="rounded-none border-0 bg-transparent py-0 shadow-none sm:rounded-xl sm:border sm:border-border/80 sm:bg-card sm:py-6 sm:shadow-(--shadow-card)">
            <CardHeader className="px-0 pb-2 sm:px-6">
              <CardTitle className="text-base">Exames solicitados</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              {examRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Nenhum exame solicitado.</p>
              ) : (
                <>
                  {/* Desktop / tablet: tabela */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {examRequests.map(e => (
                          <TableRow key={e.id}>
                            <TableCell>{dayjs(e.request_date).format('DD/MM/YYYY')}</TableCell>
                            <TableCell>{e.exam_type}</TableCell>
                            <TableCell><Badge variant="outline">{e.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile: cards */}
                  <div className="space-y-2 md:hidden">
                    {examRequests.map(e => (
                      <div key={e.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{dayjs(e.request_date).format('DD/MM/YYYY')}</p>
                          <p className="truncate text-xs text-muted-foreground">{e.exam_type}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0">{e.status}</Badge>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vaccines */}
        <TabsContent value="vaccines">
          <Card className="rounded-none border-0 bg-transparent py-0 shadow-none sm:rounded-xl sm:border sm:border-border/80 sm:bg-card sm:py-6 sm:shadow-(--shadow-card)">
            <CardHeader className="flex flex-col items-start gap-2 space-y-0 px-0 pb-2 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <CardTitle className="text-base">Vacinas</CardTitle>
              {!isClosed && (
                <Button size="sm" onClick={() => { setVaccineForm({ name: '', date: dayjs().format('YYYY-MM-DD'), batch: '', next_dose: '' }); setVaccineModal(true); }}>
                  <Syringe className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              )}
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              {/* Vaccines from this record */}
              {(record.vaccines ?? []).length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold mb-2 text-foreground">Nesta ficha</h4>
                  {/* Desktop / tablet: tabela */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader><TableRow><TableHead>Vacina</TableHead><TableHead>Data</TableHead><TableHead>Lote</TableHead><TableHead>Próxima dose</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {(record.vaccines ?? []).map((v, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{v.name}</TableCell>
                            <TableCell>{dayjs(v.date).format('DD/MM/YYYY')}</TableCell>
                            <TableCell>{v.batch || '—'}</TableCell>
                            <TableCell>{v.next_dose ? dayjs(v.next_dose).format('DD/MM/YYYY') : '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Mobile: cards */}
                  <div className="space-y-2 md:hidden">
                    {(record.vaccines ?? []).map((v, i) => (
                      <div key={i} className="rounded-lg bg-muted/40 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{v.name}</span>
                          <span className="text-xs text-muted-foreground">{dayjs(v.date).format('DD/MM/YYYY')}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>Lote: {v.batch || '—'}</span>
                          <span>Próxima: {v.next_dose ? dayjs(v.next_dose).format('DD/MM/YYYY') : '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* All vaccines from patient */}
              {vaccineRecords.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-foreground">Histórico geral</h4>
                  {/* Desktop / tablet: tabela */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader><TableRow><TableHead>Vacina</TableHead><TableHead>Data</TableHead><TableHead>Lote</TableHead><TableHead>Próxima dose</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {vaccineRecords.map(v => (
                          <TableRow key={v.id}>
                            <TableCell className="font-medium">{v.vaccine_name}</TableCell>
                            <TableCell>{dayjs(v.application_date).format('DD/MM/YYYY')}</TableCell>
                            <TableCell>{v.batch_number || '—'}</TableCell>
                            <TableCell>{v.next_due_date ? dayjs(v.next_due_date).format('DD/MM/YYYY') : '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Mobile: cards */}
                  <div className="space-y-2 md:hidden">
                    {vaccineRecords.map(v => (
                      <div key={v.id} className="rounded-lg bg-muted/40 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{v.vaccine_name}</span>
                          <span className="text-xs text-muted-foreground">{dayjs(v.application_date).format('DD/MM/YYYY')}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>Lote: {v.batch_number || '—'}</span>
                          <span>Próxima: {v.next_due_date ? dayjs(v.next_due_date).format('DD/MM/YYYY') : '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(record.vaccines ?? []).length === 0 && vaccineRecords.length === 0 && (
                <p className="text-sm text-muted-foreground py-4">Nenhuma vacina registrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attachments */}
        <TabsContent value="attachments">
          <Card className="rounded-none border-0 bg-transparent py-0 shadow-none sm:rounded-xl sm:border sm:border-border/80 sm:bg-card sm:py-6 sm:shadow-(--shadow-card)">
            <CardHeader className="flex flex-col items-start gap-2 space-y-0 px-0 pb-2 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <CardTitle className="text-base">Anexos (imagens de exames, vacinas...)</CardTitle>
              {!isClosed && (
                <Button size="sm" onClick={() => { setAttachForm({ name: '', category: 'exame', file: null }); setAttachModal(true); }}>
                  <Paperclip className="h-3 w-3 mr-1" /> Anexar
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4 px-0 sm:px-6">
              {patientFiles.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Nenhum anexo.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {patientFiles.map((f) => (
                    <button key={f.id} type="button" onClick={() => handleOpenPatientFile(f.id)} className="border rounded-lg p-3 hover:bg-muted/50 transition text-left">
                      <div className="w-full h-24 bg-muted rounded flex items-center justify-center mb-2">
                        {f.mime_type?.startsWith('image/') ? (
                          <ImageIcon className="w-8 h-8 text-muted-foreground/60" />
                        ) : (
                          <Paperclip className="w-8 h-8 text-muted-foreground/60" />
                        )}
                      </div>
                      <div className="text-sm font-medium truncate">{f.original_filename}</div>
                      <div className="text-xs text-muted-foreground/60">{dayjs(f.created_at).format('DD/MM/YYYY HH:mm')}</div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Barra de ações fixa no rodapé — mobile só, substitui os botões do
          cabeçalho (que ficam ocultos abaixo do breakpoint desktop). Fica
          colada acima da faixa reservada pro SetupChecklistWidget (68px),
          pra não sobrepor nem ficar sobreposta por ele. */}
      {!isClosed && (
        <div className="fixed inset-x-0 bottom-17 z-30 flex gap-2.5 border-t border-wa-line bg-white p-3 sm:hidden">
          <Button
            onClick={handleClose}
            disabled={saving}
            variant="outline"
            className="flex-1 rounded-[9px] border-[1.5px] border-wa-line text-wa-ink"
          >
            <Lock className="mr-1 size-3.75" /> Fechar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-[9px] bg-wa-brand-600 font-bold hover:bg-wa-brand-700"
          >
            {saving ? <Loader2 className="mr-1 size-3.75 animate-spin" /> : <Save className="mr-1 size-3.75" />} Salvar
          </Button>
        </div>
      )}

      {/* Vaccine modal */}
      <DashboardCreateFormDialog
        open={vaccineModal}
        onOpenChange={setVaccineModal}
        title="Adicionar Vacina"
        contentClassName="modal-responsive"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="border border-gray-300" onClick={() => setVaccineModal(false)}>Cancelar</Button>
            <Button onClick={handleAddVaccine} className="bg-primary">Adicionar</Button>
          </div>
        }
      >
        <div className="space-y-4 md:space-y-6">
          <div className="space-y-2"><Label>Nome *</Label><Input value={vaccineForm.name} onChange={e => setVaccineForm(p => ({ ...p, name: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Data</Label><Input type="date" value={vaccineForm.date} onChange={e => setVaccineForm(p => ({ ...p, date: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Lote</Label><Input value={vaccineForm.batch} onChange={e => setVaccineForm(p => ({ ...p, batch: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Próxima dose</Label><Input type="date" value={vaccineForm.next_dose} onChange={e => setVaccineForm(p => ({ ...p, next_dose: e.target.value }))} /></div>
        </div>
      </DashboardCreateFormDialog>

      {/* Attachment modal */}
      <DashboardCreateFormDialog
        open={attachModal}
        onOpenChange={setAttachModal}
        title="Anexar Arquivo"
        contentClassName="modal-responsive"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="border border-gray-300" onClick={() => setAttachModal(false)}>Cancelar</Button>
            <Button onClick={handleAddAttachment} disabled={attachUploading} className="bg-primary">
              {attachUploading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Anexar
            </Button>
          </div>
        }
      >
        <div className="space-y-4 md:space-y-6">
          <div className="space-y-2"><Label>Descrição</Label><Input value={attachForm.name} onChange={e => setAttachForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Hemograma 25/03 (opcional)" /></div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <select className="w-full border rounded px-3 py-2 text-sm" value={attachForm.category} onChange={e => setAttachForm(p => ({ ...p, category: e.target.value }))}>
              <option value="exame">Exame</option>
              <option value="imagem">Imagem</option>
              <option value="documento">Documento</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Arquivo *</Label>
            <Input type="file" onChange={e => setAttachForm(p => ({ ...p, file: e.target.files?.[0] ?? null }))} />
          </div>
        </div>
      </DashboardCreateFormDialog>

      {/* Nova prescrição inline (2.3) */}
      <DashboardCreateFormDialog
        open={presModal}
        onOpenChange={setPresModal}
        title="Nova prescrição"
        contentClassName="modal-responsive sm:max-w-2xl"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="border border-gray-300" onClick={() => setPresModal(false)}>Cancelar</Button>
            <Button onClick={handleCreatePrescription} disabled={presSaving} className="bg-primary">
              {presSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Criar prescrição
            </Button>
          </div>
        }
      >
        <div className="space-y-4 md:space-y-6">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={presForm.prescription_type} onValueChange={v => setPresForm(p => ({ ...p, prescription_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="solicitacao_cirurgia">Solicitação de cirurgia</SelectItem>
                <SelectItem value="vacinas">Vacinas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Medicamentos</Label>
              <Button type="button" size="sm" variant="outline" onClick={addMed}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar
              </Button>
            </div>
            {presForm.medications.map((m, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input className="flex-1" placeholder="Nome do medicamento *" value={m.name} onChange={e => updateMed(i, { name: e.target.value })} />
                  {presForm.medications.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeMed(i)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input placeholder="Via (VO, IV, IM...)" value={m.via} onChange={e => updateMed(i, { via: e.target.value })} />
                  <Input placeholder="Dose (ex.: 10 mg/kg)" value={m.dosage} onChange={e => updateMed(i, { dosage: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="flex gap-1">
                    <Input type="number" placeholder="Freq." value={m.frequency_value} onChange={e => updateMed(i, { frequency_value: e.target.value })} />
                    <Select value={m.frequency_unit} onValueChange={v => updateMed(i, { frequency_unit: v })}>
                      <SelectTrigger className="w-28 shrink-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutos">minutos</SelectItem>
                        <SelectItem value="horas">horas</SelectItem>
                        <SelectItem value="dias">dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-1">
                    <Input type="number" placeholder="Duração" value={m.duration_value} onChange={e => updateMed(i, { duration_value: e.target.value })} />
                    <Select value={m.duration_unit} onValueChange={v => updateMed(i, { duration_unit: v })}>
                      <SelectTrigger className="w-28 shrink-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dias">dias</SelectItem>
                        <SelectItem value="semanas">semanas</SelectItem>
                        <SelectItem value="meses">meses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={presForm.observations} onChange={e => setPresForm(p => ({ ...p, observations: e.target.value }))} />
          </div>
        </div>
      </DashboardCreateFormDialog>
    </div>
  );
}
