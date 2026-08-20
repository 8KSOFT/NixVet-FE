'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DashboardCreateFormDialog } from '@/components/dashboard-create-form-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import { API_PAGE_SIZE } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';
import {
  useWorkflowConfigsPagedQuery,
  useCreateWorkflowConfigMutation,
  useDeleteWorkflowConfigMutation,
} from '@/hooks/apiHooks/useWorkflowConfigs';

const ACTION_TYPES = [
  { value: 'send_whatsapp', labelKey: 'settingsAutomations.actionTypes.sendWhatsapp' },
  { value: 'send_email', labelKey: 'settingsAutomations.actionTypes.sendEmail' },
  { value: 'create_task', labelKey: 'settingsAutomations.actionTypes.createTask' },
  { value: 'create_notification', labelKey: 'settingsAutomations.actionTypes.createNotification' },
];

type FormValues = {
  event_name: string;
  action_type: string;
  delay_minutes: number;
  channel?: string;
  template_message?: string;
  description?: string;
  is_active: boolean;
};

export default function SettingsAutomationsPage() {
  const { t } = useTranslation();
  const [listPage, setListPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    defaultValues: { delay_minutes: 0, is_active: true },
  });

  const { data, isLoading: loading } = useWorkflowConfigsPagedQuery(listPage);
  const list = data?.items ?? [];
  const listTotal = data?.total ?? 0;
  const listTotalPages = data?.totalPages ?? 1;
  const createMutation = useCreateWorkflowConfigMutation();
  const deleteMutation = useDeleteWorkflowConfigMutation();

  const onSubmit = async (values: FormValues) => {
    try {
      await createMutation.mutateAsync({
        event_name: values.event_name,
        action_type: values.action_type,
        delay_minutes: Number(values.delay_minutes) || 0,
        channel: values.channel || undefined,
        template_message: values.template_message || undefined,
        description: values.description || undefined,
        is_active: values.is_active !== false,
      });
      setModalOpen(false);
      reset();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('settingsAutomations.saveError')));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('settingsAutomations.deleteError')));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold mb-6">{t('settingsAutomations.title')}</h1>
      <Card className="rounded-none border-0 bg-transparent py-0 shadow-none sm:rounded-xl sm:border sm:border-border/80 sm:bg-card sm:py-6 sm:shadow-(--shadow-card)">
        <CardContent className="px-0 pt-0 sm:px-6 sm:pt-6">
          <p className="text-muted-foreground mb-4">{t('settingsAutomations.description')}</p>
          <Button onClick={() => setModalOpen(true)} className="mb-4 w-full bg-primary sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> {t('settingsAutomations.newRuleButton')}
          </Button>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : list.length === 0 ? (
            <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
              {t('settingsAutomations.emptyState')}
            </div>
          ) : (
            <div>
            {/* Desktop / tablet: tabela */}
            <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>{t('settingsAutomations.tableHeaderEvent')}</TableHead>
                  <TableHead>{t('settingsAutomations.tableHeaderAction')}</TableHead>
                  <TableHead className="w-[100px]">{t('settingsAutomations.tableHeaderDelay')}</TableHead>
                  <TableHead>{t('settingsAutomations.tableHeaderChannel')}</TableHead>
                  <TableHead>{t('settingsAutomations.tableHeaderActive')}</TableHead>
                  <TableHead className="w-[80px]">{t('settingsAutomations.tableHeaderActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((r) => (
                  <TableRow className="border-b border-gray-300 h-15" key={r.id}>
                    <TableCell>{r.event_name}</TableCell>
                    <TableCell>{r.action_type}</TableCell>
                    <TableCell>{r.delay_minutes}</TableCell>
                    <TableCell>{r.channel}</TableCell>
                    <TableCell>{r.is_active ? t('settingsAutomations.yes') : t('settingsAutomations.no')}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.event_name}</p>
                      <p className="text-xs text-muted-foreground">{r.action_type} · {r.channel}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="shrink-0 text-red-600 hover:text-red-700" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>{t('settingsAutomations.delayMinutesShort', { minutes: r.delay_minutes })}</span>
                    <span>{r.is_active ? t('settingsAutomations.active') : t('settingsAutomations.inactive')}</span>
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

      <DashboardCreateFormDialog
        open={modalOpen}
        onOpenChange={(open) => { setModalOpen(open); if (!open) reset(); }}
        title={t('settingsAutomations.createDialogTitle')}
        contentClassName="modal-responsive"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="border border-gray-300"
              onClick={() => setModalOpen(false)}
            >
              {t('settingsAutomations.cancelButton')}
            </Button>
            <Button type="submit" form="automation-form" className="bg-primary">
              {t('settingsAutomations.createButton')}
            </Button>
          </div>
        }
      >
        <form id="automation-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
          <div className="space-y-2">
            <Label htmlFor="event_name">{t('settingsAutomations.eventNameLabel')}</Label>
            <Input id="event_name" placeholder={t('settingsAutomations.eventNamePlaceholder')} {...register('event_name', { required: true })} />
            {errors.event_name && <p className="text-sm text-destructive">{t('settingsAutomations.requiredField')}</p>}
          </div>
          <div className="space-y-2">
            <Label>{t('settingsAutomations.actionTypeLabel')}</Label>
            <Controller
              name="action_type"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('settingsAutomations.selectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{t(type.labelKey)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.action_type && <p className="text-sm text-destructive">{t('settingsAutomations.requiredField')}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="delay_minutes">{t('settingsAutomations.delayMinutesLabel')}</Label>
            <Input id="delay_minutes" type="number" min={0} {...register('delay_minutes', { required: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="channel">{t('settingsAutomations.channelLabel')}</Label>
            <Input id="channel" placeholder={t('settingsAutomations.channelPlaceholder')} {...register('channel')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template_message">{t('settingsAutomations.templateMessageLabel')}</Label>
            <Textarea id="template_message" rows={2} placeholder={t('settingsAutomations.templateMessagePlaceholder')} {...register('template_message')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('settingsAutomations.descriptionLabel')}</Label>
            <Input id="description" placeholder={t('settingsAutomations.descriptionPlaceholder')} {...register('description')} />
          </div>
          <div className="flex items-center gap-2">
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <Switch id="is_active" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="is_active">{t('settingsAutomations.activeSwitchLabel')}</Label>
          </div>
        </form>
      </DashboardCreateFormDialog>
    </div>
  );
}
