'use client';

import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '@/lib/axios';

interface Category {
  id: number;
  name: string;
  tenant_id: string | null;
}

interface Disease {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  category_id: number;
  category?: { name: string };
  tenant_id: string | null;
}

export default function DiseasesSettingsPage() {
  const [list, setList] = useState<Disease[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try {
      const [resList, resCat] = await Promise.all([
        api.get<Disease[]>('/catalog/diseases'),
        api.get<Category[]>('/catalog/disease-categories'),
      ]);
      setList(resList.data ?? []);
      setCategories(resCat.data ?? []);
    } catch (e) {
      message.error('Erro ao carregar doenças');
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

  const openEdit = (row: Disease) => {
    if (row.tenant_id == null) {
      message.info('Itens do sistema base não podem ser editados. Adicione um item customizado para sua clínica.');
      return;
    }
    setEditingId(row.id);
    form.setFieldsValue({ name: row.name, description: row.description ?? '', category_id: row.category_id });
    setModalOpen(true);
  };

  const handleDelete = async (row: Disease) => {
    if (row.tenant_id == null) {
      message.warning('Itens do sistema base não podem ser excluídos.');
      return;
    }
    try {
      await api.delete(`/catalog/diseases/${row.id}`);
      message.success('Excluído');
      load();
    } catch (e) {
      message.error('Erro ao excluir');
    }
  };

  const onFinish = async (values: any) => {
    try {
      if (editingId != null) {
        await api.put(`/catalog/diseases/${editingId}`, values);
        message.success('Atualizado');
      } else {
        await api.post('/catalog/diseases', values);
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
    { title: 'Categoria', dataIndex: ['category', 'name'], key: 'category' },
    {
      title: 'Tipo',
      key: 'type',
      render: (_: unknown, r: Disease) =>
        r.tenant_id == null ? <Tag color="blue">Sistema</Tag> : <Tag color="green">Clínica</Tag>,
    },
    {
      title: 'Ações',
      key: 'actions',
      render: (_: unknown, row: Disease) => (
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
        <h2 className="text-xl font-bold text-blue-600">Doenças</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} className="bg-blue-600">
          Adicionar
        </Button>
      </div>
      <p className="text-gray-500 text-sm mb-3">
        Itens do <strong>Sistema</strong> são a base do catálogo. Sua clínica pode adicionar itens próprios (marcados como <strong>Clínica</strong>).
      </p>
      <Table rowKey="id" columns={columns} dataSource={list} loading={loading} pagination={{ pageSize: 20 }} />

      <Modal
        title={editingId != null ? 'Editar doença' : 'Nova doença'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="category_id" label="Categoria" rules={[{ required: true }]}>
            <Select placeholder="Categoria" options={categories.map((c) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
            <Input placeholder="Nome da doença" />
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
