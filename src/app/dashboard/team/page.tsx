'use client';

import React, { useEffect, useState } from 'react';
import type { ApiRequestError } from '@/app/types/api-error';
import type { TeamAssignableRole, TeamUserFormValues, TeamUserRow } from '@/app/types/team-user';
import { DashboardCreateFormDialog } from '@/components/dashboard-create-form-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { Plus, Pencil, Trash2, Loader2, Users } from 'lucide-react';
import api from '@/lib/axios';
import { API_PAGE_SIZE, listQueryParams, parseListResponse } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';
import { getStoredUserRole } from '@/lib/role-permissions';
import { useTranslation } from 'react-i18next';

const ASSIGNABLE_ROLES = [
  { value: 'veterinarian', labelKey: 'roles.veterinarian' },
  { value: 'reception', labelKey: 'roles.reception' },
  { value: 'intern', labelKey: 'roles.intern' },
  { value: 'manager', labelKey: 'roles.manager' },
  { value: 'admin', labelKey: 'roles.admin' },
] as const satisfies readonly TeamAssignableRole[];

function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
  const typedError = error as ApiRequestError;
  const responseMessage = typedError.response?.data?.message;

  if (Array.isArray(responseMessage)) {
    return responseMessage[0] ?? fallbackMessage;
  }

  return responseMessage ?? typedError.message ?? fallbackMessage;
}

export default function TeamPage() {
  const { t } = useTranslation('common');
  const [users, setUsers] = useState<TeamUserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [listTotal, setListTotal] = useState(0);
  const [listTotalPages, setListTotalPages] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const { register, handleSubmit, reset, control } = useForm<TeamUserFormValues>();

  const currentRole = getStoredUserRole();
  const canAssignAdmin = currentRole === 'admin' || currentRole === 'superadmin';
  const roleOptions = ASSIGNABLE_ROLES.filter((r) => r.value !== 'admin' || canAssignAdmin).map((r) => ({
    value: r.value,
    label: t(r.labelKey),
  }));

  const fetchUsers = async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const response = await api.get('/users/staff', {
        params: listQueryParams(listPage),
      });
      const p = parseListResponse<TeamUserRow>(response.data, listPage);
      setUsers(p.items);
      setListTotal(p.total);
      setListTotalPages(p.totalPages);
    } catch (error: unknown) {
      const statusCode = (error as ApiRequestError).response?.status;
      if (statusCode === 403) {
        setForbidden(true);
        setUsers([]);
      } else {
        console.error('Error fetching users:', error);
        toast.error(t('team.loadError'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [listPage]);

  const handleAdd = () => {
    setEditingId(null);
    reset({
      name: '',
      email: '',
      role: 'veterinarian',
      password: '',
      crmv: '',
      specialty: '',
    });
    setModalVisible(true);
  };

  const handleEdit = (record: TeamUserRow) => {
    setEditingId(record.id);
    reset({
      name: record.name,
      email: record.email,
      role: record.role,
      password: '',
      crmv: record.crmv ?? '',
      specialty: record.specialty ?? '',
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/users/${id}`);
      toast.success(t('team.removed'));
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(t('team.removeError'));
    }
  };

  const onSubmit = async (values: TeamUserFormValues) => {
    try {
      const payload: Record<string, string> = { ...values };
      if (editingId) {
        if (!payload.password?.trim()) delete payload.password;
        await api.put(`/users/${editingId}`, payload);
        toast.success(t('team.updated'));
      } else {
        await api.post('/users', payload);
        toast.success(t('team.created'));
      }
      setModalVisible(false);
      fetchUsers();
    } catch (error: unknown) {
      console.error('Error saving user:', error);
      toast.error(getApiErrorMessage(error, t('team.saveError')));
    }
  };

  const roleBadgeVariant = (
    role: string,
  ): 'admin' | 'manager' | 'veterinarian' | 'reception' | 'intern' | 'secondary' | 'default' => {
    if (role === 'admin' || role === 'superadmin') return 'admin';
    if (role === 'manager') return 'manager';
    if (role === 'reception') return 'reception';
    if (role === 'intern') return 'intern';
    return 'veterinarian';
  };

  if (forbidden) {
    return (
      <div>
        <h1 className="text-2xl font-heading font-bold mb-4 flex items-center gap-2">{t('team.title')}</h1>
        <p className="text-muted-foreground">{t('team.forbidden')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-extrabold font-['InterDoFigma'] flex items-center gap-2">{t('team.title')}</h1>
        <Button onClick={handleAdd} className="bg-primary">
          <Plus className="w-4 h-4 mr-2" /> {t('team.newMember')}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div>
          <div className="rounded-md border border-gray-300 overflow-hidden">
            <Table>
              <TableHeader className="h-15">
                <TableRow className="border-b border-gray-300">
                  <TableHead>{t('team.colName')}</TableHead>
                  <TableHead>{t('team.colEmail')}</TableHead>
                  <TableHead>{t('team.colCrmv')}</TableHead>
                  <TableHead>{t('team.colSpecialty')}</TableHead>
                  <TableHead>{t('team.colRole')}</TableHead>
                  <TableHead>{t('team.colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-b border-gray-300">
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.crmv}</TableCell>
                    <TableCell>{user.specialty}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(user.role)}>
                        {t(`roles.${user.role}`, { defaultValue: user.role })}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-40">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="p-0" onClick={() => handleEdit(user)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="p-0">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('team.confirmRemove')}</AlertDialogTitle>
                              <AlertDialogDescription>{user.name}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(user.id)}>Confirmar</AlertDialogAction>
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

      <DashboardCreateFormDialog
        open={modalVisible}
        onOpenChange={setModalVisible}
        title={editingId ? t('team.editTitle') : t('team.newTitle')}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setModalVisible(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="team-create-form">
              Salvar
            </Button>
          </div>
        }
      >
        <form id="team-create-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>{t('team.formName')}</Label>
            <Input {...register('name', { required: true })} />
          </div>
          <div>
            <Label>{t('team.formEmail')}</Label>
            <Input type="email" {...register('email', { required: true })} />
          </div>
          <div>
            <Label>{t('team.formRole')}</Label>
            <Controller
              name="role"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('team.formRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground mt-1">{t('team.formRoleHint')}</p>
          </div>
          <div>
            <Label>{editingId ? t('team.formPasswordOptional') : t('team.formPassword')}</Label>
            <Input
              type="password"
              {...register('password')}
              placeholder={editingId ? t('team.passwordPlaceholder') : ''}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('team.formCrmv')}</Label>
              <Input {...register('crmv')} />
            </div>
            <div>
              <Label>{t('team.formSpecialty')}</Label>
              <Input {...register('specialty')} />
            </div>
          </div>
        </form>
      </DashboardCreateFormDialog>
    </div>
  );
}
