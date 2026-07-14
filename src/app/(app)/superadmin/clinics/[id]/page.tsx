'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft, ShieldCheck, ShieldOff, Loader2, Save, KeyRound, MessageCircle,
} from 'lucide-react';
import {
  useSuperadminTenantQuery,
  usePatchSuperadminTenantMutation,
  useResetSuperadminTenantAdminPasswordMutation,
  useProvisionSuperadminWhatsappMutation,
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

const PLAN_OPTIONS = [
  { value: 'essencial', label: 'Essencial — R$179/mês' },
  { value: 'clinica', label: 'Clínica — R$299/mês' },
  { value: 'hospital', label: 'Hospital — R$499/mês' },
  { value: 'enterprise', label: 'Enterprise (manual)' },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active:       { label: 'Ativo',           color: 'bg-green-100 text-green-800 border-green-200' },
  exempt:       { label: 'Isento (cortesia)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  trial:        { label: 'Trial',            color: 'bg-blue-100 text-blue-800 border-blue-200' },
  trial_expired:{ label: 'Trial Expirado',   color: 'bg-red-100 text-red-800 border-red-200' },
  overdue:      { label: 'Em Atraso',        color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  suspended:    { label: 'Suspenso',         color: 'bg-gray-100 text-gray-700 border-gray-200' },
  cancelled:    { label: 'Cancelado',        color: 'bg-red-100 text-red-800 border-red-200' },
};

const addDays = (d: number) => new Date(Date.now() + d * 86400000).toISOString();
const addMonths = (m: number) => { const dt = new Date(); dt.setMonth(dt.getMonth() + m); return dt.toISOString(); };

export default function ClinicDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  const router = useRouter();

  const { data: clinic, isLoading: loading, error } = useSuperadminTenantQuery(id);
  const patchMutation = usePatchSuperadminTenantMutation();
  const resetPasswordMutation = useResetSuperadminTenantAdminPasswordMutation();
  const provisionMutation = useProvisionSuperadminWhatsappMutation();
  const savingPlan = patchMutation.isPending;
  const resetting = resetPasswordMutation.isPending;
  const whatsappProvisioning = provisionMutation.isPending;

  const [plan, setPlan] = useState('');

  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [whatsappOpen, setWhatsappOpen] = useState(false);

  useEffect(() => {
    if (!id) toast.error('Clínica inválida');
  }, [id]);

  useEffect(() => {
    if (error) toast.error('Falha ao carregar dados da clínica');
  }, [error]);

  useEffect(() => {
    if (clinic) setPlan(clinic.billing_plan ?? 'essencial');
  }, [clinic]);

  const patch = async (payload: Record<string, unknown>, successMsg?: string) => {
    try {
      await patchMutation.mutateAsync({ id, payload });
      toast.success(successMsg ?? 'Atualizado');
    } catch {
      toast.error('Falha ao atualizar');
    }
  };

  const savePlan = async () => {
    try {
      await patchMutation.mutateAsync({ id, payload: { billing_plan: plan } });
      toast.success('Plano atualizado');
    } catch {
      toast.error('Falha ao salvar plano');
    }
  };

  const submitReset = async () => {
    if (newPassword.trim().length < 8) { toast.error('Senha mínimo 8 caracteres'); return; }
    try {
      await resetPasswordMutation.mutateAsync({ id, payload: { newPassword: newPassword.trim() } });
      toast.success('Senha redefinida');
      setResetOpen(false);
      setNewPassword('');
    } catch { toast.error('Erro ao redefinir senha'); }
  };

  const submitProvision = async () => {
    try {
      await provisionMutation.mutateAsync({ tenantId: id, instanceName: `NixVet - ${clinic?.name}` });
      toast.success('Instância WhatsApp provisionada');
      setWhatsappOpen(false);
    } catch { toast.error('Erro ao provisionar WhatsApp'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground gap-2">
        <Loader2 className="size-5 animate-spin" /> Carregando...
      </div>
    );
  }

  if (!clinic) return <div className="p-8 text-muted-foreground">Clínica não encontrada.</div>;

  const statusInfo = STATUS_MAP[clinic.subscription_status ?? ''] ?? { label: clinic.subscription_status ?? '—', color: '' };
  const isAccessible = clinic.subscription_status === 'active' || clinic.subscription_status === 'exempt';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4 mr-1" /> Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{clinic.name}</h1>
          <p className="text-muted-foreground text-sm font-mono">{clinic.code}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1 — Informações básicas */}
        <Card>
          <CardHeader><CardTitle className="text-base">Informações Básicas</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Nome</span><span className="font-medium">{clinic.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Código</span><span className="font-mono">{clinic.code}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{clinic.email ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Telefone</span><span>{clinic.phone ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">CPF/CNPJ</span><span>{clinic.cpf_cnpj ?? '—'}</span></div>
            {clinic.createdAt && (
              <div className="flex justify-between"><span className="text-muted-foreground">Criado em</span><span>{new Date(clinic.createdAt).toLocaleDateString('pt-BR')}</span></div>
            )}
          </CardContent>
        </Card>

        {/* Card 2 — Assinatura */}
        <Card>
          <CardHeader><CardTitle className="text-base">Assinatura e Acesso</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge className={`text-xs border ${statusInfo.color}`} variant="outline">{statusInfo.label}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Plano</span>
              <Badge variant="outline" className="capitalize">{clinic.billing_plan ?? '—'}</Badge>
            </div>
            {clinic.trial_ends_at && (clinic.subscription_status === 'trial' || clinic.subscription_status === 'exempt') && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{clinic.subscription_status === 'exempt' ? 'Isenção até' : 'Trial até'}</span>
                <span className="text-sm font-medium">{new Date(clinic.trial_ends_at).toLocaleDateString('pt-BR')}</span>
              </div>
            )}
            {clinic.cancel_at && (
              <div className="text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-md px-3 py-2">
                ⚠️ Cancelamento agendado: {new Date(clinic.cancel_at).toLocaleDateString('pt-BR')}
              </div>
            )}

            {/* Ações rápidas */}
            <div className="flex flex-wrap gap-2 pt-2">
              {!isAccessible && (
                <Button size="sm" variant="outline" className="gap-1 text-emerald-700 border-emerald-200"
                  onClick={() => void patch({ subscription_status: 'active' }, 'Acesso liberado')}>
                  <ShieldCheck className="size-3.5" /> Liberar acesso
                </Button>
              )}
              {isAccessible && (
                <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200"
                  onClick={() => void patch({ subscription_status: 'suspended' }, 'Conta suspensa')}>
                  <ShieldOff className="size-3.5" /> Suspender
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => void patch({ subscription_status: 'trial', trial_ends_at: addDays(14) })}>Trial 14d</Button>
              <Button size="sm" variant="outline" onClick={() => void patch({ subscription_status: 'trial', trial_ends_at: addDays(30) })}>Trial 30d</Button>
              <Button size="sm" variant="outline" onClick={() => void patch({ subscription_status: 'exempt', trial_ends_at: addMonths(3) })}>Isentar 3m</Button>
              <Button size="sm" variant="outline" onClick={() => void patch({ subscription_status: 'exempt', trial_ends_at: addMonths(6) })}>Isentar 6m</Button>
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
          <CardHeader><CardTitle className="text-base">Recursos Habilitados</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Chatbot WhatsApp</p>
                <p className="text-xs text-muted-foreground">Habilita o chatbot da Nina via WhatsApp</p>
              </div>
              <Switch
                checked={clinic.whatsapp_ai_chatbot_enabled}
                onCheckedChange={(v) => void patch({ whatsapp_ai_chatbot_enabled: v })}
              />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Plataforma IA</p>
                <p className="text-xs text-muted-foreground">Habilita recursos de IA clínica. Disponível no plano Hospital e Enterprise.</p>
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
          <CardHeader><CardTitle className="text-base">Administrador da Clínica</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-1">
              <p><span className="text-muted-foreground">Nome: </span><span className="font-medium">{clinic.admin_name ?? '—'}</span></p>
              <p><span className="text-muted-foreground">Email: </span><span>{clinic.admin_email ?? '—'}</span></p>
            </div>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setResetOpen(true)} disabled={!clinic.admin_email}>
              <KeyRound className="size-3.5" /> Redefinir senha
            </Button>
          </CardContent>
        </Card>

        {/* Card 5 — WhatsApp */}
        <Card>
          <CardHeader><CardTitle className="text-base">WhatsApp (Z-API)</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Provisiona uma instância Z-API para esta clínica. A clínica verá o QR Code em Configurações → WhatsApp.</p>
            <Button size="sm" variant="outline" className="gap-1 text-green-700 border-green-200" onClick={() => setWhatsappOpen(true)}>
              <MessageCircle className="size-3.5" /> Provisionar instância
            </Button>
          </CardContent>
        </Card>

        {/* Card 6 — Histórico (placeholder) */}
        <Card>
          <CardHeader><CardTitle className="text-base">Histórico de Pagamentos</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Histórico de pagamentos disponível em breve.</p>
          </CardContent>
        </Card>
      </div>

      {/* Modal reset senha */}
      <Dialog open={resetOpen} onOpenChange={(o) => !o && setResetOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redefinir senha do admin</DialogTitle>
            <DialogDescription>{clinic.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Nova senha</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>Cancelar</Button>
            <Button onClick={() => void submitReset()} disabled={resetting}>
              {resetting && <Loader2 className="size-4 animate-spin mr-1" />} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal WhatsApp */}
      <Dialog open={whatsappOpen} onOpenChange={(o) => !o && setWhatsappOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="size-5 text-green-600" /> Provisionar WhatsApp
            </DialogTitle>
            <DialogDescription>Cria uma instância Z-API para <strong>{clinic.name}</strong>.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setWhatsappOpen(false)}>Cancelar</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => void submitProvision()} disabled={whatsappProvisioning}>
              {whatsappProvisioning && <Loader2 className="size-4 animate-spin mr-1" />} Provisionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
