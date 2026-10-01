import api, { clearClientSession } from "@/lib/axios";

export interface SessionUser {
  tenant_id: string;
  name: string;
  [key: string]: unknown;
}

/**
 * Guarda o que o cliente precisa saber sobre a sessão — e só isso.
 *
 * O access token **não** passa por aqui: ele chega em cookie HttpOnly emitido
 * pelo backend no login/cadastro/aceite de convite, fora do alcance do JS. O
 * que fica em `localStorage` é dado de exibição (nome, papel, permissões de
 * menu) e o tenant, que não é segredo — ele também vai dentro do JWT, que é a
 * fonte confiável para o servidor.
 *
 * Usado tanto pelo login normal quanto pelo cadastro guiado, que loga o admin
 * automaticamente assim que a clínica é criada — sem essa função duplicada em
 * dois lugares, os dois fluxos divergiam silenciosamente.
 */
export function establishSession(user: SessionUser, tenantCode: string): void {
  localStorage.setItem("tenantId", user.tenant_id);
  localStorage.setItem("tenantCode", tenantCode);
  localStorage.setItem("user", JSON.stringify(semDadoPessoal(user)));
}

/**
 * O e-mail não fica no `localStorage` (01/10/2026): qualquer script que rode
 * na página lê o armazenamento inteiro, e a única tela que o exibia (o banner
 * de confirmação) passou a lê-lo de `/users/profile`. Ficam id, nome, papel,
 * tenant e o carimbo de confirmação — o que o cliente usa para decidir tela.
 */
export function semDadoPessoal(user: SessionUser): SessionUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { email, ...resto } = user;
  return resto as SessionUser;
}

/**
 * Sessões abertas antes de 01/10/2026 ainda têm o e-mail gravado — e o
 * refresh não reescreve o `user` (renewSession descarta o corpo). Roda uma
 * vez ao carregar o app; sem `user` ou já limpo, não faz nada.
 */
export function limparDadoPessoalLegado(): void {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return;
    const user = JSON.parse(raw) as SessionUser;
    if (!("email" in user)) return;
    localStorage.setItem("user", JSON.stringify(semDadoPessoal(user)));
  } catch {
    /* armazenamento indisponível ou JSON inválido — nada a limpar */
  }
}

/** Existe sessão neste navegador? O cookie HttpOnly é invisível ao JS, então
 * a pergunta que dá para responder no cliente é "houve login nesta origem" —
 * a palavra final continua sendo o 401 da API. */
export function hasClientSession(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("user");
}

/**
 * Encerra a sessão: pede ao backend para revogar o refresh token e apagar os
 * cookies (só ele consegue — são HttpOnly) e limpa o resto no cliente.
 * Best-effort: se a chamada falhar, o local é limpo do mesmo jeito.
 */
export async function destroySession(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    // Sessão já expirada/revogada — nada a fazer.
  }
  clearClientSession();
}
