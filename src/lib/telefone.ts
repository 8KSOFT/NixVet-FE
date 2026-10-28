/**
 * Telefone brasileiro: máscara, validação e exibição. Fonte única: todo campo
 * de telefone e toda tela que mostra um usam estas funções, para o mesmo número
 * não aparecer de três jeitos diferentes.
 *
 * Guarda-se e envia-se só os dígitos (`somenteDigitos`); a máscara é só da tela.
 */

export const somenteDigitos = (valor: string): string => valor.replace(/\D/g, '');

/** Quem cola "+55 11 91234-5678" não pode ficar com 13 dígitos num campo de 11. */
function semPais(digitos: string): string {
  return digitos.length > 11 && digitos.startsWith('55') ? digitos.slice(2) : digitos;
}

/** DDD de 11 a 99: o primeiro dígito não é zero e o segundo também não. */
const DDD_VALIDO = /^[1-9][1-9]/;

/**
 * Máscara progressiva, aplicada a cada tecla: `(1`, `(11) 9123`, `(11) 9123-4567`
 * e, ao chegar no 11º dígito, `(11) 91234-5678`. Idempotente: formatar um valor
 * já formatado devolve o mesmo valor.
 */
export function formatarTelefone(valor: string): string {
  const d = semPais(somenteDigitos(valor)).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  if (d.length <= 6) return `(${ddd}) ${resto}`;
  if (d.length <= 10) return `(${ddd}) ${resto.slice(0, 4)}-${resto.slice(4)}`;
  return `(${ddd}) ${resto.slice(0, 5)}-${resto.slice(5)}`;
}

/**
 * Fixo (10 dígitos, começando em 2 a 5 depois do DDD) ou celular (11 dígitos,
 * começando em 9). Celular de 10 dígitos é o formato de antes do nono dígito e
 * não existe mais.
 */
export function telefoneValido(valor: string): boolean {
  const d = semPais(somenteDigitos(valor));
  if (d.length !== 10 && d.length !== 11) return false;
  if (!DDD_VALIDO.test(d)) return false;
  return d.length === 10 ? /[2-5]/.test(d[2]) : d[2] === '9';
}

/**
 * Para mostrar um telefone que veio do banco (dígitos, ou texto livre antigo).
 * Número brasileiro vira `(11) 91234-5678`, com `+55 ` na frente se veio com o
 * código do país. O que não for reconhecível (0800, número de fora, texto) volta
 * como estava: melhor mostrar o original que um número mutilado.
 */
export function exibirTelefone(valor: string | null | undefined): string {
  if (!valor) return '';
  const d = somenteDigitos(valor);
  const comPais = d.length > 11 && d.startsWith('55');
  const nacional = comPais ? d.slice(2) : d;
  if ((nacional.length === 10 || nacional.length === 11) && DDD_VALIDO.test(nacional)) {
    return `${comPais ? '+55 ' : ''}${formatarTelefone(nacional)}`;
  }
  return valor;
}
