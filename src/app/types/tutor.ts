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
