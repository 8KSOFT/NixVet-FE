import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import AppProviders from '@/components/AppProviders';
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NixVet - Sistema Veterinário",
  description: "Gestão clínica veterinária profissional",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={plusJakarta.variable}>
      <body className="min-h-screen bg-slate-100 text-slate-800 antialiased">
        <AntdRegistry>
          <AppProviders>{children}</AppProviders>
        </AntdRegistry>
      </body>
    </html>
  );
}
