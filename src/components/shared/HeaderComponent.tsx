import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LogoCompletoDynamic } from "./LogoCompletoDynamic";

interface HeaderComponentProps {
  width: string;
  height: string;
}

export const HeaderComponent = ({ width, height }: HeaderComponentProps) => {
  return (
    <header className="fixed w-[80%] top-16 left-1/2 -translate-x-1/2 z-50 flex h-16 items-center justify-between bg-white/95 rounded-full backdrop-blur-sm supports-backdrop-filter:bg-white/90 pl-4 pr-2 shadow-xl">
      <LogoCompletoDynamic width={width} height={height} />

      <Button asChild size="lg" className="rounded-full shadow-none bg-brand-deep/20">
        <Link href="/login">
          {" "}
          <span className="text-brand-deep font-bold">Acessar Sistema</span>
        </Link>
      </Button>
    </header>
  );
};
