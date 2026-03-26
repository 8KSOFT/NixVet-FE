'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, Plus, FileText, Eye, Search } from 'lucide-react';
import api from '@/lib/axios';
import dayjs from 'dayjs';

interface Patient { id: string; name: string; species?: string; breed?: string; }
interface Vet { id: string; name: string; }
interface MedicalRecord {
  id: string; patient_id: string; veterinarian_id: string | null;
  record_type: string; record_date: string;
  chief_complaint: string | null; diagnosis: string | null;
  status: string; patient?: Patient; veterinarian?: Vet;
  created_at: string;
}

export default function MedicalRecordsListPage() {
  const router = useRouter();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [vets, setVets] = useState<Vet[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterPatient, setFilterPatient] = useState('');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    patient_id: '', veterinarian_id: '', record_type: 'atendimento',
    record_date: dayjs().format('YYYY-MM-DD'), chief_complaint: '',
  });

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
  const fetchVets = async () => { try { const r = await api.get<Vet[]>('/users/veterinarians'); setVets(Array.isArray(r.data) ? r.data : []); } catch {} };

  useEffect(() => { fetchPatients(); fetchVets(); }, []);
  useEffect(() => { fetchRecords(); }, [filterPatient]);

  const handleCreate = async () => {
    if (!form.patient_id) { toast.error('Selecione o paciente'); return; }
    try {
      const res = await api.post<MedicalRecord>('/medical-records', form);
      toast.success('Prontuário criado');
      setModalVisible(false);
      router.push(`/dashboard/medical-records/${res.data.id}`);
    } catch { toast.error('Erro ao criar prontuário'); }
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
        <Button onClick={() => { setForm({ patient_id: '', veterinarian_id: '', record_type: 'atendimento', record_date: dayjs().format('YYYY-MM-DD'), chief_complaint: '' }); setModalVisible(true); }} className="bg-blue-600 hover:bg-blue-700">
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

      <Dialog open={modalVisible} onOpenChange={setModalVisible}>
        <DialogContent className="max-w-lg" onInteractOutside={e => e.preventDefault()}>
          <DialogHeader><DialogTitle>Novo Prontuário</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Paciente *</Label>
              <Select value={form.patient_id} onValueChange={v => setForm(p => ({ ...p, patient_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name} {p.species ? `(${p.species})` : ''}</SelectItem>)}</SelectContent>
              </Select>
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
    </div>
  );
}
