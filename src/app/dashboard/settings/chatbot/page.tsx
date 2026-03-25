'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { Bot, Loader2 } from 'lucide-react';
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
    <div>
      <h1 className="text-2xl font-bold text-blue-600 mb-2 flex items-center gap-2">
        <Bot className="w-6 h-6" /> Chatbot — Persona e Respostas
      </h1>
      <p className="text-slate-500 mb-6 text-sm">
        Configure a personalidade do bot e as mensagens padrão. Deixe em branco para usar o texto padrão do sistema.
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6 text-sm text-blue-800">
        <p className="font-semibold mb-2">Como funciona</p>
        <ul className="list-disc pl-4 space-y-1">
          <li><b>Persona:</b> nome que o bot usa ao se identificar nas mensagens geradas pela IA.</li>
          <li><b>Boas-vindas:</b> enviada automaticamente quando o cliente escreve pela 1ª vez.</li>
          <li><b>Fallback:</b> enviada quando a IA não entende a mensagem (sem OPENAI_API_KEY ou intenção desconhecida).</li>
          <li><b>Emergência:</b> substitui a resposta padrão quando o sistema detecta urgência.</li>
          <li><b>Atendimento humano:</b> enviada quando o cliente pede falar com uma pessoa.</li>
          <li><b>Instruções extras:</b> injetadas no prompt do sistema — permite customizar o comportamento da IA.</li>
        </ul>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="persona_name">
                  Nome da persona{' '}
                  <span className="text-gray-400 text-xs" title="Como o bot se identifica nas respostas geradas pela IA">(?)</span>
                </Label>
                <Input
                  id="persona_name"
                  placeholder="Ex.: Nina, Assistente Pet, Clínica PetCare"
                  maxLength={80}
                  {...register('persona_name', { required: true })}
                />
                {errors.persona_name && <p className="text-red-500 text-xs mt-1">Campo obrigatório</p>}
              </div>

              <Separator />
              <p className="text-sm text-gray-500">Mensagens automáticas</p>

              <div>
                <Label htmlFor="greeting_message">
                  Boas-vindas{' '}
                  <span className="text-gray-400 text-xs" title="Enviada na 1ª mensagem recebida do cliente. Deixe vazio para não enviar.">(?)</span>
                </Label>
                <Textarea
                  id="greeting_message"
                  rows={2}
                  placeholder={DEFAULTS.greeting_message}
                  maxLength={500}
                  {...register('greeting_message')}
                />
              </div>

              <div>
                <Label htmlFor="fallback_message">
                  Resposta de fallback (IA indisponível ou intenção desconhecida){' '}
                  <span className="text-gray-400 text-xs" title="Enviada quando a IA não consegue responder">(?)</span>
                </Label>
                <Textarea
                  id="fallback_message"
                  rows={2}
                  placeholder={DEFAULTS.fallback_message}
                  maxLength={500}
                  {...register('fallback_message')}
                />
              </div>

              <div>
                <Label htmlFor="emergency_message">
                  Mensagem de emergência{' '}
                  <span className="text-gray-400 text-xs" title="Enviada quando o sistema detecta intenção de urgência/emergência">(?)</span>
                </Label>
                <Textarea
                  id="emergency_message"
                  rows={2}
                  placeholder={DEFAULTS.emergency_message}
                  maxLength={500}
                  {...register('emergency_message')}
                />
              </div>

              <div>
                <Label htmlFor="human_handoff_message">
                  Transferência para humano{' '}
                  <span className="text-gray-400 text-xs" title="Enviada quando o cliente solicita atendimento humano — depois disso o bot pausa">(?)</span>
                </Label>
                <Textarea
                  id="human_handoff_message"
                  rows={2}
                  placeholder={DEFAULTS.human_handoff_message}
                  maxLength={500}
                  {...register('human_handoff_message')}
                />
              </div>

              <div>
                <Label htmlFor="farewell_message">
                  Encerramento{' '}
                  <span className="text-gray-400 text-xs" title="Pode ser usada manualmente ou por automações ao finalizar atendimento">(?)</span>
                </Label>
                <Textarea
                  id="farewell_message"
                  rows={2}
                  placeholder={DEFAULTS.farewell_message}
                  maxLength={500}
                  {...register('farewell_message')}
                />
              </div>

              <Separator />
              <p className="text-sm text-gray-500">Prompt avançado</p>

              <div>
                <Label htmlFor="system_prompt_extra">
                  Instruções adicionais para a IA{' '}
                  <span className="text-gray-400 text-xs" title='Texto injetado no system prompt. Ex.: "Somos especializados em animais exóticos.", "Não mencione preços.", "Sempre sugira vacinas para filhotes."'>(?)</span>
                </Label>
                <Textarea
                  id="system_prompt_extra"
                  rows={4}
                  placeholder="Ex.: Somos uma clínica especializada em animais exóticos. Sempre mencione que temos pronto-socorro 24h."
                  maxLength={1000}
                  {...register('system_prompt_extra')}
                />
              </div>

              <Button type="submit" disabled={saving} className="bg-blue-600">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar configurações
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
