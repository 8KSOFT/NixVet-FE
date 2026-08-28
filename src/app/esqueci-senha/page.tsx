import type { Metadata } from "next";
import EsqueciSenhaClient from "./EsqueciSenhaClient";

export const metadata: Metadata = {
  title: "Recuperar senha — NixVet",
  description: "Recupere o acesso à sua conta NixVet.",
  // Página utilitária de fluxo de login — sem valor de busca própria.
  robots: { index: false, follow: true },
};

export default function Page() {
  return <EsqueciSenhaClient />;
}
