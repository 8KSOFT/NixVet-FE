import { setTenantCookie } from "@/lib/axios";

export interface SessionUser {
  tenant_id: string;
  name: string;
  [key: string]: unknown;
}

/**
 * Grava a sessão (token + tenant) em localStorage/cookie. Usado tanto pelo
 * login normal quanto pelo cadastro guiado, que loga o admin automaticamente
 * assim que a clínica é criada — sem essa função duplicada em dois lugares,
 * os dois fluxos divergiam silenciosamente.
 */
export function establishSession(
  accessToken: string,
  user: SessionUser,
  tenantCode: string,
): void {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("tenantId", user.tenant_id);
  localStorage.setItem("tenantCode", tenantCode);
  localStorage.setItem("user", JSON.stringify(user));
  setTenantCookie(user.tenant_id);
}
