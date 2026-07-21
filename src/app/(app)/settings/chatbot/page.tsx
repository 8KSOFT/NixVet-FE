'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
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
import type { ChatbotSettings } from '@/app/types/chatbot-settings';

const DEFAULTS: Record<string, string> = {
  persona_name: 'Assistente',
  greeting_message: 'Olá! Seja bem-vindo(a). Como posso ajudar você e seu pet hoje? 🐾',
  farewell_message: 'Obrigado pelo contato! Qualquer dúvida, estamos aqui. Até logo! 👋',
  fallback_message: 'Desculpe, não entendi sua mensagem. Pode reformular? Se preferir, um atendente pode ajudá-lo.',
  emergency_message: 'Percebemos que pode ser urgente. Se o animal estiver muito mal, dirija-se imediatamente à nossa clínica. Nossa equipe foi notificada. 🚨',
  human_handoff_message: 'Entendido! Vou chamar um atendente humano. Em breve alguém da nossa equipe entrará em contato. 👋',
  system_prompt_extra: '',
};

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

export default function ChatbotSettingsPage() {
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
  }, [data, isError, reset]);

  const onSubmit = async (values: ChatbotSettings) => {
    try {
      await saveMutation.mutateAsync(values);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar'));
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
              <Bot className="w-6 h-6 text-primary" /> Persona & Mensagens
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure o comportamento e as mensagens padrão do bot.
            </p>
          </div>
        </div>
        <Link href="/chatbot-workflows">
          <Button variant="outline" size="sm" className="w-full gap-1.5 text-muted-foreground sm:w-auto">
            <Workflow className="w-4 h-4" /> Ver Workflows
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
                Persona & Mensagens
              </TabsTrigger>
              <TabsTrigger value="advanced" className="h-auto! whitespace-normal px-3 py-2 text-center leading-snug">
                Prompt Avançado
              </TabsTrigger>
            </TabsList>

            <TabsContent value="persona" className="mt-0">
              <Card>
                <CardContent className="space-y-4 pt-6 md:space-y-6">
                  {/* Persona name */}
                  <div className="space-y-2">
                    <Label htmlFor="persona_name" className="flex items-center gap-1">
                      Nome da persona
                      <FieldTooltip text="Como o bot se identifica nas respostas geradas pela IA (ex: Nina, Assistente Pet)." />
                    </Label>
                    <Input
                      id="persona_name"
                      placeholder="Ex.: Nina, Assistente Pet, Clínica PetCare"
                      maxLength={80}
                      {...register('persona_name', { required: true })}
                    />
                    {errors.persona_name && (
                      <p className="text-destructive text-xs">Campo obrigatório</p>
                    )}
                  </div>

                  <Separator />

                  {/* Greeting */}
                  <div className="space-y-2">
                    <Label htmlFor="greeting_message" className="flex items-center gap-1">
                      Mensagem de boas-vindas
                      <FieldTooltip text="Enviada automaticamente quando o cliente escreve pela 1ª vez. Deixe vazio para não enviar." />
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
                      Resposta de fallback
                      <FieldTooltip text="Enviada quando a IA não consegue responder (ex: sem OpenAI key ou intenção desconhecida)." />
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
                      Mensagem de emergência
                      <FieldTooltip text="Enviada quando o sistema detecta uma emergência real (atropelamento, convulsão, envenenamento etc.)." />
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
                      Transferência para humano
                      <FieldTooltip text="Enviada quando o cliente solicita atendimento humano. Após isso o bot é pausado para essa conversa." />
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
                      Mensagem de encerramento
                      <FieldTooltip text="Pode ser usada manualmente ou por automações ao finalizar um atendimento." />
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
                      Instruções adicionais para a IA
                      <FieldTooltip text='Texto injetado no system prompt. Permite customizar o comportamento da IA. Ex: "Somos especializados em animais exóticos.", "Não mencione preços."' />
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Este texto é concatenado ao prompt base da IA. Use para customizar o comportamento,
                      adicionar contexto da clínica ou restringir tópicos.
                    </p>
                    <Textarea
                      id="system_prompt_extra"
                      rows={6}
                      placeholder="Ex.: Somos uma clínica especializada em animais exóticos. Sempre mencione que temos pronto-socorro 24h. Nunca mencione preços sem antes consultar a recepção."
                      maxLength={1000}
                      {...register('system_prompt_extra')}
                    />
                    <p className="text-xs text-muted-foreground/60">Máximo 1000 caracteres</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-4 flex flex-col sm:flex-row sm:justify-end">
            <Button type="submit" disabled={saving} className="w-full gap-2 bg-primary sm:w-auto">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar configurações
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
