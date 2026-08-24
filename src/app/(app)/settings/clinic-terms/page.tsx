"use client";

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardCreateFormDialog } from "@/components/dashboard-create-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Eye, Trash2, Loader2 } from "lucide-react";
import {
  useClinicTermTemplatesQuery,
  useRequestClinicTermUploadUrlMutation,
  useCreateClinicTermTemplateMutation,
  useToggleClinicTermTemplateActiveMutation,
  useClinicTermDownloadUrlMutation,
  useDeleteClinicTermTemplateMutation,
} from "@/hooks/apiHooks/useClinicTermTemplates";
import type { ClinicTermTemplate as ClinicTerm } from "@/app/types/clinic-term-template";

const TERM_TYPE_VALUES = [
  "medical_discharge",
  "no_medical_discharge",
  "service_terms",
  "service_contract",
  "other",
] as const;

export default function ClinicTermsPage() {
  const { t } = useTranslation();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; term_type: string; file: File | null }>({
    name: "",
    term_type: "service_terms",
    file: null,
  });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const { data: terms = [], isLoading: loading } = useClinicTermTemplatesQuery();
  const requestUploadUrlMutation = useRequestClinicTermUploadUrlMutation();
  const createMutation = useCreateClinicTermTemplateMutation();
  const toggleActiveMutation = useToggleClinicTermTemplateActiveMutation();
  const downloadUrlMutation = useClinicTermDownloadUrlMutation();
  const deleteMutation = useDeleteClinicTermTemplateMutation();
  const saving = requestUploadUrlMutation.isPending || createMutation.isPending;

  const typeLabel = (type: string) =>
    (TERM_TYPE_VALUES as readonly string[]).includes(type)
      ? t(`settingsClinicTerms.termTypes.${type}`)
      : type;

  const handleUpload = async () => {
    if (!form.name.trim()) {
      toast.error(t('settingsClinicTerms.toasts.nameRequired'));
      return;
    }
    if (!form.file) {
      toast.error(t('settingsClinicTerms.toasts.fileRequired'));
      return;
    }
    try {
      // 1. PAR de upload no OCI
      const par = await requestUploadUrlMutation.mutateAsync({
        filename: form.file.name,
        mime_type: form.file.type,
      });
      // 2. PUT direto no OCI
      const put = await fetch(par.upload_url, {
        method: "PUT",
        body: form.file,
        headers: { "Content-Type": form.file.type || "application/octet-stream" },
      });
      if (!put.ok) throw new Error(t('settingsClinicTerms.toasts.uploadFailed'));
      // 3. Persiste metadados
      await createMutation.mutateAsync({
        name: form.name,
        term_type: form.term_type,
        storage_path: par.storage_path,
        mime_type: form.file.type,
        size_bytes: form.file.size,
        display_order: terms.length,
      });
      setAddOpen(false);
      setForm({ name: "", term_type: "service_terms", file: null });
    } catch {
      toast.error(t('settingsClinicTerms.toasts.addError'));
    }
  };

  const toggleActive = async (term: ClinicTerm) => {
    try {
      await toggleActiveMutation.mutateAsync({ id: term.id, is_active: !term.is_active });
    } catch {
      toast.error(t('settingsClinicTerms.toasts.updateError'));
    }
  };

  const handlePreview = async (id: string) => {
    setPreviewLoading(true);
    setPreviewOpen(true);
    try {
      const url = await downloadUrlMutation.mutateAsync(id);
      setPreviewUrl(url);
    } catch {
      toast.error(t('settingsClinicTerms.toasts.loadFileError'));
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('settingsClinicTerms.deleteConfirm'))) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch {
      toast.error(t('settingsClinicTerms.toasts.deleteError'));
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-extrabold">{t('settingsClinicTerms.title')}</h1>
        <Button onClick={() => setAddOpen(true)} className="w-full bg-primary hover:bg-primary/70 sm:w-auto">
          <Plus className="mr-1 h-4 w-4" /> {t('settingsClinicTerms.addButton')}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/60" />
        </div>
      ) : terms.length === 0 ? (
        <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
          {t('settingsClinicTerms.emptyState')}
        </div>
      ) : (
        <>
          {/* Desktop / tablet: tabela */}
          <div className="hidden overflow-x-auto rounded-lg border border-gray-300 md:block">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>
                    {t('settingsClinicTerms.table.name')}
                  </TableHead>
                  <TableHead>
                    {t('settingsClinicTerms.table.type')}
                  </TableHead>
                  <TableHead>
                    {t('settingsClinicTerms.table.active')}
                  </TableHead>
                  <TableHead>
                    {t('settingsClinicTerms.table.order')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('settingsClinicTerms.table.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terms.map((term) => (
                  <TableRow className="border-b border-gray-300 h-15" key={term.id}>
                    <TableCell className="font-medium">
                      {term.name}
                    </TableCell>
                    <TableCell>
                      {typeLabel(term.term_type)}
                    </TableCell>
                    <TableCell>
                      <Switch checked={term.is_active} onCheckedChange={() => toggleActive(term)} />
                    </TableCell>
                    <TableCell>
                      {term.display_order}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => handlePreview(term.id)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 border-red-300 hover:bg-red-50"
                          onClick={() => handleDelete(term.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {terms.map((term) => (
              <div key={term.id} className="rounded-lg border border-gray-300 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{term.name}</p>
                    <p className="text-xs text-muted-foreground">{typeLabel(term.term_type)}</p>
                  </div>
                  <Switch
                    checked={term.is_active}
                    onCheckedChange={() => toggleActive(term)}
                    className="shrink-0"
                  />
                </div>

                <div className="mt-3 text-sm">
                  <p className="text-xs text-muted-foreground">{t('settingsClinicTerms.table.order')}</p>
                  <p>{term.display_order}</p>
                </div>

                <div className="mt-3 flex items-center justify-end gap-2 border-t border-gray-200 pt-2">
                  <Button size="sm" variant="outline" onClick={() => handlePreview(term.id)}>
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-500 border-red-300 hover:bg-red-50"
                    onClick={() => handleDelete(term.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Adicionar Termo */}
      <DashboardCreateFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title={t('settingsClinicTerms.addDialog.title')}
        preventOutsideClose
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              {t('settingsClinicTerms.addDialog.cancel')}
            </Button>
            <Button onClick={handleUpload} disabled={saving} className="bg-primary">
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} {t('settingsClinicTerms.addDialog.save')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>{t('settingsClinicTerms.addDialog.nameLabel')}</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>{t('settingsClinicTerms.addDialog.typeLabel')}</Label>
            <Select value={form.term_type} onValueChange={(v) => setForm((f) => ({ ...f, term_type: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TERM_TYPE_VALUES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`settingsClinicTerms.termTypes.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t('settingsClinicTerms.addDialog.fileLabel')}</Label>
            <Input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))}
            />
          </div>
        </div>
      </DashboardCreateFormDialog>

      {/* Preview */}
      <Dialog
        open={previewOpen}
        onOpenChange={(o) => {
          if (!o) {
            setPreviewOpen(false);
            setPreviewUrl(null);
          }
        }}
      >
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('settingsClinicTerms.previewDialog.title')}</DialogTitle>
          </DialogHeader>
          {previewLoading || !previewUrl ? (
            <div className="flex h-[75vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/60" />
            </div>
          ) : (
            <iframe src={previewUrl} className="h-[75vh] w-full rounded" title={t('settingsClinicTerms.previewDialog.title')} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
