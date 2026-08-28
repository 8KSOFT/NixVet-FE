import type { Metadata } from "next";
import RegisterClient from "./RegisterClient";

const TITLE = "Crie sua conta grátis — NixVet";
const DESCRIPTION =
  "Teste o NixVet por 14 dias grátis, sem cartão de crédito. Prontuário, agenda, financeiro e atendimento automático no WhatsApp para sua clínica veterinária.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/register",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/register",
  },
  twitter: {
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function Page() {
  return <RegisterClient />;
}
