'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Info, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useReminderSettingsQuery,
  useSystemReminderDefaultsQuery,
  useSaveReminderSettingsMutation,
  useResetReminderSettingsMutation,
} from '@/hooks/apiHooks/useReminderSettings';
import type { ReminderSettings } from '@/app/types/reminder-settings';

const FIELD_INFO_KEYS: Record<keyof ReminderSettings, string> = {
  confirmation_enabled: 'confirmationEnabled',
  confirmation_hours_before: 'confirmationHoursBefore',
  reminder_enabled: 'reminderEnabled',
  reminder_hours_before: 'reminderHoursBefore',
  follow_up_enabled: 'followUpEnabled',
  follow_up_hours_after: 'followUpHoursAfter',
  follow_up_only_when_completed: 'followUpOnlyWhenCompleted',
};

function FieldLabel({ label, field }: { label: string; field: keyof ReminderSettings }) {
  const { t } = useTranslation();
  return (
    <span className="flex items-center gap-1">
      {label}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="size-3.5 cursor-help text-muted-foreground/60" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[240px] text-xs">
            {t(`settingsReminders.fieldInfo.${FIELD_INFO_KEYS[field]}`)}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
}

export default function RemindersSettingsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<ReminderSettings | null>(null);

  const { data: effective, isLoading: loading } = useReminderSettingsQuery();
  const { data: systemDefaults } = useSystemReminderDefaultsQuery();
  const saveMutation = useSaveReminderSettingsMutation();
  const resetMutation = useResetReminderSettingsMutation();
  const saving = saveMutation.isPending;
  const resetting = resetMutation.isPending;

  useEffect(() => {
    if (effective) setSettings(effective);
  }, [effective]);

  const handleSave = async () => {
    if (!settings) return;
    try {
      const saved = await saveMutation.mutateAsync(settings);
      setSettings(saved);
    } catch {
      toast.error(t('settingsReminders.saveError'));
    }
  };

  const handleReset = async () => {
    try {
      const reset = await resetMutation.mutateAsync();
      setSettings(reset);
    } catch {
      toast.error(t('settingsReminders.resetError'));
    }
  };

  const set = <K extends keyof ReminderSettings>(key: K, value: ReminderSettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  if (loading || !settings) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t('settingsReminders.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('settingsReminders.subtitle')}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('settingsReminders.confirmationTitle')}</CardTitle>
          <CardDescription>
            {t('settingsReminders.confirmationDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="conf_enabled">
              <FieldLabel label={t('settingsReminders.enableConfirmation')} field="confirmation_enabled" />
            </Label>
            <Switch
              id="conf_enabled"
              checked={settings.confirmation_enabled}
              onCheckedChange={(v) => set('confirmation_enabled', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="conf_hours">
              <FieldLabel label={t('settingsReminders.hoursBeforeAppointment')} field="confirmation_hours_before" />
            </Label>
            <Input
              id="conf_hours"
              type="number"
              min={1}
              max={72}
              className="w-20 text-right"
              value={settings.confirmation_hours_before}
              onChange={(e) => set('confirmation_hours_before', Number(e.target.value))}
              disabled={!settings.confirmation_enabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('settingsReminders.reminderTitle')}</CardTitle>
          <CardDescription>
            {t('settingsReminders.reminderDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="rem_enabled">
              <FieldLabel label={t('settingsReminders.enableReminder')} field="reminder_enabled" />
            </Label>
            <Switch
              id="rem_enabled"
              checked={settings.reminder_enabled}
              onCheckedChange={(v) => set('reminder_enabled', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="rem_hours">
              <FieldLabel label={t('settingsReminders.hoursBeforeAppointment')} field="reminder_hours_before" />
            </Label>
            <Input
              id="rem_hours"
              type="number"
              min={1}
              max={24}
              className="w-20 text-right"
              value={settings.reminder_hours_before}
              onChange={(e) => set('reminder_hours_before', Number(e.target.value))}
              disabled={!settings.reminder_enabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('settingsReminders.followUpTitle')}</CardTitle>
          <CardDescription>
            {t('settingsReminders.followUpDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="fu_enabled">
              <FieldLabel label={t('settingsReminders.enableFollowUp')} field="follow_up_enabled" />
            </Label>
            <Switch
              id="fu_enabled"
              checked={settings.follow_up_enabled}
              onCheckedChange={(v) => set('follow_up_enabled', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="fu_hours">
              <FieldLabel label={t('settingsReminders.hoursAfterAppointment')} field="follow_up_hours_after" />
            </Label>
            <Input
              id="fu_hours"
              type="number"
              min={0}
              max={72}
              className="w-20 text-right"
              value={settings.follow_up_hours_after}
              onChange={(e) => set('follow_up_hours_after', Number(e.target.value))}
              disabled={!settings.follow_up_enabled}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="fu_completed">
              <FieldLabel
                label={t('settingsReminders.onlyWhenCompleted')}
                field="follow_up_only_when_completed"
              />
            </Label>
            <Switch
              id="fu_completed"
              checked={settings.follow_up_only_when_completed}
              onCheckedChange={(v) => set('follow_up_only_when_completed', v)}
              disabled={!settings.follow_up_enabled}
            />
          </div>
        </CardContent>
      </Card>

      {systemDefaults && (
        <p className="text-xs text-muted-foreground">
          {t('settingsReminders.systemDefault', {
            confirmation: systemDefaults.confirmation_hours_before,
            reminder: systemDefaults.reminder_hours_before,
            followUp: systemDefaults.follow_up_hours_after,
          })}
        </p>
      )}

      <Separator />

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={handleReset} disabled={resetting}>
          {resetting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RotateCcw className="mr-2 size-4" />}
          {t('settingsReminders.resetToDefault')}
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
          {t('settingsReminders.saveSettings')}
        </Button>
      </div>
    </div>
  );
}
