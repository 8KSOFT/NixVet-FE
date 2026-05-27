"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Building2,
  Mail,
  Lock,
  Loader2,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getApiBaseUrl } from "@/lib/api-base";
import { fetchPublicBranding } from "@/lib/branding";
import { LogoCompactoDynamic } from "@/components/shared/LogoCompactoDynamic";
import Image from "next/image";

export default function LoginPage() {
  const { t: translation } = useTranslation("common");
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantCode, setTenantCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [defaultTenantCode, setDefaultTenantCode] = useState<string | null>(
    null,
  );
  const [brandingLoading, setBrandingLoading] = useState(true);

  useEffect(() => {
    fetchPublicBranding()
      .then((branding) => {
        setBrandName(branding.appName || "NixVetApp");
        setBrandLogo(branding.logoUrl);
        setDefaultTenantCode(branding.tenantCode);
      })
      .finally(() => setBrandingLoading(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password;

    if (!trimmedEmail || !trimmedPassword) {
      toast.error("Preencha email e senha.");
      return;
    }

    setLoading(true);

    const code = (
      tenantCode.trim() ||
      defaultTenantCode?.trim() ||
      "nixvet"
    ).toLowerCase();
    const apiBase = getApiBaseUrl();
    const url = `${apiBase}/auth/login`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          password: trimmedPassword,
          tenantCode: code,
        }),
      });
      const raw = await res.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { message: raw || "Resposta inválida do servidor." };
      }

      if (!res.ok) {
        const apiMessage = Array.isArray(data?.message)
          ? data.message.join(" | ")
          : data?.message || "";
        toast.error(apiMessage || `Falha no login (${res.status})`);
        console.error("[LOGIN] HTTP error", {
          status: res.status,
          statusText: res.statusText,
          body: data,
          apiBase,
        });
        return;
      }

      const { access_token, user } = data;
      localStorage.setItem("accessToken", access_token);
      localStorage.setItem("tenantId", user.tenant_id);
      localStorage.setItem("tenantCode", code);
      localStorage.setItem("user", JSON.stringify(user));

      toast.success(translation("auth.welcome", { name: user.name }));
      router.push("/dashboard");
    } catch (err: any) {
      console.error("[LOGIN] fetch error:", err);
      toast.error(
        "Não foi possível conectar ao servidor. Verifique CORS/domínio da API.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell relative min-h-screen">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      <div className="flex min-h-screen w-full">
        <section className="relative flex w-[50%] shrink-0 flex-col justify-center bg-brand-deep text-white">
          <div className="p-0 m-0">
            <Image
              src="/images/logo/logo-bg.svg"
              alt="Logo"
              fill={true}
              className="opacity-8 pb-28 invert"
              // width={100}
              // height={100}
            />
          </div>
          <div className="relative z-10 mx-auto flex items-start justify-between max-w-lg flex-col gap-2">
            <div className="mb-8">
              <div className="flex items-end justify-center gap-2">
                {brandingLoading ? (
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex items-center">
                      <Skeleton className="h-5 w-36 rounded" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-end gap-2">
                    <LogoCompactoDynamic width="41" height="41" />
                    <h1 className="font-heading leading-7 text-2xl tracking-tight scale-y-85 sm:text-[32px]">
                      <span className="text-white">
                        {brandName.substring(0, 6)}
                      </span>
                      <span className="text-white/60">
                        {brandName.substring(6, 9)}
                      </span>
                    </h1>
                  </div>
                )}
              </div>
            </div>
            <div>
              <p className="max-w-md text-base tracking-wider leading-11 font-black subpixel-antialiased text-white sm:text-[42px] font-['InterDoFigma']">
                {translation("auth.subtitle")
                  .split(/(?<!\bSistema) /)
                  .map((line: string, index: number) => (
                    <span key={index} className="block">
                      {line}
                    </span>
                  ))}
              </p>
            </div>
            <ul className="mt-4 max-w-md space-y-0 text-sm leading-relaxed text-white/80">
              <li className="flex gap-3">
                <span>Multi-clínica com dados isolados por unidade.</span>
              </li>
              <li className="flex gap-3">
                <span>Interface pensada para fluxo rápido no consultório.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Formulário */}
        <div className="flex flex-col flex-1 items-center justify-center px-4 py-10 sm:px-8 lg:py-14">
          <div className="mt-12 flex w-full max-w-87.5 flex-col flex-1 items-center justify-center">
            <div className="w-full flex flex-col items-start">
              <h2 className="font-heading mb-6 text-center text-xl font-semibold text-foreground">
                {translation("auth.cardTitle")}
              </h2>
              <form onSubmit={handleLogin} className="space-y-4 w-full">
                <div className="space-y-1.5">
                  <div className="relative">
                    <Input
                      id="tenantCode"
                      name="tenantCode"
                      className="pl-5 shadow-none"
                      placeholder={translation("auth.tenantCodePlaceholder")}
                      value={tenantCode}
                      onChange={(e) =>
                        setTenantCode(e.target.value.toLowerCase())
                      }
                      autoComplete="organization"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="relative">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      className="pl-5 shadow-none"
                      placeholder={translation("auth.emailPlaceholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value.toLowerCase())}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      className="pl-5 shadow-none"
                      placeholder={translation("auth.passwordPlaceholder")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-8">
                  <div className="text-center">
                    <a
                      href="#"
                      className="text-xs font-medium text-gray-400 transition-colors duration-200 hover:text-(--primary-hover)"
                      onClick={(e) => e.preventDefault()}
                    >
                      {translation("auth.forgotPassword")}
                    </a>
                  </div>
                  <Button
                    type="submit"
                    className="w-37.5 text-base font-medium rounded-full"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="size-4 animate-spin" />}
                    {translation("auth.submit")}
                  </Button>
                </div>
              </form>

              <p className="mt-8 text-center text-sm text-muted-foreground w-full">
                Não tem conta?{" "}
                <a
                  href="/register"
                  className="font-semibold text-primary hover:underline"
                >
                  Comece grátis por 14 dias
                </a>
              </p>
            </div>
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} {brandName}.{" "}
            {translation("auth.footer")}
          </p>
        </div>
      </div>
    </div>
  );
}
