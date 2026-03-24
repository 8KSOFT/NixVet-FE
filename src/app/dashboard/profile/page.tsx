'use client';

import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '@/lib/axios';

const { Title } = Typography;

interface ProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  crmv?: string | null;
  specialty?: string | null;
}

export default function ProfilePage() {
  const { t } = useTranslation('common');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<ProfileData>('/users/profile');
      form.setFieldsValue({
        name: res.data.name,
        email: res.data.email,
        crmv: res.data.crmv ?? '',
        specialty: res.data.specialty ?? '',
        password: '',
      });
    } catch {
      message.error(t('profile.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onFinish = async (values: Record<string, string>) => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        name: values.name,
        email: values.email,
        crmv: values.crmv,
        specialty: values.specialty,
      };
      if (values.password?.trim()) {
        payload.password = values.password;
      }
      const res = await api.put<ProfileData>('/users/profile', payload);
      message.success(t('profile.saved'));
      const raw = localStorage.getItem('user');
      const prev = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        'user',
        JSON.stringify({
          ...prev,
          name: res.data.name,
          email: res.data.email,
        }),
      );
      form.setFieldValue('password', '');
    } catch (e: any) {
      message.error(e.response?.data?.message || t('profile.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Title level={2} className="!mb-6 !text-slate-800 !font-semibold flex items-center gap-2">
        <UserOutlined /> {t('profile.title')}
      </Title>
      <Card loading={loading} className="max-w-xl rounded-xl shadow-sm border border-slate-200/80">
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="name" label={t('profile.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label={t('profile.email')} rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label={t('profile.newPassword')}
            rules={[
              {
                validator: (_, v) => {
                  if (v && String(v).length > 0 && String(v).length < 6) {
                    return Promise.reject(new Error(t('profile.passwordMin')));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input.Password placeholder={t('profile.passwordPlaceholder')} />
          </Form.Item>
          <Form.Item name="crmv" label={t('profile.crmv')}>
            <Input />
          </Form.Item>
          <Form.Item name="specialty" label={t('profile.specialty')}>
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} className="bg-blue-600">
              {t('profile.save')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
