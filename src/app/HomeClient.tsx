"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "react-i18next";
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
import { usePlanText } from "@/lib/i18n/plans";
import { HeaderComponent } from "@/components/shared/HeaderComponent";
import { LogoCompactoDynamic } from "@/components/shared/componentizedImages/LogoCompactoDynamic";
import { DogDynamic } from "@/components/shared/componentizedImages/DogDynamic";
import { RevealOnScroll } from "@/components/shared/RevealOnScroll";
import { useIsMobile } from "@/hooks/use-mobile";
import { DogbackDynamic } from "@/components/shared/componentizedImages/DogbackDynamic";
import { LogoColored } from "@/components/shared/componentizedImages/LogoColored";
import { ProductTour } from "@/components/shared/landing/ProductTour";
import { Faq } from "@/components/shared/landing/Faq";
import { GOOGLE_PLAY_URL } from "@/components/shared/landing/faq-items";
import { GA_EVENTS, trackEvent } from "@/lib/analytics";

const FEATURES = [
  { icon: Stethoscope, key: "clinical" },
  { icon: ShieldCheck, key: "security" },
  { icon: FileSignature, key: "docs" },
] as const;

const ROI_KEYS = ["whatsapp", "schedule", "reminder", "records"] as const;
const DOC_TAG_KEYS = ["pdf", "signature", "auto"] as const;

const FEATURE_ANIMATION_DELAY_CLASS_NAMES = [
  "motion-safe:[transition-delay:80ms]",
  "motion-safe:[transition-delay:160ms]",
  "motion-safe:[transition-delay:240ms]",
];

// Cada CTA leva para o mesmo /register, então sem o rótulo de origem não dá
// para saber QUAL delas converte — que é a única pergunta útil aqui.
const aoClicarCta = (origem: string) => () =>
  trackEvent(GA_EVENTS.SIGN_UP_START, { origem });

export default function HomeClient() {
  const { t } = useTranslation();
  const planText = usePlanText();
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
                {t('landing.heroBadge')}
              </span>
            </RevealOnScroll>
            <RevealOnScroll>
              <h1 className="flex flex-col font-black text-white mb-6 text-5xl md:text-7xl sm:text-6xl tracking-wide leading-thight">
                {t('landing.h1a')} <p>{t('landing.h1b')}</p>
                <span className="text-white/65 bg-clip-text">
                  {t('landing.h1c')} <p>{t('landing.h1d')}</p>
                </span>
              </h1>
            </RevealOnScroll>
            <RevealOnScroll delayClassName="motion-safe:[transition-delay:140ms] w-[90%]">
              <p className="text-[15px] text-white/95 tracking-normal mb-8 max-w-80 lg:text-[19px] md:text-[19px] sm:text-[16px] lg:w-115 md:w-115 sm:w-90 lg:max-w-115 md:max-w-115 sm:max-w-90">
                {t('landing.heroText')}
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
                  onClick={aoClicarCta("hero")}
                  className="flex w-full items-center gap-4"
                >
                  <span className="whitespace-nowrap">{t('landing.ctaStart')}</span>
                  <div className="flex shrink-0 items-center justify-center size-11 rounded-full bg-brand-deep text-white transition-[filter] duration-200 group-hover:brightness-90">
                    <ArrowRight className="size-8" />
                  </div>
                </Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-white/75 lg:justify-start">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-300" /> {t('landing.bullets.free')}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-300" /> {t('landing.bullets.noCard')}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-300" /> {t('landing.bullets.cancel')}
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
              {/* h2, não h1: a página só pode ter um h1, e ele é o do herói
                  ("Sua clínica organizada..."). Duas h1 dividem o sinal de
                  qual é o assunto da página. As classes são as mesmas — nada
                  muda visualmente. */}
              <h2 className="text-white text-[32px] font-bold leading-tight lg:text-[59.61px] md:text-[45px] sm:text-[38px]">
                <span className="text-pretty">{t('landing.why1')}</span>
                <p>{t('landing.why2')}</p>
              </h2>
            </RevealOnScroll>

            <RevealOnScroll delayClassName="motion-safe:[transition-delay:140ms]">
              {isTinyScreen ? (
                <h2 className="text-white font-extralight text-[22px]">
                  <span>{t('landing.sub1')}</span>
                  <p>{t('landing.sub2')}</p>
                </h2>
              ) : (
                <h2 className="text-white font-extralight text-[25px] lg:text-[25px] md:text-[20px] sm:text-[18px]">
                  <span>{t('landing.sub1')}</span>
                  <p>{t('landing.sub2')}</p>
                </h2>
              )}
            </RevealOnScroll>
          </div>

          {/* Container das imagens (Controlado pelo fluxo do Flexbox) */}
          {/* w-75: os 300px eram implícitos enquanto a arte era <svg> sem
              largura própria — `w-fit` caía na largura intrínseca padrão do CSS
              para elemento substituído. Com <img> a intrínseca passa a ser a do
              arquivo, então a medida vira explícita para o herói não mudar de
              tamanho. O max-w-70 segue limitando o mobile a 280px. */}
          <div className="relative order-1 -mt-8 z-10 w-75 max-w-70 sm:max-w-none flex justify-center pointer-events-none select-none sm:mt-0 lg:order-2 md:order-2 sm:order-2">
            <div className="motion-safe:animate-[nix-float-slow_9s_ease-in-out_infinite] motion-safe:will-change-transform w-full max-w-100">
              {isMobile ? (
                <DogbackDynamic className="w-full h-auto" />
              ) : (
                // max-w-none: o preflight do Tailwind põe max-width:100% em
                // <img> (não punha no <svg> de antes) e clampava o 160%.
                <DogDynamic className="w-[160%] max-w-none h-auto" />
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
                    {t('landing.diffBadge')}
                  </span>
                  <div className="mb-4 flex items-center gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/16 text-white">
                      <MessageCircle className="size-6" />
                    </div>
                    <h4 className="text-[20px] leading-snug font-bold text-white">
                      {t('landing.diffTitle')}
                    </h4>
                  </div>
                  <p className="text-[15px] leading-relaxed text-white/85">
                    {t('landing.diffText')}
                  </p>
                </div>
                <div className="mt-5 space-y-2 rounded-xl border border-white/15 bg-white/8 p-3.5">
                  <div className="max-w-[85%] rounded-xl rounded-bl-sm bg-white/14 px-3 py-2 text-[12.5px] leading-snug text-white">
                    {t('landing.chatClient')}
                  </div>
                  <div className="ml-auto max-w-[85%] rounded-xl rounded-br-sm bg-emerald-300 px-3 py-2 text-[12.5px] font-semibold leading-snug text-brand-deep-dark">
                    {t('landing.chatBot')}
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
                  key={feature.key}
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
                                {t(`landing.features.${feature.key}.title`)}
                              </h4>
                            </div>
                            <p className="mb-4 text-[15px] leading-relaxed text-gray-500">
                              {t(`landing.features.${feature.key}.description`)}
                            </p>
                            <ul className="flex flex-wrap gap-2">
                              {DOC_TAG_KEYS.map(
                                (tag) => (
                                  <li
                                    key={tag}
                                    className="rounded-full bg-[#eef7f3] px-3 py-1 text-[12.5px] font-semibold text-brand-deep-dark"
                                  >
                                    {t(`landing.docTags.${tag}`)}
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                          <div className="w-full shrink-0 rounded-xl border border-border bg-white p-4 shadow-sm sm:w-55">
                            <div className="mb-3 flex items-center justify-between">
                              <span className="text-[11px] font-bold tracking-wide text-brand-deep-dark uppercase">
                                {t('landing.docFile')}
                              </span>
                              <FileSignature className="size-4 text-brand-deep" />
                            </div>
                            <div className="mb-3 space-y-1.5">
                              <div className="h-2 w-4/5 rounded-full bg-border" />
                              <div className="h-2 w-3/5 rounded-full bg-border" />
                              <div className="h-2 w-2/3 rounded-full bg-border" />
                            </div>
                            <div className="flex w-fit items-center gap-1.5 rounded-full bg-[#eef7f3] px-2.5 py-1 text-[11px] font-semibold text-brand-deep-dark">
                              <CheckCircle2 className="size-3.5 text-brand-deep" /> {t('landing.signed')}
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
                              {t(`landing.features.${feature.key}.title`)}
                            </h4>
                          </div>
                          <p className="text-[15px] leading-relaxed text-gray-500">
                            {t(`landing.features.${feature.key}.description`)}
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
              {t('landing.tourKicker')}
            </span>
            <h2 className="text-brand-deep-dark text-[32px] font-black leading-tight lg:text-[42px] md:text-[36px]">
              {t('landing.tourTitle')}
            </h2>
            <p className="mt-4 text-[16px] text-[#565656] lg:text-[18px]">
              {t('landing.tourText')}
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
              {t('landing.roi.kicker')}
            </span>
            <h2 className="text-brand-deep-dark text-[32px] font-black leading-tight lg:text-[42px] md:text-[36px]">
              {t('landing.roi.title')}
            </h2>
          </RevealOnScroll>

          <RevealOnScroll
            delayClassName="motion-safe:[transition-delay:120ms]"
            className="overflow-hidden rounded-2xl border border-brand-deep/15 shadow-[0_20px_45px_rgba(18,179,127,0.12)]"
          >
            <div className="hidden grid-cols-[1.1fr_1fr_1fr] bg-linear-to-r from-brand-deep-dark to-brand-deep text-[13.5px] font-bold text-white sm:grid">
              <div className="p-4">{t('landing.roi.colTask')}</div>
              <div className="p-4">{t('landing.roi.colBefore')}</div>
              <div className="p-4">{t('landing.roi.colAfter')}</div>
            </div>
            {ROI_KEYS.map((row, rowIndex) => (
              <div
                key={row}
                className={`grid grid-cols-1 sm:grid-cols-[1.1fr_1fr_1fr] ${
                  rowIndex % 2 === 1 ? "bg-[#eef7f3]" : "bg-white"
                }`}
              >
                <div className="border-t border-brand-deep/10 p-4 text-[14px] font-semibold text-brand-deep-dark sm:text-inherit">
                  {t(`landing.roi.rows.${row}.task`)}
                </div>
                <div className="border-t border-brand-deep/10 p-4 text-[14px] leading-relaxed text-gray-500">
                  {t(`landing.roi.rows.${row}.before`)}
                </div>
                <div className="border-t border-brand-deep/10 border-l-2 border-l-brand-deep/40 bg-brand-deep/5 p-4 text-[14px] leading-relaxed font-semibold text-brand-deep">
                  {t(`landing.roi.rows.${row}.after`)}
                </div>
              </div>
            ))}
          </RevealOnScroll>

          <RevealOnScroll
            delayClassName="motion-safe:[transition-delay:200ms]"
            className="mx-auto mt-8 max-w-xl text-center text-[17px] font-semibold text-brand-deep-dark"
          >
            {t('landing.roi.closing')}
          </RevealOnScroll>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="relative w-full py-20 px-4 lg:px-6 bg-white">
        <div className="mx-auto max-w-6xl">
          <RevealOnScroll className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-brand-deep-dark text-[32px] font-black leading-tight lg:text-[48px] md:text-[38px]">
              {t('landing.plans.title')}
            </h2>
            <p className="mt-4 text-[16px] text-[#565656] lg:text-[20px]">
              {t('landing.plans.subtitle')}
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
                      {t('landing.plans.popular')}
                    </span>
                  )}
                  <CardContent className="flex h-full flex-col p-0">
                    <h3 className="text-xl font-semibold text-brand-deep-dark">{planText(plan).name}</h3>
                    <p className="mt-1 text-sm text-gray-500">{planText(plan).tagline}</p>
                    <div className="mt-4 flex items-end gap-1">
                      <span className="text-4xl font-extrabold text-brand-deep-dark">
                        R${plan.price}
                      </span>
                      <span className="mb-1 text-sm text-gray-500">{t('billingUpgrade.perMonth')}</span>
                    </div>
                    <ul className="mt-6 flex-1 space-y-2.5">
                      {planText(plan).features.map((feature) => (
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
                      <Link href="/register" onClick={aoClicarCta("planos")}>{t('landing.plans.cta')}</Link>
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
              {t('landing.faq.kicker')}
            </span>
            <h2 className="text-brand-deep-dark text-[32px] font-black leading-tight lg:text-[42px] md:text-[36px]">
              {t('landing.faq.title')}
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
              <div>
                {t(isMobile ? 'landing.ctaSection.titleMobile' : 'landing.ctaSection.titleDesktop')
                  .split('\n')
                  .map((line: string) => (
                    <p key={line} className={line.startsWith('<hl>') ? 'text-brand-deep' : 'text-[#565656]'}>
                      {line.replace(/<\/?hl>/g, '')}
                    </p>
                  ))}
              </div>
            </h2>
          </RevealOnScroll>
          <RevealOnScroll delayClassName="motion-safe:[transition-delay:160ms]">
            {isMobile ? (
              <p className="mb-10 max-w-2xl mx-auto relative z-10 text-[18px] text-[#565656] lg:text-[28px] md:text-[28px] sm:text-[18px]">
                {t('landing.ctaSection.textMobile').split('\n').map((line: string) => (
                  <p key={line}>{line}</p>
                ))}
              </p>
            ) : (
              <p className="mb-10 max-w-2xl mx-auto relative z-10 text-[18px] text-[#565656] lg:text-[28px] md:text-[28px] sm:text-[18px]">
                {t('landing.ctaSection.text')}
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
              <Link href="/register" onClick={aoClicarCta("rodape")}>
                {t('landing.ctaStart')}
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
            {t('landing.footer.resources')}
          </Link>
          <div className="w-0.5 h-5 bg-gray-600 lg:w-0.5 lg:h-7" />
          <Link
            href="#planos"
            className="text-[16px] text-brand-deep hover:text-brand-deep/80 transition-colors lg:text-[22px] md:text-[22px] sm:text-[16px]"
          >
            {t('landing.footer.plans')}
          </Link>
          <div className="w-0.5 h-5 bg-gray-600 lg:w-0.5 lg:h-7" />
          <Link
            href="#faq"
            className="text-[16px] text-brand-deep hover:text-brand-deep/80 transition-colors lg:text-[22px] md:text-[22px] sm:text-[16px]"
          >
            {t('landing.footer.faq')}
          </Link>
          <div className="w-0.5 h-5 bg-gray-600 lg:w-0.5 lg:h-7" />
          <Link
            href="/politicas-uso"
            className="text-[16px] text-brand-deep hover:text-brand-deep/80 transition-colors lg:text-[22px] md:text-[22px] sm:text-[16px]"
          >
            {t('landing.footer.policies')}
          </Link>
          <div className="w-0.5 h-5 bg-gray-600 lg:w-0.5 lg:h-7" />
          <Link
            href="/termos-servicos-aplicativo"
            className="text-[16px] text-brand-deep hover:text-brand-deep/80 transition-colors lg:text-[22px] md:text-[22px] sm:text-[16px]"
          >
            {t('landing.footer.terms')}
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
            alt={t('landing.footer.playAlt')}
            width={180}
            height={53}
            className="h-13.25 w-auto"
          />
        </Link>
        <p className="text-[16px] text-[#565656] lg:text-[22px] md:text-[22px] sm:text-[16px]">
          {t('landing.footer.rights', { year: new Date().getFullYear() })}
        </p>
      </footer>
    </main>
  );
}
