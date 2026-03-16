'use client';

import React, { useEffect, useState } from 'react';
import { Calendar, Badge, Modal, Form, Select, DatePicker, Input, message, Button, Tag } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { PlusOutlined, CalendarOutlined, SwapOutlined, BulbOutlined } from '@ant-design/icons';
import api from '@/lib/axios';

interface Resource {
  id: string;
  name: string;
  type: string;
}

interface AvailabilitySlot {
  vetId: string;
  vetName: string;
  slots: string[];
}

function SlotSelect({
  form,
  availability,
  availabilityLoading,
}: {
  form: any;
  availability: AvailabilitySlot[];
  availabilityLoading: boolean;
}) {
  const vetId = Form.useWatch('veterinarian_id', form);
  const vetSlots = vetId ? availability.find(a => a.vetId === vetId) : null;
  const options = (vetSlots?.slots ?? []).map(slot => ({
    value: slot,
    label: new Date(slot).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  }));
  return (
    <Form.Item
      name="slot_datetime"
      label="Horário disponível"
      rules={[{ required: true, message: 'Selecione o horário' }]}
    >
      <Select
        placeholder={availabilityLoading ? 'Carregando...' : 'Selecione o horário'}
        loading={availabilityLoading}
        allowClear
        options={options}
      />
    </Form.Item>
  );
}

interface Consultation {
  id: string;
  consultation_date: string;
  patient?: { name: string };
  veterinarian?: { name: string };
  observations?: string;
  status?: string;
  paid?: boolean;
}

interface Patient {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  role: string;
}

export default function CalendarPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [veterinarians, setVeterinarians] = useState<User[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [updating, setUpdating] = useState(false);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [rescheduleVisible, setRescheduleVisible] = useState(false);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleSlot, setRescheduleSlot] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [rescheduleForm] = Form.useForm();
  const [resources, setResources] = useState<Resource[]>([]);
  const [summarizeLoading, setSummarizeLoading] = useState(false);
  const [structureLoading, setStructureLoading] = useState(false);

  const fetchConsultations = async () => {
    try {
      const response = await api.get('/consultations');
      setConsultations(response.data);
    } catch (error) {
      console.error('Error fetching consultations:', error);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await api.get('/patients');
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchVeterinarians = async () => {
    try {
      const response = await api.get('/users/veterinarians');
      setVeterinarians(response.data);
    } catch (error) {
      console.error('Error fetching veterinarians:', error);
    }
  };

  const fetchResources = async () => {
    try {
      const res = await api.get<Resource[]>('/resources');
      setResources(Array.isArray(res.data) ? res.data : []);
    } catch {
      setResources([]);
    }
  };

  useEffect(() => {
    fetchConsultations();
    fetchPatients();
    fetchVeterinarians();
    fetchResources();
  }, []);

  const getListData = (value: Dayjs) => {
    const listData = consultations.filter(c =>
      dayjs(c.consultation_date).isSame(value, 'day'),
    );
    return listData || [];
  };

  const formatStatus = (status?: string) => {
    if (status === 'completed') return 'Realizada';
    if (status === 'cancelled') return 'Cancelada';
    return 'Agendada';
  };

  const getStatusColor = (status?: string) => {
    if (status === 'completed') return 'green';
    if (status === 'cancelled') return 'red';
    return 'blue';
  };

  const handleOpenDetails = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setDetailsVisible(true);
  };

  const handleSelect = (date: Dayjs) => {
    setSelectedDate(date);
  };

  const fetchAvailability = async (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    setAvailabilityLoading(true);
    try {
      const res = await api.get('/availability', { params: { date: dateStr } });
      setAvailability(res.data?.veterinarians ?? []);
    } catch {
      setAvailability([]);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleAdd = () => {
    form.resetFields();
    form.setFieldsValue({ consultation_date: selectedDate });
    setModalVisible(true);
    fetchAvailability(selectedDate);
  };

  const handleSummarizeObservations = async () => {
    const notes = form.getFieldValue('observations') ?? '';
    if (!notes.trim()) {
      message.info('Digite algo nas observações para resumir');
      return;
    }
    setSummarizeLoading(true);
    try {
      const res = await api.post<{ summary?: string }>('/ai/summarize', { notes });
      const summary = res.data?.summary ?? '';
      if (summary) form.setFieldValue('observations', summary);
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao resumir');
    } finally {
      setSummarizeLoading(false);
    }
  };

  const handleStructureObservations = async () => {
    const text = form.getFieldValue('observations') ?? '';
    if (!text.trim()) {
      message.info('Digite algo nas observações para estruturar');
      return;
    }
    setStructureLoading(true);
    try {
      const res = await api.post<{ symptoms?: string[]; possible_diagnosis?: string[] }>('/ai/structure-observations', { text });
      const symptoms = res.data?.symptoms ?? [];
      const diagnosis = res.data?.possible_diagnosis ?? [];
      const structured = [
        symptoms.length ? `Sintomas: ${symptoms.join(', ')}` : '',
        diagnosis.length ? `Diagnóstico possível: ${diagnosis.join(', ')}` : '',
      ].filter(Boolean).join('\n');
      if (structured) form.setFieldValue('observations', (text + (text.endsWith('\n') ? '' : '\n') + structured).trim());
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao estruturar');
    } finally {
      setStructureLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const consultationDate = values.slot_datetime
        ? values.slot_datetime
        : values.consultation_date?.toISOString?.() ?? values.consultation_date;
      const payload = {
        patient_id: values.patient_id,
        veterinarian_id: values.veterinarian_id,
        consultation_date: consultationDate,
        price: parseFloat(values.price),
        observations: values.observations,
        required_resources: values.required_resources?.length ? values.required_resources : undefined,
      };
      await api.post('/consultations', payload);
      message.success('Consulta agendada com sucesso');
      setModalVisible(false);
      fetchConsultations();
    } catch (error) {
      console.error('Error scheduling consultation:', error);
      message.error('Erro ao agendar consulta. Verifique os dados.');
    }
  };

  const handleMarkCompleted = async () => {
    if (!selectedConsultation) return;
    try {
      setUpdating(true);
      await api.put(`/consultations/${selectedConsultation.id}`, {
        status: 'completed',
      });
      message.success('Consulta marcada como realizada');
      setDetailsVisible(false);
      setSelectedConsultation(null);
      fetchConsultations();
    } catch (error) {
      console.error('Error updating consultation status:', error);
      message.error('Erro ao atualizar status da consulta');
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedConsultation) return;
    try {
      setUpdating(true);
      await api.put(`/consultations/${selectedConsultation.id}`, {
        paid: true,
      });
      message.success('Pagamento confirmado');
      setDetailsVisible(false);
      setSelectedConsultation(null);
      fetchConsultations();
    } catch (error) {
      console.error('Error confirming payment:', error);
      message.error('Erro ao confirmar pagamento');
    } finally {
      setUpdating(false);
    }
  };

  const openReschedule = () => {
    setRescheduleSlot(selectedConsultation?.consultation_date ?? null);
    rescheduleForm.setFieldsValue({
      start_time: selectedConsultation?.consultation_date
        ? dayjs(selectedConsultation.consultation_date)
        : dayjs(),
    });
    setRescheduleVisible(true);
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedConsultation) return;
    setRescheduleLoading(true);
    try {
      const values = await rescheduleForm.validateFields();
      const start = values.start_time.toISOString?.() ?? values.start_time;
      const startDate = new Date(start);
      const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);
      await api.put(`/consultations/${selectedConsultation.id}/reschedule`, {
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
      });
      message.success('Consulta reagendada');
      setRescheduleVisible(false);
      setDetailsVisible(false);
      setSelectedConsultation(null);
      fetchConsultations();
    } catch (e) {
      if (e?.errorFields) message.error('Preencha a nova data/hora');
      else message.error('Erro ao reagendar');
    } finally {
      setRescheduleLoading(false);
    }
  };

  const dateCellRender = (value: Dayjs) => {
    const listData = getListData(value);
    return (
      <ul className="list-none p-0 m-0">
        {listData.map(item => (
          <li
            key={item.id}
            className="mb-1 cursor-pointer"
            onClick={() => handleOpenDetails(item)}
          >
            <Badge
              status="success"
              text={
                <span className="text-xs">
                  {dayjs(item.consultation_date).format('HH:mm')} - {item.patient?.name}
                </span>
              }
            />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
          <CalendarOutlined /> Agenda
        </h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          className="bg-blue-600"
        >
          Agendar Consulta
        </Button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <Calendar cellRender={dateCellRender} onSelect={handleSelect} />
      </div>

      <Modal
        title="Agendar Consulta"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="patient_id"
            label="Paciente"
            rules={[{ required: true, message: 'Selecione o paciente' }]}
          >
            <Select placeholder="Selecione o paciente">
              {patients.map(p => (
                <Select.Option key={p.id} value={p.id}>
                  {p.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="consultation_date"
            label="Data"
            rules={[{ required: true, message: 'Selecione a data' }]}
          >
            <DatePicker
              format="DD/MM/YYYY"
              className="w-full"
              onChange={(date) => date && fetchAvailability(date)}
            />
          </Form.Item>

          <Form.Item
            name="veterinarian_id"
            label="Veterinário"
            rules={[{ required: true, message: 'Selecione o veterinário' }]}
          >
            <Select
              placeholder="Selecione o veterinário"
              loading={availabilityLoading}
              onChange={() => form.setFieldValue('slot_datetime', undefined)}
            >
              {veterinarians.map(v => (
                <Select.Option key={v.id} value={v.id}>
                  {v.name} ({v.role})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <SlotSelect form={form} availability={availability} availabilityLoading={availabilityLoading} />

          <Form.Item
            name="price"
            label="Valor da Consulta (R$)"
            rules={[{ required: true, message: 'Informe o valor' }]}
          >
            <Input type="number" step="0.01" prefix="R$" />
          </Form.Item>

          <Form.Item name="required_resources" label="Recursos (opcional)">
            <Select
              mode="multiple"
              placeholder="Salas/equipamentos"
              allowClear
              options={resources.map((r) => ({ value: r.id, label: `${r.name} (${r.type})` }))}
            />
          </Form.Item>

          <Form.Item
            name="observations"
            label="Observações"
            extra={
              <span className="flex items-center gap-2 mt-1">
                <Button
                  type="link"
                  size="small"
                  icon={<BulbOutlined />}
                  onClick={handleSummarizeObservations}
                  loading={summarizeLoading}
                  title="Resumir com IA"
                >
                  Resumir
                </Button>
                <Button
                  type="link"
                  size="small"
                  onClick={handleStructureObservations}
                  loading={structureLoading}
                  title="Estruturar sintomas e diagnóstico (IA)"
                >
                  Estruturar
                </Button>
              </span>
            }
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Detalhes da Consulta"
        open={detailsVisible}
        onCancel={() => {
          setDetailsVisible(false);
          setSelectedConsultation(null);
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setDetailsVisible(false);
              setSelectedConsultation(null);
            }}
          >
            Fechar
          </Button>,
          <Button
            key="reschedule"
            icon={<SwapOutlined />}
            disabled={selectedConsultation?.status === 'cancelled'}
            onClick={openReschedule}
          >
            Reagendar
          </Button>,
          <Button
            key="complete"
            type="primary"
            disabled={selectedConsultation?.status === 'completed'}
            loading={updating}
            onClick={handleMarkCompleted}
          >
            Marcar como realizada
          </Button>,
          <Button
            key="paid"
            type="primary"
            disabled={selectedConsultation?.paid}
            loading={updating}
            onClick={handleConfirmPayment}
          >
            Confirmar pagamento
          </Button>,
        ]}
      >
        {selectedConsultation && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Data e hora:</span>
              <span>
                {new Date(selectedConsultation.consultation_date).toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Paciente:</span>
              <span>{selectedConsultation.patient?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>Veterinário:</span>
              <span>{selectedConsultation.veterinarian?.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Status:</span>
              <Tag color={getStatusColor(selectedConsultation.status)}>
                {formatStatus(selectedConsultation.status)}
              </Tag>
            </div>
            <div className="flex justify-between items-center">
              <span>Pagamento:</span>
              <Tag color={selectedConsultation.paid ? 'green' : 'orange'}>
                {selectedConsultation.paid ? 'Pago' : 'Pendente'}
              </Tag>
            </div>
            {selectedConsultation.observations && (
              <div>
                <div className="font-semibold mb-1">Observações</div>
                <div className="text-sm text-gray-700">
                  {selectedConsultation.observations}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="Reagendar consulta"
        open={rescheduleVisible}
        onCancel={() => setRescheduleVisible(false)}
        onOk={() => handleRescheduleSubmit()}
        confirmLoading={rescheduleLoading}
      >
        <Form form={rescheduleForm} layout="vertical">
          <Form.Item
            name="start_time"
            label="Nova data e hora"
            rules={[{ required: true }]}
          >
            <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
