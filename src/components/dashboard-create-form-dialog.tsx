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
          'grid-cols-1 h-fit max-h-[90vh] max-w-[calc(100%-4rem)] overflow-y-auto overflow-x-hidden rounded-2xl border-none bg-white p-0 modal-responsive',
          contentClassName,
        )}
        onInteractOutside={preventOutsideClose ? (event) => event.preventDefault() : undefined}
        onEscapeKeyDown={preventEscapeClose ? (event) => event.preventDefault() : undefined}
      >
        <div className={cn('w-full overflow-hidden rounded-2xl border border-gray-300 bg-[#F2F2F7]', containerClassName)}>
          <DialogHeader
            className={cn(
              'flex flex-col items-start justify-between gap-0 rounded-2xl bg-[#F2F2F7] text-left',
              headerClassName,
            )}
          >
            <div className="flex h-20 w-full items-center justify-between px-4">
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
            {description && <div className="px-5 pb-4 text-sm text-muted-foreground">{description}</div>}
            <div className={cn('w-full rounded-2xl border-t border-gray-300 bg-white p-5', bodyClassName)}>
              {children}
              {footer && <div className={cn('mt-4 md:mt-6', footerClassName)}>{footer}</div>}
            </div>
          </DialogHeader>
        </div>
      </DialogContent>
    </Dialog>
  );
}
