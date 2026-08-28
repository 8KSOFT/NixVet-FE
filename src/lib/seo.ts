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
export const OG_BASE = {
  type: "website",
  locale: "pt_BR",
  siteName: "NixVet",
  images: [{ url: "/logo-512.png", width: 512, height: 512, alt: "NixVet" }],
} satisfies Metadata["openGraph"];

export const TWITTER_BASE = {
  card: "summary",
  images: ["/logo-512.png"],
} satisfies Metadata["twitter"];
