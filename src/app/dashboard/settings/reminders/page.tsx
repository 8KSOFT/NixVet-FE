'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
import api from '@/lib/axios';

interface ReminderSettings {
  confirmation_enabled: boolean;
  confirmation_hours_before: number;
  reminder_enabled: boolean;
  reminder_hours_before: number;
  follow_up_enabled: boolean;
  follow_up_hours_after: number;
  follow_up_only_when_completed: boolean;
}

const FIELD_INFO: Record<keyof ReminderSettings, string> = {
  confirmation_enabled: 'Envia mensagem de confirmação de presença antes da consulta.',
  confirmation_hours_before: 'Quantas horas antes da consulta o responsável recebe o pedido de confirmação.',
  reminder_enabled: 'Envia lembrete próximo ao horário da consulta com o tempo restante.',
  reminder_hours_before: 'Quantas horas antes da consulta enviar o lembrete.',
  follow_up_enabled: 'Envia mensagem de acompanhamento após a consulta.',
  follow_up_hours_after: 'Quantas horas após a consulta (quando marcada como concluída) enviar o acompanhamento.',
  follow_up_only_when_completed: 'Se ativo, o acompanhamento só é enviado quando a consulta for marcada como Concluída no sistema.',
};

function FieldLabel({ label, field }: { label: string; field: keyof ReminderSettings }) {
  return (
    <span className="flex items-center gap-1">
      {label}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="size-3.5 cursor-help text-muted-foreground/60" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[240px] text-xs">{FIELD_INFO[field]}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
}

export default function RemindersSettingsPage() {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [systemDefaults, setSystemDefaults] = useState<ReminderSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<ReminderSettings>('/settings/reminders'),
      api.get<ReminderSettings>('/settings/reminders/system'),
    ])
      .then(([eff, sys]) => {
        setSettings(eff.data);
        setSystemDefaults(sys.data);
      })
      .catch(() => toast.error('Erro ao carregar configurações de lembretes.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await api.put<ReminderSettings>('/settings/reminders', settings);
      setSettings(res.data);
      toast.success('Configurações salvas com sucesso.');
    } catch {
      toast.error('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await api.delete('/settings/reminders');
      const res = await api.get<ReminderSettings>('/settings/reminders');
      setSettings(res.data);
      toast.success('Configurações redefinidas para o padrão do sistema.');
    } catch {
      toast.error('Erro ao redefinir configurações.');
    } finally {
      setResetting(false);
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
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Lembretes de Consulta</h1>
          <p className="text-sm text-muted-foreground">
            Configure quando e como os lembretes automáticos são enviados via WhatsApp.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Confirmação de presença</CardTitle>
          <CardDescription>
            Enviada antes da consulta para confirmar se o responsável comparecerá.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="conf_enabled">
              <FieldLabel label="Ativar confirmação" field="confirmation_enabled" />
            </Label>
            <Switch
              id="conf_enabled"
              checked={settings.confirmation_enabled}
              onCheckedChange={(v) => set('confirmation_enabled', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="conf_hours">
              <FieldLabel label="Horas antes da consulta" field="confirmation_hours_before" />
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
          <CardTitle className="text-base">Lembrete próximo ao horário</CardTitle>
          <CardDescription>
            Mensagem enviada horas antes com o tempo restante até a consulta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="rem_enabled">
              <FieldLabel label="Ativar lembrete" field="reminder_enabled" />
            </Label>
            <Switch
              id="rem_enabled"
              checked={settings.reminder_enabled}
              onCheckedChange={(v) => set('reminder_enabled', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="rem_hours">
              <FieldLabel label="Horas antes da consulta" field="reminder_hours_before" />
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
          <CardTitle className="text-base">Acompanhamento pós-consulta</CardTitle>
          <CardDescription>
            Mensagem enviada após a consulta perguntando como está o pet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="fu_enabled">
              <FieldLabel label="Ativar acompanhamento" field="follow_up_enabled" />
            </Label>
            <Switch
              id="fu_enabled"
              checked={settings.follow_up_enabled}
              onCheckedChange={(v) => set('follow_up_enabled', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="fu_hours">
              <FieldLabel label="Horas após a consulta" field="follow_up_hours_after" />
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
                label="Somente quando consulta for marcada como concluída"
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
          Padrão do sistema: confirmação {systemDefaults.confirmation_hours_before}h antes •
          lembrete {systemDefaults.reminder_hours_before}h antes •
          acompanhamento {systemDefaults.follow_up_hours_after}h após
        </p>
      )}

      <Separator />

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={handleReset} disabled={resetting}>
          {resetting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RotateCcw className="mr-2 size-4" />}
          Redefinir para padrão
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
          Salvar configurações
        </Button>
      </div>
    </div>
  );
}
