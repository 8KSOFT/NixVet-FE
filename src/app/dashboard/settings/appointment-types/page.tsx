'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, message, Popconfirm, Space, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '@/lib/axios';

interface AppointmentType {
  id: string;
  name: string;
  duration_minutes: number;
  color: string | null;
  is_active: boolean;
}

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#64748b',
];

export default function AppointmentTypesPage() {
  const [list, setList] = useState<AppointmentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentType | null>(null);
  const [form] = Form.useForm();

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await api.get<AppointmentType[]>('/appointment-types');
      setList(res.data ?? []);
    } catch {
      message.error('Erro ao carregar tipos de procedimento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const openNew = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ duration_minutes: 30, color: '#3b82f6' });
    setModalOpen(true);
  };

  const openEdit = (row: AppointmentType) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      duration_minutes: row.duration_minutes,
      color: row.color ?? '#3b82f6',
    });
    setModalOpen(true);
  };

  const onFinish = async (values: { name: string; duration_minutes: number; color?: string }) => {
    try {
      if (editing) {
        await api.put(`/appointment-types/${editing.id}`, values);
        message.success('Atualizado');
      } else {
        await api.post('/appointment-types', values);
        message.success('Tipo criado');
      }
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetchList();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao salvar');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/appointment-types/${id}`);
      message.success('Removido');
      fetchList();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao remover');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-600 mb-6">Tipos de Procedimento</h1>
      <Card>
        <p className="text-slate-600 mb-4">
          Defina os tipos de procedimento com sua duração padrão. O sistema usará essa duração ao calcular
          os slots disponíveis na agenda.
        </p>
        <Space className="mb-4">
          <Button type="primary" icon={<PlusOutlined />} onClick={openNew} className="bg-blue-600">
            Novo tipo
          </Button>
        </Space>
        <Table
          loading={loading}
          dataSource={list}
          rowKey="id"
          pagination={false}
          columns={[
            {
              title: 'Nome',
              dataIndex: 'name',
              render: (name: string, r: AppointmentType) => (
                <Space>
                  {r.color && (
                    <span
                      style={{ background: r.color, width: 14, height: 14, borderRadius: 3, display: 'inline-block' }}
                    />
                  )}
                  {name}
                </Space>
              ),
            },
            {
              title: 'Duração',
              dataIndex: 'duration_minutes',
              render: (d: number) => {
                if (d < 60) return `${d} min`;
                const h = Math.floor(d / 60);
                const m = d % 60;
                return m > 0 ? `${h}h ${m}min` : `${h}h`;
              },
            },
            {
              title: 'Cor no calendário',
              dataIndex: 'color',
              render: (c: string | null) =>
                c ? (
                  <Tag style={{ background: c, borderColor: c, color: '#fff' }}>{c}</Tag>
                ) : (
                  <span className="text-gray-400">—</span>
                ),
            },
            {
              title: 'Ações',
              key: 'actions',
              render: (_: any, r: AppointmentType) => (
                <Space>
                  <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />
                  <Popconfirm
                    title="Remover este tipo?"
                    onConfirm={() => handleDelete(r.id)}
                    okText="Remover"
                    cancelText="Cancelar"
                  >
                    <Button icon={<DeleteOutlined />} size="small" danger />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={editing ? 'Editar tipo de procedimento' : 'Novo tipo de procedimento'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="name" label="Nome do procedimento" rules={[{ required: true }]}>
            <Input placeholder="Ex.: Consulta, Vacina, Cirurgia, Retorno..." />
          </Form.Item>
          <Form.Item
            name="duration_minutes"
            label="Duração padrão (minutos)"
            rules={[{ required: true }]}
          >
            <InputNumber min={5} max={480} step={5} className="w-full" addonAfter="min" />
          </Form.Item>
          <Form.Item name="color" label="Cor no calendário">
            <Input type="color" className="w-24 h-10 p-1 cursor-pointer" />
          </Form.Item>
          <div className="flex flex-wrap gap-2 mb-4">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => form.setFieldValue('color', c)}
                style={{ background: c, width: 28, height: 28, borderRadius: 4, border: '2px solid #e5e7eb', cursor: 'pointer' }}
                title={c}
              />
            ))}
          </div>
          <Form.Item>
            <Button type="primary" htmlType="submit" className="bg-blue-600">
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
