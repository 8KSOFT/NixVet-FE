'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { ProductCategory } from '@/app/types/product';
import {
  useCreateProductCategoryMutation,
  useDeleteProductCategoryMutation,
  useProductCategoriesQuery,
  useUpdateProductCategoryMutation,
} from '@/hooks/apiHooks/useStock';

const NONE_VALUE = '__none__';

export function CategoriesTab() {
  const { t } = useTranslation();
  const { data: categories = [], isLoading } = useProductCategoriesQuery();
  const createCategory = useCreateProductCategoryMutation();
  const updateCategory = useUpdateProductCategoryMutation();
  const deleteCategory = useDeleteProductCategoryMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);

  const roots = useMemo(
    () => categories.filter((c) => !c.parent_id).sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );
  const childrenByParent = useMemo(() => {
    const map = new Map<string, ProductCategory[]>();
    for (const category of categories) {
      if (!category.parent_id) continue;
      const list = map.get(category.parent_id) ?? [];
      list.push(category);
      map.set(category.parent_id, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [categories]);

  // Categoria-mãe só pode ser uma raiz (sem parent_id); ao editar, não pode ser a própria categoria.
  const availableParents = useMemo(
    () => roots.filter((r) => r.id !== editing?.id),
    [roots, editing],
  );

  const openNew = () => {
    setEditing(null);
    setName('');
    setParentId(null);
    setDialogOpen(true);
  };

  const openEdit = (category: ProductCategory) => {
    setEditing(category);
    setName(category.name);
    setParentId(category.parent_id ?? null);
    setDialogOpen(true);
  };

  const saving = createCategory.isPending || updateCategory.isPending;

  const save = async () => {
    if (!name.trim()) {
      toast.error(t('settingsProdutos.categories.missingNameError'));
      return;
    }
    try {
      const payload = { name: name.trim(), parent_id: parentId };
      if (editing) {
        await updateCategory.mutateAsync({ id: editing.id, payload });
      } else {
        await createCategory.mutateAsync(payload);
      }
      setDialogOpen(false);
    } catch {
      toast.error(t('settingsProdutos.categories.saveError'));
    }
  };

  const handleDelete = async (category: ProductCategory) => {
    try {
      await deleteCategory.mutateAsync(category.id);
    } catch {
      toast.error(t('settingsProdutos.categories.deleteError'));
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
          <Plus className="mr-2 size-4" /> {t('settingsProdutos.categories.new')}
        </Button>
      </div>

      {roots.length === 0 ? (
        <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
          {t('settingsProdutos.categories.empty')}
        </div>
      ) : (
        <div className="space-y-1 rounded-lg border border-gray-300 bg-white p-2">
          {roots.map((root) => (
            <div key={root.id}>
              <div className="flex items-center justify-between gap-2 rounded-md px-3 py-2 hover:bg-muted/50">
                <span className="font-medium">{root.name}</span>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(root)}>
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
                        <AlertDialogTitle>{t('settingsProdutos.categories.deleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('settingsProdutos.categories.deleteDescription', { name: root.name })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('settingsProdutos.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => handleDelete(root)}
                        >
                          {t('settingsProdutos.remove')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              {(childrenByParent.get(root.id) ?? []).map((child) => (
                <div
                  key={child.id}
                  className="ml-6 flex items-center justify-between gap-2 rounded-md border-l border-gray-200 px-3 py-2 hover:bg-muted/50"
                >
                  <span className="text-sm text-muted-foreground">{child.name}</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(child)}>
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
                          <AlertDialogTitle>{t('settingsProdutos.categories.deleteTitle')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('settingsProdutos.categories.deleteDescription', { name: child.name })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('settingsProdutos.cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={() => handleDelete(child)}
                          >
                            {t('settingsProdutos.remove')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <DashboardCreateFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? t('settingsProdutos.categories.editTitle') : t('settingsProdutos.categories.new')}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              {t('settingsProdutos.cancel')}
            </Button>
            <Button type="submit" form="category-form" className="bg-primary" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t('settingsProdutos.save')}
            </Button>
          </div>
        }
      >
        <form
          id="category-form"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="category-name">{t('settingsProdutos.categories.nameLabel')}</Label>
            <Input id="category-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category-parent">{t('settingsProdutos.categories.parentLabel')}</Label>
            <Select
              value={parentId ?? NONE_VALUE}
              onValueChange={(v) => setParentId(v === NONE_VALUE ? null : v)}
            >
              <SelectTrigger id="category-parent" className="w-full">
                <SelectValue placeholder={t('settingsProdutos.categories.none')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>{t('settingsProdutos.categories.none')}</SelectItem>
                {availableParents.map((parent) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t('settingsProdutos.categories.parentHint')}</p>
          </div>
        </form>
      </DashboardCreateFormDialog>
    </div>
  );
}
