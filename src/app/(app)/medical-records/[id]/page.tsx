'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Loader2, ChevronLeft, Save, Lock, Syringe, Paperclip, FileText, Pill, FlaskConical, Activity, ImageIcon, AlertTriangle, Sparkles, Info, Plus, ChevronDown, Undo2, Trash2, Stethoscope } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/axios';
import { fetchAllListPages } from '@/lib/pagination';
import dayjs from 'dayjs';

interface Vaccine { name: string; date: string; batch?: string; next_dose?: string; }
interface Attachment { name: string; url: string; type: string; uploaded_at: string; }
interface MedicalRecord {
  id: string; patient_id: string; veterinarian_id: string | null;
  record_type: string; record_date: string;
  chief_complaint: string | null; anamnesis: string | null;
  physical_exam: string | null; diagnosis: string | null;
  observations: string | null;
  weight_kg: number | null; temperature_c: number | null;
  lymph_nodes: string | null; hydration: string | null; mucous_membranes: string | null;
  heart_rate: number | null; respiratory_rate: number | null; capillary_refill_time: number | null;
  team_notes: string | null;
  status: string; vaccines: Vaccine[] | null; attachments: Attachment[] | null;
  consultation_id: string | null;
  patient?: { id: string; name: string; species?: string; breed?: string };
  veterinarian?: { id: string; name: string };
}

interface ActiveHospitalization { id: string; status: string; }
interface PatientFileItem { id: string; original_filename: string; category: string; mime_type: string | null; created_at: string; }

interface Prescription { id: string; prescription_date: string; medications: string; prescription_type: string; }
interface ExamRequest { id: string; request_date: string; exam_type: string; status: string; }
interface VaccineRecord { id: string; vaccine_name: string; application_date: string; next_due_date: string; batch_number: string; }

export default function MedicalRecordDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [examRequests, setExamRequests] = useState<ExamRequest[]>([]);
  const [vaccineRecords, setVaccineRecords] = useState<VaccineRecord[]>([]);

  const [vaccineModal, setVaccineModal] = useState(false);
  const [vaccineForm, setVaccineForm] = useState({ name: '', date: dayjs().format('YYYY-MM-DD'), batch: '', next_dose: '' });
  const [attachModal, setAttachModal] = useState(false);
  const [attachForm, setAttachForm] = useState<{ name: string; category: string; file: File | null }>({ name: '', category: 'exame', file: null });
  const [attachUploading, setAttachUploading] = useState(false);
  const [patientFiles, setPatientFiles] = useState<PatientFileItem[]>([]);

  const [form, setForm] = useState({
    chief_complaint: '', anamnesis: '', diagnosis: '',
    observations: '', weight_kg: '', temperature_c: '',
    lymph_nodes: '', hydration: '', mucous_membranes: '',
    heart_rate: '', respiratory_rate: '', capillary_refill_time: '',
    team_notes: '',
  });

  // Banner de internação ativa (2.2)
  const [activeHosp, setActiveHosp] = useState<ActiveHospitalization | null>(null);
  // Card de exame físico colapsável (2.4)
  const [examOpen, setExamOpen] = useState(true);
  // Formatação de anamnese por IA (2.6)
  const [formattingAi, setFormattingAi] = useState(false);
  const [originalAnamnese, setOriginalAnamnese] = useState<string | null>(null);

  // Nova prescrição inline (2.3)
  const emptyMed = () => ({ name: '', via: '', dosage: '', frequency_value: '', frequency_unit: 'horas', duration_value: '', duration_unit: 'dias' });
  const [presModal, setPresModal] = useState(false);
  const [presSaving, setPresSaving] = useState(false);
  const [presForm, setPresForm] = useState<{ prescription_type: string; observations: string; medications: ReturnType<typeof emptyMed>[] }>({
    prescription_type: 'receita', observations: '', medications: [emptyMed()],
  });

  const fetchRecord = useCallback(async () => {
    if (!id) {
      setLoading(false);
      toast.error('Ficha inválida');
      return;
    }

    setLoading(true);
    try {
      const r = await api.get<MedicalRecord>(`/medical-records/${id}`);
      setRecord(r.data);
      setForm({
        chief_complaint: r.data.chief_complaint || '',
        anamnesis: r.data.anamnesis || '',
        diagnosis: r.data.diagnosis || '',
        observations: r.data.observations || '',
        weight_kg: r.data.weight_kg != null ? String(r.data.weight_kg) : '',
        temperature_c: r.data.temperature_c != null ? String(r.data.temperature_c) : '',
        lymph_nodes: r.data.lymph_nodes || '',
        hydration: r.data.hydration || '',
        mucous_membranes: r.data.mucous_membranes || '',
        heart_rate: r.data.heart_rate != null ? String(r.data.heart_rate) : '',
        respiratory_rate: r.data.respiratory_rate != null ? String(r.data.respiratory_rate) : '',
        capillary_refill_time: r.data.capillary_refill_time != null ? String(r.data.capillary_refill_time) : '',
        team_notes: r.data.team_notes || '',
      });
      setOriginalAnamnese(null);
    } catch { setRecord(null); } finally { setLoading(false); }
  }, [id]);

  const fetchPatientFiles = useCallback(async (patientId: string) => {
    try {
      const r = await api.get<PatientFileItem[]>('/patient-files', { params: { patient_id: patientId } });
      setPatientFiles(Array.isArray(r.data) ? r.data : []);
    } catch {
      setPatientFiles([]);
    }
  }, []);

  const fetchActiveHosp = useCallback(async (patientId: string) => {
    try {
      const r = await api.get<ActiveHospitalization[] | { data: ActiveHospitalization[] }>(
        '/hospitalizations',
        { params: { patient_id: patientId, status: 'active' } },
      );
      const list = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      setActiveHosp(list.length > 0 ? list[0] : null);
    } catch {
      setActiveHosp(null);
    }
  }, []);

  const fetchRelated = useCallback(async (patientId: string) => {
    try {
      const [pres, ex, vac] = await Promise.all([
        fetchAllListPages<Prescription>('/prescriptions', { patient_id: patientId }),
        fetchAllListPages<ExamRequest>('/exam-requests', { patient_id: patientId }),
        fetchAllListPages<VaccineRecord>('/vaccines', { patient_id: patientId }),
      ]);
      setPrescriptions(pres);
      setExamRequests(ex);
      setVaccineRecords(vac);
    } catch {
      setPrescriptions([]);
      setExamRequests([]);
      setVaccineRecords([]);
    }
  }, []);

  useEffect(() => { if (id) fetchRecord(); }, [id, fetchRecord]);
  useEffect(() => {
    if (record?.patient_id) {
      fetchRelated(record.patient_id);
      fetchActiveHosp(record.patient_id);
      fetchPatientFiles(record.patient_id);
    }
  }, [record?.patient_id, fetchRelated, fetchActiveHosp, fetchPatientFiles]);

  const handleSave = async () => {
    if (!record) return;
    setSaving(true);
    try {
      await api.put(`/medical-records/${id}`, {
        ...form,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        temperature_c: form.temperature_c ? parseFloat(form.temperature_c) : null,
        heart_rate: form.heart_rate ? parseInt(form.heart_rate, 10) : null,
        respiratory_rate: form.respiratory_rate ? parseInt(form.respiratory_rate, 10) : null,
        capillary_refill_time: form.capillary_refill_time ? parseFloat(form.capillary_refill_time) : null,
      });
      toast.success('Ficha salva');
      fetchRecord();
    } catch { toast.error('Erro ao salvar'); } finally { setSaving(false); }
  };

  const handleClose = async () => {
    if (!record) return;
    setSaving(true);
    try {
      await api.put(`/medical-records/${id}`, { status: 'closed' });
      toast.success('Ficha fechada');
      fetchRecord();
    } catch { toast.error('Erro ao fechar'); } finally { setSaving(false); }
  };

  const handleAddVaccine = async () => {
    if (!vaccineForm.name) { toast.error('Informe o nome da vacina'); return; }
    try {
      await api.post(`/medical-records/${id}/vaccines`, vaccineForm);
      toast.success('Vacina adicionada');
      setVaccineModal(false);
      fetchRecord();
    } catch { toast.error('Erro ao adicionar vacina'); }
  };

  // 8.7 — upload de anexo via OCI (patient_files)
  const handleAddAttachment = async () => {
    if (!attachForm.file) { toast.error('Selecione um arquivo'); return; }
    if (!record) return;
    setAttachUploading(true);
    try {
      const file = attachForm.file;
      const { data: par } = await api.post<{ upload_url: string; storage_path: string }>(
        '/patient-files/upload-url',
        { patient_id: record.patient_id, category: attachForm.category, filename: file.name, mime_type: file.type },
      );
      const put = await fetch(par.upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      });
      if (!put.ok) throw new Error('upload falhou');
      await api.post('/patient-files', {
        patient_id: record.patient_id,
        category: attachForm.category,
        original_filename: attachForm.name || file.name,
        storage_path: par.storage_path,
        mime_type: file.type,
        size_bytes: file.size,
      });
      toast.success('Anexo enviado');
      setAttachModal(false);
      setAttachForm({ name: '', category: 'exame', file: null });
      fetchPatientFiles(record.patient_id);
    } catch { toast.error('Erro ao enviar anexo'); } finally { setAttachUploading(false); }
  };

  const handleOpenPatientFile = async (fileId: string) => {
    try {
      const { data } = await api.get<{ download_url: string }>(`/patient-files/${fileId}/download-url`);
      window.open(data.download_url, '_blank', 'noopener,noreferrer');
    } catch { toast.error('Erro ao abrir arquivo'); }
  };

  // 2.6 — Formatar anamnese com IA
  const handleFormatAnamnese = async () => {
    if (!form.anamnesis.trim()) return;
    setFormattingAi(true);
    try {
      const prev = form.anamnesis;
      const r = await api.post<{ formatted: string }>('/ai/format-text', {
        text: prev,
        context: 'veterinary_anamnesis',
      });
      setOriginalAnamnese(prev);
      setForm(p => ({ ...p, anamnesis: r.data.formatted || prev }));
      toast.success('Anamnese formatada com IA');
    } catch { toast.error('Não foi possível formatar com IA'); } finally { setFormattingAi(false); }
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
    setPresSaving(true);
    try {
      await api.post('/prescriptions', {
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
      toast.success('Prescrição criada');
      setPresModal(false);
      setPresForm({ prescription_type: 'receita', observations: '', medications: [emptyMed()] });
      if (record.patient_id) fetchRelated(record.patient_id);
    } catch { toast.error('Erro ao criar prescrição'); } finally { setPresSaving(false); }
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
    <div className="space-y-4">
      {/* Banner de internação ativa (2.2) */}
      {activeHosp && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Este animal está internado na clínica.</span>
          <Link href={`/internacoes/${activeHosp.id}`} className="ml-auto font-medium underline">
            Ver internação →
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm"><Link href="/medical-records"><ChevronLeft className="w-4 h-4" /></Link></Button>
          <div>
            <h1 className="text-xl font-bold text-primary flex items-center gap-2">
              <FileText className="w-5 h-5" /> Ficha #{id.substring(0, 8)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {record.patient?.name} — {dayjs(record.record_date).format('DD/MM/YYYY')} — {record.veterinarian?.name || 'Sem veterinário'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={isClosed ? 'bg-green-500 text-white' : 'bg-primary/100 text-white'}>{isClosed ? 'Fechado' : 'Aberto'}</Badge>
          {!isClosed && (
            <>
              <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-blue-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Salvar
              </Button>
              <Button onClick={handleClose} disabled={saving} variant="outline" className="border-green-500 text-green-600 hover:bg-green-50">
                <Lock className="h-4 w-4 mr-1" /> Fechar ficha
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Patient info card */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><span className="text-muted-foreground">Paciente:</span> <span className="font-medium">{record.patient?.name}</span></div>
            <div><span className="text-muted-foreground">Espécie:</span> <span className="font-medium">{record.patient?.species || '—'}</span></div>
            <div><span className="text-muted-foreground">Raça:</span> <span className="font-medium">{record.patient?.breed || '—'}</span></div>
            <div><span className="text-muted-foreground">Tipo:</span> <Badge variant="outline">{record.record_type}</Badge></div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="clinical">
        <TabsList className="w-full justify-start flex-wrap">
          <TabsTrigger value="clinical"><Activity className="w-4 h-4 mr-1" /> Clínico</TabsTrigger>
          <TabsTrigger value="prescriptions"><Pill className="w-4 h-4 mr-1" /> Prescrições</TabsTrigger>
          <TabsTrigger value="exams"><FlaskConical className="w-4 h-4 mr-1" /> Exames</TabsTrigger>
          <TabsTrigger value="vaccines"><Syringe className="w-4 h-4 mr-1" /> Vacinas</TabsTrigger>
          <TabsTrigger value="attachments"><ImageIcon className="w-4 h-4 mr-1" /> Anexos</TabsTrigger>
        </TabsList>

        {/* Clinical */}
        <TabsContent value="clinical">
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-1">
                <Label>Queixa principal</Label>
                <Textarea rows={2} value={form.chief_complaint} onChange={e => setForm(p => ({ ...p, chief_complaint: e.target.value }))} disabled={isClosed} />
              </div>

              {/* Anamnese + Formatar com IA (2.6) */}
              <div className="space-y-1">
                <Label>Anamnese</Label>
                <Textarea rows={3} value={form.anamnesis} onChange={e => setForm(p => ({ ...p, anamnesis: e.target.value }))} disabled={isClosed} placeholder="Histórico do paciente, evolução dos sintomas..." />
                {!isClosed && (
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleFormatAnamnese}
                      disabled={formattingAi || !form.anamnesis}
                    >
                      {formattingAi ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                      Formatar com IA
                    </Button>
                    {originalAnamnese != null && (
                      <Button type="button" variant="ghost" size="sm" onClick={handleUndoAnamnese}>
                        <Undo2 className="h-3 w-3 mr-1" /> Desfazer
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Exame Físico estruturado, colapsável (2.4) */}
              <div className="rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setExamOpen(o => !o)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Stethoscope className="h-4 w-4" /> Exame Físico
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${examOpen ? 'rotate-180' : ''}`} />
                </button>
                {examOpen && (
                  <div className="grid grid-cols-1 gap-4 border-t border-slate-200 px-4 py-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Peso (kg)</Label>
                      <Input type="number" step="0.01" value={form.weight_kg} onChange={e => setForm(p => ({ ...p, weight_kg: e.target.value }))} disabled={isClosed} />
                    </div>
                    <div className="space-y-1">
                      <Label>Temperatura (°C)</Label>
                      <Input type="number" step="0.1" value={form.temperature_c} onChange={e => setForm(p => ({ ...p, temperature_c: e.target.value }))} disabled={isClosed} />
                    </div>
                    <div className="space-y-1">
                      <Label>Linfonodos</Label>
                      <Input value={form.lymph_nodes} onChange={e => setForm(p => ({ ...p, lymph_nodes: e.target.value }))} disabled={isClosed} />
                    </div>
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
                    <div className="space-y-1">
                      <Label>Mucosas</Label>
                      <Input value={form.mucous_membranes} onChange={e => setForm(p => ({ ...p, mucous_membranes: e.target.value }))} disabled={isClosed} placeholder="ex.: róseas, pálidas" />
                    </div>
                    <div className="space-y-1">
                      <Label>Frequência Cardíaca (bpm)</Label>
                      <Input type="number" value={form.heart_rate} onChange={e => setForm(p => ({ ...p, heart_rate: e.target.value }))} disabled={isClosed} />
                    </div>
                    <div className="space-y-1">
                      <Label>Frequência Respiratória (mpm)</Label>
                      <Input type="number" value={form.respiratory_rate} onChange={e => setForm(p => ({ ...p, respiratory_rate: e.target.value }))} disabled={isClosed} />
                    </div>
                    <div className="space-y-1">
                      <Label>TPC (segundos)</Label>
                      <Input type="number" step="0.1" value={form.capillary_refill_time} onChange={e => setForm(p => ({ ...p, capillary_refill_time: e.target.value }))} disabled={isClosed} />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label>Diagnóstico Presuntivo</Label>
                <Textarea rows={2} value={form.diagnosis} onChange={e => setForm(p => ({ ...p, diagnosis: e.target.value }))} disabled={isClosed} />
              </div>

              {/* Notas da Equipe (2.7) */}
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Label>Notas da Equipe</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Espaço para registrar observações internas importantes, recomendações operacionais
                        ou informações úteis para a equipe clínica.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Textarea rows={3} value={form.team_notes} onChange={e => setForm(p => ({ ...p, team_notes: e.target.value }))} disabled={isClosed} />
              </div>

              <div className="space-y-1">
                <Label>Observações</Label>
                <Textarea rows={2} value={form.observations} onChange={e => setForm(p => ({ ...p, observations: e.target.value }))} disabled={isClosed} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prescriptions */}
        <TabsContent value="prescriptions">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">Prescrições do paciente</CardTitle>
              <div className="flex items-center gap-2">
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
            <CardContent>
              {prescriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Nenhuma prescrição registrada.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Medicamentos</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {prescriptions.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>{dayjs(p.prescription_date).format('DD/MM/YYYY')}</TableCell>
                        <TableCell><Badge variant="outline">{p.prescription_type}</Badge></TableCell>
                        <TableCell className="max-w-[300px] truncate">{p.medications || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exams */}
        <TabsContent value="exams">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">Exames solicitados</CardTitle>
            </CardHeader>
            <CardContent>
              {examRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Nenhum exame solicitado.</p>
              ) : (
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vaccines */}
        <TabsContent value="vaccines">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">Vacinas</CardTitle>
              {!isClosed && (
                <Button size="sm" onClick={() => { setVaccineForm({ name: '', date: dayjs().format('YYYY-MM-DD'), batch: '', next_dose: '' }); setVaccineModal(true); }}>
                  <Syringe className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {/* Vaccines from this record */}
              {(record.vaccines ?? []).length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold mb-2 text-foreground">Nesta ficha</h4>
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
              )}
              {/* All vaccines from patient */}
              {vaccineRecords.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-foreground">Histórico geral</h4>
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
              )}
              {(record.vaccines ?? []).length === 0 && vaccineRecords.length === 0 && (
                <p className="text-sm text-muted-foreground py-4">Nenhuma vacina registrada.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attachments */}
        <TabsContent value="attachments">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">Anexos (imagens de exames, vacinas...)</CardTitle>
              {!isClosed && (
                <Button size="sm" onClick={() => { setAttachForm({ name: '', category: 'exame', file: null }); setAttachModal(true); }}>
                  <Paperclip className="h-3 w-3 mr-1" /> Anexar
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
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

      {/* Vaccine modal */}
      <Dialog open={vaccineModal} onOpenChange={setVaccineModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Adicionar Vacina</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Nome *</Label><Input value={vaccineForm.name} onChange={e => setVaccineForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Data</Label><Input type="date" value={vaccineForm.date} onChange={e => setVaccineForm(p => ({ ...p, date: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Lote</Label><Input value={vaccineForm.batch} onChange={e => setVaccineForm(p => ({ ...p, batch: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Próxima dose</Label><Input type="date" value={vaccineForm.next_dose} onChange={e => setVaccineForm(p => ({ ...p, next_dose: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVaccineModal(false)}>Cancelar</Button>
            <Button onClick={handleAddVaccine} className="bg-primary">Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attachment modal */}
      <Dialog open={attachModal} onOpenChange={setAttachModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Anexar Arquivo</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1"><Label>Descrição</Label><Input value={attachForm.name} onChange={e => setAttachForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Hemograma 25/03 (opcional)" /></div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <select className="w-full border rounded px-3 py-2 text-sm" value={attachForm.category} onChange={e => setAttachForm(p => ({ ...p, category: e.target.value }))}>
                <option value="exame">Exame</option>
                <option value="imagem">Imagem</option>
                <option value="documento">Documento</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Arquivo *</Label>
              <Input type="file" onChange={e => setAttachForm(p => ({ ...p, file: e.target.files?.[0] ?? null }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttachModal(false)}>Cancelar</Button>
            <Button onClick={handleAddAttachment} disabled={attachUploading} className="bg-primary">
              {attachUploading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Anexar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nova prescrição inline (2.3) */}
      <Dialog open={presModal} onOpenChange={setPresModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova prescrição</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
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
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Via (VO, IV, IM...)" value={m.via} onChange={e => updateMed(i, { via: e.target.value })} />
                    <Input placeholder="Dose (ex.: 10 mg/kg)" value={m.dosage} onChange={e => updateMed(i, { dosage: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex gap-1">
                      <Input type="number" placeholder="Freq." value={m.frequency_value} onChange={e => updateMed(i, { frequency_value: e.target.value })} />
                      <Select value={m.frequency_unit} onValueChange={v => updateMed(i, { frequency_unit: v })}>
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
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
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
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

            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea rows={2} value={presForm.observations} onChange={e => setPresForm(p => ({ ...p, observations: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPresModal(false)}>Cancelar</Button>
            <Button onClick={handleCreatePrescription} disabled={presSaving} className="bg-primary">
              {presSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Criar prescrição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
