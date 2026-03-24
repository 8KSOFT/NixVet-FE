/**
 * Espelha backend/src/core/rbac/permissions.ts — usado como fallback se `user.permissions` não existir (sessões antigas).
 */
const MENU_BY_ROLE: Record<string, readonly string[]> = {
  superadmin: [
    'dashboard',
    'patients',
    'owners',
    'team',
    'prescriptions',
    'bulario',
    'exams',
    'followups',
    'calendar',
    'vaccines',
    'tasks',
    'whatsapp',
    'settings',
  ],
  admin: [
    'dashboard',
    'patients',
    'owners',
    'team',
    'prescriptions',
    'bulario',
    'exams',
    'followups',
    'calendar',
    'vaccines',
    'tasks',
    'whatsapp',
    'settings',
  ],
  manager: [
    'dashboard',
    'patients',
    'owners',
    'team',
    'prescriptions',
    'bulario',
    'exams',
    'followups',
    'calendar',
    'vaccines',
    'tasks',
    'whatsapp',
    'settings',
  ],
  reception: [
    'dashboard',
    'patients',
    'owners',
    'calendar',
    'vaccines',
    'tasks',
    'whatsapp',
  ],
  intern: ['dashboard', 'patients', 'owners', 'calendar', 'vaccines', 'tasks'],
  veterinarian: [
    'dashboard',
    'patients',
    'owners',
    'prescriptions',
    'bulario',
    'exams',
    'followups',
    'calendar',
    'vaccines',
    'tasks',
    'whatsapp',
  ],
};

export function menuKeysForRole(role: string | null | undefined): string[] {
  const r = (role || 'veterinarian').toLowerCase().trim();
  return [...(MENU_BY_ROLE[r] ?? MENU_BY_ROLE.veterinarian)];
}

export function getStoredMenuKeys(): string[] {
  if (typeof window === 'undefined') return MENU_BY_ROLE.veterinarian;
  try {
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    if (Array.isArray(user?.permissions) && user.permissions.length > 0) {
      return user.permissions as string[];
    }
    return menuKeysForRole(user?.role);
  } catch {
    return menuKeysForRole('veterinarian');
  }
}

export function getStoredUserRole(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    return user?.role ?? null;
  } catch {
    return null;
  }
}
