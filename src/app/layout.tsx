import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import AppProviders from '@/components/AppProviders';
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  adjustFontFallback: true,
  weight: ["400", "500"],
});

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  adjustFontFallback: true,
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "NixVet - Sistema Veterinário",
  description: "Gestão clínica veterinária profissional",
  manifest: "/manifest.json",
  // Sem bloco `icons` de propósito: os arquivos `app/favicon.ico`, `app/icon.png`
  // e `app/apple-icon.png` são detectados pelo Next e viram as tags <link>
  // automaticamente. O bloco anterior apontava para `/logo.svg`, que não existe
  // em `public/` — por isso o navegador caía no favicon padrão do Next.
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
