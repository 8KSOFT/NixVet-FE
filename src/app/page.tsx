import type { Metadata } from "next";
import { OG_BASE, TWITTER_BASE } from "@/lib/seo";
import HomeClient from "./HomeClient";
import { FAQ_ITEMS } from "@/components/shared/landing/faq-items";

const TITLE = "NixVet — Sistema para Clínica Veterinária com IA no WhatsApp";
const DESCRIPTION =
  "Prontuário, agenda e financeiro num só sistema — e o WhatsApp da sua clínica respondendo sozinho. Teste grátis por 14 dias, sem cartão de crédito.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    ...OG_BASE,
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
  },
  twitter: {
    ...TWITTER_BASE,
    title: TITLE,
    description: DESCRIPTION,
  },
};


// FAQ_ITEMS vem de components/shared/landing/faq-items.ts (fonte única,
// compartilhada com o componente client) — aqui só vira dado estruturado.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "NixVetApp",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: DESCRIPTION,
  url: "https://nixvetapp.com.br",
  provider: {
    "@type": "Organization",
    name: "8KSOFT Tecnologia da Informação LTDA",
    url: "https://nixvetapp.com.br",
  },
  offers: [
    {
      "@type": "Offer",
      name: "Essencial",
      price: "179",
      priceCurrency: "BRL",
      priceValidUntil: "2027-12-31",
      url: "https://nixvetapp.com.br/register",
    },
    {
      "@type": "Offer",
      name: "Clínica",
      price: "299",
      priceCurrency: "BRL",
      priceValidUntil: "2027-12-31",
      url: "https://nixvetapp.com.br/register",
    },
    {
      "@type": "Offer",
      name: "Hospital",
      price: "499",
      priceCurrency: "BRL",
      priceValidUntil: "2027-12-31",
      url: "https://nixvetapp.com.br/register",
    },
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
      />
      <HomeClient />
    </>
  );
}
