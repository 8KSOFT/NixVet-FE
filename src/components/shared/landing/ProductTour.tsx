"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
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

type TourShot = { src: string };

type TourTab = {
  value: string;
  url: string;
  shots: TourShot[];
};

/** Quando uma aba tem mais de um print, vira um carrossel simples (setas +
 * bolinhas) dentro do mesmo BrowserFrame — em vez de escolher só um e
 * descartar o outro. */
function TourShots({ tab, url, shots }: { tab: string; url: string; shots: TourShot[] }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const hasMultiple = shots.length > 1;
  const shot = shots[index];

  return (
    <div className="relative">
      <BrowserFrame url={url}>
        <ScreenshotImage src={shot.src} alt={t(`landing.tour.tabs.${tab}.shots.${index}`)} />
      </BrowserFrame>

      {hasMultiple && (
        <>
          {/* Sempre dentro da moldura (nunca "pendurada" pra fora) — no
              celular, uma seta a cavalo da borda ficava cortada ou saía da
              viewport; assim funciona igual em qualquer tamanho de tela. */}
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + shots.length) % shots.length)}
            aria-label={t('landing.tour.prev')}
            className="absolute inset-y-0 left-1.5 z-10 my-auto flex size-10 items-center justify-center rounded-full border border-border bg-white/90 text-gray-600 shadow-md backdrop-blur-sm transition-colors hover:bg-white sm:left-3"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % shots.length)}
            aria-label={t('landing.tour.next')}
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
                aria-label={t('landing.tour.seeShot', { n: i + 1 })}
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
    url: "app.nixvetapp.com/medical-records/prontuario/duke",
    shots: [
      {
        src: "/landing/screenshot-prontuario-detalhe.webp",
      },
      {
        src: "/landing/screenshot-prontuario-lista.webp",
      },
    ],
  },
  {
    value: "agenda",
    url: "app.nixvetapp.com/calendar",
    shots: [
      {
        src: "/landing/screenshot-agenda.webp",
      },
    ],
  },
  {
    value: "whatsapp",
    url: "app.nixvetapp.com/whatsapp",
    shots: [
      {
        src: "/landing/screenshot-whatsapp.webp",
      },
    ],
  },
  {
    value: "financeiro",
    url: "app.nixvetapp.com/financeiro/lancamentos",
    shots: [
      {
        src: "/landing/screenshot-financeiro.webp",
      },
    ],
  },
];

export function ProductTour() {
  const { t } = useTranslation();
  return (
    <Tabs defaultValue="prontuario" className="w-full items-center gap-8">
      <TabsList className="h-auto! flex-wrap justify-center gap-x-2 gap-y-3 rounded-full bg-transparent p-0">
        {TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-gray-500 shadow-none transition-colors data-[state=active]:border-brand-deep-dark data-[state=active]:bg-brand-deep-dark data-[state=active]:text-white data-[state=active]:shadow-none"
          >
            {t(`landing.tour.tabs.${tab.value}.label`)}
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
            <TourShots tab={tab.value} url={tab.url} shots={tab.shots} />
            <Caption>{t(`landing.tour.tabs.${tab.value}.caption`)}</Caption>
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}
