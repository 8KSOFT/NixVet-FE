'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { Loader2, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import { useProfileQuery, useUpdateProfileMutation } from '@/hooks/apiHooks/useUsers';

interface ProfileFormValues {
  name: string;
  email: string;
  password: string;
  crmv: string;
  specialty: string;
  sipeagro_number: string;
}

export default function ProfilePage() {
  const { t } = useTranslation('common');
  const { register, handleSubmit, reset, setValue } = useForm<ProfileFormValues>();

  const { data: profile, isLoading: loading, isError } = useProfileQuery();
  const updateMutation = useUpdateProfileMutation();
  const saving = updateMutation.isPending;

  useEffect(() => {
    if (isError) {
      toast.error(t('profile.loadError'));
      return;
    }
    if (!profile) return;
    reset({
      name: profile.name,
      email: profile.email,
      crmv: profile.crmv ?? '',
      specialty: profile.specialty ?? '',
      sipeagro_number: profile.sipeagro_number ?? '',
      password: '',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, isError]);

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      const payload: {
        name: string;
        email: string;
        crmv: string;
        specialty: string;
        sipeagro_number: string;
        password?: string;
      } = {
        name: values.name,
        email: values.email,
        crmv: values.crmv,
        specialty: values.specialty,
        sipeagro_number: values.sipeagro_number,
      };
      if (values.password?.trim()) {
        payload.password = values.password;
      }
      const updated = await updateMutation.mutateAsync(payload);
      const raw = localStorage.getItem('user');
      const prev = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        'user',
        JSON.stringify({
          ...prev,
          name: updated.name,
          email: updated.email,
        }),
      );
      setValue('password', '');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('profile.saveError')));
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold text-foreground mb-6 flex items-center gap-2">
        <User className="w-6 h-6" /> {t('profile.title')}
      </h2>
      <Card className="max-w-xl rounded-xl shadow-sm border border-border/80">
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label>{t('profile.name')}</Label>
                <Input {...register('name', { required: true })} />
              </div>
              <div>
                <Label>{t('profile.email')}</Label>
                <Input type="email" {...register('email', { required: true })} />
              </div>
              <div>
                <Label>{t('profile.newPassword')}</Label>
                <Input
                  type="password"
                  {...register('password')}
                  placeholder={t('profile.passwordPlaceholder')}
                />
              </div>
              <div>
                <Label>{t('profile.crmv')}</Label>
                <Input {...register('crmv')} />
              </div>
              <div>
                <Label>{t('profile.sipeagro')}</Label>
                <Input maxLength={20} {...register('sipeagro_number')} />
                <p className="text-xs text-muted-foreground mt-1">{t('profile.sipeagroHint')}</p>
              </div>
              <div>
                <Label>{t('profile.specialty')}</Label>
                <Input {...register('specialty')} />
              </div>
              <Button type="submit" disabled={saving} className="bg-primary">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('profile.save')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
