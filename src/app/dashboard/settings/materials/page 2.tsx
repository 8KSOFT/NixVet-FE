'use client';

import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '@/lib/axios';

interface Material {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  tenant_id: string | null;
}

export default function MaterialsSettingsPage() {
  const [list, setList] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<Material[]>('/catalog/materials');
      setList(res.data ?? []);
    } catch (e) {
      message.error('Erro ao carregar materiais');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (row: Material) => {
    if (row.tenant_id == null) {
      message.info('Itens do sistema base não podem ser editados.');
      return;
    }
    setEditingId(row.id);
    form.setFieldsValue({ name: row.name, description: row.description ?? '' });
    setModalOpen(true);
  };

  const handleDelete = async (row: Material) => {
    if (row.tenant_id == null) {
      message.warning('Itens do sistema base não podem ser excluídos.');
      return;
    }
    try {
      await api.delete(`/catalog/materials/${row.id}`);
      message.success('Excluído');
      load();
    } catch (e) {
      message.error('Erro ao excluir');
    }
  };

  const onFinish = async (values: any) => {
    try {
      if (editingId != null) {
        await api.put(`/catalog/materials/${editingId}`, values);
        message.success('Atualizado');
      } else {
        await api.post('/catalog/materials', values);
        message.success('Adicionado');
      }
      setModalOpen(false);
      load();
    } catch (e) {
      message.error(editingId != null ? 'Erro ao atualizar' : 'Erro ao adicionar');
    }
  };

  const columns = [
    { title: 'Nome', dataIndex: 'name', key: 'name' },
    { title: 'Descrição', dataIndex: 'description', key: 'description', render: (v: string | null) => v ?? '—' },
    {
      title: 'Tipo',
      key: 'type',
      render: (_: unknown, r: Material) =>
        r.tenant_id == null ? <Tag color="blue">Sistema</Tag> : <Tag color="green">Clínica</Tag>,
    },
    {
      title: 'Ações',
      key: 'actions',
      render: (_: unknown, row: Material) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(row)} disabled={row.tenant_id == null} />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-blue-600">Materiais</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} className="bg-blue-600">
          Adicionar
        </Button>
      </div>
      <p className="text-gray-500 text-sm mb-3">
        Itens do <strong>Sistema</strong> são a base. Sua clínica pode adicionar itens próprios (<strong>Clínica</strong>).
      </p>
      <Table rowKey="id" columns={columns} dataSource={list} loading={loading} pagination={{ pageSize: 20 }} />

      <Modal title={editingId != null ? 'Editar material' : 'Novo material'} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
            <Input placeholder="Nome do material" />
          </Form.Item>
          <Form.Item name="description" label="Descrição">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" className="bg-blue-600">Salvar</Button>
              <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
