"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  CheckCircle2,
  FileSignature,
  MessageCircle,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { PLANS } from "@/lib/plans";
import { HeaderComponent } from "@/components/shared/HeaderComponent";
import { LogoCompactoDynamic } from "@/components/shared/componentizedImages/LogoCompactoDynamic";
import { DogDynamic } from "@/components/shared/componentizedImages/DogDynamic";
import type { LandingPageFeature } from "@/app/types/LandingPageFeature";
import { RevealOnScroll } from "@/components/shared/RevealOnScroll";
import { useIsMobile } from "@/hooks/use-mobile";
import { DogbackDynamic } from "@/components/shared/componentizedImages/DogbackDynamic";
import { LogoColored } from "@/components/shared/componentizedImages/LogoColored";
import { ProductTour } from "@/components/shared/landing/ProductTour";
import { Faq } from "@/components/shared/landing/Faq";
import { GOOGLE_PLAY_URL } from "@/components/shared/landing/faq-items";

const FEATURES: LandingPageFeature[] = [
  {
    icon: Stethoscope,
    title: "Gestão Clínica",
    description:
      "Prontuário completo com anamnese, histórico e exame físico. Tudo organizado por paciente e responsável.",
  },
  {
    icon: ShieldCheck,
    title: "Segurança LGPD",
    description:
      "Dados sensíveis criptografados (AES-256), consentimento de responsáveis e logs de auditoria completos.",
  },
  {
    icon: FileSignature,
    title: "Docs Inteligentes",
    description:
      "Receitas e solicitações de exames em PDF com assinatura digital e envio automático por e-mail.",
  },
];

const ROI_ROWS = [
  {
    task: "Responder WhatsApp",
    before: "Recepcionista digitando, um cliente por vez",
    after: "Respostas automáticas 24h, recepção só entra em casos complexos",
  },
  {
    task: "Marcar consulta",
    before: "Ida e volta de mensagens até fechar horário",
    after: "Agendamento direto pelo próprio WhatsApp do cliente",
  },
  {
    task: "Lembrete de vacina",
    before: "Alguém precisa lembrar de avisar manualmente",
    after: "Lembrete automático, sem depender de ninguém lembrar",
  },
  {
    task: "Prontuário",
    before: "Papel ou planilha, difícil de buscar depois",
    after: "Busca instantânea, histórico completo por paciente",
  },
];

const FEATURE_ANIMATION_DELAY_CLASS_NAMES = [
  "motion-safe:[transition-delay:80ms]",
  "motion-safe:[transition-delay:160ms]",
  "motion-safe:[transition-delay:240ms]",
];

export default function HomeClient() {
  const isMobile = useIsMobile();
  const isTablet = useIsMobile(958);
  const isTinyScreen = useIsMobile(500);

  return (
    <main className="overflow-hidden">
      <HeaderComponent width="80%" height="80%" />
      {/* Hero */}
      <section className="relative flex min-h-screen items-start justify-start bg-brand-deep">
        <div className="absolute top-10 -right-115 rotate-7 z-0 w-[80vw] max-w-225 min-w-185 opacity-7 pointer-events-none select-none md:w-[50vw] sm:w-[50vw] lg:top-10 md:top-10 sm:top-10 lg:-right-30 md:-right-30 sm:-right-30">
          <div className="motion-safe:animate-[nix-float-slow_10s_ease-in-out_infinite] motion-safe:will-change-transform invert">
            <LogoCompactoDynamic
              width={isTablet ? (isMobile ? "50%" : "80%") : "80%"}
              height={isTablet ? (isMobile ? "50%" : "80%") : "80%"}
            />
          </div>
        </div>
        <div className="relative flex flex-col gap-10 pt-32 pb-12 w-[90%] z-10 mx-auto sm:h-[calc(100%-200px)] sm:justify-between sm:gap-0 sm:pt-0 sm:pb-0 sm:top-32 md:top-32 lg:top-44 lg:w-[80%] md:w-[80%] sm:w-[80%] lg:h-fit lg:justify-start md:justify-start sm:justify-start">
          <div>
            <RevealOnScroll className="flex justify-center sm:justify-start">
              <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[11px] font-semibold text-white sm:gap-2 sm:px-3.5 sm:py-1.5 sm:text-[13px]">
                <span className="size-1.5 rounded-full bg-emerald-300 motion-safe:animate-pulse" />
                Novo: atendimento automático no WhatsApp
              </span>
            </RevealOnScroll>
            <RevealOnScroll>
              <h1 className="flex flex-col font-black text-white mb-6 text-5xl md:text-7xl sm:text-6xl tracking-wide leading-thight">
                Sua clínica <p>organizada.</p>
                <span className="text-white/65 bg-clip-text">
                  Seu WhatsApp, <p>respondendo sozinho.</p>
                </span>
              </h1>
            </RevealOnScroll>
            <RevealOnScroll delayClassName="motion-safe:[transition-delay:140ms] w-[90%]">
              <p className="text-[15px] text-white/95 tracking-normal mb-8 max-w-80 lg:text-[19px] md:text-[19px] sm:text-[16px] lg:w-115 md:w-115 sm:w-90 lg:max-w-115 md:max-w-115 sm:max-w-90">
                O NixVetApp junta prontuário, agenda e financeiro num só
                sistema, e ainda atende seus clientes no WhatsApp: agenda
                consulta, tira dúvida. E avisos sobre agendamentos, vacinas
                e retornos.
              </p>
            </RevealOnScroll>
          </div>
          <RevealOnScroll
            delayClassName="motion-safe:[transition-delay:260ms]"
            className="w-full flex flex-col items-center pb-8 sm:pb-0 lg:flex lg:items-start md:flex md:items-start sm:flex sm:items-start"
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 lg:gap-6">
              <Button
                size="lg"
                className="group h-13 w-fit p-0 pl-6 pr-2 text-[16px] rounded-full text-sm font-medium text-brand-deep bg-white shadow-sm hover:bg-white/90 transition-colors active:bg-white/80"
              >
                <Link
                  href="/register"
                  className="flex w-full items-center gap-4"
                >
                  <span className="whitespace-nowrap">Começar agora grátis</span>
                  <div className="flex shrink-0 items-center justify-center size-11 rounded-full bg-brand-deep text-white transition-[filter] duration-200 group-hover:brightness-90">
                    <ArrowRight className="size-8" />
                  </div>
                </Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-white/75 lg:justify-start">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-300" /> 14 dias grátis
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-300" /> sem cartão de crédito
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-300" /> cancele quando quiser
              </span>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <section
        id="diferenciais"
        className="relative w-full h-fit min-h-screen py-16 md:py-24 flex flex-col items-center justify-start bg-brand-deep gap-12 md:gap-20"
      >
        {/* Quadro escuro com degradê vertical - Mantido em absolute sem quebrar o fluxo */}
        <div className="absolute top-20 right-[5%] w-full h-full max-h-150 rounded-r-[45px] bg-linear-to-b from-black/25 via-black/5 to-transparent blur-sm pointer-events-none lg:right-[25%] md:right-[25%] sm:right-[15%] lg:top-10" />

        {/* Bloco Superior: Alinha os Textos e o Dog lado a lado (ou um sob o outro no mobile) */}
        <div className="relative z-10 flex flex-col items-center w-[90%] sm:w-[80%] sm:flex-row sm:justify-center gap-18 sm:items-center lg:-mt-40 md:-mt-40 sm:-mt-35">
          {/* Container dos textos (Não usa mais translate manual) */}
          <div className="w-fit order-2 -mt-15 text-pretty space-y-4 text-center sm:text-left lg:mt-30 md:mt-30 sm:mt-30">
            <RevealOnScroll>
              <h1 className="text-white text-[32px] font-bold leading-tight lg:text-[59.61px] md:text-[45px] sm:text-[38px]">
                <span className="text-pretty">Por que escolher</span>
                <p>o NixVetApp?</p>
              </h1>
            </RevealOnScroll>

            <RevealOnScroll delayClassName="motion-safe:[transition-delay:140ms]">
              {isTinyScreen ? (
                <h2 className="text-white font-extralight text-[22px]">
                  <span>Tecnologia de ponta</span>
                  <p> desenvolvida para otimizar</p>
                  <p>cada aspecto da sua clínica</p>
                </h2>
              ) : (
                <h2 className="text-white font-extralight text-[25px] lg:text-[25px] md:text-[20px] sm:text-[18px]">
                  <span>Tecnologia de ponta desenvolvida para</span>
                  <p>otimizar cada aspecto da sua clínica</p>
                </h2>
              )}
            </RevealOnScroll>
          </div>

          {/* Container das imagens (Controlado pelo fluxo do Flexbox) */}
          <div className="relative order-1 -mt-8 z-10 w-fit max-w-70 sm:max-w-none flex justify-center pointer-events-none select-none sm:mt-0 lg:order-2 md:order-2 sm:order-2">
            <div className="motion-safe:animate-[nix-float-slow_9s_ease-in-out_infinite] motion-safe:will-change-transform w-full max-w-100">
              {isMobile ? (
                <DogbackDynamic
                  width="100%"
                  height="100%"
                  className="w-full h-auto"
                />
              ) : (
                <DogDynamic
                  width="100%"
                  height="100%"
                  className="w-[160%] h-auto"
                />
              )}
            </div>
          </div>
        </div>

        {/* Bloco Inferior: Grid de Cards (Substitui o top-100 por gap natural da section) */}
        <div className="relative z-10 w-full sm:w-[85%] px-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1.3fr_1fr_1fr] md:gap-6">
            <RevealOnScroll className="sm:row-span-2">
              <Card className="group flex h-full min-h-70 flex-col justify-between overflow-hidden rounded-2xl border-none bg-linear-to-br from-brand-deep-dark to-brand-deep p-6 shadow-md">
                <div>
                  <span className="mb-5 inline-flex items-center rounded-full bg-white/16 px-3 py-1 text-[11.5px] font-bold text-white">
                    ★ Diferencial NixVet
                  </span>
                  <div className="mb-4 flex items-center gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/16 text-white">
                      <MessageCircle className="size-6" />
                    </div>
                    <h4 className="text-[20px] leading-snug font-bold text-white">
                      Atendimento no WhatsApp, mesmo sem ninguém na recepção
                    </h4>
                  </div>
                  <p className="text-[15px] leading-relaxed text-white/85">
                    Sua equipe para de perder cliente por mensagem não
                    respondida. O sistema marca a consulta sozinho e chama um
                    humano quando o caso foge do script.
                  </p>
                </div>
                <div className="mt-5 space-y-2 rounded-xl border border-white/15 bg-white/8 p-3.5">
                  <div className="max-w-[85%] rounded-xl rounded-bl-sm bg-white/14 px-3 py-2 text-[12.5px] leading-snug text-white">
                    Oi! Preciso marcar consulta pro meu gato, ele tá sem comer 😟
                  </div>
                  <div className="ml-auto max-w-[85%] rounded-xl rounded-br-sm bg-emerald-300 px-3 py-2 text-[12.5px] font-semibold leading-snug text-brand-deep-dark">
                    Entendi! Consigo um horário hoje às 16h40 com a Dra. Ana.
                    Confirma?
                  </div>
                </div>
              </Card>
            </RevealOnScroll>

            {FEATURES.map((feature, featureIndex) => {
              const transitionDelayClassName =
                FEATURE_ANIMATION_DELAY_CLASS_NAMES[featureIndex] ?? "";
              const Icon = feature.icon;
              const isDocsCard = featureIndex === FEATURES.length - 1;
              return (
                <RevealOnScroll
                  key={feature.title}
                  delayClassName={transitionDelayClassName}
                  className={isDocsCard ? "sm:col-span-2" : ""}
                >
                  <Card className="group h-full min-h-54 rounded-2xl shadow-sm transition-all duration-300 hover:border-primary/20 hover:shadow-md hover:-translate-y-1">
                    <CardContent className="flex h-full flex-col justify-center p-6">
                      {isDocsCard ? (
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                          <div className="flex-1">
                            <div className="mb-3 flex items-center gap-4">
                              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#eef7f3] text-brand-deep-dark">
                                <Icon className="size-6" />
                              </div>
                              <h4 className="text-[20px] leading-snug font-bold text-brand-deep-dark">
                                {feature.title}
                              </h4>
                            </div>
                            <p className="mb-4 text-[15px] leading-relaxed text-gray-500">
                              {feature.description}
                            </p>
                            <ul className="flex flex-wrap gap-2">
                              {["Receita em PDF", "Assinatura digital", "Envio automático"].map(
                                (tag) => (
                                  <li
                                    key={tag}
                                    className="rounded-full bg-[#eef7f3] px-3 py-1 text-[12.5px] font-semibold text-brand-deep-dark"
                                  >
                                    {tag}
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                          <div className="w-full shrink-0 rounded-xl border border-border bg-white p-4 shadow-sm sm:w-55">
                            <div className="mb-3 flex items-center justify-between">
                              <span className="text-[11px] font-bold tracking-wide text-brand-deep-dark uppercase">
                                Receita.pdf
                              </span>
                              <FileSignature className="size-4 text-brand-deep" />
                            </div>
                            <div className="mb-3 space-y-1.5">
                              <div className="h-2 w-4/5 rounded-full bg-border" />
                              <div className="h-2 w-3/5 rounded-full bg-border" />
                              <div className="h-2 w-2/3 rounded-full bg-border" />
                            </div>
                            <div className="flex w-fit items-center gap-1.5 rounded-full bg-[#eef7f3] px-2.5 py-1 text-[11px] font-semibold text-brand-deep-dark">
                              <CheckCircle2 className="size-3.5 text-brand-deep" /> Assinado
                              digitalmente
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="mb-3 flex items-center gap-4">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#eef7f3] text-brand-deep-dark">
                              <Icon className="size-5" />
                            </div>
                            <h4 className="text-[20px] leading-snug font-semibold text-brand-deep-dark">
                              {feature.title}
                            </h4>
                          </div>
                          <p className="text-[15px] leading-relaxed text-gray-500">
                            {feature.description}
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </RevealOnScroll>
              );
            })}
          </div>
        </div>

        {/* CONTAINER DA BARRIGA CENTRALIZADA */}
        <div className="absolute bottom-0 left-0 w-full pointer-events-none z-20 flex flex-col items-center transform translate-y-[99%]">
          <svg
            viewBox="0 0 500 150"
            preserveAspectRatio="none"
            className="w-87.5 h-12.5 block"
          >
            <path
              d="M0,0 C125,0 125,150 250,150 S375,0 500,0 Z"
              className="fill-brand-deep"
            />
          </svg>
        </div>
      </section>

      {/* Tour do produto */}
      <section id="demo" className="relative w-full bg-[#eef7f3] px-4 py-20 lg:px-6">
        <div className="mx-auto max-w-6xl">
          <RevealOnScroll className="mx-auto mb-12 max-w-2xl text-center">
            <span className="mb-2.5 block text-[13px] font-bold tracking-wider text-brand-deep-dark uppercase">
              Veja por dentro
            </span>
            <h2 className="text-brand-deep-dark text-[32px] font-black leading-tight lg:text-[42px] md:text-[36px]">
              O sistema, na prática
            </h2>
            <p className="mt-4 text-[16px] text-[#565656] lg:text-[18px]">
              Um vislumbre de como fica o dia a dia da sua equipe usando o NixVetApp.
            </p>
          </RevealOnScroll>

          <RevealOnScroll delayClassName="motion-safe:[transition-delay:120ms]">
            <ProductTour />
          </RevealOnScroll>
        </div>
      </section>

      {/* ROI */}
      <section className="relative w-full bg-white px-4 py-20 lg:px-6">
        <div className="mx-auto max-w-4xl">
          <RevealOnScroll className="mx-auto mb-12 max-w-2xl text-center">
            <span className="mb-2.5 block text-[13px] font-bold tracking-wider text-brand-deep-dark uppercase">
              Retorno sobre o investimento
            </span>
            <h2 className="text-brand-deep-dark text-[32px] font-black leading-tight lg:text-[42px] md:text-[36px]">
              Quanto tempo isso economiza da sua equipe?
            </h2>
          </RevealOnScroll>

          <RevealOnScroll
            delayClassName="motion-safe:[transition-delay:120ms]"
            className="overflow-hidden rounded-2xl border border-brand-deep/15 shadow-[0_20px_45px_rgba(18,179,127,0.12)]"
          >
            <div className="hidden grid-cols-[1.1fr_1fr_1fr] bg-linear-to-r from-brand-deep-dark to-brand-deep text-[13.5px] font-bold text-white sm:grid">
              <div className="p-4">Tarefa</div>
              <div className="p-4">Do jeito antigo</div>
              <div className="p-4">Com o NixVetApp</div>
            </div>
            {ROI_ROWS.map((row, rowIndex) => (
              <div
                key={row.task}
                className={`grid grid-cols-1 sm:grid-cols-[1.1fr_1fr_1fr] ${
                  rowIndex % 2 === 1 ? "bg-[#eef7f3]" : "bg-white"
                }`}
              >
                <div className="border-t border-brand-deep/10 p-4 text-[14px] font-semibold text-brand-deep-dark sm:text-inherit">
                  {row.task}
                </div>
                <div className="border-t border-brand-deep/10 p-4 text-[14px] leading-relaxed text-gray-500">
                  {row.before}
                </div>
                <div className="border-t border-brand-deep/10 border-l-2 border-l-brand-deep/40 bg-brand-deep/5 p-4 text-[14px] leading-relaxed font-semibold text-brand-deep">
                  {row.after}
                </div>
              </div>
            ))}
          </RevealOnScroll>

          <RevealOnScroll
            delayClassName="motion-safe:[transition-delay:200ms]"
            className="mx-auto mt-8 max-w-xl text-center text-[17px] font-semibold text-brand-deep-dark"
          >
            Menos tempo apagando incêndio na recepção, mais tempo cuidando dos pacientes.
          </RevealOnScroll>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="relative w-full py-20 px-4 lg:px-6 bg-white">
        <div className="mx-auto max-w-6xl">
          <RevealOnScroll className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-brand-deep-dark text-[32px] font-black leading-tight lg:text-[48px] md:text-[38px]">
              Planos para cada tamanho de clínica
            </h2>
            <p className="mt-4 text-[16px] text-[#565656] lg:text-[20px]">
              14 dias grátis para testar, sem cartão de crédito. Escolha o plano ideal quando estiver pronto.
            </p>
          </RevealOnScroll>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {PLANS.map((plan, planIndex) => (
              <RevealOnScroll
                key={plan.id}
                delayClassName={FEATURE_ANIMATION_DELAY_CLASS_NAMES[planIndex] ?? ""}
                className="h-full"
              >
                <Card
                  className={`relative flex h-full flex-col p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                    plan.highlight
                      ? "border-brand-deep/40 bg-brand-deep/5 shadow-md"
                      : "border-border"
                  }`}
                >
                  {plan.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-deep px-3 py-0.5 text-xs font-bold text-white shadow">
                      Mais popular
                    </span>
                  )}
                  <CardContent className="flex h-full flex-col p-0">
                    <h3 className="text-xl font-semibold text-brand-deep-dark">{plan.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">{plan.tagline}</p>
                    <div className="mt-4 flex items-end gap-1">
                      <span className="text-4xl font-extrabold text-brand-deep-dark">
                        R${plan.price}
                      </span>
                      <span className="mb-1 text-sm text-gray-500">/mês</span>
                    </div>
                    <ul className="mt-6 flex-1 space-y-2.5">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-deep" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      asChild
                      className={`mt-8 w-full rounded-full ${
                        plan.highlight
                          ? "bg-brand-deep text-white hover:bg-brand-deep-dark"
                          : "bg-brand-deep/10 text-brand-deep-dark hover:bg-brand-deep/20"
                      }`}
                    >
                      <Link href="/register">Começar grátis</Link>
                    </Button>
                  </CardContent>
                </Card>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative w-full bg-white px-4 py-20 lg:px-6">
        <div className="mx-auto max-w-3xl">
          <RevealOnScroll className="mx-auto mb-12 max-w-2xl text-center">
            <span className="mb-2.5 block text-[13px] font-bold tracking-wider text-brand-deep-dark uppercase">
              Dúvidas frequentes
            </span>
            <h2 className="text-brand-deep-dark text-[32px] font-black leading-tight lg:text-[42px] md:text-[36px]">
              Perguntas frequentes
            </h2>
          </RevealOnScroll>

          <RevealOnScroll delayClassName="motion-safe:[transition-delay:120ms]">
            <Faq />
          </RevealOnScroll>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-0 lg:px-6">
        <div className="relative flex flex-col items-center mx-auto max-w-5xl overflow-hiddenc px-2 py-12 text-center lg:p-12">
          <RevealOnScroll>
            <h2 className="text-brand-deep mb-6 text-[32px] font-black relative word-spacing-wide leading-tight lg:text-[60px] md:text-[42px] sm:text-[32px] ">
              {isMobile ? (
                <div>
                  <p className="text-[#565656]">Pronto para</p>
                  <p className="text-[#565656]">nunca mais</p>
                  <p className="text-brand-deep">perder um cliente</p>
                  <p className="text-[#565656]">por mensagem</p>
                  <p className="text-[#565656]">não respondida?</p>
                </div>
              ) : (
                <div>
                  <p className="text-[#565656]">Pronto para nunca mais</p>
                  <p className="text-brand-deep">perder um cliente</p>
                  <p className="text-[#565656]">por mensagem não</p>
                  <p className="text-[#565656]">respondida?</p>
                </div>
              )}
            </h2>
          </RevealOnScroll>
          <RevealOnScroll delayClassName="motion-safe:[transition-delay:160ms]">
            {isMobile ? (
              <p className="mb-10 max-w-2xl mx-auto relative z-10 text-[18px] text-[#565656] lg:text-[28px] md:text-[28px] sm:text-[18px]">
                <span>Junte-se às clínicas que já</span>
                <p>modernizaram o atendimento</p>
                <p>com o NixVetApp.</p>
              </p>
            ) : (
              <p className="mb-10 max-w-2xl mx-auto relative z-10 text-[18px] text-[#565656] lg:text-[28px] md:text-[28px] sm:text-[18px]">
                Junte-se às clínicas que já modernizaram o atendimento com o
                NixVetApp.
              </p>
            )}
          </RevealOnScroll>
          <RevealOnScroll delayClassName="motion-safe:[transition-delay:280ms]">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="group w-fit p-0 pl-6 pr-2 rounded-full flex items-center gap-4 text-[20px] text-brand-deep font-medium h-16 shadow-none bg-brand-deep/10 active:bg-brand-deep/30 hover:bg-brand-deep/25 border-none"
            >
              <Link href="/register">
                Começar agora grátis
                <div className="flex shrink-0 items-center justify-center size-12 rounded-full bg-brand-deep text-white transition-[filter] duration-200 group-hover:brightness-90">
                  <ArrowRight className="size-8" />
                </div>
              </Link>
            </Button>
          </RevealOnScroll>
        </div>
      </section>

      <footer className="flex flex-col items-center justify-center text-center bg-white text-gray-500 border-t-2 border-gray-200/80 py-18">
        <div className="mb-4">
          <LogoColored
            width={isMobile ? "200px" : "400px"}
            // height="auto"
            className="inline-block hover:opacity-80 transition-all"
          />
        </div>
        <div className="flex flex-wrap justify-center gap-2 text-sm mb-3">
          <Link
            href="#diferenciais"
            className="text-[16px] text-brand-deep hover:text-brand-deep/80 transition-colors lg:text-[22px] md:text-[22px] sm:text-[16px]"
          >
            Recursos
          </Link>
          <div className="w-0.5 h-5 bg-gray-600 lg:w-0.5 lg:h-7" />
          <Link
            href="#planos"
            className="text-[16px] text-brand-deep hover:text-brand-deep/80 transition-colors lg:text-[22px] md:text-[22px] sm:text-[16px]"
          >
            Planos
          </Link>
          <div className="w-0.5 h-5 bg-gray-600 lg:w-0.5 lg:h-7" />
          <Link
            href="#faq"
            className="text-[16px] text-brand-deep hover:text-brand-deep/80 transition-colors lg:text-[22px] md:text-[22px] sm:text-[16px]"
          >
            Dúvidas frequentes
          </Link>
          <div className="w-0.5 h-5 bg-gray-600 lg:w-0.5 lg:h-7" />
          <Link
            href="/politicas-uso"
            className="text-[16px] text-brand-deep hover:text-brand-deep/80 transition-colors lg:text-[22px] md:text-[22px] sm:text-[16px]"
          >
            Políticas de uso
          </Link>
          <div className="w-0.5 h-5 bg-gray-600 lg:w-0.5 lg:h-7" />
          <Link
            href="/termos-servicos-aplicativo"
            className="text-[16px] text-brand-deep hover:text-brand-deep/80 transition-colors lg:text-[22px] md:text-[22px] sm:text-[16px]"
          >
            Termos do aplicativo
          </Link>
        </div>
        <Link
          href={GOOGLE_PLAY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 inline-block transition-opacity hover:opacity-80"
        >
          <Image
            src="/images/badges/google-play-badge.png"
            alt="Disponível no Google Play"
            width={180}
            height={53}
            className="h-13.25 w-auto"
          />
        </Link>
        <p className="text-[16px] text-[#565656] lg:text-[22px] md:text-[22px] sm:text-[16px]">
          NixVetApp ©{new Date().getFullYear()} - Todos os direitos reservados.
        </p>
      </footer>
    </main>
  );
}
