import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Stethoscope, Shield, FileText, Cloud } from 'lucide-react';
import Logo from '@/components/Logo';

const FEATURES = [
  {
    icon: Stethoscope,
    iconBg: 'bg-orange-50 text-blue-500',
    title: 'Gestão Clínica',
    description: 'Prontuário completo com anamnese, histórico e exame físico. Tudo organizado por paciente e tutor.',
  },
  {
    icon: Shield,
    iconBg: 'bg-blue-50 text-blue-600',
    title: 'Segurança LGPD',
    description: 'Dados sensíveis criptografados (AES-256), consentimento de tutores e logs de auditoria completos.',
  },
  {
    icon: FileText,
    iconBg: 'bg-orange-50 text-blue-500',
    title: 'Docs Inteligentes',
    description: 'Receitas e solicitações de exames em PDF com assinatura digital e envio automático por e-mail.',
  },
  {
    icon: Cloud,
    iconBg: 'bg-blue-50 text-blue-600',
    title: 'Arquitetura SaaS',
    description: 'Multi-tenant, escalável e disponível 24/7. Seus dados seguros e acessíveis de qualquer lugar.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-slate-100 bg-white/95 px-6 backdrop-blur-sm md:px-12 supports-[backdrop-filter]:bg-white/90">
        <div className="flex items-center gap-3">
          <Logo width={40} height={40} />
          <span className="text-2xl font-bold text-blue-600 tracking-tight">NixVetApp</span>
        </div>
        <Button asChild size="lg" className="rounded-full px-8">
          <Link href="/login">Acessar Sistema</Link>
        </Button>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#eef6f8] via-[#f8fafc] to-white py-24 px-6 text-center md:px-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                'radial-gradient(ellipse 80% 50% at 50% -20%, rgb(14 116 144 / 0.12), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgb(59 130 246 / 0.08), transparent)',
            }}
            aria-hidden
          />

          <div className="relative z-10 mx-auto max-w-5xl">
            <div className="mb-8 inline-block px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 font-medium text-sm border border-blue-100">
              A plataforma definitiva para veterinários
            </div>
            <h1 className="text-blue-600 mb-6 text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
              Gestão Veterinária <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-500">
                Profissional e Segura
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              Simplifique sua rotina clínica com o NixVetApp. Prontuários eletrônicos,
              receitas digitais inteligentes e conformidade LGPD em uma interface moderna.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild size="lg" className="h-14 rounded-full px-10 text-lg">
                <Link href="/login">Começar Agora</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-10 text-lg rounded-full">
                Agendar Demonstração
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-blue-600 text-3xl md:text-4xl font-bold">Por que escolher o NixVetApp?</h2>
            <p className="text-gray-500 text-xl max-w-2xl mx-auto mt-4">
              Tecnologia de ponta desenvolvida para otimizar cada aspecto da sua clínica.
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
                    <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${feature.iconBg}`}>
                      <Icon className="size-7" />
                    </div>
                    <h4 className="font-semibold text-base mb-3">{feature.title}</h4>
                    <p className="text-gray-600 leading-relaxed text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d7b94] to-[#0a5f72] p-12 text-center text-white shadow-lg md:p-20">
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                background: 'radial-gradient(circle at 90% 10%, rgba(255,255,255,0.15), transparent 45%)',
              }}
              aria-hidden
            />

            <h2 className="text-white mb-6 text-3xl md:text-5xl font-bold relative z-10">
              Pronto para transformar sua clínica?
            </h2>
            <p className="mb-10 max-w-2xl mx-auto relative z-10 text-xl leading-relaxed text-white/90">
              Junte-se a veterinários que já modernizaram seus atendimentos com o NixVetApp.
            </p>
            <Button asChild size="lg" variant="secondary" className="h-14 px-12 text-lg rounded-full shadow-lg relative z-10">
              <Link href="/login">Acessar Plataforma</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="text-center bg-white text-gray-500 py-12 border-t border-gray-100">
        <div className="mb-4">
          <Logo width={32} height={32} className="inline-block opacity-50 grayscale hover:grayscale-0 transition-all" />
        </div>
        <div className="flex flex-wrap justify-center gap-4 text-sm mb-3">
          <Link href="/politicas-uso" className="text-blue-600 hover:underline">
            Políticas de uso
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/termos-servicos-aplicativo" className="text-blue-600 hover:underline">
            Termos do aplicativo
          </Link>
        </div>
        <p>NixVetApp ©{new Date().getFullYear()} - Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
