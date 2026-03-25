'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { Plus, Pencil, Trash2, Loader2, Users } from 'lucide-react';
import api from '@/lib/axios';
import { getStoredUserRole } from '@/lib/role-permissions';
import { useTranslation } from 'react-i18next';

interface UserRow {
  id: string;
  name: string;
  email: string;
  crmv?: string;
  specialty?: string;
  role: string;
}

interface UserFormValues {
  name: string;
  email: string;
  role: string;
  password: string;
  crmv?: string;
  specialty?: string;
}

const ASSIGNABLE_ROLES = [
  { value: 'veterinarian', labelKey: 'roles.veterinarian' },
  { value: 'reception', labelKey: 'roles.reception' },
  { value: 'intern', labelKey: 'roles.intern' },
  { value: 'manager', labelKey: 'roles.manager' },
  { value: 'admin', labelKey: 'roles.admin' },
] as const;

export default function TeamPage() {
  const { t } = useTranslation('common');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const { register, handleSubmit, reset, control } = useForm<UserFormValues>();

  const currentRole = getStoredUserRole();
  const canAssignAdmin = currentRole === 'admin' || currentRole === 'superadmin';
  const roleOptions = ASSIGNABLE_ROLES.filter(
    (r) => r.value !== 'admin' || canAssignAdmin,
  ).map((r) => ({
    value: r.value,
    label: t(r.labelKey),
  }));

  const fetchUsers = async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const response = await api.get<UserRow[]>('/users/staff');
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      if (error.response?.status === 403) {
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
  }, []);

  const handleAdd = () => {
    setEditingId(null);
    reset({ name: '', email: '', role: 'veterinarian', password: '', crmv: '', specialty: '' });
    setModalVisible(true);
  };

  const handleEdit = (record: UserRow) => {
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

  const onSubmit = async (values: UserFormValues) => {
    try {
      const payload: Record<string, string> = { ...values } as Record<string, string>;
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
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast.error(error.response?.data?.message || t('team.saveError'));
    }
  };

  const roleBadgeVariant = (role: string): 'destructive' | 'secondary' | 'default' => {
    if (role === 'admin' || role === 'superadmin') return 'destructive';
    if (role === 'manager') return 'secondary';
    return 'default';
  };

  if (forbidden) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-blue-600 mb-4 flex items-center gap-2">
          <Users className="w-6 h-6" /> {t('team.title')}
        </h1>
        <p className="text-slate-600">{t('team.forbidden')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
          <Users className="w-6 h-6" /> {t('team.title')}
        </h1>
        <Button onClick={handleAdd} className="bg-blue-600">
          <Plus className="w-4 h-4 mr-2" /> {t('team.newMember')}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
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
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.crmv}</TableCell>
                <TableCell>{user.specialty}</TableCell>
                <TableCell>
                  <Badge variant={roleBadgeVariant(user.role)}>
                    {t(`roles.${user.role}`, { defaultValue: user.role })}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleEdit(user)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon">
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
                          <AlertDialogAction onClick={() => handleDelete(user.id)}>
                            Confirmar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={modalVisible} onOpenChange={setModalVisible}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? t('team.editTitle') : t('team.newTitle')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalVisible(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
