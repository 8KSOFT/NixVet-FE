"use client";

import React, { useState } from "react";
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

const TERM_TYPES: Array<{ value: string; label: string }> = [
  { value: "medical_discharge", label: "Alta médica" },
  { value: "no_medical_discharge", label: "Alta a pedido (sem alta médica)" },
  { value: "service_terms", label: "Termo de serviço" },
  { value: "service_contract", label: "Contrato de prestação" },
  { value: "other", label: "Outro" },
];

const typeLabel = (t: string) => TERM_TYPES.find((x) => x.value === t)?.label ?? t;

export default function ClinicTermsPage() {
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

  const handleUpload = async () => {
    if (!form.name.trim()) {
      toast.error("Informe o nome do termo");
      return;
    }
    if (!form.file) {
      toast.error("Selecione um arquivo PDF ou DOCX");
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
      if (!put.ok) throw new Error("Falha no upload para o storage");
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
      toast.error("Erro ao adicionar termo");
    }
  };

  const toggleActive = async (term: ClinicTerm) => {
    try {
      await toggleActiveMutation.mutateAsync({ id: term.id, is_active: !term.is_active });
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  const handlePreview = async (id: string) => {
    setPreviewLoading(true);
    setPreviewOpen(true);
    try {
      const url = await downloadUrlMutation.mutateAsync(id);
      setPreviewUrl(url);
    } catch {
      toast.error("Erro ao carregar o arquivo");
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir este termo?")) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch {
      toast.error("Erro ao excluir");
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-extrabold">Termos da Clínica</h1>
        <Button onClick={() => setAddOpen(true)} className="w-full bg-primary hover:bg-primary/70 sm:w-auto">
          <Plus className="mr-1 h-4 w-4" /> Adicionar Termo
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/60" />
        </div>
      ) : terms.length === 0 ? (
        <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
          Nenhum termo cadastrado.
        </div>
      ) : (
        <>
          {/* Desktop / tablet: tabela */}
          <div className="hidden overflow-x-auto rounded-lg border border-gray-300 md:block">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>
                    Nome
                  </TableHead>
                  <TableHead>
                    Tipo
                  </TableHead>
                  <TableHead>
                    Ativo
                  </TableHead>
                  <TableHead>
                    Ordem
                  </TableHead>
                  <TableHead className="text-right">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terms.map((t) => (
                  <TableRow className="border-b border-gray-300 h-15" key={t.id}>
                    <TableCell className="font-medium">
                      {t.name}
                    </TableCell>
                    <TableCell>
                      {typeLabel(t.term_type)}
                    </TableCell>
                    <TableCell>
                      <Switch checked={t.is_active} onCheckedChange={() => toggleActive(t)} />
                    </TableCell>
                    <TableCell>
                      {t.display_order}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => handlePreview(t.id)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 border-red-300 hover:bg-red-50"
                          onClick={() => handleDelete(t.id)}
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
            {terms.map((t) => (
              <div key={t.id} className="rounded-lg border border-gray-300 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{typeLabel(t.term_type)}</p>
                  </div>
                  <Switch
                    checked={t.is_active}
                    onCheckedChange={() => toggleActive(t)}
                    className="shrink-0"
                  />
                </div>

                <div className="mt-3 text-sm">
                  <p className="text-xs text-muted-foreground">Ordem</p>
                  <p>{t.display_order}</p>
                </div>

                <div className="mt-3 flex items-center justify-end gap-2 border-t border-gray-200 pt-2">
                  <Button size="sm" variant="outline" onClick={() => handlePreview(t.id)}>
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-500 border-red-300 hover:bg-red-50"
                    onClick={() => handleDelete(t.id)}
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
        title="Adicionar Termo"
        containerClassName="max-w-lg mx-auto"
        preventOutsideClose
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={saving} className="bg-primary">
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Salvar
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Nome *</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={form.term_type} onValueChange={(v) => setForm((f) => ({ ...f, term_type: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TERM_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Arquivo (PDF ou DOCX) *</Label>
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
            <DialogTitle>Visualizar termo</DialogTitle>
          </DialogHeader>
          {previewLoading || !previewUrl ? (
            <div className="flex h-[75vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/60" />
            </div>
          ) : (
            <iframe src={previewUrl} className="h-[75vh] w-full rounded" title="Visualizar termo" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
