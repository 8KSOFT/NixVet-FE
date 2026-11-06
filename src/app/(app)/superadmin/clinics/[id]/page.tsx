'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ArrowLeft, ShieldCheck, ShieldOff, Loader2, Save, KeyRound,
} from 'lucide-react';
import {
  useSuperadminTenantQuery,
  usePatchSuperadminTenantMutation,
  useResetSuperadminTenantAdminPasswordMutation,
} from '@/hooks/apiHooks/useSuperadminTenants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { usePlanOptions, usePlanShortLabel } from '@/lib/i18n/plans';
import { exibirTelefone } from '@/lib/telefone';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  exempt: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  trial: 'bg-blue-100 text-blue-800 border-blue-200',
  trial_expired: 'bg-red-100 text-red-800 border-red-200',
  overdue: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  suspended: 'bg-gray-100 text-gray-700 border-gray-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

const addDays = (d: number) => new Date(Date.now() + d * 86400000).toISOString();
const addMonths = (m: number) => { const dt = new Date(); dt.setMonth(dt.getMonth() + m); return dt.toISOString(); };

export default function ClinicDetailPage() {
  const { t } = useTranslation();
  const PLAN_OPTIONS = usePlanOptions();
  const planShortLabel = usePlanShortLabel();
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  const router = useRouter();

  const { data: clinic, isLoading: loading, error } = useSuperadminTenantQuery(id);
  const patchMutation = usePatchSuperadminTenantMutation();
  const resetPasswordMutation = useResetSuperadminTenantAdminPasswordMutation();
  const savingPlan = patchMutation.isPending;
  const resetting = resetPasswordMutation.isPending;

  const [plan, setPlan] = useState('');

  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (!id) toast.error(t('superadminClinics.detail.invalid'));
  }, [id, t]);

  useEffect(() => {
    if (error) toast.error(t('superadminClinics.detail.loadFail'));
  }, [error, t]);

  useEffect(() => {
    if (clinic) setPlan(clinic.billing_plan ?? 'essencial');
  }, [clinic]);

  const patch = async (payload: Record<string, unknown>) => {
    try {
      await patchMutation.mutateAsync({ id, payload });
    } catch {
      toast.error(t('superadminClinics.detail.updateFail'));
    }
  };

  const savePlan = async () => {
    try {
      await patchMutation.mutateAsync({ id, payload: { billing_plan: plan } });
    } catch {
      toast.error(t('superadminClinics.detail.planFail'));
    }
  };

  const submitReset = async () => {
    if (newPassword.trim().length < 8) { toast.error(t('superadminClinics.detail.passwordMin')); return; }
    try {
      await resetPasswordMutation.mutateAsync({ id, payload: { newPassword: newPassword.trim() } });
      setResetOpen(false);
      setNewPassword('');
    } catch { toast.error(t('superadminClinics.detail.resetFail')); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
        <Loader2 className="size-5 animate-spin" /> {t('superadminClinics.loadingShort')}
      </div>
    );
  }

  if (!clinic) return <div className="p-8 text-muted-foreground">{t('superadminClinics.detail.notFound')}</div>;

  const statusInfo = {
    label: clinic.subscription_status
      ? t(`subscriptionStatus.${clinic.subscription_status}`, { defaultValue: clinic.subscription_status })
      : '—',
    color: STATUS_COLORS[clinic.subscription_status ?? ''] ?? '',
  };
  const isAccessible = clinic.subscription_status === 'active' || clinic.subscription_status === 'exempt';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4 mr-1" /> {t('superadminClinics.detail.back')}
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{clinic.name}</h1>
          <p className="text-muted-foreground text-sm font-mono">{clinic.code}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1 — Informações básicas */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t('superadminClinics.detail.basicInfo')}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{t('superadminClinics.fields.name')}</span><span className="font-medium">{clinic.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t('superadminClinics.fields.code')}</span><span className="font-mono">{clinic.code}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t('superadminClinics.fields.email')}</span><span>{clinic.email ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t('superadminClinics.fields.phone')}</span><span>{exibirTelefone(clinic.phone) || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t('superadminClinics.detail.cpfCnpj')}</span><span>{clinic.cpf_cnpj ?? '—'}</span></div>
            {clinic.createdAt && (
              <div className="flex justify-between"><span className="text-muted-foreground">{t('superadminClinics.detail.created')}</span><span>{new Date(clinic.createdAt).toLocaleDateString('pt-BR')}</span></div>
            )}
          </CardContent>
        </Card>

        {/* Card 2 — Assinatura */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t('superadminClinics.detail.subscription')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('superadminClinics.cols.status')}</span>
              <Badge className={`text-xs border ${statusInfo.color}`} variant="outline">{statusInfo.label}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('superadminClinics.cols.plan')}</span>
              <Badge variant="outline" className="capitalize">{planShortLabel(clinic.billing_plan)}</Badge>
            </div>
            {clinic.trial_ends_at && (clinic.subscription_status === 'trial' || clinic.subscription_status === 'exempt') && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{clinic.subscription_status === 'exempt' ? t('superadminClinics.detail.exemptUntil') : t('superadminClinics.detail.trialUntil')}</span>
                <span className="text-sm font-medium">{new Date(clinic.trial_ends_at).toLocaleDateString('pt-BR')}</span>
              </div>
            )}
            {clinic.cancel_at && (
              <div className="text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-md px-3 py-2">
                ⚠️ {t('superadminClinics.editDialog.cancelScheduled', { date: new Date(clinic.cancel_at).toLocaleDateString('pt-BR') })}
              </div>
            )}

            {/* Ações rápidas */}
            <div className="flex flex-wrap gap-2 pt-2">
              {!isAccessible && (
                <Button size="sm" variant="outline" className="gap-1 text-emerald-700 border-emerald-200"
                  onClick={() => void patch({ subscription_status: 'active' })}>
                  <ShieldCheck className="size-3.5" /> {t('superadminClinics.detail.releaseAccess')}
                </Button>
              )}
              {isAccessible && (
                <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200"
                  onClick={() => void patch({ subscription_status: 'suspended' })}>
                  <ShieldOff className="size-3.5" /> {t('superadminClinics.actions.suspend')}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => void patch({ subscription_status: 'trial', trial_ends_at: addDays(14) })}>{t('superadminClinics.detail.trial14d')}</Button>
              <Button size="sm" variant="outline" onClick={() => void patch({ subscription_status: 'trial', trial_ends_at: addDays(30) })}>{t('superadminClinics.detail.trial30d')}</Button>
              <Button size="sm" variant="outline" onClick={() => void patch({ subscription_status: 'exempt', trial_ends_at: addMonths(3) })}>{t('superadminClinics.detail.exempt3m')}</Button>
              <Button size="sm" variant="outline" onClick={() => void patch({ subscription_status: 'exempt', trial_ends_at: addMonths(6) })}>{t('superadminClinics.detail.exempt6m')}</Button>
            </div>

            {/* Alterar plano */}
            <div className="flex gap-2 pt-1">
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger className="flex-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={savePlan} disabled={savingPlan}>
                {savingPlan ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card 3 — Recursos */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t('superadminClinics.detail.resources')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{t('superadminClinics.cols.chatbot')}</p>
                <p className="text-xs text-muted-foreground">{t('superadminClinics.detail.chatbotHint')}</p>
              </div>
              <Switch
                checked={clinic.whatsapp_ai_chatbot_enabled}
                onCheckedChange={(v) => void patch({ whatsapp_ai_chatbot_enabled: v })}
              />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{t('superadminClinics.cols.ai')}</p>
                <p className="text-xs text-muted-foreground">{t('superadminClinics.detail.aiHint')}</p>
              </div>
              <Switch
                checked={clinic.ai_platform_enabled}
                onCheckedChange={(v) => void patch({ ai_platform_enabled: v })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 4 — Admin */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t('superadminClinics.detail.admin')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">{t('superadminClinics.detail.adminName')}</span><span className="font-medium">{clinic.admin_name ?? '—'}</span></p>
              <p><span className="text-muted-foreground">{t('superadminClinics.detail.adminEmail')}</span><span>{clinic.admin_email ?? '—'}</span></p>
            </div>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setResetOpen(true)} disabled={!clinic.admin_email}>
              <KeyRound className="size-3.5" /> {t('superadminClinics.actions.resetPassword')}
            </Button>
          </CardContent>
        </Card>

        {/* Card 5 — WhatsApp */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t('superadminClinics.detail.whatsapp')}</CardTitle></CardHeader>
          <CardContent>
            {/* Sem ação aqui desde que a Z-API saiu (02/10/2026): o número é
                Baileys e só pareia lendo o QR Code no celular da clínica. */}
            <p className="text-sm text-muted-foreground">
              {t('superadminClinics.detail.whatsappText')}
            </p>
          </CardContent>
        </Card>

        {/* Card 6 — Histórico (placeholder) */}
        <Card>
          <CardHeader><CardTitle className="text-base">{t('superadminClinics.detail.payments')}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t('superadminClinics.detail.paymentsSoon')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Modal reset senha */}
      <Dialog open={resetOpen} onOpenChange={(o) => !o && setResetOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('superadminClinics.resetDialog.title')}</DialogTitle>
            <DialogDescription>{clinic.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>{t('superadminClinics.resetDialog.newPassword')}</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>{t('superadminClinics.resetDialog.cancel')}</Button>
            <Button onClick={() => void submitReset()} disabled={resetting}>
              {resetting && <Loader2 className="size-4 animate-spin mr-1" />} {t('superadminClinics.resetDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
