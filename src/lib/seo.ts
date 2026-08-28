import type { Metadata } from "next";

export const SITE_URL = "https://nixvetapp.com.br";

export const DEFAULT_TITLE =
  "NixVet — Sistema para Clínica Veterinária com IA no WhatsApp";
export const DEFAULT_DESCRIPTION =
  "Prontuário, agenda e financeiro num só sistema — e o WhatsApp da sua clínica respondendo sozinho. Teste grátis por 14 dias, sem cartão de crédito.";

// O Next substitui `openGraph`/`twitter` inteiros quando uma página os
// redefine — não faz merge campo a campo com o layout. Sem espalhar estas
// bases, toda página que sobrescreve o título perde imagem, type e locale, e
// o link compartilhado vai sem preview.
// PNG e não WebP: suporte a WebP em og:image é irregular entre os
// rastreadores das redes, e PNG/JPEG são aceitos por todos. Economizar
// bytes aqui não paga o risco de o card não renderizar onde o link circula.
const OG_IMAGE = {
  url: "/og-nixvet.png",
  width: 1200,
  height: 630,
  alt: "NixVet — sua clínica organizada e o WhatsApp respondendo sozinho",
};

export const OG_BASE = {
  type: "website",
  locale: "pt_BR",
  siteName: "NixVet",
  images: [OG_IMAGE],
} satisfies Metadata["openGraph"];

// summary_large_image: com 1200x630 o card vira a arte inteira. Com o
// logo quadrado de antes, "summary" era o certo — a proporção mudou, o
// tipo de card precisa mudar junto.
export const TWITTER_BASE = {
  card: "summary_large_image",
  images: [OG_IMAGE.url],
} satisfies Metadata["twitter"];
