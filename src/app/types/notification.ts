export interface ClinicNotification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  createdAt?: string;
}

export interface NotificationsPaged {
  data: ClinicNotification[];
  total: number;
  page: number;
  totalPages: number;
}
