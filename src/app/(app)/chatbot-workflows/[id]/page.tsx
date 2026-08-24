'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { PlanUpgradeGate } from '@/components/billing/PlanUpgradeGate';

// O editor visual (WorkflowEditor.tsx) carrega @xyflow/react, uma lib pesada
// que só faz sentido baixar quando essa rota específica é aberta — dynamic +
// ssr:false evita que ela entre no first load JS e evita mismatch de SSR
// (o canvas do React Flow depende de medir o DOM no browser).
const WorkflowEditor = dynamic(() => import('./WorkflowEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  ),
});

export default function WorkflowEditorPage() {
  return (
    <PlanUpgradeGate requiredPlan="clinica" feature="Chatbot / Workflows visuais">
      <WorkflowEditor />
    </PlanUpgradeGate>
  );
}
