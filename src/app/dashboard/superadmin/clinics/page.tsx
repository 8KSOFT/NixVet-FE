'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, KeyRound } from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { getStoredUserRole } from '@/lib/role-permissions';

export type ClinicRow = {
  id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  whatsapp_ai_chatbot_enabled: boolean;
  ai_platform_enabled: boolean;
  billing_plan: string | null;
  admin_email: string | null;
  admin_name: string | null;
};

export default function SuperadminClinicsPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [rows, setRows] = useState<ClinicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetTenantId, setResetTenantId] = useState<string | null>(null);
  const [resetClinicName, setResetClinicName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ClinicRow[]>('/superadmin/tenants');
      setRows(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      const err = e as { response?: { status?: number } };
      if (err.response?.status === 403) {
        toast.error(t('superadminClinics.forbidden'));
        router.replace('/dashboard');
        return;
      }
      toast.error(t('superadminClinics.loadError'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    if (getStoredUserRole() !== 'superadmin') {
      router.replace('/dashboard');
      return;
    }
    void load();
  }, [load, router]);

  const openReset = (row: ClinicRow) => {
    setResetTenantId(row.id);
    setResetClinicName(row.name);
    setNewPassword('');
  };

  const submitReset = async () => {
    if (!resetTenantId || newPassword.trim().length < 8) {
      toast.error(t('superadminClinics.passwordMin'));
      return;
    }
    setResetting(true);
    try {
      await api.post(`/superadmin/tenants/${resetTenantId}/reset-admin-password`, {
        newPassword: newPassword.trim(),
      });
      toast.success(t('superadminClinics.resetOk'));
      setResetTenantId(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const msg = err.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(' | ') : (msg as string) || t('superadminClinics.resetError');
      toast.error(text);
    } finally {
      setResetting(false);
    }
  };

  const yesNo = (v: boolean) => (v ? t('superadminClinics.yes') : t('superadminClinics.no'));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t('superadminClinics.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('superadminClinics.subtitle')}</p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="size-5 animate-spin" />
            {t('superadminClinics.loading')}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('superadminClinics.colName')}</TableHead>
                <TableHead>{t('superadminClinics.colCode')}</TableHead>
                <TableHead>{t('superadminClinics.colClinicEmail')}</TableHead>
                <TableHead>{t('superadminClinics.colAdmin')}</TableHead>
                <TableHead>{t('superadminClinics.colChatbot')}</TableHead>
                <TableHead>{t('superadminClinics.colAi')}</TableHead>
                <TableHead>{t('superadminClinics.colPlan')}</TableHead>
                <TableHead className="text-right">{t('superadminClinics.colActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    {t('superadminClinics.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="font-mono text-sm">{row.code}</TableCell>
                    <TableCell className="text-sm">{row.email ?? '—'}</TableCell>
                    <TableCell className="text-sm">
                      <div>{row.admin_name ?? '—'}</div>
                      <div className="text-muted-foreground text-xs">{row.admin_email ?? ''}</div>
                    </TableCell>
                    <TableCell>{yesNo(row.whatsapp_ai_chatbot_enabled)}</TableCell>
                    <TableCell>{yesNo(row.ai_platform_enabled)}</TableCell>
                    <TableCell className="text-sm">{row.billing_plan?.trim() || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => openReset(row)}
                        disabled={!row.admin_email}
                      >
                        <KeyRound className="size-3.5" />
                        {t('superadminClinics.resetPassword')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={Boolean(resetTenantId)} onOpenChange={(o) => !o && setResetTenantId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('superadminClinics.resetTitle')}</DialogTitle>
            <DialogDescription>
              {t('superadminClinics.resetDescription', { name: resetClinicName })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-admin-pw">{t('superadminClinics.newPassword')}</Label>
            <Input
              id="new-admin-pw"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setResetTenantId(null)}>
              {t('superadminClinics.cancel')}
            </Button>
            <Button type="button" onClick={() => void submitReset()} disabled={resetting}>
              {resetting && <Loader2 className="size-4 animate-spin" />}
              {t('superadminClinics.confirmReset')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
