'use client';

import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message, Divider, Alert, Tooltip } from 'antd';
import { RobotOutlined, QuestionCircleOutlined } from '@ant-design/icons';
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

const DEFAULTS: Required<ChatbotSettings> = {
  persona_name: 'Assistente',
  greeting_message: 'Olá! Seja bem-vindo(a). Como posso ajudar você e seu pet hoje? 🐾',
  farewell_message: 'Obrigado pelo contato! Qualquer dúvida, estamos aqui. Até logo! 👋',
  fallback_message: 'Desculpe, não entendi sua mensagem. Pode reformular? Se preferir, um atendente pode ajudá-lo.',
  emergency_message: 'Percebemos que pode ser urgente. Se o animal estiver muito mal, dirija-se imediatamente à nossa clínica. Nossa equipe foi notificada. 🚨',
  human_handoff_message: 'Entendido! Vou chamar um atendente humano. Em breve alguém da nossa equipe entrará em contato. 👋',
  system_prompt_extra: '',
};

export default function ChatbotSettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get<ChatbotSettings>('/chatbot-settings');
      const data = res.data ?? {};
      form.setFieldsValue({
        persona_name: data.persona_name ?? DEFAULTS.persona_name,
        greeting_message: data.greeting_message ?? DEFAULTS.greeting_message,
        farewell_message: data.farewell_message ?? DEFAULTS.farewell_message,
        fallback_message: data.fallback_message ?? DEFAULTS.fallback_message,
        emergency_message: data.emergency_message ?? DEFAULTS.emergency_message,
        human_handoff_message: data.human_handoff_message ?? DEFAULTS.human_handoff_message,
        system_prompt_extra: data.system_prompt_extra ?? '',
      });
    } catch {
      // sem configuração ainda — usa defaults
      form.setFieldsValue(DEFAULTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFinish = async (values: ChatbotSettings) => {
    setSaving(true);
    try {
      await api.put('/chatbot-settings', values);
      message.success('Configurações do chatbot salvas');
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const fieldLabel = (label: string, tip: string) => (
    <span className="flex items-center gap-1">
      {label}
      <Tooltip title={tip}>
        <QuestionCircleOutlined className="text-gray-400 text-xs" />
      </Tooltip>
    </span>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-600 mb-2 flex items-center gap-2">
        <RobotOutlined /> Chatbot — Persona e Respostas
      </h1>
      <p className="text-slate-500 mb-6 text-sm">
        Configure a personalidade do bot e as mensagens padrão. Deixe em branco para usar o texto padrão do sistema.
      </p>

      <Alert
        type="info"
        showIcon
        className="mb-6"
        message="Como funciona"
        description={
          <ul className="text-sm list-disc pl-4 mt-1 space-y-1">
            <li><b>Persona:</b> nome que o bot usa ao se identificar nas mensagens geradas pela IA.</li>
            <li><b>Boas-vindas:</b> enviada automaticamente quando o cliente escreve pela 1ª vez.</li>
            <li><b>Fallback:</b> enviada quando a IA não entende a mensagem (sem OPENAI_API_KEY ou intenção desconhecida).</li>
            <li><b>Emergência:</b> substitui a resposta padrão quando o sistema detecta urgência.</li>
            <li><b>Atendimento humano:</b> enviada quando o cliente pede falar com uma pessoa.</li>
            <li><b>Instruções extras:</b> injetadas no prompt do sistema — permite customizar o comportamento da IA.</li>
          </ul>
        }
      />

      <Card loading={loading}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="persona_name"
            label={fieldLabel('Nome da persona', 'Como o bot se identifica nas respostas geradas pela IA')}
            rules={[{ required: true }]}
          >
            <Input placeholder="Ex.: Nina, Assistente Pet, Clínica PetCare" maxLength={80} />
          </Form.Item>

          <Divider className="!text-sm !text-gray-500">Mensagens automáticas</Divider>

          <Form.Item
            name="greeting_message"
            label={fieldLabel('Boas-vindas', 'Enviada na 1ª mensagem recebida do cliente. Deixe vazio para não enviar.')}
          >
            <Input.TextArea
              rows={2}
              placeholder={DEFAULTS.greeting_message}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="fallback_message"
            label={fieldLabel('Resposta de fallback (IA indisponível ou intenção desconhecida)', 'Enviada quando a IA não consegue responder')}
          >
            <Input.TextArea
              rows={2}
              placeholder={DEFAULTS.fallback_message}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="emergency_message"
            label={fieldLabel('Mensagem de emergência', 'Enviada quando o sistema detecta intenção de urgência/emergência')}
          >
            <Input.TextArea
              rows={2}
              placeholder={DEFAULTS.emergency_message}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="human_handoff_message"
            label={fieldLabel('Transferência para humano', 'Enviada quando o cliente solicita atendimento humano — depois disso o bot pausa')}
          >
            <Input.TextArea
              rows={2}
              placeholder={DEFAULTS.human_handoff_message}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="farewell_message"
            label={fieldLabel('Encerramento', 'Pode ser usada manualmente ou por automações ao finalizar atendimento')}
          >
            <Input.TextArea
              rows={2}
              placeholder={DEFAULTS.farewell_message}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Divider className="!text-sm !text-gray-500">Prompt avançado</Divider>

          <Form.Item
            name="system_prompt_extra"
            label={fieldLabel(
              'Instruções adicionais para a IA',
              'Texto injetado no system prompt. Ex.: "Somos especializados em animais exóticos.", "Não mencione preços.", "Sempre sugira vacinas para filhotes."',
            )}
          >
            <Input.TextArea
              rows={4}
              placeholder="Ex.: Somos uma clínica especializada em animais exóticos. Sempre mencione que temos pronto-socorro 24h."
              maxLength={1000}
              showCount
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} className="bg-blue-600">
              Salvar configurações
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
