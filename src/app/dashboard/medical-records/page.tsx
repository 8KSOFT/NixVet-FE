'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, Plus, FileText, Eye, Search, UserPlus, PawPrint } from 'lucide-react';
import api from '@/lib/axios';
import dayjs from 'dayjs';

interface Patient { id: string; name: string; species?: string; breed?: string; tutor_id?: string | null; }
interface Tutor { id: string; name: string; email?: string; phone?: string; }
interface Vet { id: string; name: string; }
interface MedicalRecord {
  id: string; patient_id: string; veterinarian_id: string | null;
  record_type: string; record_date: string;
  chief_complaint: string | null; diagnosis: string | null;
  status: string; patient?: Patient; veterinarian?: Vet;
  created_at: string;
}

const emptyForm = () => ({
  patient_id: '',
  veterinarian_id: '',
  record_type: 'atendimento',
  record_date: dayjs().format('YYYY-MM-DD'),
  chief_complaint: '',
});

const emptyTutor = () => ({ name: '', cpf: '', phone: '', email: '', cep: '', street: '', number: '' });
const emptyPatient = () => ({ name: '', species: 'Canino', breed: '', sex: 'M', age: '0', weight: '0', tutor_id: '' as string | '_none' });

export default function MedicalRecordsListPage() {
  const router = useRouter();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [vets, setVets] = useState<Vet[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterPatient, setFilterPatient] = useState('');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState(emptyForm());

  const [tutorModal, setTutorModal] = useState(false);
  const [tutorForm, setTutorForm] = useState(emptyTutor());
  const [tutorSaving, setTutorSaving] = useState(false);

  const [patientModal, setPatientModal] = useState(false);
  const [patientForm, setPatientForm] = useState(emptyPatient());
  const [patientSaving, setPatientSaving] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterPatient) params.patient_id = filterPatient;
      const r = await api.get<MedicalRecord[]>('/medical-records', { params });
      setRecords(Array.isArray(r.data) ? r.data : []);
    } catch { setRecords([]); } finally { setLoading(false); }
  };

  const fetchPatients = async () => { try { const r = await api.get<Patient[]>('/patients'); setPatients(Array.isArray(r.data) ? r.data : []); } catch {} };
  const fetchTutors = async () => { try { const r = await api.get<Tutor[]>('/tutors'); setTutors(Array.isArray(r.data) ? r.data : []); } catch {} };
  const fetchVets = async () => { try { const r = await api.get<Vet[]>('/users/veterinarians'); setVets(Array.isArray(r.data) ? r.data : []); } catch {} };

  useEffect(() => { fetchPatients(); fetchTutors(); fetchVets(); }, []);
  useEffect(() => { fetchRecords(); }, [filterPatient]);

  const handleCreate = async () => {
    if (!form.patient_id) { toast.error('Selecione ou cadastre um paciente'); return; }
    try {
      const res = await api.post<MedicalRecord>('/medical-records', form);
      toast.success('Prontuário criado');
      setModalVisible(false);
      router.push(`/dashboard/medical-records/${res.data.id}`);
    } catch { toast.error('Erro ao criar prontuário'); }
  };

  const handleCreateTutor = async () => {
    if (!tutorForm.name || !tutorForm.cpf || !tutorForm.phone || !tutorForm.email || !tutorForm.cep) {
      toast.error('Preencha nome, CPF, telefone, email e CEP');
      return;
    }
    setTutorSaving(true);
    try {
      const res = await api.post<Tutor>('/tutors', tutorForm);
      toast.success('Tutor cadastrado');
      await fetchTutors();
      setTutorModal(false);
      setTutorForm(emptyTutor());
      setPatientForm((p) => ({ ...p, tutor_id: res.data.id }));
      if (!patientModal) setPatientModal(true);
    } catch {
      toast.error('Erro ao cadastrar tutor');
    } finally {
      setTutorSaving(false);
    }
  };

  const handleCreatePatient = async () => {
    if (!patientForm.name || !patientForm.species || !patientForm.breed) {
      toast.error('Preencha nome, espécie e raça');
      return;
    }
    setPatientSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: patientForm.name,
        species: patientForm.species,
        breed: patientForm.breed,
        sex: patientForm.sex,
        age: Number(patientForm.age) || 0,
        weight: Number(patientForm.weight) || 0,
      };
      if (patientForm.tutor_id && patientForm.tutor_id !== '_none') {
        payload.tutor_id = patientForm.tutor_id;
      } else {
        payload.no_tutor_reason = 'EMERGENCIA';
      }
      const res = await api.post<Patient>('/patients', payload);
      toast.success('Animal cadastrado');
      await fetchPatients();
      setForm((p) => ({ ...p, patient_id: res.data.id }));
      setPatientModal(false);
      setPatientForm(emptyPatient());
    } catch {
      toast.error('Erro ao cadastrar animal');
    } finally {
      setPatientSaving(false);
    }
  };

  const filtered = records.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.patient?.name || '').toLowerCase().includes(q) ||
      (r.veterinarian?.name || '').toLowerCase().includes(q) ||
      (r.chief_complaint || '').toLowerCase().includes(q) ||
      (r.diagnosis || '').toLowerCase().includes(q)
    );
  });

  const typeLabel = (t: string) => {
    const map: Record<string, string> = { atendimento: 'Atendimento', retorno: 'Retorno', emergencia: 'Emergência', cirurgia: 'Cirurgia', internacao: 'Internação' };
    return map[t] || t;
  };

  const statusBadge = (s: string) => {
    if (s === 'closed') return <Badge className="bg-green-500 text-white">Fechado</Badge>;
    return <Badge className="bg-blue-500 text-white">Aberto</Badge>;
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
          <FileText className="h-6 w-6" /> Prontuários
        </h1>
        <Button onClick={() => { setForm(emptyForm()); setModalVisible(true); }} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-1" /> Novo Prontuário
        </Button>
      </div>

      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Buscar por paciente, veterinário, queixa..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="w-[220px]">
              <Select value={filterPatient || '_all'} onValueChange={v => setFilterPatient(v === '_all' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Filtrar por paciente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos os pacientes</SelectItem>
                  {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Nenhum prontuário encontrado.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Queixa</TableHead>
                  <TableHead>Veterinário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/dashboard/medical-records/${r.id}`)}>
                    <TableCell className="whitespace-nowrap">{dayjs(r.record_date).format('DD/MM/YYYY')}</TableCell>
                    <TableCell className="font-medium">{r.patient?.name || '—'}</TableCell>
                    <TableCell><Badge variant="outline">{typeLabel(r.record_type)}</Badge></TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.chief_complaint || '—'}</TableCell>
                    <TableCell>{r.veterinarian?.name || '—'}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Novo Prontuário */}
      <Dialog open={modalVisible} onOpenChange={setModalVisible}>
        <DialogContent className="max-w-lg" onInteractOutside={e => e.preventDefault()}>
          <DialogHeader><DialogTitle>Novo Prontuário</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Paciente *</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select value={form.patient_id} onValueChange={v => setForm(p => ({ ...p, patient_id: v }))}>
                    <SelectTrigger><SelectValue placeholder={patients.length ? 'Selecione' : 'Nenhum animal cadastrado'} /></SelectTrigger>
                    <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name} {p.species ? `(${p.species})` : ''}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setPatientForm(emptyPatient()); setPatientModal(true); }}
                  title="Cadastrar novo animal"
                >
                  <PawPrint className="h-4 w-4 mr-1" /> Novo animal
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Sem tutor cadastrado? Use o botão <strong>Novo animal</strong> e clique em <strong>+ Novo tutor</strong> dentro dele — ou deixe sem tutor (emergência).
              </p>
            </div>

            <div className="space-y-1">
              <Label>Veterinário</Label>
              <Select value={form.veterinarian_id || '_none'} onValueChange={v => setForm(p => ({ ...p, veterinarian_id: v === '_none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent><SelectItem value="_none">Nenhum</SelectItem>{vets.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={form.record_type} onValueChange={v => setForm(p => ({ ...p, record_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="atendimento">Atendimento</SelectItem>
                    <SelectItem value="retorno">Retorno</SelectItem>
                    <SelectItem value="emergencia">Emergência</SelectItem>
                    <SelectItem value="cirurgia">Cirurgia</SelectItem>
                    <SelectItem value="internacao">Internação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Data</Label>
                <Input type="date" value={form.record_date} onChange={e => setForm(p => ({ ...p, record_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Queixa principal</Label>
              <Textarea rows={2} value={form.chief_complaint} onChange={e => setForm(p => ({ ...p, chief_complaint: e.target.value }))} placeholder="Descreva a queixa do tutor..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalVisible(false)}>Cancelar</Button>
            <Button onClick={handleCreate} className="bg-blue-600">Criar e Abrir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Novo Animal inline */}
      <Dialog open={patientModal} onOpenChange={setPatientModal}>
        <DialogContent className="max-w-lg" onInteractOutside={e => e.preventDefault()}>
          <DialogHeader><DialogTitle>Cadastrar novo animal</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Tutor</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    value={patientForm.tutor_id || '_none'}
                    onValueChange={v => setPatientForm(p => ({ ...p, tutor_id: v === '_none' ? '' : v }))}
                  >
                    <SelectTrigger><SelectValue placeholder={tutors.length ? 'Selecione' : 'Nenhum tutor cadastrado'} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Sem tutor (emergência)</SelectItem>
                      {tutors.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setTutorForm(emptyTutor()); setTutorModal(true); }}
                  title="Cadastrar novo tutor"
                >
                  <UserPlus className="h-4 w-4 mr-1" /> Novo tutor
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nome *</Label>
                <Input value={patientForm.name} onChange={e => setPatientForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Sexo</Label>
                <Select value={patientForm.sex} onValueChange={v => setPatientForm(p => ({ ...p, sex: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Macho</SelectItem>
                    <SelectItem value="F">Fêmea</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Espécie *</Label>
                <Input value={patientForm.species} onChange={e => setPatientForm(p => ({ ...p, species: e.target.value }))} placeholder="Canino, Felino..." />
              </div>
              <div className="space-y-1">
                <Label>Raça *</Label>
                <Input value={patientForm.breed} onChange={e => setPatientForm(p => ({ ...p, breed: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Idade (anos)</Label>
                <Input type="number" step="0.1" value={patientForm.age} onChange={e => setPatientForm(p => ({ ...p, age: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Peso (kg)</Label>
                <Input type="number" step="0.1" value={patientForm.weight} onChange={e => setPatientForm(p => ({ ...p, weight: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPatientModal(false)}>Cancelar</Button>
            <Button onClick={handleCreatePatient} disabled={patientSaving} className="bg-blue-600">
              {patientSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Salvar animal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Novo Tutor inline */}
      <Dialog open={tutorModal} onOpenChange={setTutorModal}>
        <DialogContent className="max-w-lg" onInteractOutside={e => e.preventDefault()}>
          <DialogHeader><DialogTitle>Cadastrar novo tutor</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nome *</Label>
                <Input value={tutorForm.name} onChange={e => setTutorForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>CPF *</Label>
                <Input value={tutorForm.cpf} onChange={e => setTutorForm(p => ({ ...p, cpf: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Telefone *</Label>
                <Input value={tutorForm.phone} onChange={e => setTutorForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Email *</Label>
                <Input type="email" value={tutorForm.email} onChange={e => setTutorForm(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>CEP *</Label>
                <Input value={tutorForm.cep} onChange={e => setTutorForm(p => ({ ...p, cep: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Rua</Label>
                <Input value={tutorForm.street} onChange={e => setTutorForm(p => ({ ...p, street: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Número</Label>
              <Input value={tutorForm.number} onChange={e => setTutorForm(p => ({ ...p, number: e.target.value }))} />
            </div>
            <p className="text-xs text-gray-500">Cadastro rápido — campos de endereço completos podem ser preenchidos depois em <strong>Tutores</strong>.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTutorModal(false)}>Cancelar</Button>
            <Button onClick={handleCreateTutor} disabled={tutorSaving} className="bg-blue-600">
              {tutorSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Salvar tutor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
