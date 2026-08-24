import { Skeleton } from '@/components/ui/skeleton';

/**
 * Fallback mostrado pelo App Router enquanto o chunk JS da rota de destino
 * ainda está sendo baixado/montado (ex.: primeira visita a uma rota pesada
 * na sessão). Sem isso a área principal ficava em branco até tudo montar,
 * o que lia como "a troca de rota travou" mesmo a navegação já tendo
 * acontecido de verdade. Genérico de propósito — cobre qualquer rota que
 * não tenha seu próprio loading.tsx mais específico (ver settings/loading.tsx).
 */
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-full sm:w-32" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
