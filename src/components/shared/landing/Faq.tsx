"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.nixvetapp.equipe";

const FAQ_ITEMS = [
  {
    question: "Preciso migrar meus dados atuais para o NixVetApp?",
    answer:
      "Sim, e nossa equipe ajuda nesse processo. Conte pra gente como estão seus dados hoje (planilha, outro sistema, papel) e te orientamos no melhor caminho para a migração.",
  },
  {
    question:
      "O atendimento automático no WhatsApp pode errar ou responder algo que não deveria?",
    answer:
      "O sistema segue as regras que você configura e identifica quando o assunto foge do script ou é uma emergência. Nesses casos, transfere a conversa para um atendente humano.",
  },
  {
    question: "Preciso trocar de número de WhatsApp para usar o sistema?",
    answer:
      "Não é necessário. A conexão é feita com o número que sua clínica já usa hoje.",
  },
  {
    question: "O que acontece depois dos 14 dias de teste grátis?",
    answer:
      "Você escolhe o plano que melhor se encaixa na sua clínica e segue usando normalmente. Não pedimos cartão de crédito no cadastro, então nada é cobrado automaticamente se você decidir não continuar.",
  },
  {
    question: "Consigo cancelar quando quiser?",
    answer: "Sim, sem multa ou fidelidade.",
  },
  {
    question: "O sistema funciona no celular?",
    answer:
      "Sim, o NixVetApp funciona direto do navegador, em computador ou celular, sem precisar instalar aplicativo. Também temos um aplicativo dedicado, se preferir.",
  },
  {
    question: "Os dados dos meus clientes e pacientes ficam seguros?",
    answer:
      "Sim. Seguimos a LGPD, com dados sensíveis criptografados e logs de auditoria completos sobre quem acessou o quê.",
  },
  {
    question: "Tem aplicativo para celular?",
    answer: (
      <>
        Sim! O NixVetApp já está disponível para Android na{" "}
        <a
          href={GOOGLE_PLAY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-brand-deep underline underline-offset-2 hover:text-brand-deep/80"
        >
          Google Play
        </a>
        . A versão para iOS (Apple Store) chega em breve.
      </>
    ),
  },
];

function FaqItems() {
  return (
    <>
      {FAQ_ITEMS.map((item, itemIndex) => (
        <AccordionItem
          key={item.question}
          value={`faq-${itemIndex}`}
          className="mb-3 rounded-2xl border border-l-[6px] border-border px-5 transition-colors last:mb-0 last:border-b last:border-border data-[state=open]:rounded-l-none data-[state=open]:border-l-brand-deep! data-[state=open]:bg-[#eef7f3]"
        >
          <AccordionTrigger className="text-[15.5px] font-semibold text-brand-deep-dark hover:no-underline data-[state=open]:text-brand-deep [&>svg]:text-brand-deep-dark/50 data-[state=open]:[&>svg]:text-brand-deep">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="text-[14.5px] leading-relaxed text-gray-500">
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </>
  );
}

export function Faq() {
  return (
    <div className="grid w-full">
      <Accordion
        type="single"
        collapsible
        defaultValue="faq-0"
        className="col-start-1 row-start-1 w-full"
      >
        <FaqItems />
      </Accordion>

      {FAQ_ITEMS.map((_, itemIndex) => (
        <Accordion
          key={itemIndex}
          type="single"
          value={`faq-${itemIndex}`}
          onValueChange={() => {}}
          aria-hidden="true"
          className="invisible col-start-1 row-start-1 w-full select-none pointer-events-none"
        >
          <FaqItems />
        </Accordion>
      ))}
    </div>
  );
}
