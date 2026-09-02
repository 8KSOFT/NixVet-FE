'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, ChevronUp, ClipboardCheck, Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GA_EVENTS, trackEvent } from '@/lib/analytics';
import { getStoredUserRole } from '@/lib/role-permissions';
import { useStaffUsersListQuery } from '@/hooks/apiHooks/useUsers';
import { useVetSchedulesQuery } from '@/hooks/apiHooks/useAvailabilityConfig';
import { useResourcesListQuery } from '@/hooks/apiHooks/useResources';
import { useHealthPlansListQuery } from '@/hooks/apiHooks/useHealthPlans';
import { useTenantMeQuery } from '@/hooks/apiHooks/useTenantSettings';
import { useGoogleStatusQuery } from '@/hooks/apiHooks/useGoogleIntegration';
import { useClinicTermTemplatesQuery } from '@/hooks/apiHooks/useClinicTermTemplates';

interface ChecklistItem {
  key: string;
  label: string;
  href: string;
  done: boolean;
}

function dismissKey(userId: string): string {
  return `nixvet:setup-checklist-dismissed:${userId}`;
}

/** Chave separada da de "dispensado" — a festa toca uma única vez na vida,
 * mesmo que o usuário nunca tenha dispensado o widget manualmente. */
function celebratedKey(userId: string): string {
  return `nixvet:setup-checklist-celebrated:${userId}`;
}

function readStoredUserId(): string | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string };
    return parsed.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Nome de cada item no relatório — desacoplado do `key` interno e do `label`
 * da tela pelo mesmo motivo do wizard de cadastro: rótulo é texto de
 * interface e vai mudar; nome de evento é chave de série histórica.
 */
const CHECKLIST_STEP_NAMES: Record<string, string> = {
  team: 'equipe',
  'vet-schedules': 'agenda_veterinarios',
  resources: 'salas_equipamentos',
  'health-plans': 'convenios',
  branding: 'identidade_visual',
  whatsapp: 'whatsapp_ia',
  'google-calendar': 'google_agenda',
  'term-templates': 'modelos_termo',
};

const CELEBRATION_COLORS = ['#12b37f', '#0e8f66', '#d4af37', '#c2417a', '#2563eb', '#fb8a2e'];

interface Particle {
  id: string;
  angle: number;
  distance: number;
  delay: number;
  color: string;
}

function makeBurst(count: number, prefix: string): Particle[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: `${prefix}-${i}`,
    angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5,
    distance: 60 + Math.random() * 55,
    delay: Math.random() * 180,
    color: CELEBRATION_COLORS[i % CELEBRATION_COLORS.length],
  }));
}

function FireworkParticle({ angle, distance, delay, color }: Particle) {
  const tx = Math.cos(angle) * distance;
  const ty = Math.sin(angle) * distance;
  return (
    <span
      className="absolute top-1/2 left-1/2 size-1.5 rounded-full"
      style={
        {
          backgroundColor: color,
          '--wa-tx': `${tx}px`,
          '--wa-ty': `${ty}px`,
          animation: `wa-particle-burst 900ms ease-out ${delay}ms forwards`,
        } as React.CSSProperties
      }
    />
  );
}

/**
 * Sequência de encerramento: risca os itens um a um (com destaque), depois
 * estrela + "100%" com fogos, e some — toca uma única vez, na transição real
 * de <100% pra 100% observada durante a sessão (ver useEffect no widget).
 */
function CelebrationOverlay({ items, onComplete }: { items: ChecklistItem[]; onComplete: () => void }) {
  const [phase, setPhase] = useState<'items' | 'finale' | 'out'>('items');
  const particles = useMemo(() => [...makeBurst(26, 'a'), ...makeBurst(22, 'b')], []);

  useEffect(() => {
    const itemsDuration = items.length * 220 + 500;
    const timers = [
      setTimeout(() => setPhase('finale'), itemsDuration),
      setTimeout(() => setPhase('out'), itemsDuration + 3000),
      setTimeout(onComplete, itemsDuration + 3400),
    ];
    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={cn(
        'fixed inset-0 z-100 flex items-center justify-center bg-wa-ink/60 p-4',
        phase === 'out' && 'animate-[wa-fade-out_400ms_ease-in_forwards]',
      )}
    >
      <div
        className="relative w-full max-w-sm rounded-wa-lg border border-wa-line bg-white p-6 text-center shadow-2xl"
        style={{ animation: 'wa-modal-pop 420ms cubic-bezier(.34,1.56,.64,1)' }}
      >
        {phase === 'items' ? (
          <>
            <h3 className="mb-4 text-base font-bold text-wa-ink">Configuração concluída!</h3>
            <ul className="space-y-1.5 text-left">
              {items.map((item, i) => (
                <li
                  key={item.key}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-wa-ink-2 opacity-0"
                  style={{
                    animation: `wa-item-in 300ms ease-out ${i * 220}ms forwards, wa-item-flash 700ms ease-out ${i * 220}ms forwards`,
                  }}
                >
                  <CheckCircle2 className="size-4 shrink-0 text-wa-brand-600" />
                  <span className="line-through decoration-wa-brand-600 decoration-2">{item.label}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="relative flex size-28 items-center justify-center">
              {particles.map((p) => (
                <FireworkParticle key={p.id} {...p} />
              ))}
              <Star
                className="size-28 fill-wa-brand-600 text-wa-brand-700 drop-shadow-lg"
                style={{ animation: 'wa-star-pop 550ms cubic-bezier(.34,1.56,.64,1) both' }}
              />
              <span className="absolute text-xl font-extrabold text-white">100%</span>
            </div>
            <p className="text-lg font-extrabold text-wa-ink">Tudo pronto! 🎉</p>
            <p className="text-sm text-wa-ink-2">Sua clínica está 100% configurada no NixVet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Checklist opcional pós-onboarding — itens que NÃO bloqueiam o uso do
 * sistema (diferente do wizard obrigatório em /register). Fica visível até
 * 100% ou até o usuário dispensar de vez; progresso e dispensa são por
 * pessoa (localStorage por userId), não por clínica — um veterinário novo
 * que entra depois ainda vê suas próprias pendências.
 *
 * No mobile vira uma bottom bar de largura cheia (não um pill flutuando
 * sobre o conteúdo); no desktop continua o pill no canto. Ao chegar em
 * 100% pela primeira vez na sessão, toca uma celebração e some para sempre.
 */
export function SetupChecklistWidget() {
  const [userId, setUserId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [celebrated, setCelebrated] = useState(true);
  const [celebrating, setCelebrating] = useState(false);
  const prevPercentRef = useRef<number | null>(null);

  /**
   * Itens já concluídos na última leitura. `null` enquanto as consultas não
   * responderam — é o que separa "acabou de concluir" de "já estava concluído
   * quando a tela abriu". Sem essa distinção, todo login de uma clínica com a
   * configuração adiantada mandaria a lista inteira de novo, e a métrica
   * viraria contagem de logins.
   */
  const itensConcluidosRef = useRef<Set<string> | null>(null);

  // Pill do desktop é "arrastável só de brincadeira": solta e ela volta
  // sozinha pro canto — dá pra afastar um instante pra ver o que tem
  // embaixo, sem precisar dispensar de vez. dragStartRef/startedRef vivem
  // fora do estado pra não disparar re-render a cada pixel de movimento.
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartedRef = useRef(false);
  const draggedRef = useRef(false);

  const handlePillPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragStartedRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePillPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!dragStartedRef.current) {
      if (Math.hypot(dx, dy) < 6) return;
      dragStartedRef.current = true;
      draggedRef.current = true;
      setDragging(true);
    }
    setDragOffset({ x: dx, y: dy });
  };

  const handlePillPointerEnd = () => {
    dragStartRef.current = null;
    dragStartedRef.current = false;
    setDragging(false);
    setDragOffset({ x: 0, y: 0 });
  };

  const handlePillClick = () => {
    // Foi um arraste, não um clique — não abre o painel, só solta a pill de
    // volta no lugar (já cuidado pelo pointerUp).
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    const id = readStoredUserId();
    setUserId(id);
    const role = getStoredUserRole();
    const allowedRole = role === 'admin' || role === 'manager';
    setDismissed(id ? localStorage.getItem(dismissKey(id)) === '1' : true);
    setCelebrated(id ? localStorage.getItem(celebratedKey(id)) === '1' : true);
    setVisible(allowedRole);
  }, []);

  const staffQuery = useStaffUsersListQuery();
  const vetSchedulesQuery = useVetSchedulesQuery();
  const resourcesQuery = useResourcesListQuery();
  const healthPlansQuery = useHealthPlansListQuery();
  const tenantQuery = useTenantMeQuery();
  const googleStatusQuery = useGoogleStatusQuery();
  const termTemplatesQuery = useClinicTermTemplatesQuery();

  const loading =
    staffQuery.isLoading ||
    vetSchedulesQuery.isLoading ||
    resourcesQuery.isLoading ||
    healthPlansQuery.isLoading ||
    tenantQuery.isLoading ||
    googleStatusQuery.isLoading ||
    termTemplatesQuery.isLoading;

  const tenant = tenantQuery.data;
  const items: ChecklistItem[] = [
    {
      key: 'team',
      label: 'Cadastrar mais veterinários',
      href: '/settings/team',
      done: (staffQuery.data?.length ?? 0) > 1,
    },
    {
      key: 'vet-schedules',
      label: 'Agenda de cada veterinário',
      href: '/settings/hours',
      done: (vetSchedulesQuery.data?.length ?? 0) > 0,
    },
    {
      key: 'resources',
      label: 'Salas e equipamentos',
      href: '/settings/resources',
      done: (resourcesQuery.data?.length ?? 0) > 0,
    },
    {
      key: 'health-plans',
      label: 'Convênios / planos de saúde',
      href: '/settings/planos-saude',
      done: (healthPlansQuery.data?.length ?? 0) > 0,
    },
    {
      key: 'branding',
      label: 'Identidade visual (logo, cor, subdomínio)',
      href: '/settings#identidade-visual',
      done: Boolean(tenant?.logo_url || tenant?.primary_color || tenant?.subdomain),
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp / atendimento por IA',
      href: '/settings/whatsapp-numbers',
      done: Boolean(tenant?.whatsapp_ai_chatbot_enabled),
    },
    {
      key: 'google-calendar',
      label: 'Google Agenda',
      href: '/settings#google-agenda',
      done: Boolean(googleStatusQuery.data?.connected),
    },
    {
      key: 'term-templates',
      label: 'Modelos de termo de consentimento',
      href: '/settings/clinic-terms',
      done: (termTemplatesQuery.data?.length ?? 0) > 0,
    },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const percent = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  // Chave estável da lista de concluídos: o array `items` é recriado a cada
  // render (é montado no corpo do componente), então usá-lo como dependência
  // do efeito abaixo o dispararia sem parar.
  const chaveConcluidos = items
    .filter((i) => i.done)
    .map((i) => i.key)
    .sort()
    .join(',');

  /**
   * Cada item que vira "concluído" com o widget na tela é uma etapa de
   * onboarding cumprida.
   *
   * Aqui não há botão de "concluir" para medir: o item fica verde porque uma
   * consulta passou a devolver dado — a pessoa cadastrou um veterinário em
   * Configurações e o react-query invalidou a lista. Como este widget vive no
   * layout de `(app)/`, ele continua montado durante essa navegação, e a
   * virada acontece com ele observando.
   *
   * A consequência disso é o que a comparação abaixo protege: quem já tinha o
   * item pronto antes de abrir a tela não gera evento nenhum, porque nunca
   * houve virada para observar. O evento mede conclusão, não presença.
   */
  useEffect(() => {
    if (!visible || loading) return;

    const concluidosAgora = new Set(
      items.filter((i) => i.done).map((i) => i.key),
    );
    const anteriores = itensConcluidosRef.current;
    itensConcluidosRef.current = concluidosAgora;

    // Primeira leitura da sessão: é fotografia do estado, não transição.
    if (anteriores === null) return;

    for (const key of concluidosAgora) {
      if (anteriores.has(key)) continue;
      trackEvent(GA_EVENTS.ONBOARDING_STEP, {
        step_name: CHECKLIST_STEP_NAMES[key] ?? key,
        // Separa estes do wizard de cadastro. Sem isso os dois grupos caem no
        // mesmo relatório e a etapa obrigatória fica lado a lado com a
        // opcional, como se fossem o mesmo funil.
        step_group: 'checklist',
      });
    }
    // `items` fora das dependências de propósito — é recriado a cada render.
    // `chaveConcluidos` representa exatamente a parte dele que importa aqui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveConcluidos, loading, visible]);

  // Dispara a celebração só quando OBSERVA a virada de <100% pra 100% durante
  // a sessão. Se já chegar 100% no primeiro carregamento (ex.: clínica que já
  // tinha tudo configurado antes dessa feature existir), marca como "visto"
  // silenciosamente — sem fogos surpresa do nada num login qualquer.
  useEffect(() => {
    if (!visible || dismissed || loading || celebrated) return;
    const prev = prevPercentRef.current;
    if (prev !== null && prev < 100 && percent >= 100) {
      setCelebrating(true);
    } else if (percent >= 100 && prev === null && userId) {
      localStorage.setItem(celebratedKey(userId), '1');
      setCelebrated(true);
    }
    prevPercentRef.current = percent;
  }, [percent, loading, celebrated, visible, dismissed, userId]);

  // Reserva espaço no fim da página (padding no <body>) enquanto a bottom bar
  // mobile existir, pra ela nunca sobrepor o conteúdo por baixo.
  useEffect(() => {
    const shouldReserve = visible && !dismissed && !loading && !celebrated && !celebrating && percent < 100;
    document.body.classList.toggle('has-config-bar', shouldReserve);
    return () => {
      document.body.classList.remove('has-config-bar');
    };
  }, [visible, dismissed, loading, celebrated, celebrating, percent]);

  if (!visible || dismissed || loading) return null;

  if (celebrating) {
    return (
      <CelebrationOverlay
        items={items}
        onComplete={() => {
          if (userId) localStorage.setItem(celebratedKey(userId), '1');
          setCelebrated(true);
          setCelebrating(false);
        }}
      />
    );
  }

  if (celebrated || percent >= 100) return null;

  const handleDismiss = () => {
    if (userId) localStorage.setItem(dismissKey(userId), '1');
    setDismissed(true);
  };

  const panel = (
    <div className="mb-3 flex items-center justify-between">
      <div>
        <h3 className="text-sm font-bold text-slate-900">Configuração — {percent}% completa</h3>
        <p className="text-xs text-slate-500">Opcional, mas ajuda a aproveitar tudo do NixVet.</p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-slate-400 hover:text-slate-600"
        aria-label="Dispensar definitivamente"
        title="Não mostrar mais"
      >
        <X className="size-4" />
      </button>
    </div>
  );

  const itemList = (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.key}>
          <Link
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50',
              item.done ? 'text-slate-400 line-through' : 'text-slate-700',
            )}
          >
            {item.done ? (
              <CheckCircle2 className="size-4 shrink-0 text-green-500" />
            ) : (
              <Circle className="size-4 shrink-0 text-slate-300" />
            )}
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {open && (
        <div className="fixed inset-x-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:inset-x-auto sm:right-5 sm:bottom-20 sm:mx-0 sm:w-80">
          {panel}
          {itemList}
        </div>
      )}

      {/* Mobile: bottom bar de largura cheia — nunca sobrepõe conteúdo porque
          a página reserva espaço pra ela (ver .has-config-bar). */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-wa-line bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,.06)] sm:hidden"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-wa-brand-600 text-white">
          <ClipboardCheck className="size-4.5" />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-[13.5px] font-bold text-wa-ink">Configuração {percent}%</span>
          <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-wa-line-2">
            <span
              className="block h-full rounded-full bg-wa-brand-600 transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </span>
        </span>
        <ChevronUp className={cn('size-4 shrink-0 text-wa-ink-2 transition-transform', open && 'rotate-180')} />
      </button>

      {/* Desktop: pill flutuante — arrastável, mas solta e ela volta sozinha
          pro canto (ver handlePillPointer* acima). */}
      <button
        type="button"
        onClick={handlePillClick}
        onPointerDown={handlePillPointerDown}
        onPointerMove={handlePillPointerMove}
        onPointerUp={handlePillPointerEnd}
        onPointerCancel={handlePillPointerEnd}
        className="fixed right-5 bottom-5 z-40 hidden touch-none items-center gap-2 rounded-full bg-wa-brand-600 px-4.5 py-3 text-[13.5px] font-bold text-white shadow-[0_6px_18px_rgba(14,158,110,.35)] hover:bg-wa-brand-700 sm:flex"
        style={{
          transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,
          transition: dragging ? 'none' : 'transform 450ms cubic-bezier(0.34,1.56,0.64,1)',
          cursor: dragging ? 'grabbing' : 'grab',
        }}
      >
        <ClipboardCheck className="size-4" />
        Configuração {percent}%
      </button>
    </>
  );
}
