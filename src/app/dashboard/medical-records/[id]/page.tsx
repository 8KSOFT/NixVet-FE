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
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, ChevronLeft, Save, Lock, Syringe, Paperclip, FileText, Pill, FlaskConical, Activity, ImageIcon } from 'lucide-react';
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
  treatment: string | null; observations: string | null;
  weight_kg: number | null; temperature_c: number | null;
  status: string; vaccines: Vaccine[] | null; attachments: Attachment[] | null;
  consultation_id: string | null;
  patient?: { id: string; name: string; species?: string; breed?: string };
  veterinarian?: { id: string; name: string };
}

interface Prescription { id: string; prescription_date: string; medications: string; prescription_type: string; }
interface ExamRequest { id: string; request_date: string; exam_type: string; status: string; }
interface VaccineRecord { id: string; vaccine_name: string; application_date: string; next_due_date: string; batch_number: string; }

export default function MedicalRecordDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [examRequests, setExamRequests] = useState<ExamRequest[]>([]);
  const [vaccineRecords, setVaccineRecords] = useState<VaccineRecord[]>([]);

  const [vaccineModal, setVaccineModal] = useState(false);
  const [vaccineForm, setVaccineForm] = useState({ name: '', date: dayjs().format('YYYY-MM-DD'), batch: '', next_dose: '' });
  const [attachModal, setAttachModal] = useState(false);
  const [attachForm, setAttachForm] = useState({ name: '', url: '', type: 'image' });

  const [form, setForm] = useState({
    chief_complaint: '', anamnesis: '', physical_exam: '', diagnosis: '',
    treatment: '', observations: '', weight_kg: '', temperature_c: '',
  });

  const fetchRecord = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<MedicalRecord>(`/medical-records/${id}`);
      setRecord(r.data);
      setForm({
        chief_complaint: r.data.chief_complaint || '',
        anamnesis: r.data.anamnesis || '',
        physical_exam: r.data.physical_exam || '',
        diagnosis: r.data.diagnosis || '',
        treatment: r.data.treatment || '',
        observations: r.data.observations || '',
        weight_kg: r.data.weight_kg != null ? String(r.data.weight_kg) : '',
        temperature_c: r.data.temperature_c != null ? String(r.data.temperature_c) : '',
      });
    } catch { setRecord(null); } finally { setLoading(false); }
  }, [id]);

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
  useEffect(() => { if (record?.patient_id) fetchRelated(record.patient_id); }, [record?.patient_id, fetchRelated]);

  const handleSave = async () => {
    if (!record) return;
    setSaving(true);
    try {
      await api.put(`/medical-records/${id}`, {
        ...form,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        temperature_c: form.temperature_c ? parseFloat(form.temperature_c) : null,
      });
      toast.success('Prontuário salvo');
      fetchRecord();
    } catch { toast.error('Erro ao salvar'); } finally { setSaving(false); }
  };

  const handleClose = async () => {
    if (!record) return;
    setSaving(true);
    try {
      await api.put(`/medical-records/${id}`, { status: 'closed' });
      toast.success('Prontuário fechado');
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

  const handleAddAttachment = async () => {
    if (!attachForm.name || !attachForm.url) { toast.error('Preencha nome e URL'); return; }
    try {
      await api.post(`/medical-records/${id}/attachments`, attachForm);
      toast.success('Anexo adicionado');
      setAttachModal(false);
      fetchRecord();
    } catch { toast.error('Erro ao adicionar anexo'); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground/60" /></div>;
  if (!record) return (
    <div>
      <Button asChild variant="ghost"><Link href="/dashboard/medical-records"><ChevronLeft className="w-4 h-4 mr-1" /> Voltar</Link></Button>
      <p className="text-muted-foreground mt-4">Prontuário não encontrado.</p>
    </div>
  );

  const isClosed = record.status === 'closed';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm"><Link href="/dashboard/medical-records"><ChevronLeft className="w-4 h-4" /></Link></Button>
          <div>
            <h1 className="text-xl font-bold text-primary flex items-center gap-2">
              <FileText className="w-5 h-5" /> Prontuário #{id.substring(0, 8)}
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
                <Lock className="h-4 w-4 mr-1" /> Fechar prontuário
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Peso (kg)</Label>
                  <Input type="number" step="0.01" value={form.weight_kg} onChange={e => setForm(p => ({ ...p, weight_kg: e.target.value }))} disabled={isClosed} />
                </div>
                <div className="space-y-1">
                  <Label>Temperatura (°C)</Label>
                  <Input type="number" step="0.1" value={form.temperature_c} onChange={e => setForm(p => ({ ...p, temperature_c: e.target.value }))} disabled={isClosed} />
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                <Label>Queixa principal</Label>
                <Textarea rows={2} value={form.chief_complaint} onChange={e => setForm(p => ({ ...p, chief_complaint: e.target.value }))} disabled={isClosed} />
              </div>
              <div className="space-y-1">
                <Label>Anamnese</Label>
                <Textarea rows={3} value={form.anamnesis} onChange={e => setForm(p => ({ ...p, anamnesis: e.target.value }))} disabled={isClosed} placeholder="Histórico do paciente, evolução dos sintomas..." />
              </div>
              <div className="space-y-1">
                <Label>Exame físico</Label>
                <Textarea rows={3} value={form.physical_exam} onChange={e => setForm(p => ({ ...p, physical_exam: e.target.value }))} disabled={isClosed} placeholder="Achados do exame físico..." />
              </div>
              <div className="space-y-1">
                <Label>Diagnóstico</Label>
                <Textarea rows={2} value={form.diagnosis} onChange={e => setForm(p => ({ ...p, diagnosis: e.target.value }))} disabled={isClosed} />
              </div>
              <div className="space-y-1">
                <Label>Tratamento</Label>
                <Textarea rows={3} value={form.treatment} onChange={e => setForm(p => ({ ...p, treatment: e.target.value }))} disabled={isClosed} placeholder="Protocolo terapêutico, medicamentos, procedimentos..." />
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
              <Button asChild size="sm" variant="outline"><Link href="/dashboard/prescriptions">Ver todas</Link></Button>
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
                  <h4 className="text-sm font-semibold mb-2 text-foreground">Neste prontuário</h4>
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
                <Button size="sm" onClick={() => { setAttachForm({ name: '', url: '', type: 'image' }); setAttachModal(true); }}>
                  <Paperclip className="h-3 w-3 mr-1" /> Anexar
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {(record.attachments ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Nenhum anexo.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(record.attachments ?? []).map((a, i) => (
                    <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="border rounded-lg p-3 hover:bg-muted/50 transition block">
                      {a.type === 'image' ? (
                        <div className="w-full h-24 bg-muted rounded flex items-center justify-center mb-2">
                          <ImageIcon className="w-8 h-8 text-muted-foreground/60" />
                        </div>
                      ) : (
                        <div className="w-full h-24 bg-muted rounded flex items-center justify-center mb-2">
                          <Paperclip className="w-8 h-8 text-muted-foreground/60" />
                        </div>
                      )}
                      <div className="text-sm font-medium truncate">{a.name}</div>
                      <div className="text-xs text-muted-foreground/60">{dayjs(a.uploaded_at).format('DD/MM/YYYY HH:mm')}</div>
                    </a>
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
            <div className="space-y-1"><Label>Nome *</Label><Input value={attachForm.name} onChange={e => setAttachForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Hemograma 25/03" /></div>
            <div className="space-y-1"><Label>URL *</Label><Input value={attachForm.url} onChange={e => setAttachForm(p => ({ ...p, url: e.target.value }))} placeholder="https://..." /></div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <select className="w-full border rounded px-3 py-2 text-sm" value={attachForm.type} onChange={e => setAttachForm(p => ({ ...p, type: e.target.value }))}>
                <option value="image">Imagem</option>
                <option value="pdf">PDF</option>
                <option value="document">Documento</option>
                <option value="other">Outro</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttachModal(false)}>Cancelar</Button>
            <Button onClick={handleAddAttachment} className="bg-primary">Anexar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
