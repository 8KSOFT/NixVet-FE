'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  User,
  Mail,
  Lock,
  Phone,
  FileText,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Loader2,
  Stethoscope,
  Calendar,
  MessageSquare,
  Bot,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiBaseUrl } from '@/lib/api-base';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatCpfCnpj(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim().replace(/-$/, '');
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim().replace(/-$/, '');
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);
}

// ─── Features list ────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Stethoscope, text: 'Prontuário eletrônico completo' },
  { icon: Calendar, text: 'Agenda e lembretes automáticos' },
  { icon: MessageSquare, text: 'WhatsApp integrado' },
  { icon: Bot, text: 'IA clínica e chatbot inteligente' },
];

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDot({ step, current }: { step: number; current: number }) {
  const done = current > step;
  const active = current === step;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex size-8 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
          done
            ? 'border-green-500 bg-green-500 text-white'
            : active
            ? 'border-primary bg-primary text-white'
            : 'border-slate-200 bg-white text-slate-400'
        }`}
      >
        {done ? <CheckCircle2 className="size-4" /> : step}
      </div>
    </div>
  );
}

const STEP_LABELS = ['Sua clínica', 'Responsável', 'Dados fiscais'];

// ─── Main component ───────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 — Clínica
  const [clinicName, setClinicName] = useState('');
  const [clinicCode, setClinicCode] = useState('');
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);

  // Step 2 — Responsável
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 3 — Dados fiscais (opcional)
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [phone, setPhone] = useState('');

  const handleClinicNameChange = (v: string) => {
    setClinicName(v);
    if (!codeManuallyEdited) setClinicCode(slugify(v));
  };

  const handleCodeChange = (v: string) => {
    setClinicCode(slugify(v));
    setCodeManuallyEdited(true);
  };

  const validateStep1 = () => {
    if (!clinicName.trim()) { toast.error('Informe o nome da clínica.'); return false; }
    if (!clinicCode.trim() || clinicCode.length < 3) { toast.error('Código deve ter ao menos 3 caracteres.'); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!adminName.trim()) { toast.error('Informe o nome do responsável.'); return false; }
    if (!adminEmail.trim() || !adminEmail.includes('@')) { toast.error('E-mail inválido.'); return false; }
    if (adminPassword.length < 6) { toast.error('Senha deve ter ao menos 6 caracteres.'); return false; }
    if (adminPassword !== confirmPassword) { toast.error('Senhas não conferem.'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/billing/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicName: clinicName.trim(),
          clinicCode: clinicCode.trim(),
          adminName: adminName.trim(),
          adminEmail: adminEmail.trim().toLowerCase(),
          adminPassword,
          cpfCnpj: cpfCnpj ? cpfCnpj.replace(/\D/g, '') : undefined,
          phone: phone ? phone.replace(/\D/g, '') : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : data.message;
        toast.error(msg ?? 'Erro ao criar conta. Tente novamente.');
        return;
      }

      toast.success('Conta criada! Seus 14 dias de teste começaram.');
      router.push(`/login?code=${clinicCode}`);
    } catch {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row">

        {/* ─── Left panel ─── */}
        <div className="flex flex-col justify-between bg-primary px-10 py-12 text-white lg:w-2/5">
          <div>
            <div className="mb-2 text-2xl font-extrabold tracking-tight">NixVet</div>
            <div className="text-sm text-blue-200">Software de Gestão Veterinária</div>
          </div>

          <div>
            <h1 className="mb-3 text-3xl font-extrabold leading-tight">
              14 dias grátis,<br />sem cartão de crédito
            </h1>
            <p className="mb-8 text-base text-blue-100">
              Tudo que sua clínica precisa em um só lugar. Configure em minutos e comece a atender.
            </p>

            <ul className="space-y-4">
              {FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-white/15">
                    <Icon className="size-4" />
                  </div>
                  <span className="text-sm text-blue-50">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-blue-300">
            Já tem conta?{' '}
            <Link href="/login" className="font-semibold text-white underline underline-offset-2">
              Fazer login
            </Link>
          </p>
        </div>

        {/* ─── Right panel ─── */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">

            {/* Step indicator */}
            <div className="mb-8 flex items-center justify-center gap-0">
              {[1, 2, 3].map((s) => (
                <React.Fragment key={s}>
                  <div className="flex flex-col items-center gap-1">
                    <StepDot step={s} current={step} />
                    <span className={`text-xs font-medium ${step === s ? 'text-primary' : 'text-slate-400'}`}>
                      {STEP_LABELS[s - 1]}
                    </span>
                  </div>
                  {s < 3 && (
                    <div className={`mb-5 h-px w-16 ${step > s ? 'bg-green-400' : 'bg-slate-200'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* ── Step 1: Clínica ── */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Dados da clínica</h2>
                  <p className="mt-1 text-sm text-slate-500">Como sua clínica aparecerá no sistema.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="clinicName">Nome da clínica *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="clinicName"
                      className="pl-9"
                      placeholder="Ex: Clínica Vet São Francisco"
                      value={clinicName}
                      onChange={(e) => handleClinicNameChange(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="clinicCode">
                    Código de acesso *
                    <span className="ml-1 text-xs text-slate-400">(usado no login)</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">@</span>
                    <Input
                      id="clinicCode"
                      className="pl-7 font-mono text-sm"
                      placeholder="saofrancisco"
                      value={clinicCode}
                      onChange={(e) => handleCodeChange(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-slate-400">Apenas letras minúsculas e números, sem espaços.</p>
                </div>

                <Button className="w-full" onClick={() => validateStep1() && setStep(2)}>
                  Continuar <ChevronRight className="ml-1 size-4" />
                </Button>
              </div>
            )}

            {/* ── Step 2: Responsável ── */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Dados do responsável</h2>
                  <p className="mt-1 text-sm text-slate-500">Será a conta administradora da clínica.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="adminName">Nome completo *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input id="adminName" className="pl-9" placeholder="Dr. João Silva" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="adminEmail">E-mail *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input id="adminEmail" type="email" className="pl-9" placeholder="joao@clinica.com.br" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="adminPassword">Senha *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input id="adminPassword" type="password" className="pl-9" placeholder="Mínimo 6 caracteres" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirmar senha *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input id="confirmPassword" type="password" className="pl-9" placeholder="Repita a senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                    <ChevronLeft className="mr-1 size-4" /> Voltar
                  </Button>
                  <Button className="flex-1" onClick={() => validateStep2() && setStep(3)}>
                    Continuar <ChevronRight className="ml-1 size-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 3: Dados fiscais ── */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Dados fiscais</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Opcional agora — mas obrigatório na hora de contratar um plano. Usado para emissão de NFS-e.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cpfCnpj">CPF ou CNPJ</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="cpfCnpj"
                      className="pl-9"
                      placeholder="000.000.000-00 ou 00.000.000/0001-00"
                      value={cpfCnpj}
                      onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
                    />
                  </div>
                  <p className="text-xs text-slate-400">Cada CPF/CNPJ só pode ter um período de teste gratuito.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone / WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="phone"
                      className="pl-9"
                      placeholder="(51) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                  <strong>Resumo do cadastro</strong>
                  <ul className="mt-2 space-y-1 text-xs text-blue-700">
                    <li>🏥 <strong>{clinicName}</strong> <span className="text-blue-500">(@{clinicCode})</span></li>
                    <li>👤 {adminName} — {adminEmail}</li>
                    <li>🎁 14 dias de acesso completo gratuito</li>
                    <li>💳 Sem cobrança automática — você escolhe o plano depois</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                    <ChevronLeft className="mr-1 size-4" /> Voltar
                  </Button>
                  <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
                    {loading ? (
                      <><Loader2 className="mr-2 size-4 animate-spin" /> Criando conta...</>
                    ) : (
                      'Começar grátis'
                    )}
                  </Button>
                </div>

                <p className="text-center text-xs text-slate-400">
                  Ao criar sua conta você concorda com os{' '}
                  <span className="text-primary underline cursor-pointer">Termos de Uso</span>
                  {' '}e{' '}
                  <span className="text-primary underline cursor-pointer">Política de Privacidade</span>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
