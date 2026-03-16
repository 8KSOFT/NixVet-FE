'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Select, message, Tag } from 'antd';
import { FileSearchOutlined } from '@ant-design/icons';
import api from '@/lib/axios';

interface ExamFollowup {
  id: string;
  exam_request_id: string;
  patient_id: string;
  expected_result_date: string | null;
  followup_status: string;
  followup_consultation_id: string | null;
  ExamRequest?: { id: string };
  Patient?: { name: string };
}

export default function FollowupsPage() {
  const [awaiting, setAwaiting] = useState<ExamFollowup[]>([]);
  const [all, setAll] = useState<ExamFollowup[]>([]);
  const [examRequests, setExamRequests] = useState<{ id: string }[]>([]);
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [awaitRes, allRes, examsRes, patientsRes] = await Promise.all([
        api.get<ExamFollowup[]>('/exam-followups/awaiting-followup'),
        api.get<ExamFollowup[]>('/exam-followups'),
        api.get<{ id: string }[]>('/exam-requests'),
        api.get<{ id: string; name: string }[]>('/patients'),
      ]);
      setAwaiting(Array.isArray(awaitRes.data) ? awaitRes.data : []);
      setAll(Array.isArray(allRes.data) ? allRes.data : []);
      setExamRequests(Array.isArray(examsRes.data) ? examsRes.data : []);
      setPatients(Array.isArray(patientsRes.data) ? patientsRes.data : []);
    } catch {
      message.error('Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onFinishCreate = async (values: { exam_request_id: string; patient_id: string; expected_result_date?: string }) => {
    try {
      await api.post('/exam-followups', values);
      message.success('Acompanhamento criado');
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao criar');
    }
  };

  const updateStatus = async (id: string, followup_status: string) => {
    try {
      await api.put(`/exam-followups/${id}`, { followup_status });
      message.success('Atualizado');
      fetchData();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-600 mb-6 flex items-center gap-2">
        <FileSearchOutlined /> Acompanhamento de exames
      </h1>
      <Card>
        <Button type="primary" onClick={() => { setModalOpen(true); setEditingId(null); }} className="mb-4 bg-blue-600">
          Novo acompanhamento
        </Button>
        <h3 className="font-medium text-slate-700 mb-2">Aguardando retorno</h3>
        <Table
          loading={loading}
          dataSource={awaiting}
          rowKey="id"
          pagination={false}
          columns={[
            { title: 'Paciente', dataIndex: ['Patient', 'name'], key: 'patient' },
            { title: 'Solicitação', dataIndex: 'exam_request_id', key: 'exam_request_id' },
            { title: 'Previsão resultado', dataIndex: 'expected_result_date', key: 'expected_result_date' },
            { title: 'Status', dataIndex: 'followup_status', key: 'followup_status' },
            {
              title: 'Ações',
              key: 'actions',
              render: (_: any, r: ExamFollowup) => (
                <Button type="link" size="small" onClick={() => updateStatus(r.id, 'closed')}>
                  Fechar
                </Button>
              ),
            },
          ]}
        />
        <h3 className="font-medium text-slate-700 mt-6 mb-2">Todos</h3>
        <Table
          loading={loading}
          dataSource={all}
          rowKey="id"
          pagination={{ pageSize: 20 }}
          columns={[
            { title: 'Paciente', dataIndex: ['Patient', 'name'], key: 'patient' },
            { title: 'Previsão', dataIndex: 'expected_result_date', key: 'expected_result_date' },
            { title: 'Status', dataIndex: 'followup_status', key: 'followup_status', render: (s: string) => <Tag>{s}</Tag> },
          ]}
        />
      </Card>

      <Modal title="Novo acompanhamento" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={onFinishCreate}>
          <Form.Item name="exam_request_id" label="Solicitação de exame" rules={[{ required: true }]}>
            <Select
              placeholder="Selecione"
              options={examRequests.map((e) => ({ value: e.id, label: e.id }))}
            />
          </Form.Item>
          <Form.Item name="patient_id" label="Paciente" rules={[{ required: true }]}>
            <Select
              placeholder="Selecione"
              options={patients.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Form.Item>
          <Form.Item name="expected_result_date" label="Previsão do resultado">
            <Input type="date" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" className="bg-blue-600">Criar</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
