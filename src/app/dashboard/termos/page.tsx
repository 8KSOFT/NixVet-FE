'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/axios';
import { fetchAllListPages } from '@/lib/pagination';
import { toast } from 'sonner';

type TermType = 'no_medical_discharge' | 'hospitalization_refusal';

interface ClinicalTerm {
  id: string;
  type: TermType;
  patient_id: string | null;
  responsible_name: string;
  responsible_document: string | null;
  reason: string | null;
  created_at: string;
}

interface Patient {
  id: string;
  name: string;
}

const TYPE_LABELS: Record<TermType, string> = {
  no_medical_discharge: 'Saída sem alta médica',
  hospitalization_refusal: 'Recusa de internação',
};

const EMPTY = {
  type: 'no_medical_discharge' as TermType,
  patient_id: '',
  responsible_name: '',
  responsible_document: '',
  reason: '',
};

export default function TermosPage() {
  const [terms, setTerms] = useState<ClinicalTerm[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [termsRes, pts] = await Promise.all([
        api.get<ClinicalTerm[]>('/clinical-terms'),
        fetchAllListPages<Patient>('/patients'),
      ]);
      setTerms(Array.isArray(termsRes.data) ? termsRes.data : []);
      setPatients(pts);
    } catch {
      toast.error('Erro ao carregar termos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const downloadPdf = async (id: string) => {
    try {
      const res = await api.get(`/clinical-terms/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `termo-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao gerar PDF');
    }
  };

  const save = async () => {
    if (!form.responsible_name.trim()) {
      toast.error('Informe o nome do responsável');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post<ClinicalTerm>('/clinical-terms', {
        type: form.type,
        patient_id: form.patient_id || undefined,
        responsible_name: form.responsible_name.trim(),
        responsible_document: form.responsible_document.trim() || undefined,
        reason: form.reason.trim() || undefined,
      });
      toast.success('Termo criado');
      setDialog(false);
      setForm({ ...EMPTY });
      await fetchData();
      if (res.data?.id) downloadPdf(res.data.id);
    } catch {
      toast.error('Erro ao criar termo');
    } finally {
      setSaving(false);
    }
  };

  const patientName = (id: string | null) =>
    id ? patients.find((p) => p.id === id)?.name ?? '—' : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Termos</h1>
          <p className="text-sm text-muted-foreground">
            Termo de saída sem alta médica e termo de recusa de internação (PDF para assinatura).
          </p>
        </div>
        <Button onClick={() => { setForm({ ...EMPTY }); setDialog(true); }}>
          <Plus className="mr-2 size-4" /> Novo termo
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : terms.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum termo emitido.</p>
          ) : (
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead className="text-right">PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terms.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{new Date(t.created_at).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{TYPE_LABELS[t.type] ?? t.type}</Badge>
                    </TableCell>
                    <TableCell>{t.responsible_name}</TableCell>
                    <TableCell>{patientName(t.patient_id)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => downloadPdf(t.id)}>
                        <Download className="mr-2 size-4" /> Baixar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              <FileText className="mr-2 inline size-4" /> Novo termo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo de termo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as TermType })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_medical_discharge">Saída sem alta médica</SelectItem>
                  <SelectItem value="hospitalization_refusal">Recusa de internação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Paciente (opcional)</Label>
              <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="resp">Nome do responsável</Label>
              <Input
                id="resp"
                value={form.responsible_name}
                onChange={(e) => setForm({ ...form, responsible_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="doc">Documento (CPF/RG)</Label>
              <Input
                id="doc"
                value={form.responsible_document}
                onChange={(e) => setForm({ ...form, responsible_document: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Textarea
                id="reason"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              Criar e gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
