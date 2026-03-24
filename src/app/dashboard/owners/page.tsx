'use client';

import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, SearchOutlined } from '@ant-design/icons';
import { MaskedInput } from 'antd-mask-input';
import axios from 'axios';
import api from '@/lib/axios';
import { formatCepMask } from '@/lib/format-cep';

interface Tutor {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  address: string;
  cep: string;
}

export default function OwnersPage() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<Tutor | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);
  const [form] = Form.useForm();

  const fetchTutors = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tutors');
      setTutors(response.data);
    } catch (error) {
      console.error('Error fetching tutors:', error);
      message.error('Erro ao carregar tutores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTutors();
  }, []);

  useEffect(() => {
    if (!modalVisible) return;

    if (!editingId || !editingRecord || editingRecord.id !== editingId) {
      form.resetFields();
      return;
    }

    const record = editingRecord;
    let street = record.address;
    let number = '';
    let complement = '';
    let neighborhood = '';
    let city = '';
    let state = '';

    const parts = record.address ? record.address.split(' - ') : [];

    if (parts.length >= 3) {
      const firstPart = parts[0].split(',');
      street = firstPart[0];
      number = firstPart[1] ? firstPart[1].trim() : '';

      if (parts.length >= 4) {
        complement = parts[1];
        neighborhood = parts[2];
        const cityState = parts[3].split('/');
        city = cityState[0];
        state = cityState[1] || '';
      } else {
        neighborhood = parts[1];
        const cityState = parts[2].split('/');
        city = cityState[0];
        state = cityState[1] || '';
      }
    }

    form.setFieldsValue({
      name: record.name,
      email: record.email,
      phone: record.phone,
      cpf: record.cpf,
      cep: formatCepMask(record.cep),
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
    });
  }, [modalVisible, editingId, editingRecord, form]);

  const handleAdd = () => {
    setEditingId(null);
    setEditingRecord(null);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/tutors/${id}`);
      message.success('Tutor removido com sucesso');
      fetchTutors();
    } catch (error) {
      console.error('Error deleting tutor:', error);
      message.error('Erro ao remover tutor');
    }
  };

  const handleCepSearch = async () => {
    const cepValue = form.getFieldValue('cep');
    if (!cepValue) return;

    const cep = cepValue.replace(/\D/g, '');
    if (cep.length !== 8) {
        message.warning('CEP inválido');
        return;
    }

    // Clear address fields before searching to give feedback
    form.setFieldsValue({
        street: '',
        neighborhood: '',
        city: '',
        state: ''
    });

    setLoadingCep(true);
    try {
      const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
      if (response.data.erro) {
        message.error('CEP não encontrado');
        return;
      }
      
      const { logradouro, bairro, localidade, uf } = response.data;
      
      // Auto-fill fields
      // Use setFieldsValue to force update form values
      form.setFieldsValue({
        street: logradouro,
        neighborhood: bairro,
        city: localidade,
        state: uf
      });
      // Force re-render of form items if needed, though setFieldsValue should work
    } catch (error) {
      console.error('Error fetching CEP:', error);
      message.error('Erro ao buscar CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      // Monta o endereço completo; envia só os campos aceitos pelo backend (evita 400 se a API for antiga)
      const fullAddress = `${values.street}, ${values.number}${values.complement ? ` - ${values.complement}` : ''} - ${values.neighborhood} - ${values.city}/${values.state}`;
      const payload = {
        name: values.name,
        cpf: values.cpf,
        email: values.email,
        cep: values.cep,
        phone: values.phone,
        address: fullAddress,
        consent_given: values.consent_given,
      };

      if (editingId) {
        await api.put(`/tutors/${editingId}`, payload);
        message.success('Tutor atualizado com sucesso');
      } else {
        await api.post('/tutors', payload);
        message.success('Tutor criado com sucesso');
      }
      setModalVisible(false);
      setEditingId(null);
      setEditingRecord(null);
      fetchTutors();
    } catch (error) {
      console.error('Error saving tutor:', error);
      message.error('Erro ao salvar tutor');
    }
  };

  const handleEdit = (record: Tutor) => {
    setEditingId(record.id);
    setEditingRecord(record);
    setModalVisible(true);
  };

  const columns = [
    {
      title: 'Nome',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Telefone',
      dataIndex: 'phone',
      key: 'phone',
      render: (text: string) => {
        if (!text) return '';
        // Format: (11) 98587-5908
        // Assuming backend returns only numbers or unformatted string
        const cleaned = ('' + text).replace(/\D/g, '');
        const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
        if (match) {
          return `(${match[1]}) ${match[2]}-${match[3]}`;
        }
        // Fallback for landlines (2+4+4)
        const matchLand = cleaned.match(/^(\d{2})(\d{4})(\d{4})$/);
        if (matchLand) {
            return `(${matchLand[1]}) ${matchLand[2]}-${matchLand[3]}`;
        }
        return text;
      }
    },
    {
      title: 'CPF',
      dataIndex: 'cpf',
      key: 'cpf',
      render: (text: string) => {
        if (!text) return '';
        // Format incoming raw CPF to masked
        // Backend returns clean numbers? Or formatted? 
        // Assuming clean numbers or whatever comes from decrypt
        const cleaned = ('' + text).replace(/\D/g, '');
        // Check if length is correct for CPF (11 digits)
        if (cleaned.length === 11) {
            return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '***.$2.$3-**');
        }
        return text;
      }
    },
    {
      title: 'Ações',
      key: 'actions',
      render: (_: any, record: Tutor) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="Tem certeza?" onConfirm={() => handleDelete(record.id)}>
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
          <TeamOutlined /> Tutores
        </h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} className="bg-blue-600">
          Novo Tutor
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={tutors}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingId ? 'Editar Tutor' : 'Novo Tutor'}
        open={modalVisible}
        destroyOnClose
        onCancel={() => {
          setModalVisible(false);
          setEditingId(null);
          setEditingRecord(null);
        }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Nome" rules={[{ required: true, message: 'Obrigatório' }]}>
            <Input />
          </Form.Item>
          
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="cpf" label="CPF" rules={[{ required: true, message: 'Obrigatório' }]}>
              <MaskedInput mask="000.000.000-00" />
            </Form.Item>
            <Form.Item name="phone" label="Telefone" rules={[{ required: true, message: 'Obrigatório' }]}>
              <MaskedInput mask="(00) 00000-0000" />
            </Form.Item>
          </div>

          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Email inválido' }]}>
            <Input />
          </Form.Item>
          
          <div className="grid grid-cols-3 gap-4">
             <div className="col-span-1">
                <Form.Item label="CEP" required tooltip="Digite o CEP para buscar o endereço">
                  <div className="flex gap-2">
                     <Form.Item
                        name="cep"
                        noStyle
                        rules={[{ required: true, message: 'Obrigatório' }]}
                     >
                        <MaskedInput mask="00000-000" disabled={loadingCep} className="w-full" />
                     </Form.Item>
                     <Button 
                       type="primary"
                       icon={loadingCep ? <SearchOutlined spin /> : <SearchOutlined />} 
                       onClick={handleCepSearch}
                       disabled={loadingCep}
                       className="bg-blue-600"
                     />
                  </div>
                </Form.Item>
             </div>
             <div className="col-span-2">
                <div className="grid grid-cols-3 gap-2">
                    <Form.Item name="street" label="Logradouro" className="col-span-2" rules={[{ required: true, message: 'Obrigatório' }]}>
                      <Input placeholder="Rua, Av, etc" />
                    </Form.Item>
                    <Form.Item name="number" label="Número" rules={[{ required: true, message: 'Obrigatório' }]}>
                      <Input placeholder="123" />
                    </Form.Item>
                </div>
             </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <Form.Item name="complement" label="Complemento">
                <Input placeholder="Apto 101" />
            </Form.Item>
            <Form.Item name="neighborhood" label="Bairro" rules={[{ required: true, message: 'Obrigatório' }]}>
                <Input />
            </Form.Item>
             <div className="col-span-1">
                 <div className="flex gap-2">
                    <Form.Item name="city" label="Cidade" className="flex-1" rules={[{ required: true, message: 'Obrigatório' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="state" label="UF" className="w-16" rules={[{ required: true, message: 'Obrigatório' }]}>
                        <Input maxLength={2} />
                    </Form.Item>
                 </div>
             </div>
          </div>

        </Form>
      </Modal>
    </div>
  );
}
