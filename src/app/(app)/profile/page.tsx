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
import { useProfileQuery, useUpdateProfileMutation, userKeys } from '@/hooks/apiHooks/useUsers';
import { ProfilePhotoUploader } from '@/components/shared/profile-photo';

interface ProfileFormValues {
  name: string;
  email: string;
  password: string;
  current_password: string;
  crmv: string;
  specialty: string;
  sipeagro_number: string;
}

export default function ProfilePage() {
  const { t } = useTranslation('common');
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormValues>();

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
      current_password: '',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, isError]);

  // Trocar e-mail ou senha exige a senha atual (backend, PERFIL_SENHA_ATUAL):
  // uma sessão esquecida aberta não pode tomar a conta.
  const emailDigitado = watch('email');
  const senhaDigitada = watch('password');
  const trocaEmail =
    !!profile && !!emailDigitado?.trim() && emailDigitado.trim().toLowerCase() !== profile.email?.trim().toLowerCase();
  const trocaSenha = !!senhaDigitada?.trim();
  const exigeSenhaAtual = trocaEmail || trocaSenha;

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      const payload: {
        name: string;
        email: string;
        crmv: string;
        specialty: string;
        sipeagro_number: string;
        password?: string;
        current_password?: string;
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
      if (exigeSenhaAtual && values.current_password) {
        payload.current_password = values.current_password;
      }
      const updated = await updateMutation.mutateAsync(payload);
      const raw = localStorage.getItem('user');
      const prev = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        'user',
        JSON.stringify({
          ...prev,
          name: updated.name,
        }),
      );
      setValue('password', '');
      setValue('current_password', '');
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
              {/* `/users/me` resolve o id pelo token — a tela não precisa carregá-lo. */}
              <ProfilePhotoUploader
                target="/users/me"
                invalidate={[userKeys.all]}
                label="sua foto"
                url={profile?.photo_url}
                name={profile?.name}
              />
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
                  autoComplete="new-password"
                  {...register('password', {
                    validate: (v) => !v?.trim() || v.length >= 8 || t('profile.passwordMin'),
                  })}
                  placeholder={t('profile.passwordPlaceholder')}
                />
                {errors.password?.message && (
                  <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
                )}
              </div>
              {exigeSenhaAtual && (
                <div>
                  <Label>{t('profile.currentPassword')}</Label>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    {...register('current_password', {
                      validate: (v) => !exigeSenhaAtual || !!v?.trim() || t('profile.currentPasswordRequired'),
                    })}
                  />
                  {errors.current_password?.message ? (
                    <p className="text-xs text-destructive mt-1">{errors.current_password.message}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">{t('profile.currentPasswordHint')}</p>
                  )}
                </div>
              )}
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
