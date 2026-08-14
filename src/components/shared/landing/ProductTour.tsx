"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

function BrowserFrame({
  url,
  children,
}: {
  url: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-white shadow-[0_20px_50px_rgba(14,30,47,0.09)] sm:rounded-2xl">
      <div className="flex items-center gap-1.5 border-b border-border bg-gray-50 px-3 py-2.5 sm:gap-2 sm:px-4 sm:py-3">
        <span className="size-2 rounded-full bg-[#ff5f57] sm:size-2.5" />
        <span className="size-2 rounded-full bg-[#febc2e] sm:size-2.5" />
        <span className="size-2 rounded-full bg-[#28c840] sm:size-2.5" />
        <span className="ml-2 truncate rounded-md border border-border bg-white px-2 py-1 text-[11px] text-gray-500 sm:ml-3 sm:px-2.5 sm:text-xs">
          {url}
        </span>
      </div>
      {children}
    </div>
  );
}

function Caption({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-center text-[14.5px] font-medium text-gray-500">{children}</p>;
}

/** As telas são print de desktop de propósito (mais informação, layout mais
 * bonito que a versão mobile do app) — então no celular, em vez de encolher
 * tudo até virar ilegível, deixa no tamanho legível e permite arrastar de
 * lado pra ver o resto, como uma foto real de tela de computador. A partir
 * do sm a viewport já é larga o bastante e o scroll nem entra em ação.
 * A sidebar do app já foi recortada do arquivo (era 223px fixos repetidos
 * nos 5 prints, e no celular a rolagem nascia exatamente em cima dela) —
 * o que sobra é só o conteúdo de cada contexto. */
function ScreenshotImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      key={src}
      className="overflow-x-auto overscroll-x-contain motion-safe:animate-[nix-tab-fade-in_320ms_ease-out] [-webkit-overflow-scrolling:touch] sm:overflow-visible"
    >
      <Image
        src={src}
        alt={alt}
        width={1377}
        height={788}
        className="h-auto w-140 max-w-none sm:w-full"
        sizes="(max-width: 896px) 100vw, 896px"
      />
    </div>
  );
}

type TourShot = { src: string; alt: string };

type TourTab = {
  value: string;
  label: string;
  url: string;
  caption: string;
  shots: TourShot[];
};

/** Quando uma aba tem mais de um print, vira um carrossel simples (setas +
 * bolinhas) dentro do mesmo BrowserFrame — em vez de escolher só um e
 * descartar o outro. */
function TourShots({ url, shots }: { url: string; shots: TourShot[] }) {
  const [index, setIndex] = useState(0);
  const hasMultiple = shots.length > 1;
  const shot = shots[index];

  return (
    <div className="relative">
      <BrowserFrame url={url}>
        <ScreenshotImage src={shot.src} alt={shot.alt} />
      </BrowserFrame>

      {hasMultiple && (
        <>
          {/* Sempre dentro da moldura (nunca "pendurada" pra fora) — no
              celular, uma seta a cavalo da borda ficava cortada ou saía da
              viewport; assim funciona igual em qualquer tamanho de tela. */}
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + shots.length) % shots.length)}
            aria-label="Print anterior"
            className="absolute inset-y-0 left-1.5 z-10 my-auto flex size-10 items-center justify-center rounded-full border border-border bg-white/90 text-gray-600 shadow-md backdrop-blur-sm transition-colors hover:bg-white sm:left-3"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % shots.length)}
            aria-label="Próximo print"
            className="absolute inset-y-0 right-1.5 z-10 my-auto flex size-10 items-center justify-center rounded-full border border-border bg-white/90 text-gray-600 shadow-md backdrop-blur-sm transition-colors hover:bg-white sm:right-3"
          >
            <ChevronRight className="size-5" />
          </button>

          <div className="mt-4 flex items-center justify-center gap-2">
            {shots.map((s, i) => (
              <button
                key={s.src}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ver print ${i + 1}`}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === index ? "w-6 bg-brand-deep-dark" : "w-2 bg-gray-300 hover:bg-gray-400",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const TABS: TourTab[] = [
  {
    value: "prontuario",
    label: "Prontuário",
    url: "app.nixvetapp.com/medical-records/prontuario/duke",
    caption: "Histórico completo, sem papel perdido.",
    shots: [
      {
        src: "/landing/screenshot-prontuario-detalhe.jpg",
        alt: "Prontuário do paciente Duke no NixVetApp, com dados da tutora, espécie, raça, idade, peso, 12 fichas de atendimento e linha do tempo",
      },
      {
        src: "/landing/screenshot-prontuario-lista.jpg",
        alt: "Lista de prontuários do NixVetApp em formato de pastas, uma por paciente, com contagem de fichas de cada um",
      },
    ],
  },
  {
    value: "agenda",
    label: "Agenda",
    url: "app.nixvetapp.com/calendar",
    caption: "Veja o mês inteiro da clínica num só lugar.",
    shots: [
      {
        src: "/landing/screenshot-agenda.jpg",
        alt: "Agenda mensal do NixVetApp com consultas de vários pacientes distribuídas ao longo dos dias do mês",
      },
    ],
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    url: "app.nixvetapp.com/whatsapp",
    caption: "Enquanto a equipe atende no balcão, o WhatsApp continua respondendo.",
    shots: [
      {
        src: "/landing/screenshot-whatsapp.jpg",
        alt: "Conversa de WhatsApp aberta no NixVetApp remarcando uma consulta, com várias mensagens trocadas entre a clínica e a tutora",
      },
    ],
  },
  {
    value: "financeiro",
    label: "Financeiro",
    url: "app.nixvetapp.com/financeiro/lancamentos",
    caption: "Contas a pagar, a receber e fluxo de caixa sempre atualizados.",
    shots: [
      {
        src: "/landing/screenshot-financeiro.jpg",
        alt: "Lançamentos financeiros do NixVetApp com receitas, despesas e resultado do período, além de lançamentos sugeridos automaticamente",
      },
    ],
  },
];

export function ProductTour() {
  return (
    <Tabs defaultValue="prontuario" className="w-full items-center gap-8">
      <TabsList className="h-auto! flex-wrap justify-center gap-x-2 gap-y-3 rounded-full bg-transparent p-0">
        {TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-gray-500 shadow-none transition-colors data-[state=active]:border-brand-deep-dark data-[state=active]:bg-brand-deep-dark data-[state=active]:text-white data-[state=active]:shadow-none"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="grid w-full min-w-0">
        {TABS.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            forceMount
            className="col-start-1 row-start-1 mt-0 min-w-0 self-start opacity-0 data-[state=active]:opacity-100 data-[state=inactive]:pointer-events-none motion-safe:data-[state=active]:animate-[nix-tab-fade-in_320ms_ease-out] motion-safe:data-[state=inactive]:animate-[nix-tab-fade-out_200ms_ease-in_forwards]"
          >
            <TourShots url={tab.url} shots={tab.shots} />
            <Caption>{tab.caption}</Caption>
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}
