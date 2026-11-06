'use client';

import React, { useEffect, useRef, useState } from 'react';
import TurnstileWidget from '@/components/security/TurnstileWidget';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GA_EVENTS, readGaClientId, trackEvent } from '@/lib/analytics';
import {
  Building2,
  User,
  Mail,
  Lock,
  Phone,
  FileText,
  Clock,
  ClipboardCheck,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Check,
  Loader2,
  Stethoscope,
  Calendar,
  MessageSquare,
  Bot,
  CreditCard,
} from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatarTelefone } from '@/lib/telefone';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import type { SessionUser } from '@/lib/session';
import { establishSession, hasClientSession } from '@/lib/session';
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

/**
 * Celular brasileiro: DDD de 11 a 99 e nove dígitos começando em 9. Espelha o
 * `CELULAR_BR` do backend — fixo é recusado nos dois lados de propósito, é o
 * número que recebe os avisos de cobrança.
 */
function isCelular(value: string) {
  return /^[1-9][0-9]9[0-9]{8}$/.test(value.replace(/\D/g, ''));
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
  { icon: Stethoscope, key: 'records' },
  { icon: Calendar, key: 'agenda' },
  { icon: MessageSquare, key: 'whatsapp' },
  { icon: Bot, key: 'ai' },
];

// ─── Sugestões de tipo de atendimento (mesmo conjunto do antigo seed) ─────────

interface AppointmentTypeDraft {
  /** Chave de tradução (`register.types.<key>`); o nome gravado sai do idioma ativo. */
  key: string;
  duration_minutes: number;
  checked: boolean;
}

const DEFAULT_APPOINTMENT_TYPES: AppointmentTypeDraft[] = [
  { key: 'consulta', duration_minutes: 30, checked: true },
  { key: 'retorno', duration_minutes: 20, checked: true },
  { key: 'vacinacao', duration_minutes: 15, checked: true },
  { key: 'curativo', duration_minutes: 20, checked: true },
  { key: 'preCirurgica', duration_minutes: 30, checked: true },
];

// ─── Tela de transição final (build "inteligente" da plataforma) ─────────────

const TRANSITION_MESSAGES = ['m0', 'm1', 'm2', 'm3', 'm4'] as const;

const TRANSITION_STEP_MS = 750;

/**
 * Tela cheia que substitui o wizard ao clicar em "Entrar no sistema" — dá a
 * sensação de que o sistema está "construindo" a plataforma da clínica antes
 * de abrir o dashboard, em vez de um corte seco entre telas. `onDone` dispara
 * quando a sequência visual termina (o cadastro em si já rodou em paralelo).
 */
function OnboardingTransition({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const [msgIndex, setMsgIndex] = useState(0);
  const [phase, setPhase] = useState<'building' | 'reveal'>('building');

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, TRANSITION_MESSAGES.length - 1));
    }, TRANSITION_STEP_MS);
    const revealAt = TRANSITION_MESSAGES.length * TRANSITION_STEP_MS + 200;
    const t1 = setTimeout(() => setPhase('reveal'), revealAt);
    const t2 = setTimeout(onDone, revealAt + 1500);
    return () => {
      clearInterval(interval);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-200 flex flex-col items-center justify-center bg-linear-to-br from-wa-brand-700 via-wa-brand-600 to-wa-brand-700 px-6 text-center text-white">
      {phase === 'building' ? (
        <>
          <div className="relative flex size-20 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-white/10" />
            <span className="absolute inset-0 animate-spin rounded-full border-2 border-white/20 border-t-white/90 [animation-duration:1.1s]" />
            <Building2 className="size-8" strokeWidth={1.75} />
          </div>
          <p className="mt-6 text-lg font-bold" aria-live="polite">
            {t(`register.transition.${TRANSITION_MESSAGES[msgIndex]}`)}
          </p>
          <div className="mt-6 h-1.5 w-64 max-w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-all duration-700 ease-out"
              style={{ width: `${((msgIndex + 1) / TRANSITION_MESSAGES.length) * 100}%` }}
            />
          </div>
        </>
      ) : (
        <div
          className="flex flex-col items-center gap-3"
          style={{ animation: 'wa-modal-pop 500ms cubic-bezier(.34,1.56,.64,1)' }}
        >
          <div className="flex size-18 items-center justify-center rounded-full bg-white/12">
            <CheckCircle2 className="size-9" strokeWidth={1.75} />
          </div>
          <p className="text-2xl font-extrabold">{t('register.transition.ready')}</p>
          <p className="text-sm text-white/80">{t('register.transition.platformReady')}</p>
        </div>
      )}
    </div>
  );
}

// ─── Primitivos de UI que faltavam (seguindo os tokens wa-* já usados no
// resto do app — ver design_handoff_whatsapp_inbox) ───────────────────────────

const STEP_KEYS = ['clinic', 'admin', 'fiscal', 'hours', 'types', 'done'] as const;

/**
 * Nome de cada etapa no relatório — separado de STEP_LABELS de propósito.
 * O rótulo da tela é texto de interface e vai mudar quando alguém achar uma
 * palavra melhor; o nome do evento é a chave de uma série histórica, e mudá-lo
 * parte o funil em dois no GA4 sem avisar ninguém.
 */
const ONBOARDING_STEP_NAMES: Record<number, string> = {
  1: 'dados_clinica',
  2: 'responsavel',
  3: 'dados_fiscais',
  4: 'horario_funcionamento',
  5: 'tipos_atendimento',
  6: 'conclusao',
};

/** Stepper de progresso: círculos numerados + linha de conexão que preenche
 * conforme as etapas são concluídas, com anel de destaque na etapa ativa. */
function Stepper({ current }: { current: number }) {
  const { t } = useTranslation();
  return (
    <div className="mb-9 flex items-start">
      {STEP_KEYS.map((stepKey, idx) => {
        const s = idx + 1;
        const done = s < current;
        const active = s === current;
        return (
          <div key={stepKey} className="relative flex flex-1 flex-col items-center gap-[7px]">
            {idx < STEP_KEYS.length - 1 && (
              <div
                className={cn(
                  'absolute top-[15px] left-[calc(50%+15px)] -z-10 h-0.5 w-[calc(100%-30px)] transition-colors',
                  done ? 'bg-wa-brand-600' : 'bg-wa-line',
                )}
              />
            )}
            <div
              className={cn(
                'flex size-[30px] shrink-0 items-center justify-center rounded-full border-2 text-[12.5px] font-bold transition-all',
                done || active
                  ? 'border-wa-brand-600 bg-wa-brand-600 text-white'
                  : 'border-wa-line bg-white text-wa-ink-3',
                active && 'shadow-[0_0_0_4px_var(--wa-brand-50)]',
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : s}
            </div>
            <span
              className={cn(
                'text-[11px] font-semibold whitespace-nowrap',
                done || active ? 'text-wa-brand-700' : 'text-wa-ink-3',
              )}
            >
              {t(`register.steps.${stepKey}`)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Label de campo com marcador de obrigatório/opcional, no padrão do handoff. */
function FieldLabel({
  htmlFor,
  required,
  optional,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  optional?: string;
  children: React.ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor} className="mb-2 flex items-center gap-1 text-[13px] font-semibold text-wa-ink">
      {children}
      {required && <span className="text-wa-brand-600">*</span>}
      {optional && <span className="font-normal text-wa-ink-3">{optional}</span>}
    </Label>
  );
}

/** Input "pill" com ícone à esquerda — compõe o <Input> já existente, só
 * movendo a moldura (borda/fundo/foco) para o wrapper para caber o ícone. */
function IconInput({
  icon,
  className,
  wrapperClassName,
  ...props
}: React.ComponentProps<typeof Input> & { icon?: React.ReactNode; wrapperClassName?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-wa border-[1.5px] border-wa-line bg-[#fbfcfb] px-3.5 py-3 transition-colors focus-within:border-wa-brand-500 focus-within:bg-white focus-within:shadow-[0_0_0_3px_var(--wa-brand-50)]',
        wrapperClassName,
      )}
    >
      {icon && <span className="flex shrink-0 items-center text-wa-ink-3 [&>svg]:size-4">{icon}</span>}
      <Input
        className={cn(
          'h-auto min-h-0 w-full border-0 bg-transparent p-0 text-[14.5px] text-wa-ink shadow-none placeholder:text-wa-ink-3 focus:ring-0 focus-visible:ring-0',
          className,
        )}
        {...props}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/** `data` do envelope de `POST /billing/register` (já desembrulhado). */
interface RegisterResponse {
  user?: SessionUser;
  tenantCode?: string;
  tenantId?: string;
  adminEmail?: string;
}

export default function RegisterClient() {
  const { t } = useTranslation();
  const router = useRouter();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

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
  // Confirmação do WhatsApp por código. `verifiedPhone` guarda os dígitos que
  // passaram no OTP: se o usuário editar o número depois, a confirmação
  // deixa de valer sozinha, em vez de acompanhar um número que ninguém
  // confirmou.
  const [phoneOtpRequired, setPhoneOtpRequired] = useState(false);
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneCode, setPhoneCode] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [phoneBusy, setPhoneBusy] = useState(false);
  const phoneVerified = verifiedPhone !== '' && verifiedPhone === phone.replace(/\D/g, '');

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
  // Nomes já criados no servidor nesta sessão — se o usuário voltar do step 6
  // e reenviar, o create de tipo de atendimento é um INSERT sem proteção
  // contra duplicata no backend, então filtramos aqui pra não recriar.
  const [createdTypeNames, setCreatedTypeNames] = useState<Set<string>>(new Set());

  // Retomada automática: quem já tem sessão (voltou depois de fechar o
  // navegador no meio do cadastro) pula direto pra etapa que falta, em vez
  // de ver o formulário de criar clínica de novo.
  const [resuming, setResuming] = useState<boolean | null>(null);
  const { data: resumeStatus } = useOnboardingStatusQuery(resuming === true);
  const saveBusinessHoursBatch = useSaveBusinessHoursBatchMutation();
  const createAppointmentType = useCreateAppointmentTypeMutation();
  const completeOnboarding = useCompleteOnboardingMutation();

  useEffect(() => {
    setResuming(hasClientSession());
  }, []);

  // A exigência do código mora no ambiente do backend (ONBOARDING_PHONE_OTP),
  // não aqui: enquanto o canal de entrega não estiver no ar, exigir código
  // impediria qualquer cadastro novo. Falha na consulta = não exigir, pelo
  // mesmo motivo — quem decide barrar é o backend, no `register`.
  useEffect(() => {
    api
      .get<{ required?: boolean }>('/billing/register/phone')
      .then(({ data }) => setPhoneOtpRequired(Boolean(data?.required)))
      .catch(() => setPhoneOtpRequired(false));
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
    if (!clinicName.trim()) { toast.error(t('register.validation.clinicName')); return false; }
    if (!clinicCode.trim() || clinicCode.length < 3) { toast.error(t('register.validation.codeMin')); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!adminName.trim()) { toast.error(t('register.validation.adminName')); return false; }
    if (!adminEmail.trim() || !adminEmail.includes('@')) { toast.error(t('register.validation.emailInvalid')); return false; }
    if (adminPassword.length < 8) { toast.error(t('register.validation.passwordMin')); return false; }
    if (adminPassword !== confirmPassword) { toast.error(t('register.validation.mismatch')); return false; }
    return true;
  };

  /** Pede o código para o número digitado. */
  const sendPhoneCode = async () => {
    if (!isCelular(phone)) {
      toast.error(t('register.validation.mobileForCode'));
      return;
    }
    setPhoneBusy(true);
    try {
      const { data } = await api.post<{ channel?: string }>('/billing/register/phone/code', {
        phone: phone.replace(/\D/g, ''),
      });
      setPhoneCodeSent(true);
      setPhoneCode('');
      toast.success(data?.channel === 'sms' ? t('register.phone.sentSms') : t('register.phone.sentWhatsapp'));
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('register.phone.sendFail')));
    } finally {
      setPhoneBusy(false);
    }
  };

  const confirmPhoneCode = async () => {
    setPhoneBusy(true);
    try {
      await api.post('/billing/register/phone/verify', {
        phone: phone.replace(/\D/g, ''),
        code: phoneCode.trim(),
      });
      setVerifiedPhone(phone.replace(/\D/g, ''));
      toast.success(t('register.phone.confirmed'));
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('register.phone.wrongCode')));
    } finally {
      setPhoneBusy(false);
    }
  };

  const validateStep3 = () => {
    const digits = cpfCnpj.replace(/\D/g, '');
    if (digits.length !== 11 && digits.length !== 14) {
      toast.error(t('register.validation.cpfCnpj'));
      return false;
    }
    if (!isCelular(phone)) {
      toast.error(t('register.validation.whatsappRequired'));
      return false;
    }
    if (phoneOtpRequired && !phoneVerified) {
      toast.error(t('register.validation.confirmCode'));
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    if (!weekdayOpen || !weekdayClose) {
      toast.error(t('register.validation.weekdayHours'));
      return false;
    }
    return true;
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

  const validateStep5 = () => {
    if (appointmentTypes.filter((t) => t.checked).length === 0) {
      toast.error(t('register.validation.selectType'));
      return false;
    }
    return true;
  };

  /**
   * Etapas já medidas nesta passagem pelo cadastro.
   *
   * O wizard tem "Voltar" em todos os passos, e o mesmo passo concluído de
   * novo dispararia o mesmo evento de novo — o que infla justamente o degrau
   * do funil onde a pessoa teve dificuldade, invertendo a leitura: a etapa
   * mais confusa apareceria como a de melhor conversão. Em `ref` e não em
   * `state` porque isto não pinta nada na tela; um `setState` aqui só
   * causaria render à toa.
   */
  const etapasMedidas = useRef(new Set<number>());

  /**
   * Conclui a etapa: valida, mede e avança. Medir DEPOIS da validação é o que
   * faz o evento significar "passo concluído" em vez de "botão clicado" —
   * clique que só produz mensagem de erro não é progresso no funil.
   */
  const concluirEtapa = (numero: number, valida: () => boolean) => () => {
    if (!valida()) return;
    if (!etapasMedidas.current.has(numero)) {
      etapasMedidas.current.add(numero);
      trackEvent(GA_EVENTS.ONBOARDING_STEP, {
        step_name: ONBOARDING_STEP_NAMES[numero],
        step_number: numero,
        // O checklist opcional de dentro do app manda o mesmo evento com
        // `step_group: 'checklist'` — sem este rótulo os dois funis, um
        // obrigatório e um opcional, viram um só no relatório.
        step_group: 'cadastro',
      });
    }
    setStep(numero + 1);
  };

  /** Melhor esforço pra mandar o usuário de volta pro campo certo quando o
   * cadastro falha por dado inválido (CPF/e-mail/código já em uso etc.). */
  function guessRegisterErrorStep(message: string | undefined): number {
    const m = (message ?? '').toLowerCase();
    if (m.includes('cpf') || m.includes('cnpj')) return 3;
    if (m.includes('celular') || m.includes('whatsapp') || m.includes('código')) return 3;
    if (m.includes('e-mail') || m.includes('email')) return 2;
    return 1;
  }

  // Único ponto que efetivamente submete coisa no servidor — dispara só aqui,
  // ao clicar em "Entrar no sistema". Steps 1-5 só guardam estado local
  // (setStep), pra ir e voltar por eles nunca duplicar cadastro. Se algo
  // falhar, volta pro step responsável com a mensagem de erro real, em vez de
  // travar na tela final. Se um passo anterior já criou a conta (ex.: usuário
  // retomou depois de fechar o navegador no meio), pula direto pro
  // horário/atendimentos em vez de recriar a conta.
  const handleFinish = async () => {
    setLoading(true);
    try {
      if (!hasClientSession()) {
        if (!validateStep1()) { setStep(1); return; }
        if (!validateStep2()) { setStep(2); return; }
        if (!validateStep3()) { setStep(3); return; }

        // Pelo client único: `withCredentials` faz o navegador aceitar a
        // sessão que o cadastro entrega em cookie HttpOnly.
        let data: RegisterResponse | undefined;
        try {
          ({ data } = await api.post<RegisterResponse>('/billing/register', {
            turnstileToken,
            clinicName: clinicName.trim(),
            clinicCode: clinicCode.trim(),
            adminName: adminName.trim(),
            adminEmail: adminEmail.trim().toLowerCase(),
            adminPassword,
            cpfCnpj: cpfCnpj.replace(/\D/g, ''),
            phone: phone.replace(/\D/g, ''),
            // Aqui, e não depois: este é o único momento em que o navegador
            // que trouxe a clínica está presente E a clínica passa a existir.
            // O backend guarda em `tenants.ga_client_id` e usa nos eventos
            // que dispara sozinho (purchase, week_active, feature_activated).
            // `undefined` quando não houve aceite de cookies — o campo é
            // opcional no backend justamente por isso.
            gaClientId: readGaClientId() ?? undefined,
          }));
        } catch (error: unknown) {
          const msg = getApiErrorMessage(error, t('register.errors.createAccount'));
          toast.error(msg);
          setStep(guessRegisterErrorStep(msg));
          return;
        }

        // O interceptor já desembrulhou o envelope { success, message, data }.
        const { user, tenantCode, tenantId } = data ?? {};
        if (!user) {
          toast.error(t('register.errors.autoLogin'));
          router.push(`/login?code=${clinicCode}`);
          return;
        }

        // Conversão: conta criada E sessão iniciada. Marcar antes disto
        // contaria cadastro que não chegou a virar acesso.
        //
        // `tenant_id` é o que costura este evento aos que vêm do servidor
        // depois (feature_activated, purchase, week_active): sem ele, o
        // cadastro e a clínica que ele criou seriam duas coisas sem relação
        // no relatório.
        trackEvent(GA_EVENTS.SIGN_UP_COMPLETE, {
          tenant_id: tenantId ?? '',
          plano: 'trial',
        });
        establishSession(user, tenantCode || clinicCode);
      }

      if (!validateStep4()) { setStep(4); return; }
      if (!validateStep5()) { setStep(5); return; }

      const selected = appointmentTypes
        .filter((ty) => ty.checked)
        .map((ty) => ({ ...ty, name: t(`register.types.${ty.key}`) }));
      const typesToCreate = selected.filter((ty) => !createdTypeNames.has(ty.name));

      // allSettled (não all) de propósito: se um tipo falhar no meio, os que
      // já foram criados não podem ser recriados numa nova tentativa — o
      // create de tipo de atendimento é um INSERT sem proteção contra
      // duplicata no backend. Horário é upsert por dia, seguro de repetir.
      const results = await Promise.allSettled([
        saveBusinessHoursBatch.mutateAsync({
          days: [1, 2, 3, 4, 5],
          open_time: weekdayOpen,
          close_time: weekdayClose,
          is_closed: false,
          is_24h: false,
        }),
        saveBusinessHoursBatch.mutateAsync({
          days: [6],
          open_time: saturdayOpen,
          close_time: saturdayClose,
          is_closed: !worksSaturday,
          is_24h: false,
        }),
        saveBusinessHoursBatch.mutateAsync({
          days: [0],
          open_time: sundayOpen,
          close_time: sundayClose,
          is_closed: !worksSunday,
          is_24h: false,
        }),
        ...typesToCreate.map((ty) =>
          createAppointmentType
            .mutateAsync({ name: ty.name, duration_minutes: ty.duration_minutes })
            .then(() => ty.name),
        ),
      ]);

      const [hoursWeekday, hoursSaturday, hoursSunday, ...typeResults] = results;
      const newlyCreated = typeResults
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        .map((r) => r.value);
      if (newlyCreated.length > 0) {
        setCreatedTypeNames((prev) => new Set([...prev, ...newlyCreated]));
      }

      if ([hoursWeekday, hoursSaturday, hoursSunday].some((r) => r.status === 'rejected')) {
        toast.error(t('register.errors.hoursSave'));
        setStep(4);
        return;
      }
      if (typeResults.some((r) => r.status === 'rejected')) {
        toast.error(t('register.errors.typeSave'));
        setStep(5);
        return;
      }

      await completeOnboarding.mutateAsync();

      // Última etapa medida só aqui: até esta linha o cadastro ainda podia
      // voltar pro passo 4 ou 5 por erro de gravação. Antes disso o evento
      // diria "concluiu" para quem não concluiu.
      if (!etapasMedidas.current.has(6)) {
        etapasMedidas.current.add(6);
        trackEvent(GA_EVENTS.ONBOARDING_STEP, {
          step_name: ONBOARDING_STEP_NAMES[6],
          step_number: 6,
          step_group: 'cadastro',
        });
      }

      setTransitioning(true);
    } catch {
      toast.error(t('register.errors.finish'));
    } finally {
      setLoading(false);
    }
  };

  const handleTransitionDone = () => {
    // Sinaliza pro dashboard que ele acabou de "nascer" do onboarding, pra
    // ele fazer sua própria entrada suave (fade + highlight) em vez de
    // simplesmente aparecer — a troca de rota em si é sempre um corte seco.
    try {
      sessionStorage.setItem('nixvet:just-onboarded', '1');
    } catch {
      // sessionStorage indisponível (modo privado etc.) — sem problema, o
      // dashboard só deixa de mostrar a entrada especial.
    }
    router.push('/dashboard');
  };

  if (transitioning) {
    return <OnboardingTransition onDone={handleTransitionDone} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-wa-bg p-4 lg:p-8">
      <div className="flex min-h-180 w-full max-w-275 flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_30px_60px_-20px_rgba(10,40,25,0.25)] lg:flex-row">

        {/* ─── Left panel ─── */}
        <div className="relative flex flex-col overflow-hidden bg-linear-to-br from-wa-brand-600 to-wa-brand-700 px-10 py-11 text-white lg:w-[380px] lg:shrink-0">
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,.09) 1.5px, transparent 1.5px)',
              backgroundSize: '22px 22px',
            }}
          />
          <div className="pointer-events-none absolute -right-35 -bottom-35 size-85 rounded-full bg-white/8" />

          <div className="relative z-10 flex flex-1 flex-col">
            <div>
              <div className="mb-3 w-fit brightness-0 invert">
                <LogoColored width="170px" height="36px" />
              </div>
              <div className="text-[13.5px] text-white/75">{t('register.left.tagline')}</div>
            </div>

            <div className="mt-auto">
              <div className="mb-4.5 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.25 text-xs font-semibold">
                <Check className="size-3.25" strokeWidth={3} />
                {t('register.left.badge')}
              </div>
              <h1 className="text-[32px] font-extrabold leading-[1.15] tracking-[-0.02em]">
                {t('register.left.title')}
              </h1>
              <p className="mt-3 max-w-75 text-[14.5px] leading-relaxed text-white/80">
                {t('register.left.text')}
              </p>

              <ul className="mt-7 flex flex-col gap-3.5">
                {FEATURES.map(({ icon: Icon, key }) => (
                  <li key={key} className="flex items-center gap-3 text-sm font-medium">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-white/16">
                      <Icon className="size-4" />
                    </div>
                    {t(`register.features.${key}`)}
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-8 text-[13px] text-white/75">
              {t('register.left.haveAccount')}{' '}
              <Link href="/login" className="font-bold text-white underline underline-offset-2">
                {t('register.left.login')}
              </Link>
            </p>
          </div>
        </div>

        {/* ─── Right panel ─── */}
        <div className="flex flex-1 flex-col overflow-y-auto px-6 py-10 sm:px-14">
          <div className="mx-auto flex min-h-180 w-full max-w-115 flex-1 flex-col">

            {showLoadingGate ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-wa-ink-3">
                <Loader2 className="size-6 animate-spin" />
                <p className="text-sm">{t('register.loading')}</p>
              </div>
            ) : (
              <>
                <Stepper current={step} />

                {/* ── Step 1: Clínica ── */}
                {step === 1 && (
                  <div className="flex flex-1 flex-col">
                    <h2 className="text-[23px] font-extrabold tracking-[-0.01em] text-wa-ink">{t('register.step1.title')}</h2>
                    <p className="mt-1.5 text-sm leading-normal text-wa-ink-2">{t('register.step1.subtitle')}</p>

                    <div className="mt-7 flex flex-col gap-5">
                      <div>
                        <FieldLabel htmlFor="clinicName" required>{t('register.step1.name')}</FieldLabel>
                        <IconInput
                          id="clinicName"
                          icon={<Building2 />}
                          placeholder={t('register.step1.namePlaceholder')}
                          value={clinicName}
                          onChange={(e) => handleClinicNameChange(e.target.value)}
                        />
                      </div>

                      <div>
                        <FieldLabel htmlFor="clinicCode" required optional={t('register.step1.codeHint')}>{t('register.step1.code')}</FieldLabel>
                        <IconInput
                          id="clinicCode"
                          icon={<span className="text-sm font-semibold">@</span>}
                          className="font-mono"
                          placeholder={t('register.step1.codePlaceholder')}
                          value={clinicCode}
                          onChange={(e) => handleCodeChange(e.target.value)}
                        />
                        <p className="mt-1.5 text-xs text-wa-ink-3">{t('register.step1.codeRule')}</p>
                      </div>
                    </div>

                    <div className="mt-auto flex gap-3 pt-7">
                      <Button
                        className="flex-1 gap-1.5 rounded-wa text-[14.5px] font-bold shadow-[0_8px_18px_-6px_rgba(18,179,127,0.45)]"
                        onClick={concluirEtapa(1, validateStep1)}
                      >
                        {t('register.continue')} <ChevronRight className="size-3.75" strokeWidth={2.5} />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Step 2: Responsável ── */}
                {step === 2 && (
                  <div className="flex flex-1 flex-col">
                    <h2 className="text-[23px] font-extrabold tracking-[-0.01em] text-wa-ink">{t('register.step2.title')}</h2>
                    <p className="mt-1.5 text-sm leading-normal text-wa-ink-2">{t('register.step2.subtitle')}</p>

                    <div className="mt-7 flex flex-col gap-5">
                      <div>
                        <FieldLabel htmlFor="adminName" required>{t('register.step2.fullName')}</FieldLabel>
                        <IconInput
                          id="adminName"
                          icon={<User />}
                          placeholder={t('register.step2.namePlaceholder')}
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                        />
                      </div>

                      <div>
                        <FieldLabel htmlFor="adminEmail" required>{t('register.step2.email')}</FieldLabel>
                        <IconInput
                          id="adminEmail"
                          type="email"
                          icon={<Mail />}
                          placeholder={t('register.step2.emailPlaceholder')}
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                        />
                      </div>

                      <div>
                        <FieldLabel htmlFor="adminPassword" required>{t('register.step2.password')}</FieldLabel>
                        <IconInput
                          id="adminPassword"
                          type="password"
                          icon={<Lock />}
                          placeholder={t('register.step2.passwordPlaceholder')}
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                        />
                      </div>

                      <div>
                        <FieldLabel htmlFor="confirmPassword" required>{t('register.step2.confirm')}</FieldLabel>
                        <IconInput
                          id="confirmPassword"
                          type="password"
                          icon={<Lock />}
                          placeholder={t('register.step2.confirmPlaceholder')}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="mt-auto flex gap-3 pt-7">
                      <Button
                        variant="outline"
                        className="flex-1 gap-1.5 rounded-wa border-[1.5px] border-wa-line text-[14.5px] font-bold text-wa-ink"
                        onClick={() => setStep(1)}
                      >
                        <ChevronLeft className="size-3.75" strokeWidth={2.5} /> {t('register.back')}
                      </Button>
                      <Button
                        className="flex-1 gap-1.5 rounded-wa text-[14.5px] font-bold shadow-[0_8px_18px_-6px_rgba(18,179,127,0.45)]"
                        onClick={concluirEtapa(2, validateStep2)}
                      >
                        {t('register.continue')} <ChevronRight className="size-3.75" strokeWidth={2.5} />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Step 3: Dados fiscais ── */}
                {step === 3 && (
                  <div className="flex flex-1 flex-col">
                    <h2 className="text-[23px] font-extrabold tracking-[-0.01em] text-wa-ink">{t('register.step3.title')}</h2>
                    <p className="mt-1.5 text-sm leading-normal text-wa-ink-2">
                      {t('register.step3.subtitle')}
                    </p>

                    <div className="mt-7 flex flex-col gap-5">
                      <div>
                        <FieldLabel htmlFor="cpfCnpj" required>{t('register.step3.cpfCnpj')}</FieldLabel>
                        <IconInput
                          id="cpfCnpj"
                          icon={<FileText />}
                          placeholder={t('register.step3.cpfPlaceholder')}
                          value={cpfCnpj}
                          onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
                        />
                        <p className="mt-1.5 text-xs text-wa-ink-3">{t('register.step3.cpfHint')}</p>
                      </div>

                      <div>
                        <FieldLabel htmlFor="phone" required>{t('register.step3.whatsapp')}</FieldLabel>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <IconInput
                              id="phone"
                              icon={<Phone />}
                              placeholder="(51) 99999-9999"
                              value={phone}
                              onChange={(e) => {
                                setPhone(formatarTelefone(e.target.value));
                                setPhoneCodeSent(false);
                              }}
                            />
                          </div>
                          {phoneOtpRequired && !phoneVerified && (
                            <Button
                              variant="outline"
                              className="rounded-wa border-[1.5px] border-wa-line px-4 text-[13.5px] font-bold text-wa-ink"
                              disabled={phoneBusy || !isCelular(phone)}
                              onClick={sendPhoneCode}
                            >
                              {phoneBusy ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : phoneCodeSent ? (
                                t('register.step3.resend')
                              ) : (
                                t('register.step3.sendCode')
                              )}
                            </Button>
                          )}
                        </div>

                        <p className="mt-1.5 text-xs text-wa-ink-3">
                          {t('register.step3.whatsappHint')}
                        </p>

                        {phoneOtpRequired && phoneVerified && (
                          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-wa-brand-600">
                            <CheckCircle2 className="size-3.75" /> {t('register.phone.confirmed')}
                          </p>
                        )}

                        {phoneOtpRequired && phoneCodeSent && !phoneVerified && (
                          <div className="mt-3 flex gap-2">
                            <div className="flex-1">
                              <IconInput
                                id="phoneCode"
                                icon={<MessageSquare />}
                                placeholder={t('register.step3.codePlaceholder')}
                                inputMode="numeric"
                                value={phoneCode}
                                onChange={(e) =>
                                  setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                                }
                              />
                            </div>
                            <Button
                              className="rounded-wa px-4 text-[13.5px] font-bold"
                              disabled={phoneBusy || phoneCode.length !== 6}
                              onClick={confirmPhoneCode}
                            >
                              {phoneBusy ? <Loader2 className="size-4 animate-spin" /> : t('register.step3.confirmBtn')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto flex gap-3 pt-7">
                      <Button
                        variant="outline"
                        className="flex-1 gap-1.5 rounded-wa border-[1.5px] border-wa-line text-[14.5px] font-bold text-wa-ink"
                        onClick={() => setStep(2)}
                      >
                        <ChevronLeft className="size-3.75" strokeWidth={2.5} /> {t('register.back')}
                      </Button>
                      <Button
                        className="flex-1 gap-1.5 rounded-wa text-[14.5px] font-bold shadow-[0_8px_18px_-6px_rgba(18,179,127,0.45)]"
                        onClick={concluirEtapa(3, validateStep3)}
                      >
                        {t('register.continue')} <ChevronRight className="size-3.75" strokeWidth={2.5} />
                      </Button>
                    </div>

                    <p className="mt-4 max-w-115 text-xs leading-relaxed text-wa-ink-3">
                      <Trans
                        i18nKey="register.step3.terms"
                        components={{
                          terms: <span className="font-semibold text-wa-brand-600 underline cursor-pointer" />,
                          privacy: <span className="font-semibold text-wa-brand-600 underline cursor-pointer" />,
                        }}
                      />
                    </p>
                  </div>
                )}

                {/* ── Step 4: Horário de funcionamento ── */}
                {step === 4 && (
                  <div className="flex flex-1 flex-col">
                    <h2 className="text-[23px] font-extrabold tracking-[-0.01em] text-wa-ink">{t('register.step4.title')}</h2>
                    <p className="mt-1.5 text-sm leading-normal text-wa-ink-2">
                      {t('register.step4.subtitle')}
                    </p>

                    <div className="mt-7 flex flex-col gap-5">
                      <div className="rounded-wa border-[1.5px] border-wa-line bg-[#fbfcfb] px-4 py-3.5">
                        <div className="flex items-center gap-2 text-sm font-semibold text-wa-ink">
                          <Clock className="size-4 shrink-0 text-wa-brand-600" />
                          {t('register.step4.weekdays')}
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-[13.5px] text-wa-ink-2">
                          <Input
                            type="time"
                            value={weekdayOpen}
                            onChange={(e) => setWeekdayOpen(e.target.value)}
                            className="h-9 min-h-9 w-full min-w-0 flex-1 rounded-[7px] border-wa-line bg-white px-2.5 py-1.5 text-[13.5px] text-wa-ink shadow-none sm:h-9"
                          />
                          <span className="shrink-0">{t('register.step4.until')}</span>
                          <Input
                            type="time"
                            value={weekdayClose}
                            onChange={(e) => setWeekdayClose(e.target.value)}
                            className="h-9 min-h-9 w-full min-w-0 flex-1 rounded-[7px] border-wa-line bg-white px-2.5 py-1.5 text-[13.5px] text-wa-ink shadow-none sm:h-9"
                          />
                        </div>
                      </div>

                      <div
                        className={cn(
                          'rounded-wa border-[1.5px] px-4 py-3.5 transition-colors',
                          worksSaturday ? 'border-wa-brand-500 bg-wa-brand-50' : 'border-wa-line bg-[#fbfcfb]',
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-wa-ink">{t('register.step4.saturday')}</span>
                          <Switch checked={worksSaturday} onCheckedChange={(v) => setWorksSaturday(v === true)} />
                        </div>
                        {worksSaturday && (
                          <div className="mt-3 flex items-center gap-2 text-[13.5px] text-wa-ink-2">
                            <Input
                              type="time"
                              value={saturdayOpen}
                              onChange={(e) => setSaturdayOpen(e.target.value)}
                              className="h-9 min-h-9 w-full min-w-0 flex-1 rounded-[7px] border-wa-line bg-white px-2.5 py-1.5 text-[13.5px] text-wa-ink shadow-none sm:h-9"
                            />
                            <span className="shrink-0">{t('register.step4.until')}</span>
                            <Input
                              type="time"
                              value={saturdayClose}
                              onChange={(e) => setSaturdayClose(e.target.value)}
                              className="h-9 min-h-9 w-full min-w-0 flex-1 rounded-[7px] border-wa-line bg-white px-2.5 py-1.5 text-[13.5px] text-wa-ink shadow-none sm:h-9"
                            />
                          </div>
                        )}
                      </div>

                      <div
                        className={cn(
                          'rounded-wa border-[1.5px] px-4 py-3.5 transition-colors',
                          worksSunday ? 'border-wa-brand-500 bg-wa-brand-50' : 'border-wa-line bg-[#fbfcfb]',
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-wa-ink">{t('register.step4.sunday')}</span>
                          <Switch checked={worksSunday} onCheckedChange={(v) => setWorksSunday(v === true)} />
                        </div>
                        {worksSunday && (
                          <div className="mt-3 flex items-center gap-2 text-[13.5px] text-wa-ink-2">
                            <Input
                              type="time"
                              value={sundayOpen}
                              onChange={(e) => setSundayOpen(e.target.value)}
                              className="h-9 min-h-9 w-full min-w-0 flex-1 rounded-[7px] border-wa-line bg-white px-2.5 py-1.5 text-[13.5px] text-wa-ink shadow-none sm:h-9"
                            />
                            <span className="shrink-0">{t('register.step4.until')}</span>
                            <Input
                              type="time"
                              value={sundayClose}
                              onChange={(e) => setSundayClose(e.target.value)}
                              className="h-9 min-h-9 w-full min-w-0 flex-1 rounded-[7px] border-wa-line bg-white px-2.5 py-1.5 text-[13.5px] text-wa-ink shadow-none sm:h-9"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto flex gap-3 pt-7">
                      {!resuming && (
                        <Button
                          variant="outline"
                          className="flex-1 gap-1.5 rounded-wa border-[1.5px] border-wa-line text-[14.5px] font-bold text-wa-ink"
                          onClick={() => setStep(3)}
                        >
                          <ChevronLeft className="size-3.75" strokeWidth={2.5} /> {t('register.back')}
                        </Button>
                      )}
                      <Button
                        className="flex-1 gap-1.5 rounded-wa text-[14.5px] font-bold shadow-[0_8px_18px_-6px_rgba(18,179,127,0.45)]"
                        onClick={concluirEtapa(4, validateStep4)}
                      >
                        {t('register.continue')} <ChevronRight className="size-3.75" strokeWidth={2.5} />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Step 5: Tipos de atendimento ── */}
                {step === 5 && (
                  <div className="flex flex-1 flex-col">
                    <h2 className="text-[23px] font-extrabold tracking-[-0.01em] text-wa-ink">{t('register.step5.title')}</h2>
                    <p className="mt-1.5 text-sm leading-normal text-wa-ink-2">
                      {t('register.step5.subtitle')}
                    </p>

                    <div className="mt-7 flex flex-col gap-2.5">
                      {appointmentTypes.map((ty, i) => (
                        <div
                          key={ty.key}
                          className="flex items-center gap-3 rounded-wa border-[1.5px] border-wa-line bg-[#fbfcfb] px-4 py-3"
                        >
                          <Checkbox checked={ty.checked} onCheckedChange={() => toggleAppointmentType(i)} />
                          <span className="flex-1 text-sm font-semibold text-wa-ink">{t(`register.types.${ty.key}`)}</span>
                          <Input
                            type="number"
                            min={5}
                            step={5}
                            value={ty.duration_minutes}
                            disabled={!ty.checked}
                            onChange={(e) => updateAppointmentTypeDuration(i, e.target.value)}
                            className="h-9 w-13.5 min-h-9 rounded-[7px] border-wa-line bg-white px-2.5 py-1.5 text-center text-[13.5px] text-wa-ink shadow-none sm:h-9"
                          />
                          <span className="text-xs text-wa-ink-3">{t('register.step5.min')}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-auto flex gap-3 pt-7">
                      <Button
                        variant="outline"
                        className="flex-1 gap-1.5 rounded-wa border-[1.5px] border-wa-line text-[14.5px] font-bold text-wa-ink"
                        onClick={() => setStep(4)}
                      >
                        <ChevronLeft className="size-3.75" strokeWidth={2.5} /> {t('register.back')}
                      </Button>
                      <Button
                        className="flex-1 gap-1.5 rounded-wa text-[14.5px] font-bold shadow-[0_8px_18px_-6px_rgba(18,179,127,0.45)]"
                        onClick={concluirEtapa(5, validateStep5)}
                      >
                        {t('register.continue')} <ChevronRight className="size-3.75" strokeWidth={2.5} />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Step 6: Conclusão ── */}
                {step === 6 && (
                  <div className="flex flex-1 flex-col justify-center">
                    <div className="mx-auto max-w-115 text-center">
                      <div className="mx-auto mb-4.5 flex size-16 items-center justify-center rounded-2xl bg-wa-brand-50">
                        <ClipboardCheck className="size-7.5 text-wa-brand-600" />
                      </div>
                      <h2 className="text-[23px] font-extrabold tracking-[-0.01em] text-wa-ink">{t('register.step6.title')}</h2>
                      <p className="mx-auto mt-2.5 text-sm leading-normal text-wa-ink-2">
                        {t('register.step6.text')}
                      </p>
                    </div>

                    <div className="mx-auto mt-6 flex max-w-115 flex-col gap-2.5 rounded-xl border border-wa-brand-100 bg-wa-brand-50 px-4.5 py-4 text-left">
                      <div className="text-[13.5px] font-bold text-wa-brand-700">{t('register.step6.summary')}</div>
                      <div className="flex items-center gap-2.25 text-[13px] text-wa-ink">
                        <Building2 className="size-3.75 shrink-0 text-wa-brand-600" />
                        <span>{clinicName} (@{clinicCode})</span>
                      </div>
                      <div className="flex items-center gap-2.25 text-[13px] text-wa-ink">
                        <User className="size-3.75 shrink-0 text-wa-brand-600" />
                        <span>{adminName} · {adminEmail}</span>
                      </div>
                      <div className="flex items-center gap-2.25 text-[13px] text-wa-ink">
                        <Calendar className="size-3.75 shrink-0 text-wa-brand-600" />
                        <span>{t('register.step6.trial')}</span>
                      </div>
                      <div className="flex items-center gap-2.25 text-[13px] text-wa-ink">
                        <CreditCard className="size-3.75 shrink-0 text-wa-brand-600" />
                        <span>{t('register.step6.noCharge')}</span>
                      </div>
                    </div>

                    {/* Montado no último passo, que é onde o cadastro é
                        efetivamente enviado. Invisível salvo quando a
                        Cloudflare decide desafiar. */}
                    <TurnstileWidget onToken={setTurnstileToken} className="mt-6 flex justify-center" />

                    <div className="mt-8 flex justify-center gap-3">
                      <Button
                        variant="outline"
                        className="gap-1.5 rounded-wa border-[1.5px] border-wa-line px-6 text-[14.5px] font-bold text-wa-ink"
                        onClick={() => setStep(5)}
                        disabled={loading}
                      >
                        <ChevronLeft className="size-3.75" strokeWidth={2.5} /> {t('register.back')}
                      </Button>
                      <Button
                        className="gap-1.5 rounded-wa px-7 text-[14.5px] font-bold shadow-[0_8px_18px_-6px_rgba(18,179,127,0.45)]"
                        onClick={handleFinish}
                        disabled={loading}
                      >
                        {loading ? (
                          <><Loader2 className="size-4 animate-spin" /> {t('register.step6.entering')}</>
                        ) : (
                          t('register.step6.enter')
                        )}
                      </Button>
                    </div>
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
