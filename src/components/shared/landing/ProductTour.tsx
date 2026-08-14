"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function BrowserFrame({
  url,
  children,
}: {
  url: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-white shadow-[0_20px_50px_rgba(14,30,47,0.09)]">
      <div className="flex items-center gap-2 border-b border-border bg-gray-50 px-4 py-3">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 truncate rounded-md border border-border bg-white px-2.5 py-1 text-xs text-gray-500">
          {url}
        </span>
      </div>
      <div className="bg-[#eef7f3] p-3 sm:p-5">
        <div className="overflow-hidden rounded-lg border border-border shadow-sm">{children}</div>
      </div>
    </div>
  );
}

function Caption({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-center text-[14.5px] font-medium text-gray-500">{children}</p>;
}

function ScreenshotImage({
  src,
  width,
  height,
  alt,
}: {
  src: string;
  width: number;
  height: number;
  alt: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className="h-auto w-full"
      sizes="(max-width: 768px) 100vw, 768px"
    />
  );
}

type TourTab = {
  value: string;
  label: string;
  caption: string;
  render: () => ReactNode;
};

const TABS: TourTab[] = [
  {
    value: "prontuario",
    label: "Prontuário",
    caption: "Histórico completo, sem papel perdido.",
    render: () => (
      <BrowserFrame url="app.nixvetapp.com/medical-records/prontuario/thor">
        <ScreenshotImage
          src="/landing/screenshot-prontuario-v2.png"
          width={1150}
          height={660}
          alt="Prontuário do paciente Thor no NixVetApp, com dados da tutora, espécie, raça, idade, peso e histórico de atendimentos"
        />
      </BrowserFrame>
    ),
  },
  {
    value: "agenda",
    label: "Agenda",
    caption: "Veja a semana inteira da clínica num só lugar.",
    render: () => (
      <BrowserFrame url="app.nixvetapp.com/calendar">
        <ScreenshotImage
          src="/landing/screenshot-agenda-v2.png"
          width={1150}
          height={660}
          alt="Agenda semanal do NixVetApp com consultas de vários pacientes distribuídas ao longo dos dias e horários"
        />
      </BrowserFrame>
    ),
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    caption: "Enquanto a equipe atende no balcão, o WhatsApp continua respondendo.",
    render: () => (
      <BrowserFrame url="app.nixvetapp.com/whatsapp">
        <ScreenshotImage
          src="/landing/screenshot-whatsapp-v2.png"
          width={1150}
          height={660}
          alt="Caixa de entrada do WhatsApp no NixVetApp com lista de conversas e uma conversa aberta agendando uma consulta"
        />
      </BrowserFrame>
    ),
  },
  {
    value: "financeiro",
    label: "Financeiro",
    caption: "Contas a pagar, a receber e fluxo de caixa sempre atualizados.",
    render: () => (
      <BrowserFrame url="app.nixvetapp.com/financeiro/lancamentos">
        <ScreenshotImage
          src="/landing/screenshot-financeiro-v2.png"
          width={1150}
          height={660}
          alt="Lançamentos financeiros confirmados no NixVetApp com data, categoria, descrição, valor recebido e forma de pagamento"
        />
      </BrowserFrame>
    ),
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

      <div className="grid w-full">
        {TABS.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            forceMount
            className="col-start-1 row-start-1 mt-0 self-start opacity-0 data-[state=active]:opacity-100 data-[state=inactive]:pointer-events-none motion-safe:data-[state=active]:animate-[nix-tab-fade-in_320ms_ease-out] motion-safe:data-[state=inactive]:animate-[nix-tab-fade-out_200ms_ease-in_forwards]"
          >
            {tab.render()}
            <Caption>{tab.caption}</Caption>
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}
