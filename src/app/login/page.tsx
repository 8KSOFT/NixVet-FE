import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Entrar — NixVet",
  description: "Acesse sua conta NixVet para gerenciar sua clínica veterinária.",
  alternates: {
    canonical: "/login",
  },
};

export default function Page() {
  return <LoginClient />;
}
