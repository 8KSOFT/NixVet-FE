import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoColored } from "@/components/shared/componentizedImages/LogoColored";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 text-center">
      <LogoColored width="220px" className="inline-block" />
      <div className="space-y-2">
        <p className="text-sm font-semibold tracking-wide text-brand-deep">
          Erro 404
        </p>
        <h1 className="text-2xl font-bold text-[#0e1e2f] sm:text-3xl">
          Página não encontrada
        </h1>
        <p className="max-w-md text-sm text-gray-500 sm:text-base">
          O link que você acessou não existe ou foi movido. Volte para a
          página inicial do NixVetApp.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/">Voltar para o início</Link>
      </Button>
    </main>
  );
}
