import Link from 'next/link';
import Logo from '@/components/Logo';

export default function LegalDocumentShell({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-700">
            <Logo width={36} height={36} alt="NixVetApp" />
            <span>NixVetApp</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/politicas-uso" className="text-slate-600 hover:text-blue-600">
              Políticas de uso
            </Link>
            <Link href="/termos-servicos-aplicativo" className="text-slate-600 hover:text-blue-600">
              Termos
            </Link>
            <Link href="/login" className="text-slate-600 hover:text-blue-600">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-2 text-2xl font-bold text-slate-900 md:text-3xl">{title}</h1>
        <p className="mb-8 text-sm text-slate-500">Última atualização: {lastUpdated}</p>
        <article className="space-y-6 text-[15px] leading-relaxed text-slate-700">{children}</article>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
        <p className="mb-2">NixVetApp © {new Date().getFullYear()}</p>
        <Link href="/" className="text-blue-600 hover:underline">
          Voltar ao início
        </Link>
      </footer>
    </div>
  );
}
