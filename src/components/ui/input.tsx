import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        data-slot="input"
        className={cn(
          // Estilos base
          "min-h-10 h-10 w-full min-w-0 rounded-lg border border-input bg-white px-3 py-2 text-base shadow-none transition-[color,box-shadow,border-color] duration-200 selection:bg-primary/20 selection:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm sm:h-11",
          
          // Reset completo de Outline, Ring e Focus (Substituindo o padrão do shadcn)
          "outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0 webkit-appearance-none",
          
          // Manteve apenas o tratamento de erro estrutural (opcional tirar se não quiser ring nem no erro)
          "aria-invalid:border-destructive aria-invalid:ring-0",

          // Evita que o autofill/popup de valores salvos do navegador troque o
          // fundo (amarelo/azul) e a cor do texto do input
          "autofill:bg-white autofill:text-foreground autofill:[-webkit-text-fill-color:var(--foreground)] autofill:[-webkit-box-shadow:0_0_0px_1000px_white_inset] autofill:[transition:background-color_9999s_ease-in-out_0s]",

          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }