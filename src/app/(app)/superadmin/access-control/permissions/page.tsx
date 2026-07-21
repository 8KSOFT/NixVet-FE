'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Pencil, Trash2, Loader2, ShieldCheck } from 'lucide-react';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import { API_PAGE_SIZE } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';
import {
  usePermissionsPagedQuery,
  useCreatePermissionMutation,
  useUpdatePermissionMutation,
  useDeletePermissionMutation,
} from '@/hooks/apiHooks/usePermissions';
import type { Permission, PermissionPayload } from '@/app/types/permission';
import { getStoredUserRole } from '@/lib/role-permissions';

type FormValues = {
  key: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  is_active: boolean;
};

export default function AccessControlPermissionsPage() {
  const router = useRouter();
  const [listPage, setListPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { is_active: true } });

  const { data, isLoading: loading, error } = usePermissionsPagedQuery(listPage);
  const list = data?.items ?? [];
  const listTotal = data?.total ?? 0;
  const listTotalPages = data?.totalPages ?? 1;

  const createMutation = useCreatePermissionMutation();
  const updateMutation = useUpdatePermissionMutation();
  const deleteMutation = useDeletePermissionMutation();

  useEffect(() => {
    const role = getStoredUserRole();
    if (role !== 'superadmin') {
      toast.error(
        `Você está logado como "${role ?? 'desconhecido'}". Apenas superadmin pode gerenciar o catálogo de permissões.`,
      );
      router.replace('/dashboard');
    }
  }, [router]);

  useEffect(() => {
    if (!error) return;
    const err = error as { response?: { status?: number } };
    if (err.response?.status === 403) {
      toast.error('Apenas superadmin pode acessar o catálogo de permissões.');
      router.replace('/dashboard');
      return;
    }
    toast.error('Falha ao carregar permissões');
  }, [error, router]);

  const openCreate = () => {
    setEditingId(null);
    reset({ key: '', name: '', description: '', resource: '', action: '', is_active: true });
    setModalOpen(true);
  };

  const openEdit = (row: Permission) => {
    setEditingId(row.id);
    reset({
      key: row.key,
      name: row.name,
      description: row.description ?? '',
      resource: row.resource,
      action: row.action,
      is_active: row.is_active,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao remover permissão'));
    }
  };

  const onSubmit = async (values: FormValues) => {
    const payload: PermissionPayload = {
      key: values.key.trim(),
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      resource: values.resource.trim(),
      action: values.action.trim(),
      is_active: values.is_active,
    };
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setModalOpen(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar permissão'));
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="mb-2 flex items-center gap-2 text-2xl font-heading font-bold">
            Catálogo de Permissões
          </h1>
          <p className="text-sm text-muted-foreground">
            Painel exclusivo do superadmin — gerencia as permissões disponíveis para montar perfis de acesso dos
            tenants.
          </p>
        </div>
        <Button onClick={openCreate} className="w-full bg-primary sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> Nova permissão
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
          Nenhuma permissão cadastrada.
        </div>
      ) : (
        <div>
          {/* Desktop / tablet: tabela */}
          <div className="hidden overflow-x-auto rounded-lg border border-gray-300 md:block">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>Chave</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Recurso</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-30">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => (
                  <TableRow className="border-b border-gray-300 h-15" key={r.id}>
                    <TableCell className="font-mono text-xs">{r.key}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.resource}</TableCell>
                    <TableCell>{r.action}</TableCell>
                    <TableCell>
                      <Badge variant={r.is_system ? 'secondary' : 'default'}>
                        {r.is_system ? 'Sistema' : 'Customizada'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.is_active ? 'default' : 'secondary'}>
                        {r.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell>
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
                              <AlertDialogTitle>Remover permissão?</AlertDialogTitle>
                              <AlertDialogDescription>{r.name}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(r.id)}>Confirmar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {list.map((r) => (
              <div key={r.id} className="rounded-lg border border-gray-300 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.name}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">{r.key}</p>
                  </div>
                  <Badge variant={r.is_active ? 'default' : 'secondary'} className="shrink-0">
                    {r.is_active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Recurso</p>
                    <p className="truncate">{r.resource}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ação</p>
                    <p className="truncate">{r.action}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Origem</p>
                    <Badge variant={r.is_system ? 'secondary' : 'default'}>
                      {r.is_system ? 'Sistema' : 'Customizada'}
                    </Badge>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-200 pt-2">
                  <Button variant="ghost" size="icon" className="p-0" onClick={() => openEdit(r)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="p-0 text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover permissão?</AlertDialogTitle>
                        <AlertDialogDescription>{r.name}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(r.id)}>Confirmar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>

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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar permissão' : 'Nova permissão'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="key">Chave</Label>
              <Input id="key" placeholder="ex: users.export" {...register('key', { required: true })} />
              {errors.key && <p className="text-red-500 text-xs mt-1">Campo obrigatório</p>}
            </div>
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" placeholder="ex: Exportar usuários" {...register('name', { required: true })} />
              {errors.name && <p className="text-red-500 text-xs mt-1">Campo obrigatório</p>}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="resource">Recurso</Label>
                <Input id="resource" placeholder="ex: users" {...register('resource', { required: true })} />
                {errors.resource && <p className="text-red-500 text-xs mt-1">Campo obrigatório</p>}
              </div>
              <div>
                <Label htmlFor="action">Ação</Label>
                <Input id="action" placeholder="ex: export" {...register('action', { required: true })} />
                {errors.action && <p className="text-red-500 text-xs mt-1">Campo obrigatório</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" placeholder="Descrição da permissão" {...register('description')} />
            </div>
            <div className="flex items-center gap-2">
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <Switch id="is_active" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label htmlFor="is_active">Ativa</Label>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-primary">
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
