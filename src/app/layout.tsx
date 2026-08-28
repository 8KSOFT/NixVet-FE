import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import AppProviders from '@/components/AppProviders';
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  adjustFontFallback: true,
  // 200/800/900 cobrem os títulos que antes usavam a fonte customizada
  // "InterDoFigma" (um @font-face solto em public/fonts servindo o MESMO
  // Inter, só que como TTF de 854KB sem preload nem ajuste de fallback —
  // medido pelo Chrome: LCP 3,02s e CLS 0,15 numa página só). Pedir os pesos
  // aqui deixa o Next self-hostar, subsetar e fazer o ajuste de fallback
  // automaticamente, igual já acontece com 400/500.
  weight: ["200", "400", "500", "800", "900"],
});

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  adjustFontFallback: true,
  weight: ["600", "700"],
});

const SITE_URL = "https://nixvetapp.com.br";
const DEFAULT_TITLE = "NixVet — Sistema para Clínica Veterinária com IA no WhatsApp";
const DEFAULT_DESCRIPTION =
  "Prontuário, agenda e financeiro num só sistema — e o WhatsApp da sua clínica respondendo sozinho. Teste grátis por 14 dias, sem cartão de crédito.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  manifest: "/manifest.json",
  // Sem bloco `icons` de propósito: os arquivos `app/favicon.ico`, `app/icon.png`
  // e `app/apple-icon.png` são detectados pelo Next e viram as tags <link>
  // automaticamente. O bloco anterior apontava para `/logo.svg`, que não existe
  // em `public/` — por isso o navegador caía no favicon padrão do Next.
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "NixVet",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: "/logo-512.png",
        width: 512,
        height: 512,
        alt: "NixVet",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ["/logo-512.png"],
  },
};

// Plataforma ainda não tem modo escuro — ignora o tema do SO e mantém a UI
// nativa do navegador (inputs, scrollbars) sempre no claro. "only light"
// (e não só "light") também desliga o force-dark automático do Chrome
// Android, que senão reescreve as cores da página em alguns aparelhos.
export const viewport: Viewport = {
  colorScheme: "only light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${poppins.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
