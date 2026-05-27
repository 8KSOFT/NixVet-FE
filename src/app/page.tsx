import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Stethoscope,
  Shield,
  FileText,
  Cloud,
  LucideArrowRight,
  DecimalsArrowRight,
  ArrowRight,
  MoveRight,
  MoveRightIcon,
  LucideMoveRight,
} from "lucide-react";
import Logo from "@/components/Logo";
import { HeaderComponent } from "@/components/shared/HeaderComponent";
import { LogoCompactoDynamic } from "@/components/shared/LogoCompactoDynamic";

const FEATURES = [
  {
    icon: Stethoscope,
    iconBg: "bg-orange-50 text-blue-500",
    title: "Gestão Clínica",
    description:
      "Prontuário completo com anamnese, histórico e exame físico. Tudo organizado por paciente e tutor.",
  },
  {
    icon: Shield,
    iconBg: "bg-blue-50 text-blue-600",
    title: "Segurança LGPD",
    description:
      "Dados sensíveis criptografados (AES-256), consentimento de tutores e logs de auditoria completos.",
  },
  {
    icon: FileText,
    iconBg: "bg-orange-50 text-blue-500",
    title: "Docs Inteligentes",
    description:
      "Receitas e solicitações de exames em PDF com assinatura digital e envio automático por e-mail.",
  },
  {
    icon: Cloud,
    iconBg: "bg-blue-50 text-blue-600",
    title: "Arquitetura SaaS",
    description:
      "Multi-tenant, escalável e disponível 24/7. Seus dados seguros e acessíveis de qualquer lugar.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <main>
        <HeaderComponent width="80%" height="80%" />
        {/* Hero */}
        <section className="relative h-screen overflow-hidden flex items-center justify-start bg-brand-deep">
          <div className="absolute invert top-10 right-10 rotate-10 z-0 w-[120vw] h-[120vw] md:w-[70vw] md:h-[70vw] max-w-225 max-h-225 opacity-10 pointer-events-none select-none">
            <LogoCompactoDynamic width="100%" height="80%" />
          </div>
          <div className="relative w-[80%] z-10 mx-auto">
            <div className="flex flex-col w-full items-start">
              <h1 className="flex flex-col text-white mb-6 text-5xl md:text-7xl font-extrabold tracking-wide leading-thight">
                Gestão <p>Veterinária</p>
                <span className="text-white/65 bg-clip-text">
                  Profissional <p> e Segura</p>
                </span>
              </h1>
              <p className="text-[23px] text-white/95 tracking-normal mb-12 max-w-146">
                Simplifique sua rotina clínica com o NixVetApp. Prontuários
                eletrônicos, receitas digitais inteligentes e conformidade LGPD
                em uma interface moderna.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-8">
                <Button
                  asChild
                  size="lg"
                  className="h-12 p-0 pl-5 pr-1 rounded-full text-sm font-bold text-brand-deep bg-white shadow-sm hover:bg-white/90 transition-colors"
                >
                  <Link
                    href="/login"
                    className="flex items-center justify-between"
                  >
                    <span>Começar Agora</span>
                    <div className="flex items-center justify-center size-10 rounded-full bg-brand-deep text-white transition-colors group-hover:bg-green-700">
                      <ArrowRight className="size-6" />
                    </div>
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-5 text-sm text-white bg-brand-deep-orange border-none rounded-full"
                >
                  Agendar Demonstração
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-blue-600 text-3xl md:text-4xl font-bold">
              Por que escolher o NixVetApp?
            </h2>
            <p className="text-gray-500 text-xl max-w-2xl mx-auto mt-4">
              Tecnologia de ponta desenvolvida para otimizar cada aspecto da sua
              clínica.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="group h-full rounded-2xl border-gray-100 shadow-sm transition-colors duration-200 hover:border-primary/20 hover:shadow-md"
                >
                  <CardContent className="pt-6">
                    <div
                      className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${feature.iconBg}`}
                    >
                      <Icon className="size-7" />
                    </div>
                    <h4 className="font-semibold text-base mb-3">
                      {feature.title}
                    </h4>
                    <p className="text-gray-600 leading-relaxed text-sm">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-linear-to-br from-[#0d7b94] to-[#0a5f72] p-12 text-center text-white shadow-lg md:p-20">
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                background:
                  "radial-gradient(circle at 90% 10%, rgba(255,255,255,0.15), transparent 45%)",
              }}
              aria-hidden
            />

            <h2 className="text-white mb-6 text-3xl md:text-5xl font-bold relative z-10">
              Pronto para transformar sua clínica?
            </h2>
            <p className="mb-10 max-w-2xl mx-auto relative z-10 text-xl leading-relaxed text-white/90">
              Junte-se a veterinários que já modernizaram seus atendimentos com
              o NixVetApp.
            </p>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="h-14 px-12 text-lg rounded-full shadow-lg relative z-10"
            >
              <Link href="/login">Acessar Plataforma</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="text-center bg-white text-gray-500 py-12 border-t border-gray-100">
        <div className="mb-4">
          <Logo
            width={32}
            height={32}
            className="inline-block opacity-50 grayscale hover:grayscale-0 transition-all"
          />
        </div>
        <div className="flex flex-wrap justify-center gap-4 text-sm mb-3">
          <Link href="/politicas-uso" className="text-blue-600 hover:underline">
            Políticas de uso
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            href="/termos-servicos-aplicativo"
            className="text-blue-600 hover:underline"
          >
            Termos do aplicativo
          </Link>
        </div>
        <p>
          NixVetApp ©{new Date().getFullYear()} - Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
