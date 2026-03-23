'use client';

import React from 'react';
import { Form, Input, Button, Card, Typography, message, Divider } from 'antd';
import { UserOutlined, LockOutlined, ShopOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import api from '@/lib/axios';
import { fetchPublicBranding } from '@/lib/branding';

const { Title, Text } = Typography;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [brandName, setBrandName] = React.useState('NixVetApp');
  const [brandLogo, setBrandLogo] = React.useState<string | null>(null);
  const [defaultTenantCode, setDefaultTenantCode] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchPublicBranding().then((branding) => {
      setBrandName(branding.appName || 'NixVetApp');
      setBrandLogo(branding.logoUrl);
      setDefaultTenantCode(branding.tenantCode);
    });
  }, []);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const tenantCode = values.tenantCode || defaultTenantCode || 'NIXVET';
      
      const response = await api.post('/auth/login', {
        email: values.email,
        password: values.password,
        tenantCode: tenantCode
      });

      const { access_token, user } = response.data;

      localStorage.setItem('accessToken', access_token);
      localStorage.setItem('tenantId', user.tenant_id); // Save ID for headers
      localStorage.setItem('tenantCode', tenantCode); // Save code for display
      localStorage.setItem('user', JSON.stringify(user));
      
      message.success(`Bem-vindo, ${user.name}!`);
      router.push('/dashboard');
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Falha no login. Verifique suas credenciais.';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo width={80} height={80} src={brandLogo} alt={brandName} />
          </div>
          <Title level={2} className="!text-blue-600 !mb-2">
            {brandName}
          </Title>
          <Text className="text-gray-500 text-lg">
            Sistema de Gestão Veterinária
          </Text>
        </div>

        <Card className="shadow-xl rounded-2xl border-0 overflow-hidden">
          <div className="p-4">
            <Form
              name="login"
              initialValues={{ remember: true }}
              onFinish={onFinish}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="tenantCode"
                label={<span className="text-gray-600 font-medium">Código da Clínica (Ex: NIXVET)</span>}
              >
                 <Input 
                  prefix={<ShopOutlined className="text-gray-400" />} 
                  placeholder="Código (Padrão: NIXVET)" 
                  className="rounded-lg"
                />
              </Form.Item>

              <Form.Item
                name="email"
                label={<span className="text-gray-600 font-medium">Email</span>}
                rules={[
                  { required: true, message: 'Por favor insira seu email!' },
                  { type: 'email', message: 'Email inválido!' }
                ]}
              >
                <Input 
                  prefix={<UserOutlined className="text-gray-400" />} 
                  placeholder="ex: vet@nixvet.com" 
                  className="rounded-lg"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span className="text-gray-600 font-medium">Senha</span>}
                rules={[{ required: true, message: 'Por favor insira sua senha!' }]}
              >
                <Input.Password
                  prefix={<LockOutlined className="text-gray-400" />}
                  placeholder="******"
                  className="rounded-lg"
                />
              </Form.Item>

              <Form.Item className="mb-2">
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  className="w-full h-12 text-lg font-medium bg-blue-600 hover:bg-blue-700 rounded-lg border-none shadow-md hover:shadow-lg transition-all"
                  loading={loading}
                >
                  Entrar no Sistema
                </Button>
              </Form.Item>

              <div className="text-center mt-4">
                <a href="#" className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors">
                  Esqueceu sua senha?
                </a>
              </div>
            </Form>
          </div>
        </Card>
        
        <div className="text-center mt-8 text-gray-400 text-sm">
          © {new Date().getFullYear()} {brandName}. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
}
