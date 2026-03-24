'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Card, List, Input, Button, message, Spin, Empty, Row, Col, Statistic, Tag, Space, Alert } from 'antd';
import { MessageOutlined, SendOutlined, BulbOutlined, ClockCircleOutlined, AlertOutlined } from '@ant-design/icons';
import api from '@/lib/axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

/** Polling enquanto a aba está visível (evita WebSocket no backend). */
const WHATSAPP_REFRESH_MS = 5000;

interface ConversationMetrics {
  unanswered_conversations: number;
  average_response_time: number;
  conversations_waiting_clinic: number;
  conversations_waiting_tutor: number;
}

interface AlertConversation {
  id: string;
  tutor_phone: string;
  status: string;
  waiting_since: string | null;
}

interface Conversation {
  id: string;
  wa_id: string;
  contact_name: string | null;
  status: string;
  last_message_at: string | null;
  whatsapp_number?: { display_phone: string };
}

interface WhatsappMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  body_text: string | null;
  created_at?: string;
  createdAt?: string;
}

export default function WhatsAppPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [sendText, setSendText] = useState('');
  const [sending, setSending] = useState(false);
  const [metrics, setMetrics] = useState<ConversationMetrics | null>(null);
  const [alerts, setAlerts] = useState<AlertConversation[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  const fetchConversations = useCallback(async (silent = false) => {
    if (!silent) setLoadingConv(true);
    try {
      const res = await api.get<{ data: Conversation[]; total: number }>('/whatsapp/conversations', {
        params: { limit: 50, order: 'desc' },
      });
      setConversations(res.data?.data ?? []);
    } catch (e) {
      if (!silent) message.error('Erro ao carregar conversas');
    } finally {
      if (!silent) setLoadingConv(false);
    }
  }, []);

  const fetchMetricsAndAlerts = useCallback(async (silent = false) => {
    try {
      const [metricsRes, alertsRes] = await Promise.all([
        api.get<ConversationMetrics>('/conversations/metrics'),
        api.get<{ conversations: AlertConversation[] }>('/conversations/alerts', { params: { minutes: 20 } }),
      ]);
      setMetrics(metricsRes.data ?? null);
      setAlerts(alertsRes.data?.conversations ?? []);
    } catch {
      if (!silent) {
        setMetrics(null);
        setAlerts([]);
      }
    }
  }, []);

  const handleSuggestReply = async () => {
    if (!messages.length) {
      message.info('Não há mensagens para sugerir resposta');
      return;
    }
    const lastInbound = [...messages].reverse().find((m) => m.direction === 'inbound');
    const context = messages.slice(-8).map((m) => `${m.direction}: ${m.body_text || ''}`).join('\n');
    const lastMessage = lastInbound?.body_text ?? '';
    setSuggestLoading(true);
    setSuggestions([]);
    try {
      const res = await api.post<{ suggested_replies?: string[] }>('/ai/suggest-replies', {
        context,
        lastMessage,
      });
      const list = res.data?.suggested_replies ?? [];
      setSuggestions(Array.isArray(list) ? list : []);
      if (list.length === 0) message.info('Nenhuma sugestão retornada');
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao obter sugestões');
    } finally {
      setSuggestLoading(false);
    }
  };

  const loadMessages = useCallback(async (conversationId: string, silent = false) => {
    if (!silent) setLoadingMsg(true);
    try {
      const res = await api.get<{ data: WhatsappMessage[]; total: number }>(
        `/whatsapp/conversations/${conversationId}/messages`,
        { params: { limit: 100 } },
      );
      const list = res.data?.data ?? [];
      setMessages(list.reverse());
    } catch (e) {
      if (!silent) {
        message.error('Erro ao carregar mensagens');
        setMessages([]);
      }
    } finally {
      if (!silent) setLoadingMsg(false);
    }
  }, []);

  const handleSend = async () => {
    if (!selectedId || !sendText.trim()) return;
    setSending(true);
    try {
      await api.post('/whatsapp/send', {
        conversation_id: selectedId,
        text: sendText.trim(),
      });
      setSendText('');
      await loadMessages(selectedId, false);
      message.success('Mensagem enviada');
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao enviar');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    fetchConversations(false);
    fetchMetricsAndAlerts(false);
  }, [fetchConversations, fetchMetricsAndAlerts]);

  useEffect(() => {
    if (selectedId) loadMessages(selectedId, false);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    const refresh = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      void fetchConversations(true);
      void fetchMetricsAndAlerts(true);
      const sid = selectedIdRef.current;
      if (sid) void loadMessages(sid, true);
    };

    const id = window.setInterval(refresh, WHATSAPP_REFRESH_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [fetchConversations, fetchMetricsAndAlerts, loadMessages]);

  const selectedConv = conversations.find((c) => c.id === selectedId);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2 m-0">
          <MessageOutlined /> WhatsApp
        </h1>
        <span className="text-xs text-slate-500">
          Lista e mensagens atualizam automaticamente a cada {WHATSAPP_REFRESH_MS / 1000}s (aba visível)
        </span>
      </div>

      <Alert
        type="info"
        showIcon
        className="mb-6"
        message="Como a clínica usa o WhatsApp aqui (sem Meta na clínica)"
        description={
          <span className="text-sm">
            O cadastro do <strong>número da clínica</strong> fica em{' '}
            <Link href="/dashboard/settings/whatsapp-numbers" className="text-blue-600 font-medium">
              Configurações → WhatsApp da clínica
            </Link>
            . Você informa um <strong>código interno</strong> e o <strong>telefone WhatsApp da clínica</strong> — não é
            necessário Facebook/Meta Business nesse modo (integração Twilio fica no servidor). Depois de cadastrar,
            mensagens recebidas nesse número aparecem nesta tela.
            {' '}
            <strong>Chatbot automático</strong> (IA responde sozinha) é ligado em{' '}
            <Link href="/dashboard/settings" className="text-blue-600 font-medium">
              Configurações → Dados da clínica
            </Link>{' '}
            (admin). No servidor ainda é necessário <code className="text-xs">OPENAI_API_KEY</code> e a fila de IA ativa.
          </span>
        }
      />

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Aguardando resposta"
              value={metrics?.conversations_waiting_clinic ?? 0}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Aguardando tutor"
              value={metrics?.conversations_waiting_tutor ?? 0}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="Tempo médio resposta"
              value={metrics?.average_response_time ?? 0}
              suffix="s"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            {alerts.length > 0 ? (
              <Space>
                <AlertOutlined className="text-amber-600" />
                <span>{alerts.length} conversa(s) há +20 min sem resposta</span>
              </Space>
            ) : (
              <Statistic title="Alertas" value={0} />
            )}
          </Card>
        </Col>
      </Row>
      {alerts.length > 0 && (
        <Card size="small" title="Conversas aguardando há mais de 20 min" className="mb-4">
          <List
            size="small"
            dataSource={alerts}
            renderItem={(a) => (
              <List.Item key={a.id}>
                <Tag>{a.tutor_phone}</Tag>
                {a.waiting_since && (
                  <span className="text-slate-500 text-sm ml-2">
                    desde {dayjs(a.waiting_since).format('DD/MM HH:mm')}
                  </span>
                )}
              </List.Item>
            )}
          />
        </Card>
      )}

      <div className="flex gap-4 flex-col lg:flex-row">
        <Card title="Conversas" className="lg:w-80 shrink-0" loading={loadingConv}>
          {conversations.length === 0 && !loadingConv ? (
            <Empty description="Nenhuma conversa" />
          ) : (
            <List
              dataSource={conversations}
              renderItem={(c) => (
                <List.Item
                  key={c.id}
                  className={`cursor-pointer rounded px-2 py-2 ${selectedId === c.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`}
                  onClick={() => setSelectedId(c.id)}
                >
                  <div className="w-full">
                    <div className="font-medium">
                      {c.contact_name || c.wa_id || 'Sem nome'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {c.wa_id}
                      {c.last_message_at && ` · ${dayjs(c.last_message_at).fromNow()}`}
                    </div>
                  </div>
                </List.Item>
              )}
            />
          )}
        </Card>
        <Card
          title={selectedConv ? (selectedConv.contact_name || selectedConv.wa_id) : 'Selecione uma conversa'}
          className="flex-1 min-w-0 flex flex-col"
          bodyStyle={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 400 }}
        >
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Clique em uma conversa para ver as mensagens
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto mb-4 space-y-2 min-h-[280px]">
                {loadingMsg ? (
                  <div className="flex justify-center py-8">
                    <Spin />
                  </div>
                ) : messages.length === 0 ? (
                  <Empty description="Nenhuma mensagem" />
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 ${
                          m.direction === 'outbound'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <div className="text-sm whitespace-pre-wrap">{m.body_text || '—'}</div>
                        <div
                          className={`text-xs mt-1 ${m.direction === 'outbound' ? 'text-blue-100' : 'text-gray-400'}`}
                        >
                          {dayjs(m.created_at ?? m.createdAt).format('DD/MM HH:mm')}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {suggestions.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  <span className="text-slate-600 text-sm self-center">Sugestões:</span>
                  {suggestions.map((s, i) => (
                    <Button
                      key={i}
                      size="small"
                      type="default"
                      onClick={() => {
                        setSendText(s);
                        setSuggestions([]);
                      }}
                    >
                      {s.length > 50 ? s.slice(0, 50) + '…' : s}
                    </Button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input.TextArea
                  value={sendText}
                  onChange={(e) => setSendText(e.target.value)}
                  placeholder="Digite a mensagem..."
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={sending}
                />
                <Button
                  icon={<BulbOutlined />}
                  onClick={handleSuggestReply}
                  loading={suggestLoading}
                  title="Sugerir resposta (IA)"
                  className="shrink-0"
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSend}
                  loading={sending}
                  disabled={!sendText.trim()}
                  className="bg-blue-600 shrink-0"
                />
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
