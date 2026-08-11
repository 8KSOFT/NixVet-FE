export interface Tutor {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  address: string;
  cep: string;
  /** URL pré-assinada da foto de perfil — expira, não guardar. */
  photo_url?: string | null;
  /**
   * Cadastro criado só com nome e telefone — pelo chatbot ou pelo vet em
   * atendimento de campo, onde parar para pedir CPF trava o trabalho. A marca
   * cai sozinha quando a clínica completa os dados que faltam.
   */
  incomplete_profile?: boolean;
}

export interface TutorPayload {
  name: string;
  cpf: string;
  email: string;
  cep: string;
  phone: string;
  address?: string;
  street?: string;
  number?: string;
}
