'use client';

import React, { useEffect, useRef, useState } from 'react';
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
import { Plus, Pencil, Trash2, Loader2, ChevronDown, X } from 'lucide-react';
import { API_PAGE_SIZE } from '@/lib/pagination';
import {
  useCreateUserMutation,
  useDeleteUserMutation,
  useStaffUsersQuery,
  useUpdateUserMutation,
  useUserAccessProfilesQuery,
  useSyncUserAccessProfilesMutation,
  type UserPayload,
} from '@/hooks/apiHooks/useUsers';
import { useAccessProfilesListQuery } from '@/hooks/apiHooks/useAccessProfiles';
import { CheckboxMultiSelect } from '@/components/checkbox-multi-select';
import { ListPagination } from '@/components/list-pagination';
import { getStoredUserRole } from '@/lib/role-permissions';
import { cn } from '@/lib/utils';
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
  const [listPage, setListPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, control, setValue, watch } = useForm<TeamUserFormValues>();

  const currentRole = getStoredUserRole();
  const canAssignAdmin = currentRole === 'admin' || currentRole === 'superadmin';
  const roleOptions = ASSIGNABLE_ROLES.filter((r) => r.value !== 'admin' || canAssignAdmin).map((r) => ({
    value: r.value,
    label: t(r.labelKey),
  }));

  const { data: usersPage, isLoading: loading, error: usersError } = useStaffUsersQuery(listPage);
  const forbidden = (usersError as ApiRequestError | null)?.response?.status === 403;
  const users = forbidden ? [] : (usersPage?.items ?? []);
  const listTotal = usersPage?.total ?? 0;
  const listTotalPages = usersPage?.totalPages ?? 1;

  const createUser = useCreateUserMutation();
  const updateUser = useUpdateUserMutation();
  const deleteUser = useDeleteUserMutation();
  const syncAccessProfiles = useSyncUserAccessProfilesMutation();

  const { data: accessProfiles, isLoading: accessProfilesLoading } = useAccessProfilesListQuery(modalVisible);
  const accessProfileOptions = (accessProfiles ?? []).map((profile) => ({
    value: profile.id,
    label: profile.name,
    description: profile.description,
  }));
  const selectedProfileIds = watch('accessProfileIds') ?? [];
  const selectedProfileLabels = accessProfileOptions
    .filter((o) => selectedProfileIds.includes(o.value))
    .map((o) => o.label);

  const [accessProfilesPanelOpen, setAccessProfilesPanelOpen] = useState(false);
  const [accessProfilesPanelPlacement, setAccessProfilesPanelPlacement] = useState<'top' | 'bottom'>('bottom');
  const accessProfilesPanelRef = useRef<HTMLDivElement>(null);
  const accessProfilesButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!accessProfilesPanelOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (accessProfilesPanelRef.current && !accessProfilesPanelRef.current.contains(event.target as Node)) {
        setAccessProfilesPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [accessProfilesPanelOpen]);

  // Estima se há espaço abaixo do botão; se não houver, abre o painel para cima.
  const toggleAccessProfilesPanel = () => {
    setAccessProfilesPanelOpen((wasOpen) => {
      const willOpen = !wasOpen;
      if (willOpen && accessProfilesButtonRef.current) {
        const rect = accessProfilesButtonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const estimatedPanelHeight = 340;
        setAccessProfilesPanelPlacement(
          spaceBelow < estimatedPanelHeight && spaceAbove > spaceBelow ? 'top' : 'bottom',
        );
      }
      return willOpen;
    });
  };

  const { data: editingUserAccessProfiles } = useUserAccessProfilesQuery(editingId, modalVisible && !!editingId);
  useEffect(() => {
    if (editingId && editingUserAccessProfiles) {
      setValue(
        'accessProfileIds',
        editingUserAccessProfiles.profiles.map((p) => p.id),
      );
    }
  }, [editingId, editingUserAccessProfiles, setValue]);

  useEffect(() => {
    if (usersError && (usersError as ApiRequestError).response?.status !== 403) {
      console.error('Error fetching users:', usersError);
      toast.error(t('team.loadError'));
    }
  }, [usersError, t]);

  const handleAdd = () => {
    setEditingId(null);
    reset({
      name: '',
      email: '',
      role: 'veterinarian',
      password: '',
      crmv: '',
      specialty: '',
      sipeagro_number: '',
      accessProfileIds: [],
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
      sipeagro_number: record.sipeagro_number ?? '',
      accessProfileIds: [],
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUser.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(t('team.removeError'));
    }
  };

  const onSubmit = async (values: TeamUserFormValues) => {
    const { accessProfileIds, ...userValues } = values;
    try {
      const payload: UserPayload = { ...userValues };
      let userId = editingId;
      if (editingId) {
        if (!payload.password?.trim()) delete payload.password;
        await updateUser.mutateAsync({ id: editingId, payload });
      } else {
        const created = await createUser.mutateAsync(payload);
        userId = created?.id ?? null;
      }
      if (userId) {
        await syncAccessProfiles.mutateAsync({ id: userId, profileIds: accessProfileIds ?? [] });
      }
      setModalVisible(false);
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <h1 className="text-2xl font-extrabold font-['InterDoFigma'] flex items-center gap-2">{t('team.title')}</h1>
        <Button onClick={handleAdd} className="w-full bg-primary sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> {t('team.newMember')}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
          Nenhum membro cadastrado.
        </div>
      ) : (
        <div>
          {/* Desktop / tablet: tabela */}
          <div className="hidden overflow-x-auto rounded-lg border border-gray-300 md:block">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>{t('team.colName')}</TableHead>
                  <TableHead>{t('team.colEmail')}</TableHead>
                  <TableHead>{t('team.colCrmv')}</TableHead>
                  <TableHead>{t('team.colSipeagro')}</TableHead>
                  <TableHead>{t('team.colSpecialty')}</TableHead>
                  <TableHead>{t('team.colRole')}</TableHead>
                  <TableHead>{t('team.colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow className="border-b border-gray-300 h-15" key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.crmv}</TableCell>
                    <TableCell>{user.sipeagro_number}</TableCell>
                    <TableCell>{user.specialty}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(user.role)}>
                        {t(`roles.${user.role}`, { defaultValue: user.role })}
                      </Badge>
                    </TableCell>
                    <TableCell>
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

          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {users.map((user) => (
              <div key={user.id} className="rounded-lg border border-gray-300 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge variant={roleBadgeVariant(user.role)} className="shrink-0">
                    {t(`roles.${user.role}`, { defaultValue: user.role })}
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('team.colCrmv')}</p>
                    <p>{user.crmv || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('team.colSipeagro')}</p>
                    <p>{user.sipeagro_number || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('team.colSpecialty')}</p>
                    <p className="truncate">{user.specialty || '—'}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-200 pt-2">
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
        <form id="team-create-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
          <div className="space-y-2">
            <Label>{t('team.formName')}</Label>
            <Input {...register('name', { required: true })} />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('team.formEmail')}</Label>
              <Input type="email" {...register('email', { required: true })} />
            </div>
            <div className="space-y-2">
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
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{editingId ? t('team.formPasswordOptional') : t('team.formPassword')}</Label>
              <Input
                type="password"
                {...register('password')}
                placeholder={editingId ? t('team.passwordPlaceholder') : ''}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('team.formCrmv')}</Label>
              <Input {...register('crmv')} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>{t('team.formSipeagro')}</Label>
              <Input maxLength={20} {...register('sipeagro_number')} />
              <p className="text-xs text-muted-foreground">{t('team.formSipeagroHint')}</p>
            </div>
            <div className="space-y-1">
              <Label>{t('team.formSpecialty')}</Label>
              <Input {...register('specialty')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('team.formAccessProfiles')}</Label>
            <p className="text-xs text-muted-foreground">{t('team.formAccessProfilesHint')}</p>
            <div className="relative" ref={accessProfilesPanelRef}>
              <Button
                ref={accessProfilesButtonRef}
                type="button"
                variant="outline"
                className="w-full justify-between font-normal"
                disabled={accessProfilesLoading}
                onClick={toggleAccessProfilesPanel}
              >
                <span className="truncate text-left">
                  {accessProfilesLoading
                    ? 'Carregando...'
                    : selectedProfileIds.length > 0
                      ? `${selectedProfileIds.length} perfil(is) selecionado(s)`
                      : 'Definir perfis de acesso'}
                </span>
                <ChevronDown className="w-4 h-4 shrink-0 opacity-60" />
              </Button>
              {accessProfilesPanelOpen && (
                <div
                  className={cn(
                    'absolute left-0 right-0 z-50 rounded-lg border border-gray-300 bg-white p-2 shadow-md',
                    accessProfilesPanelPlacement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1',
                  )}
                >
                  <div className="flex items-center justify-between px-1 pb-1">
                    <span className="text-xs font-medium text-muted-foreground">{t('team.formAccessProfiles')}</span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => setAccessProfilesPanelOpen(false)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <Controller
                    name="accessProfileIds"
                    control={control}
                    render={({ field }) => (
                      <CheckboxMultiSelect
                        options={accessProfileOptions}
                        selected={field.value ?? []}
                        onChange={field.onChange}
                        emptyMessage={t('team.formAccessProfilesEmpty')}
                        className="max-h-72 border-none p-0"
                      />
                    )}
                  />
                </div>
              )}
            </div>
            {selectedProfileLabels.length > 0 && (
              <p className="truncate text-xs text-muted-foreground">{selectedProfileLabels.join(', ')}</p>
            )}
          </div>
        </form>
      </DashboardCreateFormDialog>
    </div>
  );
}
