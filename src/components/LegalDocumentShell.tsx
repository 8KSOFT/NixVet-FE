import Link from 'next/link';
import { LogoColored } from '@/components/shared/componentizedImages/LogoColored';

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
    <div className="min-h-screen bg-[#eef7f3] text-brand-deep-dark/90">
      <div className="bg-brand-deep px-4 pb-24 pt-6 md:pt-10">
        <header className="mx-auto flex max-w-4xl items-center justify-between rounded-full bg-white/95 py-2.5 pl-5 pr-3 shadow-xl">
          <Link href="/" aria-label="NixVetApp — início">
            <LogoColored width="150px" height="32px" />
          </Link>
          <nav className="flex items-center gap-1 text-sm font-semibold">
            <Link
              href="/politicas-uso"
              className="hidden rounded-full px-3 py-2 text-brand-deep-dark/70 transition-colors hover:bg-brand-deep/10 hover:text-brand-deep-dark sm:block"
            >
              Políticas de uso
            </Link>
            <Link
              href="/termos-servicos-aplicativo"
              className="hidden rounded-full px-3 py-2 text-brand-deep-dark/70 transition-colors hover:bg-brand-deep/10 hover:text-brand-deep-dark sm:block"
            >
              Termos
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-brand-deep/10 px-4 py-2 text-brand-deep transition-colors hover:bg-brand-deep/20"
            >
              Entrar
            </Link>
          </nav>
        </header>

        <div className="mx-auto mt-12 max-w-4xl px-2 md:mt-16">
          <h1 className="font-heading text-3xl font-black leading-tight text-white md:text-5xl">{title}</h1>
          <p className="mt-4 inline-block rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[13px] font-semibold text-white">
            Última atualização: {lastUpdated}
          </p>
        </div>
      </div>

      <main className="mx-auto -mt-14 max-w-4xl px-4 pb-16">
        <article
          className={[
            'space-y-8 rounded-2xl border border-brand-deep/15 bg-white p-6 text-[15px] leading-relaxed shadow-[0_20px_45px_rgba(18,179,127,0.12)] md:p-10',
            '[&_h2]:border-l-4 [&_h2]:border-brand-deep [&_h2]:pl-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:leading-snug [&_h2]:text-brand-deep-dark',
            '[&_strong]:font-semibold [&_strong]:text-brand-deep-dark',
            '[&_li]:marker:text-brand-deep',
            '[&_a]:font-semibold [&_a]:text-brand-deep [&_a]:underline-offset-2 hover:[&_a]:underline',
          ].join(' ')}
        >
          {children}
        </article>
      </main>

      <footer className="bg-brand-deep-dark py-8 text-center text-sm text-white/70">
        <p className="mb-2">NixVetApp © {new Date().getFullYear()} — 8KSOFT Tecnologia da Informação LTDA</p>
        <Link href="/" className="font-semibold text-white hover:underline">
          Voltar ao início
        </Link>
      </footer>
    </div>
  );
}
