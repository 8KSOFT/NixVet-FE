'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { Plus, Loader2 } from 'lucide-react';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import { API_PAGE_SIZE } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';
import { useResourcesPagedQuery, useCreateResourceMutation } from '@/hooks/apiHooks/useResources';

interface ResourceFormValues {
  name: string;
  type: string;
}

export default function SettingsResourcesPage() {
  const { t } = useTranslation();
  const [listPage, setListPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const form = useForm<ResourceFormValues>();

  const TYPES = [
    { value: 'room', label: t('settingsResources.typeRoom') },
    { value: 'surgery_room', label: t('settingsResources.typeSurgeryRoom') },
    { value: 'equipment', label: t('settingsResources.typeEquipment') },
  ];

  const { data, isLoading: loading } = useResourcesPagedQuery(listPage);
  const list = data?.items ?? [];
  const listTotal = data?.total ?? 0;
  const listTotalPages = data?.totalPages ?? 1;
  const createMutation = useCreateResourceMutation();

  const onFinish = async (values: ResourceFormValues) => {
    try {
      await createMutation.mutateAsync(values);
      setModalOpen(false);
      form.reset();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('settingsResources.saveError')));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-primary mb-6">{t('settingsResources.title')}</h1>
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground mb-4">{t('settingsResources.description')}</p>
          <Button
            onClick={() => {
              form.reset();
              setModalOpen(true);
            }}
            className="mb-4 w-full bg-primary sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" /> {t('settingsResources.newResource')}
          </Button>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : list.length === 0 ? (
            <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
              {t('settingsResources.emptyState')}
            </div>
          ) : (
            <div>
            <div className="overflow-x-auto rounded-lg border border-gray-300">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>{t('settingsResources.columnName')}</TableHead>
                  <TableHead>{t('settingsResources.columnType')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => (
                  <TableRow className="border-b border-gray-300 h-15" key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{TYPES.find((x) => x.value === r.type)?.label ?? r.type}</TableCell>
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
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settingsResources.newResource')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onFinish)} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label>{t('settingsResources.nameLabel')}</Label>
              <Input {...form.register('name', { required: true })} placeholder={t('settingsResources.namePlaceholder')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('settingsResources.typeLabel')}</Label>
              <Controller
                name="type"
                control={form.control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('settingsResources.selectPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <Button type="submit" className="bg-primary">
              {t('settingsResources.save')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
