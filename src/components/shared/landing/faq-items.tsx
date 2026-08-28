// Dados do FAQ fora do módulo client: o JSON-LD da home é montado no server, e
// um `export` de arquivo "use client" chega lá como referência, não como valor.
// Vale para o FAQ_ITEMS e para o GOOGLE_PLAY_URL.
//
// `answer` é sempre texto puro, que é o que o dado estruturado aceita;
// `answerNode` existe só onde a resposta renderizada leva marcação.
import type { ReactNode } from "react";

export interface FaqItem {
  question: string;
  /** Texto puro — é o que vai para o dado estruturado da home. */
  answer: string;
  /** Só onde a resposta renderizada leva marcação (link, ênfase). */
  answerNode?: ReactNode;
}

export const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.nixvetapp.equipe";

export const FAQ_ITEMS: FaqItem[] = [
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
    answer:
      "Sim! O NixVetApp já está disponível para Android na Google Play. A versão para iOS (Apple Store) chega em breve.",
    answerNode: (
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
