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
      <header className="flex items-center justify-between px-6 md:px-12 bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-50 h-20 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <Logo width={40} height={40} />
          <span className="text-2xl font-bold text-blue-600 tracking-tight">NixVetApp</span>
        </div>
        <Link href="/login">
          <Button size="lg" className="rounded-full px-8">
            Acessar Sistema
          </Button>
        </Link>
      </header>

      <main>
        {/* Hero */}
        <section className="bg-gradient-to-b from-[#f0f5ff] to-white py-24 px-6 md:px-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-70" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-100 rounded-full mix-blend-multiply filter blur-xl opacity-70" />

          <div className="max-w-5xl mx-auto relative z-10">
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
              <Link href="/login">
                <Button size="lg" className="h-14 px-10 text-lg rounded-full hover:scale-105 transition-transform">
                  Começar Agora
                </Button>
              </Link>
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
                <Card key={feature.title} className="h-full shadow-sm hover:shadow-xl transition-all duration-300 border-gray-100 rounded-2xl group">
                  <CardContent className="pt-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${feature.iconBg}`}>
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
          <div className="max-w-5xl mx-auto bg-blue-600 rounded-3xl p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <h2 className="text-white mb-6 text-3xl md:text-5xl font-bold relative z-10">
              Pronto para transformar sua clínica?
            </h2>
            <p className="mb-10 max-w-2xl mx-auto relative z-10 text-xl leading-relaxed text-white/90">
              Junte-se a veterinários que já modernizaram seus atendimentos com o NixVetApp.
            </p>
            <Link href="/login" className="relative z-10">
              <Button size="lg" variant="secondary" className="h-14 px-12 text-lg rounded-full shadow-lg">
                Acessar Plataforma
              </Button>
            </Link>
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
