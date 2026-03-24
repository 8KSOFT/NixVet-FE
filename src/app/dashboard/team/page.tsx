'use client';

import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Tag, Space, Popconfirm, Select } from 'antd';
import { PlusOutlined, UserOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '@/lib/axios';
import { getStoredUserRole } from '@/lib/role-permissions';
import { useTranslation } from 'react-i18next';

interface UserRow {
  id: string;
  name: string;
  email: string;
  crmv?: string;
  specialty?: string;
  role: string;
}

const ASSIGNABLE_ROLES = [
  { value: 'veterinarian', labelKey: 'roles.veterinarian' },
  { value: 'reception', labelKey: 'roles.reception' },
  { value: 'intern', labelKey: 'roles.intern' },
  { value: 'manager', labelKey: 'roles.manager' },
  { value: 'admin', labelKey: 'roles.admin' },
] as const;

export default function TeamPage() {
  const { t } = useTranslation('common');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [forbidden, setForbidden] = useState(false);

  const currentRole = getStoredUserRole();
  const canAssignAdmin = currentRole === 'admin' || currentRole === 'superadmin';
  const roleOptions = ASSIGNABLE_ROLES.filter(
    (r) => r.value !== 'admin' || canAssignAdmin,
  ).map((r) => ({
    value: r.value,
    label: t(r.labelKey),
  }));

  const fetchUsers = async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const response = await api.get<UserRow[]>('/users/staff');
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      if (error.response?.status === 403) {
        setForbidden(true);
        setUsers([]);
      } else {
        console.error('Error fetching users:', error);
        message.error(t('team.loadError'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ role: 'veterinarian' });
    setModalVisible(true);
  };

  const handleEdit = (record: UserRow) => {
    setEditingId(record.id);
    form.setFieldsValue({
      ...record,
      password: '',
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/users/${id}`);
      message.success(t('team.removed'));
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      message.error(t('team.removeError'));
    }
  };

  const handleSubmit = async (values: Record<string, string>) => {
    try {
      const payload = { ...values };
      if (editingId) {
        if (!payload.password?.trim()) delete payload.password;
        await api.put(`/users/${editingId}`, payload);
        message.success(t('team.updated'));
      } else {
        await api.post('/users', payload);
        message.success(t('team.created'));
      }
      setModalVisible(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      message.error(error.response?.data?.message || t('team.saveError'));
    }
  };

  const columns = [
    { title: t('team.colName'), dataIndex: 'name', key: 'name' },
    { title: t('team.colEmail'), dataIndex: 'email', key: 'email' },
    { title: t('team.colCrmv'), dataIndex: 'crmv', key: 'crmv' },
    { title: t('team.colSpecialty'), dataIndex: 'specialty', key: 'specialty' },
    {
      title: t('team.colRole'),
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={role === 'admin' || role === 'superadmin' ? 'red' : role === 'manager' ? 'purple' : 'blue'}>
          {t(`roles.${role}`, { defaultValue: role })}
        </Tag>
      ),
    },
    {
      title: t('team.colActions'),
      key: 'actions',
      render: (_: unknown, record: UserRow) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title={t('team.confirmRemove')} onConfirm={() => handleDelete(record.id)}>
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (forbidden) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-blue-600 mb-4 flex items-center gap-2">
          <UserOutlined /> {t('team.title')}
        </h1>
        <p className="text-slate-600">{t('team.forbidden')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
          <UserOutlined /> {t('team.title')}
        </h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} className="bg-blue-600">
          {t('team.newMember')}
        </Button>
      </div>

      <Table columns={columns} dataSource={users} rowKey="id" loading={loading} />

      <Modal
        title={editingId ? t('team.editTitle') : t('team.newTitle')}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label={t('team.formName')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label={t('team.formEmail')} rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="role"
            label={t('team.formRole')}
            rules={[{ required: true }]}
            extra={t('team.formRoleHint')}
          >
            <Select options={roleOptions} />
          </Form.Item>
          <Form.Item
            name="password"
            label={editingId ? t('team.formPasswordOptional') : t('team.formPassword')}
            rules={[
              {
                validator: (_, v) => {
                  if (!editingId && (!v || String(v).length < 6)) {
                    return Promise.reject(new Error(t('team.passwordMin')));
                  }
                  if (v && String(v).length > 0 && String(v).length < 6) {
                    return Promise.reject(new Error(t('team.passwordMin')));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input.Password placeholder={editingId ? t('team.passwordPlaceholder') : ''} />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="crmv" label={t('team.formCrmv')}>
              <Input />
            </Form.Item>
            <Form.Item name="specialty" label={t('team.formSpecialty')}>
              <Input />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
