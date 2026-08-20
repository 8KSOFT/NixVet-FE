'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { Bot, Loader2, Workflow, ArrowLeft, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import { useChatbotSettingsQuery, useSaveChatbotSettingsMutation } from '@/hooks/apiHooks/useChatbotSettings';
import { PlanUpgradeGate } from '@/components/billing/PlanUpgradeGate';
import type { ChatbotSettings } from '@/app/types/chatbot-settings';

function FieldTooltip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help inline-block ml-1 align-middle" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[240px] text-xs">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ChatbotSettingsPageContent() {
  const { t } = useTranslation();

  const DEFAULTS: Record<string, string> = {
    persona_name: t('settingsChatbot.defaults.personaName'),
    greeting_message: t('settingsChatbot.defaults.greetingMessage'),
    farewell_message: t('settingsChatbot.defaults.farewellMessage'),
    fallback_message: t('settingsChatbot.defaults.fallbackMessage'),
    emergency_message: t('settingsChatbot.defaults.emergencyMessage'),
    human_handoff_message: t('settingsChatbot.defaults.humanHandoffMessage'),
    system_prompt_extra: '',
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChatbotSettings>({
    defaultValues: DEFAULTS,
  });

  const { data, isLoading: loading, isError } = useChatbotSettingsQuery();
  const saveMutation = useSaveChatbotSettingsMutation();
  const saving = saveMutation.isPending;

  useEffect(() => {
    if (isError) {
      reset(DEFAULTS);
      return;
    }
    if (!data) return;
    reset({
      persona_name: data.persona_name ?? DEFAULTS.persona_name,
      greeting_message: data.greeting_message ?? DEFAULTS.greeting_message,
      farewell_message: data.farewell_message ?? DEFAULTS.farewell_message,
      fallback_message: data.fallback_message ?? DEFAULTS.fallback_message,
      emergency_message: data.emergency_message ?? DEFAULTS.emergency_message,
      human_handoff_message: data.human_handoff_message ?? DEFAULTS.human_handoff_message,
      system_prompt_extra: data.system_prompt_extra ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isError, reset]);

  const onSubmit = async (values: ChatbotSettings) => {
    try {
      await saveMutation.mutateAsync(values);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('settingsChatbot.saveError')));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/chatbot-workflows">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-heading font-semibold text-foreground flex items-center gap-2">
              <Bot className="w-6 h-6 text-primary" /> {t('settingsChatbot.title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('settingsChatbot.subtitle')}
            </p>
          </div>
        </div>
        <Link href="/chatbot-workflows">
          <Button variant="outline" size="sm" className="w-full gap-1.5 text-muted-foreground sm:w-auto">
            <Workflow className="w-4 h-4" /> {t('settingsChatbot.viewWorkflows')}
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs defaultValue="persona">
            <TabsList className="mb-4 grid h-auto! w-full grid-cols-1 gap-1 sm:grid-cols-2">
              <TabsTrigger value="persona" className="h-auto! whitespace-normal px-3 py-2 text-center leading-snug">
                {t('settingsChatbot.tabs.persona')}
              </TabsTrigger>
              <TabsTrigger value="advanced" className="h-auto! whitespace-normal px-3 py-2 text-center leading-snug">
                {t('settingsChatbot.tabs.advanced')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="persona" className="mt-0">
              <Card>
                <CardContent className="space-y-4 pt-6 md:space-y-6">
                  {/* Persona name */}
                  <div className="space-y-2">
                    <Label htmlFor="persona_name" className="flex items-center gap-1">
                      {t('settingsChatbot.personaName.label')}
                      <FieldTooltip text={t('settingsChatbot.personaName.tooltip')} />
                    </Label>
                    <Input
                      id="persona_name"
                      placeholder={t('settingsChatbot.personaName.placeholder')}
                      maxLength={80}
                      {...register('persona_name', { required: true })}
                    />
                    {errors.persona_name && (
                      <p className="text-destructive text-xs">{t('settingsChatbot.requiredField')}</p>
                    )}
                  </div>

                  <Separator />

                  {/* Greeting */}
                  <div className="space-y-2">
                    <Label htmlFor="greeting_message" className="flex items-center gap-1">
                      {t('settingsChatbot.greetingMessage.label')}
                      <FieldTooltip text={t('settingsChatbot.greetingMessage.tooltip')} />
                    </Label>
                    <Textarea
                      id="greeting_message"
                      rows={2}
                      placeholder={DEFAULTS.greeting_message}
                      maxLength={500}
                      {...register('greeting_message')}
                    />
                  </div>

                  {/* Fallback */}
                  <div className="space-y-2">
                    <Label htmlFor="fallback_message" className="flex items-center gap-1">
                      {t('settingsChatbot.fallbackMessage.label')}
                      <FieldTooltip text={t('settingsChatbot.fallbackMessage.tooltip')} />
                    </Label>
                    <Textarea
                      id="fallback_message"
                      rows={2}
                      placeholder={DEFAULTS.fallback_message}
                      maxLength={500}
                      {...register('fallback_message')}
                    />
                  </div>

                  {/* Emergency */}
                  <div className="space-y-2">
                    <Label htmlFor="emergency_message" className="flex items-center gap-1">
                      {t('settingsChatbot.emergencyMessage.label')}
                      <FieldTooltip text={t('settingsChatbot.emergencyMessage.tooltip')} />
                    </Label>
                    <Textarea
                      id="emergency_message"
                      rows={2}
                      placeholder={DEFAULTS.emergency_message}
                      maxLength={500}
                      {...register('emergency_message')}
                    />
                  </div>

                  {/* Human handoff */}
                  <div className="space-y-2">
                    <Label htmlFor="human_handoff_message" className="flex items-center gap-1">
                      {t('settingsChatbot.humanHandoffMessage.label')}
                      <FieldTooltip text={t('settingsChatbot.humanHandoffMessage.tooltip')} />
                    </Label>
                    <Textarea
                      id="human_handoff_message"
                      rows={2}
                      placeholder={DEFAULTS.human_handoff_message}
                      maxLength={500}
                      {...register('human_handoff_message')}
                    />
                  </div>

                  {/* Farewell */}
                  <div className="space-y-2">
                    <Label htmlFor="farewell_message" className="flex items-center gap-1">
                      {t('settingsChatbot.farewellMessage.label')}
                      <FieldTooltip text={t('settingsChatbot.farewellMessage.tooltip')} />
                    </Label>
                    <Textarea
                      id="farewell_message"
                      rows={2}
                      placeholder={DEFAULTS.farewell_message}
                      maxLength={500}
                      {...register('farewell_message')}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="mt-0">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="system_prompt_extra" className="flex items-center gap-1">
                      {t('settingsChatbot.advancedPrompt.label')}
                      <FieldTooltip text={t('settingsChatbot.advancedPrompt.tooltip')} />
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t('settingsChatbot.advancedPrompt.description')}
                    </p>
                    <Textarea
                      id="system_prompt_extra"
                      rows={6}
                      placeholder={t('settingsChatbot.advancedPrompt.placeholder')}
                      maxLength={1000}
                      {...register('system_prompt_extra')}
                    />
                    <p className="text-xs text-muted-foreground/60">{t('settingsChatbot.advancedPrompt.maxChars')}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-4 flex flex-col sm:flex-row sm:justify-end">
            <Button type="submit" disabled={saving} className="w-full gap-2 bg-primary sm:w-auto">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('settingsChatbot.saveButton')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ChatbotSettingsPage() {
  const { t } = useTranslation();
  return (
    <PlanUpgradeGate requiredPlan="clinica" feature={t('settingsChatbot.featureName')}>
      <ChatbotSettingsPageContent />
    </PlanUpgradeGate>
  );
}
