'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
      toast.success('Permissão removida');
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
        toast.success('Permissão atualizada');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Permissão criada');
      }
      setModalOpen(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar permissão'));
    }
  };

  return (
    <div>
      <h1 className="mb-2 flex items-center gap-2 text-2xl font-heading font-bold text-primary">
        <ShieldCheck className="h-6 w-6" /> Catálogo de Permissões
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Painel exclusivo do superadmin — gerencia as permissões disponíveis para montar perfis de acesso dos tenants.
      </p>
      <Card>
        <CardContent className="pt-6">
          <Button onClick={openCreate} className="mb-4 bg-primary">
            <Plus className="w-4 h-4 mr-2" /> Nova permissão
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
                    <TableHead>Chave</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Recurso</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhuma permissão cadastrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    list.map((r) => (
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
