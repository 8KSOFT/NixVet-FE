'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import { useForm, Controller } from 'react-hook-form';
import { Plus, Pencil, Trash2, Loader2, ShieldCheck, Lock } from 'lucide-react';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import { API_PAGE_SIZE } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';
import { CheckboxMultiSelect } from '@/components/checkbox-multi-select';
import {
  useAccessProfilesListQuery,
  useAccessProfilesPagedQuery,
  useCreateAccessProfileMutation,
  useUpdateAccessProfileMutation,
  useDeleteAccessProfileMutation,
} from '@/hooks/apiHooks/useAccessProfiles';
import type { AccessProfile, AccessProfilePayload } from '@/app/types/access-profile';
import type { Permission } from '@/app/types/permission';
import type { ApiRequestError } from '@/app/types/api-error';

type FormValues = {
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  permission_ids: string[];
};

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function AccessControlProfilesPage() {
  const [listPage, setListPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AccessProfile | null>(null);

  const { register, handleSubmit, reset, control, watch, setValue } = useForm<FormValues>({
    defaultValues: { is_active: true, permission_ids: [] },
  });

  const { data, isLoading: loading, error } = useAccessProfilesPagedQuery(listPage);
  const forbidden = (error as ApiRequestError | null)?.response?.status === 403;
  const list = forbidden ? [] : (data?.items ?? []);
  const listTotal = data?.total ?? 0;
  const listTotalPages = data?.totalPages ?? 1;

  // O catálogo bruto (`GET /access-control/permissions`) é restrito a superadmin no backend.
  // Para montar o seletor aqui, derivamos as permissões disponíveis a partir dos perfis
  // visíveis ao tenant (sistema + customizados), que já vêm com as permissões embutidas.
  const {
    data: allProfiles,
    isLoading: permissionsLoading,
    error: permissionsError,
  } = useAccessProfilesListQuery(modalOpen);
  const permissionsForbidden = (permissionsError as ApiRequestError | null)?.response?.status === 403;
  const permissionCatalog = useMemo(() => {
    const byId = new Map<string, Permission>();
    for (const profile of allProfiles ?? []) {
      for (const permission of profile.permissions) {
        byId.set(permission.id, permission);
      }
    }
    return [...byId.values()].sort(
      (a, b) => a.resource.localeCompare(b.resource) || a.action.localeCompare(b.action),
    );
  }, [allProfiles]);
  const permissionOptions = permissionCatalog.map((p) => ({
    value: p.id,
    label: `${p.name} (${p.key})`,
    description: p.description,
  }));

  const createMutation = useCreateAccessProfileMutation();
  const updateMutation = useUpdateAccessProfileMutation();
  const deleteMutation = useDeleteAccessProfileMutation();

  const nameValue = watch('name');
  const isEditing = !!editingProfile;

  const openCreate = () => {
    setEditingProfile(null);
    reset({ name: '', slug: '', description: '', is_active: true, permission_ids: [] });
    setModalOpen(true);
  };

  const openEdit = (row: AccessProfile) => {
    setEditingProfile(row);
    reset({
      name: row.name,
      slug: row.slug,
      description: row.description ?? '',
      is_active: row.is_active,
      permission_ids: row.permissions.map((p) => p.id),
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Perfil removido');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao remover perfil'));
    }
  };

  const onSubmit = async (values: FormValues) => {
    const payload: AccessProfilePayload = {
      name: values.name.trim(),
      slug: (values.slug.trim() || slugify(values.name)) || values.name,
      description: values.description.trim() || undefined,
      permission_ids: values.permission_ids,
      is_active: values.is_active,
    };
    try {
      if (editingProfile) {
        await updateMutation.mutateAsync({ id: editingProfile.id, payload });
        toast.success('Perfil atualizado');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Perfil criado');
      }
      setModalOpen(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar perfil'));
    }
  };

  if (forbidden) {
    return (
      <div>
        <h1 className="mb-4 flex items-center gap-2 text-2xl font-heading font-bold text-primary">
          <ShieldCheck className="h-6 w-6" /> Perfis de Acesso
        </h1>
        <p className="text-muted-foreground">Apenas administrador ou gerente pode gerenciar perfis de acesso.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 flex items-center gap-2 text-2xl font-heading font-bold text-primary">
        <ShieldCheck className="h-6 w-6" /> Perfis de Acesso
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Monte perfis vinculando permissões e depois atribua cada perfil aos usuários da equipe em{' '}
        <span className="font-medium">Equipe</span>.
      </p>
      <Card>
        <CardContent className="pt-6">
          <Button onClick={openCreate} className="mb-4 bg-primary">
            <Plus className="w-4 h-4 mr-2" /> Novo perfil
          </Button>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-full border-collapse bg-white text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-300 h-15">
                    <TableHead>Nome</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Permissões</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum perfil cadastrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    list.map((r) => (
                      <TableRow className="border-b border-gray-300 h-15" key={r.id}>
                        <TableCell>{r.name}</TableCell>
                        <TableCell className="font-mono text-xs">{r.slug}</TableCell>
                        <TableCell>{r.permissions.length}</TableCell>
                        <TableCell>
                          <Badge variant={r.is_system ? 'secondary' : 'default'}>
                            {r.is_system ? 'Sistema' : 'Customizado'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.is_active ? 'default' : 'secondary'}>
                            {r.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {r.is_system ? (
                            <div className="flex items-center gap-1 text-muted-foreground" title="Perfil de sistema — somente leitura">
                              <Lock className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" className="p-0" onClick={() => openEdit(r)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="p-0 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remover perfil?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {r.name}. Perfis vinculados a usuários não podem ser removidos.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(r.id)}>
                                      Confirmar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <ListPagination
                page={listPage}
                totalPages={listTotalPages}
                total={listTotal}
                pageSize={API_PAGE_SIZE}
                onPageChange={setListPage}
                disabled={loading}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar perfil de acesso' : 'Novo perfil de acesso'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  placeholder="ex: Recepção Avançada"
                  {...register('name', { required: true })}
                  onChange={(e) => {
                    setValue('name', e.target.value);
                    if (!isEditing) setValue('slug', slugify(e.target.value));
                  }}
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" placeholder="reception-advanced" {...register('slug', { required: true })} />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" placeholder="Descrição do perfil" {...register('description')} />
            </div>
            <div className="flex items-center gap-2">
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <Switch id="is_active" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label htmlFor="is_active">Ativo</Label>
            </div>
            <div>
              <Label className="mb-2 block">Permissões</Label>
              {permissionsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : permissionsForbidden ? (
                <p className="text-sm text-muted-foreground">Não foi possível carregar as permissões disponíveis.</p>
              ) : (
                <Controller
                  name="permission_ids"
                  control={control}
                  render={({ field }) => (
                    <CheckboxMultiSelect
                      options={permissionOptions}
                      selected={field.value}
                      onChange={field.onChange}
                      emptyMessage="Nenhuma permissão cadastrada."
                    />
                  )}
                />
              )}
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-primary" disabled={!nameValue}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
