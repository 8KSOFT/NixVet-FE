'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Clock, ExternalLink } from 'lucide-react';

export default function ConfiguracoesFiscaisPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-primary">{t('settingsFiscal.title')}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t('settingsFiscal.subtitle')}</p>
      </div>

      {/* Status do módulo */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="p-3 bg-amber-100 rounded-full shrink-0">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-amber-800">{t('settingsFiscal.statusTitle')}</p>
              <p className="text-sm text-amber-700 mt-0.5">
                {t('settingsFiscal.statusDescription')}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="self-start border-amber-400 text-amber-700 sm:ml-auto sm:shrink-0 sm:self-auto">
            {t('settingsFiscal.comingSoon')}
          </Badge>
        </CardContent>
      </Card>

      {/* Sobre NFS-e */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> {t('settingsFiscal.aboutTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            {t('settingsFiscal.aboutParagraph1Prefix')} <strong className="text-foreground">{t('settingsFiscal.aboutParagraph1Strong')}</strong>{' '}
            {t('settingsFiscal.aboutParagraph1Suffix')}
          </p>
          <p>
            {t('settingsFiscal.aboutParagraph2Prefix')} <strong className="text-foreground">{t('settingsFiscal.aboutParagraph2Strong')}</strong>.
          </p>
          <p>
            {t('settingsFiscal.requirementsIntro')}
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>{t('settingsFiscal.requirement1')}</li>
            <li>{t('settingsFiscal.requirement2')}</li>
            <li>{t('settingsFiscal.requirement3')}</li>
            <li>{t('settingsFiscal.requirement4')}</li>
          </ul>
        </CardContent>
      </Card>

      {/* Formulário de configuração futura (desabilitado) */}
      <Card className="opacity-60 pointer-events-none select-none">
        <CardHeader>
          <CardTitle className="text-base">{t('settingsFiscal.clinicDataTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>{t('settingsFiscal.cnpjLabel')}</Label>
              <Input placeholder="00.000.000/0001-00" disabled />
            </div>
            <div>
              <Label>{t('settingsFiscal.municipalRegistrationLabel')}</Label>
              <Input placeholder="000000-0" disabled />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>{t('settingsFiscal.serviceCodeLabel')}</Label>
              <Input placeholder={t('settingsFiscal.serviceCodePlaceholder')} disabled />
            </div>
            <div>
              <Label>{t('settingsFiscal.taxRegimeLabel')}</Label>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder={t('settingsFiscal.selectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simples">{t('settingsFiscal.taxRegimeSimples')}</SelectItem>
                  <SelectItem value="presumido">{t('settingsFiscal.taxRegimePresumido')}</SelectItem>
                  <SelectItem value="real">{t('settingsFiscal.taxRegimeReal')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">{t('settingsFiscal.ctaTitle')}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('settingsFiscal.ctaDescription')}
            </p>
          </div>
          <Button variant="outline" className="w-full gap-2 sm:w-auto" asChild>
            <a href="https://wa.me/5500000000000" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" /> {t('settingsFiscal.ctaButton')}
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
