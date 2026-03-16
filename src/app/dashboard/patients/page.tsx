'use client';

import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Popconfirm, Select, InputNumber, Radio } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, MedicineBoxOutlined, HistoryOutlined } from '@ant-design/icons';
import Link from 'next/link';
import api from '@/lib/axios';

const NO_TUTOR_REASON_LABELS: Record<string, string> = {
  EMERGENCIA: 'Emergência',
  ABANDONO: 'Abandono',
};

interface Tutor {
  id: string;
  name: string;
}

interface Patient {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  weight: number;
  sex: string;
  chip_number?: string;
  tutor_id: string | null;
  no_tutor_reason?: string | null;
  tutor?: Tutor | null;
}

interface SupportOption {
  id: number;
  description: string;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [speciesOptions, setSpeciesOptions] = useState<SupportOption[]>([]);
  const [breedOptions, setBreedOptions] = useState<SupportOption[]>([]);
  const [breedSearchValue, setBreedSearchValue] = useState('');
  const [sexOptions, setSexOptions] = useState<SupportOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const watchedSpecies = Form.useWatch('species', form);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const response = await api.get('/patients');
      setPatients(response.data);
    } catch (error) {
      console.error('Error fetching patients:', error);
      message.error('Erro ao carregar pacientes');
    } finally {
      setLoading(false);
    }
  };

  const fetchTutors = async () => {
    try {
      const response = await api.get('/tutors');
      setTutors(response.data);
    } catch (error) {
      console.error('Error fetching tutors:', error);
    }
  };

  const BREED_DISCRIMINATOR: Record<string, string> = {
    CANINO: 'ANIMAL_RACA_CAO',
    FELINO: 'ANIMAL_RACA_GATO',
    BOVINO: 'ANIMAL_RACA_BOVINO',
    EQUINO: 'ANIMAL_RACA_EQUINO',
    OUTRO: 'ANIMAL_RACA_OUTRO',
  };

  const getBreedDiscriminator = (species: string) =>
    BREED_DISCRIMINATOR[species] ?? 'ANIMAL_RACA_OUTRO';

  const fetchSupportOptions = async () => {
    try {
      const [species, sex] = await Promise.all([
        api.get<SupportOption[]>('/catalog/support', { params: { discriminator: 'ANIMAL_ESPECIE' } }),
        api.get<SupportOption[]>('/catalog/support', { params: { discriminator: 'ANIMAL_GENERO' } }),
      ]);
      setSpeciesOptions(species.data ?? []);
      setSexOptions(sex.data ?? []);
    } catch (error) {
      console.error('Error fetching support options:', error);
    }
  };

  const fetchBreedOptions = async (species: string) => {
    const disc = getBreedDiscriminator(species);
    try {
      const res = await api.get<SupportOption[]>('/catalog/support', { params: { discriminator: disc } });
      setBreedOptions(res.data ?? []);
    } catch (error) {
      console.error('Error fetching breed options:', error);
      setBreedOptions([]);
    }
  };

  const handleAddBreed = async (breedName?: string) => {
    const species = form.getFieldValue('species');
    const disc = getBreedDiscriminator(species);
    const newBreed = (breedName ?? breedSearchValue)?.trim();
    if (!newBreed) return;
    try {
      await api.post('/catalog/support', { discriminator: disc, description: newBreed });
      message.success(`Raça "${newBreed}" cadastrada`);
      await fetchBreedOptions(species);
      form.setFieldValue('breed', newBreed);
      setBreedSearchValue('');
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Erro ao cadastrar raça');
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchTutors();
    fetchSupportOptions();
  }, []);

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ tutor_choice: undefined });
    setModalVisible(true);
  };

  const handleEdit = (record: Patient) => {
    setEditingId(record.id);
    const hasTutor = !!record.tutor_id;
    form.setFieldsValue({
      ...record,
      tutor_choice: hasTutor ? 'yes' : 'no',
      no_tutor_reason: record.no_tutor_reason ?? undefined,
    });
    fetchBreedOptions(record.species);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/patients/${id}`);
      message.success('Paciente removido com sucesso');
      fetchPatients();
    } catch (error) {
      console.error('Error deleting patient:', error);
      message.error('Erro ao remover paciente');
    }
  };

  const handleSubmit = async (values: any) => {
    const { tutor_choice, ...rest } = values;
    const payload =
      tutor_choice === 'yes'
        ? { ...rest, tutor_id: rest.tutor_id || null, no_tutor_reason: null }
        : { ...rest, tutor_id: null, no_tutor_reason: rest.no_tutor_reason || null };
    try {
      if (editingId) {
        await api.put(`/patients/${editingId}`, payload);
        message.success('Paciente atualizado com sucesso');
      } else {
        await api.post('/patients', payload);
        message.success('Paciente criado com sucesso');
      }
      setModalVisible(false);
      fetchPatients();
    } catch (error) {
      console.error('Error saving patient:', error);
      message.error('Erro ao salvar paciente');
    }
  };

  const columns = [
    {
      title: 'Nome',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Espécie',
      dataIndex: 'species',
      key: 'species',
    },
    {
      title: 'Raça',
      dataIndex: 'breed',
      key: 'breed',
    },
    {
      title: 'Tutor',
      key: 'tutorName',
      render: (_: any, record: Patient) =>
        record.tutor?.name ?? (record.no_tutor_reason ? `Sem tutor (${NO_TUTOR_REASON_LABELS[record.no_tutor_reason] ?? record.no_tutor_reason})` : '—'),
    },
    {
      title: 'Ações',
      key: 'actions',
      render: (_: any, record: Patient) => (
        <Space>
          <Link href={`/dashboard/patients/${record.id}`}>
            <Button icon={<HistoryOutlined />} title="Ver timeline" />
          </Link>
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
          <MedicineBoxOutlined /> Pacientes
        </h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} className="bg-blue-600">
          Novo Paciente
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={patients}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingId ? 'Editar Paciente' : 'Novo Paciente'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Nome" rules={[{ required: true, message: 'Obrigatório' }]}>
            <Input />
          </Form.Item>

          <Form.Item
            name="tutor_choice"
            label="Tutor"
            rules={[{ required: true, message: 'Defina se informa o tutor agora ou não' }]}
            extra={editingId ? 'Você pode vincular ou alterar o tutor ao editar o paciente.' : undefined}
          >
            <Radio.Group>
              <Radio value="yes">Informar tutor agora</Radio>
              <Radio value="no">Não informar tutor (emergência ou abandono)</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.tutor_choice !== curr.tutor_choice}
          >
            {({ getFieldValue }) =>
              getFieldValue('tutor_choice') === 'yes' ? (
                <Form.Item name="tutor_id" label="Selecione o tutor" rules={[{ required: true, message: 'Selecione um tutor' }]}>
                  <Select placeholder="Selecione um tutor" allowClear showSearch optionFilterProp="label">
                    {tutors.map((tutor) => (
                      <Select.Option key={tutor.id} value={tutor.id} label={tutor.name}>
                        {tutor.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : getFieldValue('tutor_choice') === 'no' ? (
                <Form.Item name="no_tutor_reason" label="Motivo" rules={[{ required: true, message: 'Informe o motivo' }]}>
                  <Select placeholder="Selecione o motivo">
                    <Select.Option value="EMERGENCIA">{NO_TUTOR_REASON_LABELS.EMERGENCIA}</Select.Option>
                    <Select.Option value="ABANDONO">{NO_TUTOR_REASON_LABELS.ABANDONO}</Select.Option>
                  </Select>
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="species" label="Espécie" rules={[{ required: true, message: 'Obrigatório' }]}>
              <Select
                placeholder="Selecione"
                showSearch
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                options={speciesOptions.map((o) => ({ value: o.description, label: o.description }))}
                onChange={(value) => {
                  form.setFieldValue('breed', undefined);
                  fetchBreedOptions(value);
                }}
              />
            </Form.Item>
            <Form.Item name="breed" label="Raça" rules={[{ required: true, message: 'Obrigatório' }]}>
              <Select
                placeholder={breedOptions.length ? 'Selecione ou cadastre a raça' : 'Selecione primeiro a espécie'}
                showSearch
                filterOption={(input, option) => {
                  const optVal = option?.value as string;
                  if (optVal?.startsWith('__NEW__:')) return true;
                  return (option?.label ?? '').toLowerCase().includes(input.toLowerCase());
                }}
                options={[
                  ...breedOptions.map((o) => ({ value: o.description, label: o.description })),
                  ...(breedSearchValue?.trim() &&
                  !breedOptions.some(
                    (o) => o.description.toLowerCase() === breedSearchValue.trim().toLowerCase(),
                  )
                    ? [
                        {
                          value: `__NEW__:${breedSearchValue.trim()}`,
                          label: `+ Cadastrar "${breedSearchValue.trim()}"`,
                        },
                      ]
                    : []),
                ]}
                onSearch={setBreedSearchValue}
                onSelect={(val: string) => {
                  if (val.startsWith('__NEW__:')) {
                    const newBreed = val.replace(/^__NEW__:/, '');
                    form.setFieldValue('breed', newBreed);
                    handleAddBreed(newBreed);
                  }
                }}
                allowClear
                disabled={!watchedSpecies}
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Form.Item name="age" label="Idade (anos)" rules={[{ required: true, message: 'Obrigatório' }]}>
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item name="weight" label="Peso (kg)" rules={[{ required: true, message: 'Obrigatório' }]}>
              <InputNumber min={0} step={0.1} className="w-full" />
            </Form.Item>
            <Form.Item name="sex" label="Sexo" rules={[{ required: true, message: 'Obrigatório' }]}>
              <Select
                placeholder="Selecione"
                options={sexOptions.map((o) => ({ value: o.description, label: o.description }))}
              />
            </Form.Item>
          </div>


          <Form.Item name="chip_number" label="Nº Microchip">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
