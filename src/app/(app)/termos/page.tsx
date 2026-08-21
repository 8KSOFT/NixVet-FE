'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { toast } from 'sonner';
import {
  useClinicalTermsQuery,
  useCreateClinicalTermMutation,
  useClinicalTermPdfMutation,
} from '@/hooks/apiHooks/useClinicalTerms';
import { usePatientsListQuery } from '@/hooks/apiHooks/usePatients';
import type { ClinicalTermType as TermType } from '@/app/types/clinical-term';
import type { TFunction } from 'i18next';

function getTypeLabels(t: TFunction): Record<TermType, string> {
  return {
    no_medical_discharge: t('termos.typeNoMedicalDischarge'),
    hospitalization_refusal: t('termos.typeHospitalizationRefusal'),
  };
}

const EMPTY = {
  type: 'no_medical_discharge' as TermType,
  patient_id: '',
  responsible_name: '',
  responsible_document: '',
  reason: '',
};

export default function TermosPage() {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  const { data: terms = [], isLoading: loading } = useClinicalTermsQuery();
  const { data: patients = [] } = usePatientsListQuery();
  const createMutation = useCreateClinicalTermMutation();
  const pdfMutation = useClinicalTermPdfMutation();
  const saving = createMutation.isPending;
  const typeLabels = getTypeLabels(t);

  const downloadPdf = async (id: string) => {
    try {
      const blob = await pdfMutation.mutateAsync(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `termo-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('termos.pdfError'));
    }
  };

  const save = async () => {
    if (!form.responsible_name.trim()) {
      toast.error(t('termos.responsibleNameRequired'));
      return;
    }
    try {
      const created = await createMutation.mutateAsync({
        type: form.type,
        patient_id: form.patient_id || undefined,
        responsible_name: form.responsible_name.trim(),
        responsible_document: form.responsible_document.trim() || undefined,
        reason: form.reason.trim() || undefined,
      });
      setDialog(false);
      setForm({ ...EMPTY });
      if (created?.id) downloadPdf(created.id);
    } catch {
      toast.error(t('termos.createError'));
    }
  };

  const patientName = (id: string | null) =>
    id ? patients.find((p) => p.id === id)?.name ?? '—' : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('termos.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('termos.subtitle')}
          </p>
        </div>
        <Button onClick={() => { setForm({ ...EMPTY }); setDialog(true); }}>
          <Plus className="mr-2 size-4" /> {t('termos.newTerm')}
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
            <p className="py-8 text-center text-sm text-muted-foreground">{t('termos.empty')}</p>
          ) : (
            <div className="overflow-x-auto">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>{t('termos.columnDate')}</TableHead>
                  <TableHead>{t('termos.columnType')}</TableHead>
                  <TableHead>{t('termos.columnResponsible')}</TableHead>
                  <TableHead>{t('termos.columnPatient')}</TableHead>
                  <TableHead className="text-right">{t('termos.columnPdf')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terms.map((term) => (
                  <TableRow className="border-b border-gray-300 h-15" key={term.id}>
                    <TableCell>{new Date(term.created_at).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{typeLabels[term.type] ?? term.type}</Badge>
                    </TableCell>
                    <TableCell>{term.responsible_name}</TableCell>
                    <TableCell>{patientName(term.patient_id)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="p-0"
                        title={t('termos.download')}
                        aria-label={t('termos.download')}
                        onClick={() => downloadPdf(term.id)}
                      >
                        <Download className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              <FileText className="mr-2 inline size-4" /> {t('termos.newTerm')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t('termos.fieldType')}</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as TermType })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_medical_discharge">{t('termos.typeNoMedicalDischarge')}</SelectItem>
                  <SelectItem value="hospitalization_refusal">{t('termos.typeHospitalizationRefusal')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('termos.fieldPatient')}</Label>
              <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('termos.fieldPatientPlaceholder')} />
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
              <Label htmlFor="resp">{t('termos.fieldResponsibleName')}</Label>
              <Input
                id="resp"
                value={form.responsible_name}
                onChange={(e) => setForm({ ...form, responsible_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="doc">{t('termos.fieldDocument')}</Label>
              <Input
                id="doc"
                value={form.responsible_document}
                onChange={(e) => setForm({ ...form, responsible_document: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="reason">{t('termos.fieldReason')}</Label>
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
              {t('termos.cancel')}
            </Button>
            <Button onClick={save} disabled={saving}>
              {t('termos.createAndGeneratePdf')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
