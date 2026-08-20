'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import { API_PAGE_SIZE } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';
import {
  useAppointmentTypesPagedQuery,
  useCreateAppointmentTypeMutation,
  useUpdateAppointmentTypeMutation,
  useDeleteAppointmentTypeMutation,
} from '@/hooks/apiHooks/useAppointmentTypes';
import type { AppointmentType } from '@/app/types/appointment-type';

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#64748b',
];

type FormValues = { name: string; duration_minutes: number; color?: string };

export default function AppointmentTypesPage() {
  const { t } = useTranslation();
  const [listPage, setListPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentType | null>(null);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: { duration_minutes: 30, color: '#3b82f6' },
  });

  const { data, isLoading: loading } = useAppointmentTypesPagedQuery(listPage);
  const list = data?.items ?? [];
  const listTotal = data?.total ?? 0;
  const listTotalPages = data?.totalPages ?? 1;
  const createMutation = useCreateAppointmentTypeMutation();
  const updateMutation = useUpdateAppointmentTypeMutation();
  const deleteMutation = useDeleteAppointmentTypeMutation();

  const openNew = () => {
    setEditing(null);
    reset({ name: '', duration_minutes: 30, color: '#3b82f6' });
    setModalOpen(true);
  };

  const openEdit = (row: AppointmentType) => {
    setEditing(row);
    reset({ name: row.name, duration_minutes: row.duration_minutes, color: row.color ?? '#3b82f6' });
    setModalOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      setModalOpen(false);
      reset();
      setEditing(null);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('settingsAppointmentTypes.saveError')));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('settingsAppointmentTypes.removeError')));
    }
  };

  const formatDuration = (d: number) => {
    if (d < 60) return t('settingsAppointmentTypes.durationMin', { value: d });
    const h = Math.floor(d / 60);
    const m = d % 60;
    return m > 0
      ? t('settingsAppointmentTypes.durationHoursMin', { hours: h, minutes: m })
      : t('settingsAppointmentTypes.durationHours', { hours: h });
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-primary mb-6">{t('settingsAppointmentTypes.title')}</h1>
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground mb-4">
            {t('settingsAppointmentTypes.description')}
          </p>
          <Button onClick={openNew} className="mb-4 w-full bg-primary sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> {t('settingsAppointmentTypes.newType')}
          </Button>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div>
            {/* Desktop / tablet: tabela */}
            <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>{t('settingsAppointmentTypes.colName')}</TableHead>
                  <TableHead>{t('settingsAppointmentTypes.colDuration')}</TableHead>
                  <TableHead>{t('settingsAppointmentTypes.color')}</TableHead>
                  <TableHead>{t('settingsAppointmentTypes.colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => (
                  <TableRow className="border-b border-gray-300 h-15" key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {r.color && (
                          <span
                            style={{ background: r.color, width: 14, height: 14, borderRadius: 3, display: 'inline-block' }}
                          />
                        )}
                        {r.name}
                      </div>
                    </TableCell>
                    <TableCell>{formatDuration(r.duration_minutes)}</TableCell>
                    <TableCell>
                      {r.color ? (
                        <Badge style={{ background: r.color, color: '#fff', borderColor: r.color }}>{r.color}</Badge>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('settingsAppointmentTypes.deleteConfirmTitle')}</AlertDialogTitle>
                              <AlertDialogDescription>{t('settingsAppointmentTypes.deleteConfirmDescription')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('settingsAppointmentTypes.cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(r.id)}>{t('settingsAppointmentTypes.remove')}</AlertDialogAction>
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
            <div className="space-y-2 md:hidden">
              {list.map((r) => (
                <div key={r.id} className="rounded-lg border border-gray-300 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {r.color && (
                        <span
                          style={{ background: r.color, width: 14, height: 14, borderRadius: 3 }}
                          className="shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{formatDuration(r.duration_minutes)}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('settingsAppointmentTypes.deleteConfirmTitle')}</AlertDialogTitle>
                            <AlertDialogDescription>{t('settingsAppointmentTypes.deleteConfirmDescription')}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('settingsAppointmentTypes.cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(r.id)}>{t('settingsAppointmentTypes.remove')}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t('settingsAppointmentTypes.editTitle') : t('settingsAppointmentTypes.newTitleModal')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">{t('settingsAppointmentTypes.nameLabel')}</Label>
              <Input id="name" placeholder={t('settingsAppointmentTypes.namePlaceholder')} {...register('name', { required: true })} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{t('settingsAppointmentTypes.requiredField')}</p>}
            </div>
            <div>
              <Label htmlFor="duration_minutes">{t('settingsAppointmentTypes.durationLabel')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="duration_minutes"
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  {...register('duration_minutes', { required: true, valueAsNumber: true })}
                />
                <span className="text-sm text-muted-foreground">{t('settingsAppointmentTypes.minutesUnit')}</span>
              </div>
              {errors.duration_minutes && <p className="text-red-500 text-xs mt-1">{t('settingsAppointmentTypes.requiredField')}</p>}
            </div>
            <div>
              <Label htmlFor="color">{t('settingsAppointmentTypes.color')}</Label>
              <Input id="color" type="color" className="w-24 h-10 p-1 cursor-pointer" {...register('color')} />
              <div className="flex flex-wrap gap-2 mt-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setValue('color', c)}
                    style={{ background: c, width: 28, height: 28, borderRadius: 4, border: '2px solid #e5e7eb', cursor: 'pointer' }}
                    title={c}
                  />
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-primary">
                {editing ? t('settingsAppointmentTypes.save') : t('settingsAppointmentTypes.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
