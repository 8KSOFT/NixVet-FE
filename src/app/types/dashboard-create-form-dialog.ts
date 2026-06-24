import type { ReactNode } from 'react';

export interface DashboardCreateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  description?: ReactNode;
  contentClassName?: string;
  containerClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  titleClassName?: string;
  hideCloseButton?: boolean;
  preventOutsideClose?: boolean;
  preventEscapeClose?: boolean;
}
