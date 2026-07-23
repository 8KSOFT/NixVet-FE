"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getApiBaseUrl } from "@/lib/api-base";
import { fetchPublicBranding } from "@/lib/branding";
import { setTenantCookie } from "@/lib/axios";
import { detectSubdomainClient } from "@/lib/subdomain";
import { getApiErrorMessage } from "@/app/utils/api-error-message";
import { LogoCompactoDynamic } from "@/components/shared/componentizedImages/LogoCompactoDynamic";
import Image from "next/image";
import { useIsMobile } from "@/hooks/use-mobile";

interface LoginResponsePayload {
  access_token?: string;
  user?: {
    tenant_id: string;
    name: string;
  } & Record<string, unknown>;
}

interface LoginResponseData {
  // Envelope novo: { success, message, data }. Ver DOCS/response-phase-1-front.md.
  data?: LoginResponsePayload;
  message?: string | string[];
}

export default function LoginPage() {
  const { t: translation } = useTranslation("common");
  const isMobile = useIsMobile();
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
  const [tenantLocked, setTenantLocked] = useState(false);
  const [brandingLoading, setBrandingLoading] = useState(true);

  useEffect(() => {
    const subdomain = detectSubdomainClient();

    if (subdomain) {
      setTenantCode(subdomain);
      setTenantLocked(true);
    } else {
      setTenantCode("");
      setTenantLocked(false);
    }

    fetchPublicBranding()
      .then((branding) => {
        setBrandName(branding.appName || "NixVetApp");
        setBrandLogo(branding.logoUrl);
        setDefaultTenantCode(branding.tenantCode);

        // Só pré-preenche e bloqueia quando o subdomínio foi detectado no host.
        if (subdomain) {
          setTenantCode(branding.tenantCode || subdomain);
          setTenantLocked(true);
        }
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

    const subdomain = detectSubdomainClient();
    const code = (
      tenantCode.trim() || (subdomain ? (defaultTenantCode?.trim() ?? "") : "")
    ).toLowerCase();

    if (!code) {
      toast.error("Informe o código da clínica.");
      return;
    }
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
      let data: LoginResponseData = {};
      try {
        data = raw ? (JSON.parse(raw) as LoginResponseData) : {};
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

      const { access_token, user } = data.data ?? {};
      if (!access_token || !user) {
        toast.error("Resposta de login inválida.");
        return;
      }
      localStorage.setItem("accessToken", access_token);
      localStorage.setItem("tenantId", user.tenant_id);
      localStorage.setItem("tenantCode", code);
      localStorage.setItem("user", JSON.stringify(user));
      setTenantCookie(user.tenant_id);

      toast.success(translation("auth.welcome", { name: user.name }));
      router.push("/dashboard");
    } catch (error: unknown) {
      console.error("[LOGIN] fetch error:", error);
      toast.error(
        getApiErrorMessage(
          error,
          "Não foi possível conectar ao servidor. Verifique CORS/domínio da API.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell relative min-h-screen flex flex-col sm:flex-row">
      <div className="absolute top-4 right-4 z-10 hidden sm:block">
        <LanguageSwitcher />
      </div>

      {/* <div className="flex flex-col min-h-screen w-full sm:flex-row"> */}
      <section className="relative flex w-full flex-col items-start justify-center gap-0 overflow-hidden bg-brand-deep px-6 pt-8 pb-8 text-white sm:w-1/2 sm:h-screen sm:flex-col sm:items-center sm:justify-center sm:px-0 sm:pt-0 sm:pb-0">
        <div className="p-0 m-0">
          <Image
            src="/images/logo/logo-bg.svg"
            alt="Logo"
            fill={true}
            className="origin-top-right scale-[0.65] opacity-20 sm:scale-100 sm:origin-center sm:opacity-8 sm:invert"
          />
        </div>

        <div className="relative z-10 flex w-full flex-col items-start gap-6 sm:mx-auto sm:h-fit sm:w-fit sm:max-w-lg sm:items-start sm:justify-between sm:gap-2">
          <div className="sm:mb-8">
            {brandingLoading ? (
              <div className="flex items-end gap-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex items-center h-7">
                  <Skeleton className="h-5 w-36 rounded" />
                </div>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <LogoCompactoDynamic width="40" height="40" />
                <h1 className="font-heading leading-7 text-[31px] tracking-tight scale-y-85">
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

          <div className="sm:block">
            <div>
              <p className="text-left text-[29px] leading-9 font-black text-white sm:text-[42px] font-['InterDoFigma'] sm:leading-11 sm:tracking-wider sm:max-w-md">
                {isMobile
                  ? translation("auth.heroTitle")
                      .split("\n")
                      .map((line: string, index: number) => (
                        <span key={index} className="block">
                          {line}
                        </span>
                      ))
                  : translation("auth.subtitle")
                      .split(/(?<!\bSistema) /)
                      .map((line: string, index: number) => (
                        <span key={index} className="block">
                          {line}
                        </span>
                      ))}
              </p>
              <p className="mt-3 max-w-xs text-base leading-relaxed text-white/80 sm:hidden">
                {translation("auth.heroDescription")
                  .split("\n")
                  .map((line: string, index: number) => (
                    <span key={index} className="block">
                      {line}
                    </span>
                  ))}
              </p>
            </div>
            <ul className="hidden mt-0 max-w-md space-y-0 text-sm leading-relaxed text-white/80 sm:mt-4 sm:block">
              <li className="flex gap-3">
                <span>Multi-clínica com dados isolados por unidade.</span>
              </li>
              <li className="flex gap-3">
                <span>Interface pensada para fluxo rápido no consultório.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Formulário */}
      <section className="relative flex flex-1 flex-col items-center justify-start bg-background px-6 pt-8 pb-10 sm:px-8 sm:pt-0 sm:pb-0 lg:py-14">
        <div className="flex w-full max-w-87.5 flex-1 flex-col items-center justify-start sm:justify-center sm:mt-12">
          <div className="flex w-full flex-1 flex-col items-start sm:flex-none sm:mt-10 sm:items-start">
            <h2 className="font-heading mb-6 text-left text-xl font-semibold text-foreground sm:mb-6">
              {translation("auth.cardTitle")}
            </h2>

            <form
              onSubmit={handleLogin}
              className="flex w-full flex-1 flex-col sm:flex-none"
            >
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    id="tenantCode"
                    name="tenantCode"
                    className={`h-13 pl-5 shadow-none sm:h-11 ${tenantLocked ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}`}
                    placeholder={translation("auth.tenantCodePlaceholder")}
                    value={tenantCode}
                    onChange={(e) =>
                      !tenantLocked &&
                      setTenantCode(e.target.value.toLowerCase())
                    }
                    readOnly={tenantLocked}
                    required={!tenantLocked}
                    autoComplete="organization"
                  />
                </div>

                <div className="relative">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    className="h-13 pl-5 shadow-none sm:h-11"
                    placeholder={translation("auth.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    className="h-13 pl-5 shadow-none sm:h-11"
                    placeholder={translation("auth.passwordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <a
                href="#"
                className="mt-4 self-end text-xs font-medium text-gray-400 transition-colors duration-200 hover:text-(--primary-hover) sm:hidden"
                onClick={(e) => e.preventDefault()}
              >
                {translation("auth.forgotPassword")}
              </a>

              <div className="mt-auto flex w-full flex-col gap-6 pt-6 sm:mt-8 sm:gap-8 sm:pt-0">
                <div className="flex w-full flex-col items-end gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                  <a
                    href="#"
                    className="hidden text-xs font-medium text-gray-400 transition-colors duration-200 hover:text-(--primary-hover) sm:inline"
                    onClick={(e) => e.preventDefault()}
                  >
                    {translation("auth.forgotPassword")}
                  </a>
                  <Button
                    type="submit"
                    className="w-full py-3.5 text-base font-medium rounded-full sm:w-35 sm:py-2.5"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="size-4 animate-spin" />}
                    {translation("auth.submit")}
                  </Button>
                </div>

                <p className="text-center text-xs text-muted-foreground w-full sm:text-sm">
                  Não tem conta?{" "}
                  <a
                    href="/register"
                    className="font-semibold text-primary hover:underline"
                  >
                    Comece grátis por 14 dias
                  </a>
                </p>
              </div>
            </form>
          </div>
        </div>
        <p className="hidden w-full mt-8 text-center text-xs text-muted-foreground sm:block">
          © {new Date().getFullYear()} {brandName}. {translation("auth.footer")}
        </p>
      </section>
    </div>
    // </div>
  );
}
