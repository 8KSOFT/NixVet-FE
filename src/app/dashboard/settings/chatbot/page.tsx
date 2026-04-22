'use client';

import React, { useEffect, useState } from 'react';
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
import api from '@/lib/axios';

interface ChatbotSettings {
  persona_name?: string;
  greeting_message?: string | null;
  farewell_message?: string | null;
  fallback_message?: string | null;
  emergency_message?: string | null;
  human_handoff_message?: string | null;
  system_prompt_extra?: string | null;
}

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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get<ChatbotSettings>('/chatbot-settings');
      const data = res.data ?? {};
      reset({
        persona_name: data.persona_name ?? DEFAULTS.persona_name,
        greeting_message: data.greeting_message ?? DEFAULTS.greeting_message,
        farewell_message: data.farewell_message ?? DEFAULTS.farewell_message,
        fallback_message: data.fallback_message ?? DEFAULTS.fallback_message,
        emergency_message: data.emergency_message ?? DEFAULTS.emergency_message,
        human_handoff_message: data.human_handoff_message ?? DEFAULTS.human_handoff_message,
        system_prompt_extra: data.system_prompt_extra ?? '',
      });
    } catch {
      reset(DEFAULTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (values: ChatbotSettings) => {
    setSaving(true);
    try {
      await api.put('/chatbot-settings', values);
      toast.success('Configurações do chatbot salvas');
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/chatbot-workflows">
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
        <Link href="/dashboard/chatbot-workflows">
          <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground">
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
            <TabsList className="mb-4">
              <TabsTrigger value="persona">Persona & Mensagens</TabsTrigger>
              <TabsTrigger value="advanced">Prompt Avançado</TabsTrigger>
            </TabsList>

            <TabsContent value="persona" className="space-y-5 mt-0">
              <Card>
                <CardContent className="pt-6 space-y-5">
                  {/* Persona name */}
                  <div>
                    <Label htmlFor="persona_name" className="flex items-center gap-1">
                      Nome da persona
                      <FieldTooltip text="Como o bot se identifica nas respostas geradas pela IA (ex: Nina, Assistente Pet)." />
                    </Label>
                    <Input
                      id="persona_name"
                      placeholder="Ex.: Nina, Assistente Pet, Clínica PetCare"
                      maxLength={80}
                      className="mt-1.5"
                      {...register('persona_name', { required: true })}
                    />
                    {errors.persona_name && (
                      <p className="text-destructive text-xs mt-1">Campo obrigatório</p>
                    )}
                  </div>

                  <Separator />

                  {/* Greeting */}
                  <div>
                    <Label htmlFor="greeting_message" className="flex items-center gap-1">
                      Mensagem de boas-vindas
                      <FieldTooltip text="Enviada automaticamente quando o cliente escreve pela 1ª vez. Deixe vazio para não enviar." />
                    </Label>
                    <Textarea
                      id="greeting_message"
                      rows={2}
                      placeholder={DEFAULTS.greeting_message}
                      maxLength={500}
                      className="mt-1.5"
                      {...register('greeting_message')}
                    />
                  </div>

                  {/* Fallback */}
                  <div>
                    <Label htmlFor="fallback_message" className="flex items-center gap-1">
                      Resposta de fallback
                      <FieldTooltip text="Enviada quando a IA não consegue responder (ex: sem OpenAI key ou intenção desconhecida)." />
                    </Label>
                    <Textarea
                      id="fallback_message"
                      rows={2}
                      placeholder={DEFAULTS.fallback_message}
                      maxLength={500}
                      className="mt-1.5"
                      {...register('fallback_message')}
                    />
                  </div>

                  {/* Emergency */}
                  <div>
                    <Label htmlFor="emergency_message" className="flex items-center gap-1">
                      Mensagem de emergência
                      <FieldTooltip text="Enviada quando o sistema detecta uma emergência real (atropelamento, convulsão, envenenamento etc.)." />
                    </Label>
                    <Textarea
                      id="emergency_message"
                      rows={2}
                      placeholder={DEFAULTS.emergency_message}
                      maxLength={500}
                      className="mt-1.5"
                      {...register('emergency_message')}
                    />
                  </div>

                  {/* Human handoff */}
                  <div>
                    <Label htmlFor="human_handoff_message" className="flex items-center gap-1">
                      Transferência para humano
                      <FieldTooltip text="Enviada quando o cliente solicita atendimento humano. Após isso o bot é pausado para essa conversa." />
                    </Label>
                    <Textarea
                      id="human_handoff_message"
                      rows={2}
                      placeholder={DEFAULTS.human_handoff_message}
                      maxLength={500}
                      className="mt-1.5"
                      {...register('human_handoff_message')}
                    />
                  </div>

                  {/* Farewell */}
                  <div>
                    <Label htmlFor="farewell_message" className="flex items-center gap-1">
                      Mensagem de encerramento
                      <FieldTooltip text="Pode ser usada manualmente ou por automações ao finalizar um atendimento." />
                    </Label>
                    <Textarea
                      id="farewell_message"
                      rows={2}
                      placeholder={DEFAULTS.farewell_message}
                      maxLength={500}
                      className="mt-1.5"
                      {...register('farewell_message')}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-5 mt-0">
              <Card>
                <CardContent className="pt-6 space-y-5">
                  <div>
                    <Label htmlFor="system_prompt_extra" className="flex items-center gap-1">
                      Instruções adicionais para a IA
                      <FieldTooltip text='Texto injetado no system prompt. Permite customizar o comportamento da IA. Ex: "Somos especializados em animais exóticos.", "Não mencione preços."' />
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1 mb-2">
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
                    <p className="text-xs text-muted-foreground/60 mt-1">Máximo 1000 caracteres</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end mt-4">
            <Button type="submit" disabled={saving} className="bg-primary gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar configurações
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
