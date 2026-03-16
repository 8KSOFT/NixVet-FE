'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Select, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '@/lib/axios';

interface Area {
  id: number;
  name: string;
}

interface Exam {
  id: number;
  name: string;
  exam_area_id?: number;
  exam_area?: Area;
}

export default function SettingsExamsPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [list, setList] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const fetchAreas = async () => {
    try {
      const res = await api.get<Area[]>('/catalog/exam-areas');
      setAreas(res.data ?? []);
    } catch (e) {
      message.error('Erro ao carregar áreas');
    }
  };

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await api.get<Exam[]>('/catalog/exams');
      setList(res.data ?? []);
    } catch (e) {
      message.error('Erro ao carregar exames');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
    fetchExams();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (row: Exam) => {
    setEditingId(row.id);
    form.setFieldsValue({ name: row.name, area_id: row.exam_area_id ?? row.exam_area?.id });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/catalog/exams/${id}`);
      message.success('Removido');
      fetchExams();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao remover');
    }
  };

  const onFinish = async (values: { name: string; area_id?: number }) => {
    try {
      if (editingId) {
        await api.put(`/catalog/exams/${editingId}`, values);
        message.success('Atualizado');
      } else {
        await api.post('/catalog/exams', values);
        message.success('Criado');
      }
      setModalOpen(false);
      fetchExams();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao salvar');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-600 mb-6">Exames</h1>
      <Card>
        <Space className="mb-4">
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} className="bg-blue-600">
            Novo exame
          </Button>
        </Space>
        <Table
          loading={loading}
          dataSource={list}
          rowKey="id"
          columns={[
            { title: 'Nome', dataIndex: 'name', key: 'name' },
            {
              title: 'Área',
              key: 'area',
              render: (_, r) => r.exam_area?.name ?? r.exam_area_id ?? '—',
            },
            {
              title: 'Ações',
              key: 'actions',
              width: 120,
              render: (_, r) => (
                <Space>
                  <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                  <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)} />
                </Space>
              ),
            },
          ]}
          pagination={{ pageSize: 20 }}
        />
      </Card>
      <Modal
        title={editingId ? 'Editar exame' : 'Novo exame'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="area_id" label="Área de exame">
            <Select allowClear placeholder="Selecione" options={areas.map((a) => ({ label: a.name, value: a.id }))} />
          </Form.Item>
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
            <Input placeholder="Nome do exame" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" className="bg-blue-600">
              Salvar
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
