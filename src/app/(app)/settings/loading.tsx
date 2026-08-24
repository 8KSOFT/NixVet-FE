import { Skeleton } from '@/components/ui/skeleton';

/**
 * Boundary de loading próprio para /settings/* — sem este arquivo, o
 * fallback de (app)/loading.tsx envolveria a árvore inteira abaixo do
 * layout do app, incluindo o SettingsLayout (sidebar de configurações),
 * fazendo a sidebar sumir e reaparecer a cada troca de sub-rota dentro de
 * Configurações. Com este arquivo, só o conteúdo (a página em si) suspende
 * — a sidebar do SettingsLayout continua montada.
 */
export default function SettingsLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
