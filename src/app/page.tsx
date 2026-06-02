"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { HeaderComponent } from "@/components/shared/HeaderComponent";
import { LogoCompactoDynamic } from "@/components/shared/componentizedImages/LogoCompactoDynamic";
import { DogDynamic } from "@/components/shared/componentizedImages/DogDynamic";
import { LogoCompletoDynamic } from "@/components/shared/componentizedImages/LogoCompletoDynamic";
import type { LandingPageFeature } from "@/app/types/LandingPageFeature";
import { RevealOnScroll } from "@/components/shared/RevealOnScroll";
import { useIsMobile } from "@/hooks/use-mobile";
import { DogbackDynamic } from "@/components/shared/componentizedImages/DogbackDynamic";

const FEATURES: LandingPageFeature[] = [
  {
    iconBackgroundClassName: "bg-orange-50 text-blue-500",
    title: "Gestão Clínica",
    description:
      "Prontuário completo com anamnese, histórico e exame físico. Tudo organizado por paciente e tutor.",
  },
  {
    iconBackgroundClassName: "bg-blue-50 text-blue-600",
    title: "Segurança LGPD",
    description:
      "Dados sensíveis criptografados (AES-256), consentimento de tutores e logs de auditoria completos.",
  },
  {
    iconBackgroundClassName: "bg-orange-50 text-blue-500",
    title: "Docs Inteligentes",
    description:
      "Receitas e solicitações de exames em PDF com assinatura digital e envio automático por e-mail.",
  },
];

const FEATURE_ANIMATION_DELAY_CLASS_NAMES = [
  "motion-safe:[transition-delay:80ms]",
  "motion-safe:[transition-delay:160ms]",
  "motion-safe:[transition-delay:240ms]",
];

export default function LandingPage() {
  const isMobile = useIsMobile();
  const isTablet = useIsMobile(958);
  const isTinyScreen = useIsMobile(500);

  return (
    <main className="overflow-hidden">
      <HeaderComponent width="80%" height="80%" />
      {/* Hero */}
      <section className="relative flex h-screen min-h-175 items-start justify-start bg-brand-deep">
        <div className="absolute top-10 -right-115 rotate-7 z-0 w-[80vw] max-w-225 min-w-185 opacity-7 pointer-events-none select-none md:w-[50vw] sm:w-[50vw] lg:top-10 md:top-10 sm:top-10 lg:-right-30 md:-right-30 sm:-right-30">
          <div className="motion-safe:animate-[nix-float-slow_10s_ease-in-out_infinite] motion-safe:will-change-transform invert">
            <LogoCompactoDynamic
              width={isTablet ? (isMobile ? "50%" : "80%") : "80%"}
              height={isTablet ? (isMobile ? "50%" : "80%") : "80%"}
            />
          </div>
        </div>
        <div className="relative flex flex-col justify-between h-[calc(100%-200px)] w-[90%] top-40 z-10 mx-auto lg:top-55 md:top-40 sm:top-40 lg:w-[80%] md:w-[80%] sm:w-[80%] lg:h-fit lg:justify-start md:justify-start sm:justify-start">
          <div>
            <RevealOnScroll>
              <h1 className="flex flex-col text-white mb-6 text-5xl md:text-7xl sm:text-6xl font-extrabold tracking-wide leading-thight">
                Gestão <p>Veterinária</p>
                <span className="text-white/65 bg-clip-text">
                  Profissional <p> e Segura</p>
                </span>
              </h1>
            </RevealOnScroll>
            <RevealOnScroll delayClassName="motion-safe:[transition-delay:140ms] w-[90%]">
              <p className="text-[16px] text-white/95 tracking-normal mb-12 max-w-100 lg:text-[24px] md:text-[24px] sm:text-[18px] lg:w-150 md:w-150 sm:w-md lg:max-w-150 md:max-w-150 sm:max-w-md">
                Simplifique sua rotina clínica com o NixVetApp. Prontuários
                eletrônicos, receitas digitais inteligentes e conformidade LGPD
                em uma interface moderna.
              </p>
            </RevealOnScroll>
          </div>
          <RevealOnScroll
            delayClassName="motion-safe:[transition-delay:260ms]"
            className="w-full flex flex-col items-center lg:flex lg:items-start md:flex md:items-start sm:flex sm:items-start"
          >
            <div className="flex flex-col sm:flex-row justify-center gap-4 lg:gap-6">
              <Button
                asChild
                size="lg"
                className="group w-60 h-13 p-0 pl-5 pr-1 text-[16px] rounded-full text-sm font-medium text-brand-deep bg-white shadow-sm hover:bg-white/90 transition-colors active:bg-white/80"
              >
                <Link
                  href="/login"
                  className="flex items-center justify-between"
                >
                  <span>Começar Agora</span>
                  <div className="flex items-center justify-center size-11 rounded-full bg-brand-deep text-white transition-colors group-hover:bg-brand-deep-dark/80">
                    <ArrowRight className="size-8" />
                  </div>
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-13 px-5 text-[16px] text-white/90 bg-brand-deep-orange border-none rounded-full hover:text-white hover:bg-brand-deep-orange/90 transition-colors"
              >
                Agendar Demonstração
              </Button>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <section className="relative w-full h-fit min-h-screen py-16 md:py-24 flex flex-col items-center justify-start bg-brand-deep gap-12 md:gap-20">
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
                <h2 className="text-white font-['InterDoFigma'] font-extralight text-[22px]">
                  <span>Tecnologia de ponta</span>
                  <p> desenvolvida para otimizar</p>
                  <p>cada aspecto da sua clínica</p>
                </h2>
              ) : (
                <h2 className="text-white font-['InterDoFigma'] font-extralight text-[25px] lg:text-[25px] md:text-[20px] sm:text-[18px]">
                  <span>Tecnologia de ponta desenvolvida para</span>
                  <p>otimizar cada aspecto da sua clínica</p>
                </h2>
              )}
            </RevealOnScroll>
          </div>

          {/* Container das imagens (Controlado pelo fluxo do Flexbox) */}
          <div className="relative order-1 -mt-15 z-10 w-fit max-w-70 sm:max-w-none flex justify-center pointer-events-none select-none sm:mt-0 lg:order-2 md:order-2 sm:order-2">
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
        <div className="relative z-10 w-full sm:w-[85%] px-[20px]">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
            {FEATURES.map((feature, featureIndex) => {
              const transitionDelayClassName =
                FEATURE_ANIMATION_DELAY_CLASS_NAMES[featureIndex] ?? "";
              return (
                <RevealOnScroll
                  key={feature.title}
                  delayClassName={transitionDelayClassName}
                  className=""
                >
                  <Card className="group w-full min-h-54 h-fit rounded-2xl shadow-sm transition-all duration-300 hover:border-primary/20 hover:shadow-md hover:-translate-y-1 lg:w-90 md:w-75 sm:w-75 min-[500px]:w-75">
                    <CardContent className="p-6 flex flex-col gap-4">
                      <h4 className="font-semibold text-[22px] text-brand-deep-dark mb-1">
                        {feature.title}
                      </h4>
                      <p className="text-gray-500 leading-relaxed text-md">
                        {feature.description}
                      </p>
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

      {/* CTA */}
      <section className="py-20 px-0 lg:px-6">
        <div className="relative flex flex-col items-center mx-auto max-w-5xl overflow-hiddenc px-2 py-12 text-center lg:p-12">
          <RevealOnScroll>
            <h2 className="text-brand-deep mb-6 text-[32px] font-['InterDoFigma'] font-black relative word-spacing-wide leading-tight lg:text-[68px] md:text-[42px] sm:text-[32px] ">
              <span className="text-[#565656]">
                Pronto para <span className="text-brand-deep">transformar</span>
              </span>
              <p className="text-[#565656]">sua clínica?</p>
            </h2>
          </RevealOnScroll>
          <RevealOnScroll delayClassName="motion-safe:[transition-delay:160ms]">
            {isMobile ? (
              <p className="mb-10 max-w-2xl mx-auto relative z-10 text-[18px] text-[#565656] lg:text-[28px] md:text-[28px] sm:text-[18px]">
                <span>Junte-se a veterinários que já</span>
                <p>modernizaram seus atendimentos</p>
                <p>com o NixVetApp.</p>
              </p>
            ) : (
              <p className="mb-10 max-w-2xl mx-auto relative z-10 text-[18px] text-[#565656] lg:text-[28px] md:text-[28px] sm:text-[18px]">
                Junte-se a veterinários que já modernizaram seus atendimentos
                com o NixVetApp.
              </p>
            )}
          </RevealOnScroll>
          <RevealOnScroll delayClassName="motion-safe:[transition-delay:280ms]">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="group w-60 p-0 pl-5 pr-2 rounded-full flex items-center justify-between text-[20px] text-brand-deep font-medium h-16 shadow-none bg-brand-deep/10 active:bg-brand-deep/30 hover:bg-brand-deep/25 border-none"
            >
              <Link href="/login">
                Começar agora
                <div className="flex items-center justify-center size-12 rounded-full bg-brand-deep text-white transition-colors group-hover:bg-brand-deep-dark/80">
                  <ArrowRight className="size-8" />
                </div>
              </Link>
            </Button>
          </RevealOnScroll>
        </div>
      </section>

      <footer className="text-center bg-white text-gray-500 py-12 border-t-2 border-gray-200/80">
        <div className="mb-4">
          <LogoCompletoDynamic
            width={isMobile ? "200px" : "400px"}
            height=""
            className="inline-block hover:opacity-80 transition-all"
          />
        </div>
        <div className="flex flex-wrap justify-center gap-2 text-sm mb-3">
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
        <p className="text-[16px] text-[#565656] lg:text-[22px] md:text-[22px] sm:text-[16px]">
          NixVetApp ©{new Date().getFullYear()} - Todos os direitos reservados.
        </p>
      </footer>
    </main>
  );
}
