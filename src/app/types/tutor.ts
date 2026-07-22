export interface Tutor {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  address: string;
  cep: string;
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
