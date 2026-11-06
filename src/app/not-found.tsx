"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LogoColored } from "@/components/shared/componentizedImages/LogoColored";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 text-center">
      <LogoColored width="220px" className="inline-block" />
      <div className="space-y-2">
        <p className="text-sm font-semibold tracking-wide text-brand-deep">
          {t("notFound.badge")}
        </p>
        <h1 className="text-2xl font-bold text-[#0e1e2f] sm:text-3xl">
          {t("notFound.title")}
        </h1>
        <p className="max-w-md text-sm text-gray-500 sm:text-base">
          {t("notFound.description")}
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/">{t("notFound.back")}</Link>
      </Button>
    </main>
  );
}
