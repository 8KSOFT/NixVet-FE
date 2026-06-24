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

interface LoginResponseData {
  access_token?: string;
  user?: {
    tenant_id: string;
    name: string;
  } & Record<string, unknown>;
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

      const { access_token, user } = data;
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
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      {/* <div className="flex flex-col min-h-screen w-full sm:flex-row"> */}
      <section className="relative flex w-full h-50 shrink-0 flex-row items-center bg-brand-deep text-white sm:w-1/2 sm:h-screen sm:flex-col sm:items-center sm:justify-center">
        <div className="p-0 m-0">
          <Image
            src="/images/logo/logo-bg.svg"
            alt="Logo"
            fill={true}
            className="opacity-8 sm:pb-28 invert"
          />
        </div>

        <div className="w-fit relative h-fit z-10 mx-auto flex items-center justify-between max-w-lg flex-col gap-2 sm:items-start">
          <div className="sm:mb-8">
            {brandingLoading ? (
              <div className="flex items-start gap-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex items-center">
                  <Skeleton className="h-5 w-36 rounded" />
                </div>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <LogoCompactoDynamic width="41" height="41" />
                <h1 className="font-heading leading-7 text-[32px] tracking-tight scale-y-85">
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
              <p className="text-base tracking-wide leading-5 font-black subpixel-antialiased text-white sm:text-[42px] font-['InterDoFigma'] sm:leading-11 sm:tracking-wider sm:max-w-md">
                {isMobile
                  ? translation("auth.subtitle")
                      .split(/ (?=Veterinária)/)
                      .map((line: string, index: number) => (
                        <span key={index} className="block text-center">
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
      <section className="flex flex-col flex-1 items-center justify-start sm:px-8 lg:py-14">
        <div className="flex w-full max-w-87.5 flex-col flex-1 items-center justify-start sm:justify-center sm:mt-12">
          <div className="w-full flex flex-col items-center mt-[10%] sm:mt-10 sm:items-start">
            <h2 className="font-heading mb-8 text-center text-xl font-semibold text-foreground sm:mb-6">
              {translation("auth.cardTitle")}
            </h2>

            <form
              onSubmit={handleLogin}
              className="space-y-3 w-full px-8 sm:px-0"
            >
              <div className="space-y-1.5">
                <div className="relative">
                  <Input
                    id="tenantCode"
                    name="tenantCode"
                    className={`pl-5 shadow-none${tenantLocked ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}`}
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
              <div className="w-full flex items-center justify-between mt-8 px-4 sm:px-0">
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
                  className="w-22 text-base font-medium rounded-full sm:w-35"
                  disabled={loading}
                >
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  {translation("auth.submit")}
                </Button>
              </div>
            </form>

            <p className="mt-8 text-center text-xs text-muted-foreground w-full sm:text-sm">
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
        <p className="w-full mt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {brandName}. {translation("auth.footer")}
        </p>
      </section>
    </div>
    // </div>
  );
}
