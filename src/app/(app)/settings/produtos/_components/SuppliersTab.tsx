'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DashboardCreateFormDialog } from '@/components/dashboard-create-form-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { Supplier } from '@/app/types/product';
import {
  useCreateSupplierMutation,
  useDeleteSupplierMutation,
  useSuppliersQuery,
  useUpdateSupplierMutation,
} from '@/hooks/apiHooks/useStock';

const EMPTY_FORM = { name: '', contact_name: '', phone: '', email: '', notes: '' };

export function SuppliersTab() {
  const { t } = useTranslation();
  const { data: suppliers = [], isLoading } = useSuppliersQuery();
  const createSupplier = useCreateSupplierMutation();
  const updateSupplier = useUpdateSupplierMutation();
  const deleteSupplier = useDeleteSupplierMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    setForm({
      name: supplier.name,
      contact_name: supplier.contact_name ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      notes: supplier.notes ?? '',
    });
    setDialogOpen(true);
  };

  const saving = createSupplier.isPending || updateSupplier.isPending;

  const save = async () => {
    if (!form.name.trim()) {
      toast.error(t('settingsProdutos.suppliers.missingNameError'));
      return;
    }
    const payload = {
      name: form.name.trim(),
      contact_name: form.contact_name.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    try {
      if (editing) {
        await updateSupplier.mutateAsync({ id: editing.id, payload });
      } else {
        await createSupplier.mutateAsync(payload);
      }
      setDialogOpen(false);
    } catch {
      toast.error(t('settingsProdutos.suppliers.saveError'));
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    try {
      await deleteSupplier.mutateAsync(supplier.id);
    } catch {
      toast.error(t('settingsProdutos.suppliers.deleteError'));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={openNew}>
          <Plus className="mr-2 size-4" /> {t('settingsProdutos.suppliers.new')}
        </Button>
      </div>

      {suppliers.length === 0 ? (
        <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
          {t('settingsProdutos.suppliers.empty')}
        </div>
      ) : (
        <div className="space-y-3">
          {suppliers.map((supplier) => (
            <div key={supplier.id} className="rounded-lg border border-gray-300 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{supplier.name}</p>
                  {supplier.contact_name ? (
                    <p className="text-xs text-muted-foreground">{supplier.contact_name}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {[supplier.phone, supplier.email].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(supplier)}>
                    <Pencil className="size-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('settingsProdutos.suppliers.deleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('settingsProdutos.suppliers.deleteDescription', { name: supplier.name })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('settingsProdutos.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => handleDelete(supplier)}
                        >
                          {t('settingsProdutos.remove')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <DashboardCreateFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? t('settingsProdutos.suppliers.editTitle') : t('settingsProdutos.suppliers.new')}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              {t('settingsProdutos.cancel')}
            </Button>
            <Button type="submit" form="supplier-form" className="bg-primary" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('settingsProdutos.save')}
            </Button>
          </div>
        }
      >
        <form
          id="supplier-form"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="supplier-name">{t('settingsProdutos.suppliers.nameLabel')}</Label>
            <Input id="supplier-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="supplier-contact">{t('settingsProdutos.suppliers.contactLabel')}</Label>
              <Input
                id="supplier-contact"
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier-phone">{t('settingsProdutos.suppliers.phoneLabel')}</Label>
              <Input
                id="supplier-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplier-email">{t('settingsProdutos.suppliers.emailLabel')}</Label>
            <Input
              id="supplier-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplier-notes">{t('settingsProdutos.suppliers.notesLabel')}</Label>
            <Textarea
              id="supplier-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </form>
      </DashboardCreateFormDialog>
    </div>
  );
}
