'use client';

import { X } from 'lucide-react';

import type { DashboardCreateFormDialogProps } from '@/app/types/dashboard-create-form-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export function DashboardCreateFormDialog({
  open,
  onOpenChange,
  title,
  children,
  footer,
  description,
  contentClassName,
  containerClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  titleClassName,
  hideCloseButton = false,
  preventOutsideClose = false,
  preventEscapeClose = false,
}: DashboardCreateFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          // Mobile: herda o bottom sheet do DialogContent base (fixed/bottom,
          // largura cheia, só cantos de cima). Desktop: volta a ser o card
          // centralizado flutuante de sempre.
          // p-0/pb-0 cancelam o padding do DialogContent base (inclusive o
          // md:pb-6 do dialog "normal") — este componente é 100% p-0 por
          // fora, quem dá respiro é o próprio rodapé interno (px-5 pb-5).
          'flex flex-col overflow-hidden border-none bg-white p-0 pb-0',
          // Largura padrão pensada pra formulário de 1-2 colunas (a maioria
          // das telas). Telas com conteúdo genuinamente largo (ex.: prévia
          // lado a lado, tabela de itens) pedem um `contentClassName` maior
          // explicitamente — não inventar `containerClassName` pra encolher
          // por fora, isso só duplica a régua de largura em dois lugares.
          'md:h-fit md:max-h-[90dvh] md:max-w-2xl md:rounded-2xl md:pb-0',
          contentClassName,
        )}
        onInteractOutside={preventOutsideClose ? (event) => event.preventDefault() : undefined}
        onEscapeKeyDown={preventEscapeClose ? (event) => event.preventDefault() : undefined}
      >
        <div
          className={cn(
            'flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-gray-300 bg-[#F2F2F7]',
            containerClassName,
          )}
        >
          <DialogHeader
            className={cn(
              'flex min-h-0 flex-1 flex-col items-start justify-between gap-0 rounded-2xl bg-[#F2F2F7] text-left',
              headerClassName,
            )}
          >
            <div className="flex h-20 w-full shrink-0 items-center justify-between px-4">
              <DialogTitle className={cn('text-[26px] font-semibold leading-tight text-foreground', titleClassName)}>
                {title}
              </DialogTitle>
              {!hideCloseButton && (
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-gray-800 hover:bg-transparent"
                  >
                    <X className="size-5" />
                    <span className="sr-only">Fechar</span>
                  </Button>
                </DialogClose>
              )}
            </div>
            {description && <div className="shrink-0 px-5 pb-4 text-sm text-muted-foreground">{description}</div>}
            {/* Única região que rola — header e footer ficam sempre visíveis,
                mesmo quando o conteúdo não cabe na tela (telas curtas no mobile). */}
            <div
              data-slot="dialog-scroll-body"
              className={cn(
                'w-full min-h-0 flex-1 overflow-y-auto rounded-2xl border-t border-gray-300 bg-white p-5',
                bodyClassName,
              )}
            >
              {children}
            </div>
            {footer && (
              <div className={cn('w-full shrink-0 bg-white px-5 pb-5 pt-4 md:pt-6', footerClassName)}>{footer}</div>
            )}
          </DialogHeader>
        </div>
      </DialogContent>
    </Dialog>
  );
}
