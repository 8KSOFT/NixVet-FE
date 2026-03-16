'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '@/lib/axios';

interface Material {
  id: number;
  name: string;
}

export default function SettingsMaterialsPage() {
  const [list, setList] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();

  const fetchMaterials = async () => {
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

  useEffect(() => {
    fetchMaterials();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (row: Material) => {
    setEditingId(row.id);
    form.setFieldsValue({ name: row.name });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/catalog/materials/${id}`);
      message.success('Removido');
      fetchMaterials();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao remover');
    }
  };

  const onFinish = async (values: { name: string }) => {
    try {
      if (editingId) {
        await api.put(`/catalog/materials/${editingId}`, values);
        message.success('Atualizado');
      } else {
        await api.post('/catalog/materials', values);
        message.success('Criado');
      }
      setModalOpen(false);
      fetchMaterials();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao salvar');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-600 mb-6">Materiais</h1>
      <Card>
        <Space className="mb-4">
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} className="bg-blue-600">
            Novo material
          </Button>
        </Space>
        <Table
          loading={loading}
          dataSource={list}
          rowKey="id"
          columns={[
            { title: 'Nome', dataIndex: 'name', key: 'name' },
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
        title={editingId ? 'Editar material' : 'Novo material'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
            <Input placeholder="Nome do material" />
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
