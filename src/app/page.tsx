import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { HeaderComponent } from '@/components/shared/HeaderComponent';
import { LogoCompactoDynamic } from '@/components/shared/componentizedImages/LogoCompactoDynamic';
import { DogDynamic } from '@/components/shared/componentizedImages/DogDynamic';
import { LogoCompletoDynamic } from '@/components/shared/componentizedImages/LogoCompletoDynamic';
import type { LandingPageFeature } from '@/app/types/LandingPageFeature';
import { RevealOnScroll } from '@/components/shared/RevealOnScroll';

const FEATURES: LandingPageFeature[] = [
  {
    iconBackgroundClassName: 'bg-orange-50 text-blue-500',
    title: 'Gestão Clínica',
    description: 'Prontuário completo com anamnese, histórico e exame físico. Tudo organizado por paciente e tutor.',
  },
  {
    iconBackgroundClassName: 'bg-blue-50 text-blue-600',
    title: 'Segurança LGPD',
    description: 'Dados sensíveis criptografados (AES-256), consentimento de tutores e logs de auditoria completos.',
  },
  {
    iconBackgroundClassName: 'bg-orange-50 text-blue-500',
    title: 'Docs Inteligentes',
    description: 'Receitas e solicitações de exames em PDF com assinatura digital e envio automático por e-mail.',
  },
];

const FEATURE_ANIMATION_DELAY_CLASS_NAMES = [
  'motion-safe:[transition-delay:80ms]',
  'motion-safe:[transition-delay:160ms]',
  'motion-safe:[transition-delay:240ms]',
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <main>
        <HeaderComponent width="80%" height="80%" />
        {/* Hero */}
        <section className="relative h-screen flex items-start justify-start bg-brand-deep">
          <div className="absolute invert top-0 right-10 rotate-6 z-0 w-[120vw] h-[120vw] md:w-[70vw] md:h-[70vw] max-w-225 max-h-225 opacity-7 pointer-events-none select-none">
            <div className="motion-safe:animate-[nix-float-slow_10s_ease-in-out_infinite] motion-safe:will-change-transform">
              <LogoCompactoDynamic width="100%" height="80%" />
            </div>
          </div>
          <div className="relative w-[80%] top-55 z-10 mx-auto">
            <div className="flex flex-col w-full items-start">
              <RevealOnScroll>
                <h1 className="flex flex-col text-white mb-6 text-5xl md:text-7xl font-extrabold tracking-wide leading-thight">
                  Gestão <p>Veterinária</p>
                  <span className="text-white/65 bg-clip-text">
                    Profissional <p> e Segura</p>
                  </span>
                </h1>
              </RevealOnScroll>
              <RevealOnScroll delayClassName="motion-safe:[transition-delay:140ms]">
                <p className="text-[24px] text-white/95 tracking-normal mb-12 max-w-148">
                  Simplifique sua rotina clínica com o NixVetApp. Prontuários eletrônicos, receitas digitais
                  inteligentes e conformidade LGPD em uma interface moderna.
                </p>
              </RevealOnScroll>
              <RevealOnScroll delayClassName="motion-safe:[transition-delay:260ms]">
                <div className="flex flex-col sm:flex-row justify-center gap-8">
                  <Button
                    asChild
                    size="lg"
                    className="group h-13 p-0 pl-5 pr-1 text-[16px] rounded-full text-sm font-medium text-brand-deep bg-white shadow-sm hover:bg-white/90 transition-colors active:bg-white/80"
                  >
                    <Link href="/login" className="flex items-center justify-between">
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
          </div>
        </section>

        <section className="relative h-screen flex flex-col items-start justify-start bg-brand-deep">
          <div className="absolute -top-30 right-20 z-10 w-200 pointer-events-none select-none">
            <div className="motion-safe:animate-[nix-float-slow_9s_ease-in-out_infinite] motion-safe:will-change-transform">
              <DogDynamic width="100%" height="100%" className="" />
            </div>
          </div>
          {/* Quadro escuro com degradê vertical e bordas suavizadas/esmaecidas */}
          <div className="absolute top-5 -left-70 w-[90%] h-200 rounded-[45px] bg-linear-to-b from-black/27 to-transparent blur-sm pointer-events-none" />
          <div className="relative w-[50%] top-25 -left-20 z-10 mx-auto">
            <RevealOnScroll>
              <h1 className="text-white text-[65px] font-bold leading-tight mb-6">
                <span>Por que escolher</span>
                <p>o NixVetApp?</p>
              </h1>
            </RevealOnScroll>
            <RevealOnScroll delayClassName="motion-safe:[transition-delay:140ms]">
              <h2 className="relative text-white font-['InterDoFigma'] font-extralight text-[28px]">
                <span>Tecnologia de ponta desenvolvida para</span>
                <p>otimizar cada aspecto da sua clínica.</p>
              </h2>
            </RevealOnScroll>
          </div>

          <div className="relative w-[80%] top-75 z-10 mx-auto">
            <div className="flex items-center justify-center gap-8">
              {FEATURES.map((feature, featureIndex) => {
                const transitionDelayClassName = FEATURE_ANIMATION_DELAY_CLASS_NAMES[featureIndex] ?? '';
                return (
                  <RevealOnScroll key={feature.title} delayClassName={transitionDelayClassName}>
                    <Card className="group w-96 h-65 rounded-2xl shadow-sm transition-all duration-300 hover:border-primary/20 hover:shadow-md hover:-translate-y-1">
                      <CardContent className="pt-6 flex flex-col gap-4">
                        <h4 className="font-semibold text-[22px] text-brand-deep-dark mb-3">{feature.title}</h4>
                        <p className="text-gray-500 leading-relaxed text-md">{feature.description}</p>
                      </CardContent>
                    </Card>
                  </RevealOnScroll>
                );
              })}
            </div>
          </div>

          {/* CONTAINER DA BARRIGA CENTRALIZADA */}
          <div className="absolute bottom-0 left-0 w-full pointer-events-none z-20 flex flex-col items-center transform translate-y-[99%]">
            {/* 2. O SVG da barriguinha com transição suave (Cúbica) */}
            <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="w-87.5 h-12.5 block">
              {/* Explicação do Path (D):
      M 0,0     -> Começa no topo esquerdo.
      C ...     -> Curva Cúbica com dois pontos de controle:
                   - 125,0   : Mantém o início plano perto da linha reta (ombro esquerdo).
                   - 125,150 : Direciona a descida para a profundidade máxima.
                   - 250,150 : Chega ao centro exato da barriga (fundo).
      S ...     -> Curva Cúbica espelhada automaticamente para subir:
                   - 375,0   : Controla a suavidade da saída e o ombro direito.
                   - 500,0   : Termina no topo direito.
      Z         -> Fecha o path.
    */}
              <path d="M0,0 C125,0 125,150 250,150 S375,0 500,0 Z" className="fill-brand-deep" />
            </svg>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6 ">
          <div className="relative flex flex-col items-center mx-auto max-w-5xl overflow-hiddenc p-12 text-center">
            <RevealOnScroll>
              <h2 className="text-brand-deep mb-6 text-[68px] font-bold relative leading-tight">
                <span className="text-[#565656]">
                  Pronto para <span className="text-brand-deep">transformar</span>
                </span>
                <p className="text-[#565656]">sua clínica?</p>
              </h2>
            </RevealOnScroll>
            <RevealOnScroll delayClassName="motion-safe:[transition-delay:160ms]">
              <p className="mb-10 max-w-2xl mx-auto relative z-10 text-[28px] text-[#565656]">
                Junte-se a veterinários que já modernizaram seus atendimentos com o NixVetApp.
              </p>
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
      </main>

      <footer className="text-center bg-white text-gray-500 py-12 border-t-2 border-gray-200/80">
        <div className="mb-4">
          <LogoCompletoDynamic width="400px" height="" className="inline-block hover:opacity-80 transition-all" />
        </div>
        <div className="flex flex-wrap justify-center gap-2 text-sm mb-3">
          <Link
            href="/politicas-uso"
            className="text-[22px] text-brand-deep hover:text-brand-deep/80 transition-colors"
          >
            Políticas de uso
          </Link>
          <div className="w-0.5 h-7 bg-gray-600" />
          <Link
            href="/termos-servicos-aplicativo"
            className="text-[22px] text-brand-deep hover:text-brand-deep/80 transition-colors"
          >
            Termos do aplicativo
          </Link>
        </div>
        <p className="text-[22px] text-[#565656]">
          NixVetApp ©{new Date().getFullYear()} - Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
