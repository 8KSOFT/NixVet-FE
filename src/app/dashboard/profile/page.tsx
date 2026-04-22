'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { Loader2, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';

interface ProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  crmv?: string | null;
  specialty?: string | null;
}

interface ProfileFormValues {
  name: string;
  email: string;
  password: string;
  crmv: string;
  specialty: string;
}

export default function ProfilePage() {
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset, setValue } = useForm<ProfileFormValues>();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<ProfileData>('/users/profile');
      reset({
        name: res.data.name,
        email: res.data.email,
        crmv: res.data.crmv ?? '',
        specialty: res.data.specialty ?? '',
        password: '',
      });
    } catch {
      toast.error(t('profile.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async (values: ProfileFormValues) => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        name: values.name,
        email: values.email,
        crmv: values.crmv,
        specialty: values.specialty,
      };
      if (values.password?.trim()) {
        payload.password = values.password;
      }
      const res = await api.put<ProfileData>('/users/profile', payload);
      toast.success(t('profile.saved'));
      const raw = localStorage.getItem('user');
      const prev = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        'user',
        JSON.stringify({
          ...prev,
          name: res.data.name,
          email: res.data.email,
        }),
      );
      setValue('password', '');
    } catch (e: any) {
      toast.error(e.response?.data?.message || t('profile.saveError'));
    } finally {
      setSaving(false);
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
