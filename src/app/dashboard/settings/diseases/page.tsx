'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Select, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '@/lib/axios';

interface Category {
  id: number;
  name: string;
}

interface Disease {
  id: number;
  name: string;
  disease_category_id?: number;
  disease_category?: Category;
}

export default function SettingsDiseasesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [list, setList] = useState<Disease[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const fetchCategories = async () => {
    try {
      const res = await api.get<Category[]>('/catalog/disease-categories');
      setCategories(res.data ?? []);
    } catch (e) {
      message.error('Erro ao carregar categorias');
    }
  };

  const fetchDiseases = async () => {
    setLoading(true);
    try {
      const res = await api.get<Disease[]>('/catalog/diseases');
      setList(res.data ?? []);
    } catch (e) {
      message.error('Erro ao carregar doenças');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchDiseases();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (row: Disease) => {
    setEditingId(row.id);
    form.setFieldsValue({ name: row.name, category_id: row.disease_category_id ?? row.disease_category?.id });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/catalog/diseases/${id}`);
      message.success('Removido');
      fetchDiseases();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao remover');
    }
  };

  const onFinish = async (values: { name: string; category_id?: number }) => {
    try {
      if (editingId) {
        await api.put(`/catalog/diseases/${editingId}`, values);
        message.success('Atualizado');
      } else {
        await api.post('/catalog/diseases', values);
        message.success('Criado');
      }
      setModalOpen(false);
      fetchDiseases();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao salvar');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-600 mb-6">Doenças</h1>
      <Card>
        <Space className="mb-4">
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} className="bg-blue-600">
            Nova doença
          </Button>
        </Space>
        <Table
          loading={loading}
          dataSource={list}
          rowKey="id"
          columns={[
            { title: 'Nome', dataIndex: 'name', key: 'name' },
            {
              title: 'Categoria',
              key: 'category',
              render: (_, r) => r.disease_category?.name ?? r.disease_category_id ?? '—',
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
        title={editingId ? 'Editar doença' : 'Nova doença'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="category_id" label="Categoria">
            <Select allowClear placeholder="Selecione" options={categories.map((c) => ({ label: c.name, value: c.id }))} />
          </Form.Item>
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
            <Input placeholder="Nome da doença" />
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
