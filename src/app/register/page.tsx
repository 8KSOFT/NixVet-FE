'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  User,
  Mail,
  Lock,
  Phone,
  FileText,
  Clock,
  ClipboardList,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Loader2,
  Stethoscope,
  Calendar,
  MessageSquare,
  Bot,
  Gift,
  CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { getApiBaseUrl } from '@/lib/api-base';
import { establishSession } from '@/lib/session';
import { LogoColored } from '@/components/shared/componentizedImages/LogoColored';
import {
  useOnboardingStatusQuery,
  useCompleteOnboardingMutation,
} from '@/hooks/apiHooks/useOnboarding';
import { useSaveBusinessHoursBatchMutation } from '@/hooks/apiHooks/useAvailabilityConfig';
import { useCreateAppointmentTypeMutation } from '@/hooks/apiHooks/useAppointmentTypes';

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
    .replace(/\p{Diacritic}/gu, '')
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

// ─── Sugestões de tipo de atendimento (mesmo conjunto do antigo seed) ─────────

interface AppointmentTypeDraft {
  name: string;
  duration_minutes: number;
  checked: boolean;
}

const DEFAULT_APPOINTMENT_TYPES: AppointmentTypeDraft[] = [
  { name: 'Consulta Clínica', duration_minutes: 30, checked: true },
  { name: 'Retorno', duration_minutes: 20, checked: true },
  { name: 'Vacinação', duration_minutes: 15, checked: true },
  { name: 'Curativo', duration_minutes: 20, checked: true },
  { name: 'Avaliação Pré-cirúrgica', duration_minutes: 30, checked: true },
];

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDot({ step, current }: { step: number; current: number }) {
  const done = current > step;
  const active = current === step;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex size-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
          done
            ? 'border-green-500 bg-green-500 text-white'
            : active
            ? 'border-primary bg-primary text-white'
            : 'border-slate-200 bg-white text-slate-400'
        }`}
      >
        {done ? <CheckCircle2 className="size-3.5" /> : step}
      </div>
    </div>
  );
}

const STEP_LABELS = ['Clínica', 'Responsável', 'Fiscal', 'Horário', 'Atendimentos', 'Pronto'];
const TOTAL_STEPS = STEP_LABELS.length;

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

  // Step 3 — Dados fiscais
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [phone, setPhone] = useState('');

  // Step 4 — Horário de funcionamento
  const [weekdayOpen, setWeekdayOpen] = useState('08:00');
  const [weekdayClose, setWeekdayClose] = useState('18:00');
  const [worksSaturday, setWorksSaturday] = useState(false);
  const [saturdayOpen, setSaturdayOpen] = useState('08:00');
  const [saturdayClose, setSaturdayClose] = useState('12:00');
  const [worksSunday, setWorksSunday] = useState(false);
  const [sundayOpen, setSundayOpen] = useState('08:00');
  const [sundayClose, setSundayClose] = useState('12:00');

  // Step 5 — Tipos de atendimento
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentTypeDraft[]>(
    DEFAULT_APPOINTMENT_TYPES,
  );

  // Retomada automática: quem já tem sessão (voltou depois de fechar o
  // navegador no meio do cadastro) pula direto pra etapa que falta, em vez
  // de ver o formulário de criar clínica de novo.
  const [resuming, setResuming] = useState<boolean | null>(null);
  const { data: resumeStatus } = useOnboardingStatusQuery(resuming === true);
  const saveBusinessHoursBatch = useSaveBusinessHoursBatchMutation();
  const createAppointmentType = useCreateAppointmentTypeMutation();
  const completeOnboarding = useCompleteOnboardingMutation();

  useEffect(() => {
    const hasSession =
      typeof window !== 'undefined' && !!localStorage.getItem('accessToken');
    setResuming(hasSession);
  }, []);

  useEffect(() => {
    if (resuming !== true || !resumeStatus) return;
    if (resumeStatus.complete) {
      router.replace('/dashboard');
      return;
    }
    if (resumeStatus.missing.includes('businessHours')) setStep(4);
    else if (resumeStatus.missing.includes('appointmentTypes')) setStep(5);
    else setStep(6);
  }, [resuming, resumeStatus, router]);

  const showLoadingGate = resuming === null || (resuming === true && !resumeStatus);

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

  const validateStep3 = () => {
    const digits = cpfCnpj.replace(/\D/g, '');
    if (digits.length !== 11 && digits.length !== 14) {
      toast.error('Informe um CPF ou CNPJ válido.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;
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
          cpfCnpj: cpfCnpj.replace(/\D/g, ''),
          phone: phone ? phone.replace(/\D/g, '') : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : data.message;
        toast.error(msg ?? 'Erro ao criar conta. Tente novamente.');
        return;
      }

      // Envelope: { success, message, data: { tenantId, tenantCode, adminEmail, access_token, user } }.
      const { access_token, user, tenantCode } = data.data ?? {};
      if (!access_token || !user) {
        toast.error('Conta criada, mas não foi possível entrar automaticamente. Faça login.');
        router.push(`/login?code=${clinicCode}`);
        return;
      }

      establishSession(access_token, user, tenantCode || clinicCode);
      toast.success('Clínica criada! Falta só terminar a configuração.');
      setStep(4);
    } catch {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleStep4Submit = async () => {
    if (!weekdayOpen || !weekdayClose) {
      toast.error('Informe o horário de segunda a sexta.');
      return;
    }
    try {
      await saveBusinessHoursBatch.mutateAsync({
        days: [1, 2, 3, 4, 5],
        open_time: weekdayOpen,
        close_time: weekdayClose,
        is_closed: false,
        is_24h: false,
      });
      await saveBusinessHoursBatch.mutateAsync({
        days: [6],
        open_time: saturdayOpen,
        close_time: saturdayClose,
        is_closed: !worksSaturday,
        is_24h: false,
      });
      await saveBusinessHoursBatch.mutateAsync({
        days: [0],
        open_time: sundayOpen,
        close_time: sundayClose,
        is_closed: !worksSunday,
        is_24h: false,
      });
      setStep(5);
    } catch {
      toast.error('Não foi possível salvar o horário. Tente novamente.');
    }
  };

  const toggleAppointmentType = (index: number) => {
    setAppointmentTypes((prev) =>
      prev.map((t, i) => (i === index ? { ...t, checked: !t.checked } : t)),
    );
  };

  const updateAppointmentTypeDuration = (index: number, value: string) => {
    const minutes = Math.max(5, Number(value) || 0);
    setAppointmentTypes((prev) =>
      prev.map((t, i) => (i === index ? { ...t, duration_minutes: minutes } : t)),
    );
  };

  const handleStep5Submit = async () => {
    const selected = appointmentTypes.filter((t) => t.checked);
    if (selected.length === 0) {
      toast.error('Selecione ao menos um tipo de atendimento.');
      return;
    }
    try {
      for (const t of selected) {
        await createAppointmentType.mutateAsync({
          name: t.name,
          duration_minutes: t.duration_minutes,
        });
      }
      setStep(6);
    } catch {
      toast.error('Não foi possível salvar os tipos de atendimento. Tente novamente.');
    }
  };

  const handleFinish = async () => {
    try {
      await completeOnboarding.mutateAsync();
      toast.success('Sua clínica está pronta! Enviamos um código para confirmar seu e-mail.');
      router.push('/dashboard');
    } catch {
      toast.error('Não foi possível concluir o cadastro. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row">

        {/* ─── Left panel ─── */}
        <div className="flex flex-col justify-between bg-primary px-10 py-12 text-white lg:w-2/5">
          <div>
            <div className="mb-3 w-fit brightness-0 invert">
              <LogoColored width="170px" height="36px" />
            </div>
            <div className="text-sm text-white/90">Software de Gestão Veterinária</div>
          </div>

          <div>
            <h1 className="mb-3 font-['InterDoFigma'] text-3xl font-black leading-tight">
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

            {showLoadingGate ? (
              <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
                <Loader2 className="size-6 animate-spin" />
                <p className="text-sm">Carregando...</p>
              </div>
            ) : (
              <>
                {/* Step indicator */}
                <div className="mb-8 flex items-center justify-center gap-0">
                  {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
                    <React.Fragment key={s}>
                      <div className="flex flex-col items-center gap-1">
                        <StepDot step={s} current={step} />
                        <span className={`text-[10px] font-medium ${step === s ? 'text-primary' : 'text-slate-400'}`}>
                          {STEP_LABELS[s - 1]}
                        </span>
                      </div>
                      {s < TOTAL_STEPS && (
                        <div className={`mb-4 h-px w-6 ${step > s ? 'bg-green-400' : 'bg-slate-200'}`} />
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
                        Usado para emissão de NFS-e quando você contratar um plano, e para liberar seus 14 dias grátis.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cpfCnpj">CPF ou CNPJ *</Label>
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

                    <div className="rounded-lg border border-brand-deep/25 bg-brand-deep/5 p-4 text-sm text-brand-deep-dark">
                      <strong>Resumo do cadastro</strong>
                      <ul className="mt-2.5 space-y-2 text-xs text-brand-deep-dark">
                        <li className="flex items-center gap-2">
                          <Building2 className="size-3.5 shrink-0 text-slate-400" />
                          <span><strong>{clinicName}</strong> <span className="text-brand-deep">(@{clinicCode})</span></span>
                        </li>
                        <li className="flex items-center gap-2">
                          <User className="size-3.5 shrink-0 text-slate-400" />
                          <span>{adminName} — {adminEmail}</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Gift className="size-3.5 shrink-0 text-slate-400" />
                          <span>14 dias de acesso completo gratuito</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CreditCard className="size-3.5 shrink-0 text-slate-400" />
                          <span>Sem cobrança automática — você escolhe o plano depois</span>
                        </li>
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
                          <>Continuar <ChevronRight className="ml-1 size-4" /></>
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

                {/* ── Step 4: Horário de funcionamento ── */}
                {step === 4 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Horário de funcionamento</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Sem isso, ninguém consegue marcar consulta — a agenda fica vazia. Dá pra ajustar depois em Configurações.
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Clock className="size-4 text-slate-400" /> Segunda a sexta
                      </div>
                      <div className="flex items-center gap-3">
                        <Input type="time" value={weekdayOpen} onChange={(e) => setWeekdayOpen(e.target.value)} />
                        <span className="text-sm text-slate-400">até</span>
                        <Input type="time" value={weekdayClose} onChange={(e) => setWeekdayClose(e.target.value)} />
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-4">
                      <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Checkbox checked={worksSaturday} onCheckedChange={(v) => setWorksSaturday(v === true)} />
                        Abre aos sábados
                      </label>
                      {worksSaturday && (
                        <div className="flex items-center gap-3">
                          <Input type="time" value={saturdayOpen} onChange={(e) => setSaturdayOpen(e.target.value)} />
                          <span className="text-sm text-slate-400">até</span>
                          <Input type="time" value={saturdayClose} onChange={(e) => setSaturdayClose(e.target.value)} />
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-slate-200 p-4">
                      <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <Checkbox checked={worksSunday} onCheckedChange={(v) => setWorksSunday(v === true)} />
                        Abre aos domingos
                      </label>
                      {worksSunday && (
                        <div className="flex items-center gap-3">
                          <Input type="time" value={sundayOpen} onChange={(e) => setSundayOpen(e.target.value)} />
                          <span className="text-sm text-slate-400">até</span>
                          <Input type="time" value={sundayClose} onChange={(e) => setSundayClose(e.target.value)} />
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      {!resuming && (
                        <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>
                          <ChevronLeft className="mr-1 size-4" /> Voltar
                        </Button>
                      )}
                      <Button
                        className="flex-1"
                        onClick={handleStep4Submit}
                        disabled={saveBusinessHoursBatch.isPending}
                      >
                        {saveBusinessHoursBatch.isPending ? (
                          <><Loader2 className="mr-2 size-4 animate-spin" /> Salvando...</>
                        ) : (
                          <>Continuar <ChevronRight className="ml-1 size-4" /></>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Step 5: Tipos de atendimento ── */}
                {step === 5 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Tipos de atendimento</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        O &ldquo;cardápio&rdquo; de serviços que aparece na hora de marcar consulta. Já sugerimos os mais comuns — ajuste como preferir.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {appointmentTypes.map((t, i) => (
                        <div
                          key={t.name}
                          className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
                        >
                          <Checkbox checked={t.checked} onCheckedChange={() => toggleAppointmentType(i)} />
                          <span className="flex-1 text-sm font-medium text-slate-700">{t.name}</span>
                          <Input
                            type="number"
                            min={5}
                            step={5}
                            className="w-20 text-center"
                            value={t.duration_minutes}
                            disabled={!t.checked}
                            onChange={(e) => updateAppointmentTypeDuration(i, e.target.value)}
                          />
                          <span className="text-xs text-slate-400">min</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={() => setStep(4)}>
                        <ChevronLeft className="mr-1 size-4" /> Voltar
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleStep5Submit}
                        disabled={createAppointmentType.isPending}
                      >
                        {createAppointmentType.isPending ? (
                          <><Loader2 className="mr-2 size-4 animate-spin" /> Salvando...</>
                        ) : (
                          <>Continuar <ChevronRight className="ml-1 size-4" /></>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Step 6: Conclusão ── */}
                {step === 6 && (
                  <div className="space-y-5 text-center">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <ClipboardList className="size-7" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Tudo pronto!</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Sua clínica já está configurada. Vamos te enviar um código por e-mail para confirmar sua conta — enquanto isso, pode usar o sistema normalmente.
                      </p>
                    </div>

                    <Button className="w-full" onClick={handleFinish} disabled={completeOnboarding.isPending}>
                      {completeOnboarding.isPending ? (
                        <><Loader2 className="mr-2 size-4 animate-spin" /> Concluindo...</>
                      ) : (
                        'Entrar no sistema'
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
