import type { MetadataRoute } from "next";

const BASE_URL = "https://nixvetapp.com.br";

// Rotas do grupo (app) — no App Router os parênteses não entram na URL, então
// os paths reais que precisam ficar fora do índice são os nomes das pastas
// dentro de src/app/(app)/. É tudo aplicação logada, sem valor de busca, e
// fica acessível nesse mesmo domínio/deploy (o middleware só seta um cookie
// de subdomínio, não faz rewrite por host).
const APP_ROUTES = [
  "ajuda",
  "billing",
  "bulario",
  "calendar",
  "chatbot-workflows",
  "dashboard",
  "exams",
  "financeiro",
  "followups",
  "internacoes",
  "medical-records",
  "owners",
  "patients",
  "prescriptions",
  "profile",
  "settings",
  "superadmin",
  "tasks",
  "termos",
  "vaccines",
  "whatsapp",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        ...APP_ROUTES.map((route) => `/${route}/`),
        "/convite/",
        "/verificar/",
        "/esqueci-senha",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
