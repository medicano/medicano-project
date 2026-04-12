export type Ordenacao = "distancia" | "avaliacao" | "convenios";

export interface Clinica {
  id: number;
  nome: string;
  endereco: string;
  telefone: string;
  imagem: string;
  distancia: number;
  avaliacao: number;
  especialidades: string[];
  convenios: string[];
  aberto: boolean;
  horario: string;
}

export interface MedicoMock {
  id: string;
  nome: string;
  crm: string;
  especialidade: string;
  bio: string;
}

export interface HorarioDiaMock {
  dia: string;
  /** Ex.: ["08:00 - 12:00", "14:00 - 18:00"] ou vazio se fechado */
  intervalos: string[];
  fechado?: boolean;
}

/** Campos extras do “banco” mock (não existem na listagem) */
export interface ClinicaDetalhesExtra {
  email: string;
  descricao: string;
  medicos: MedicoMock[];
  horariosSemana: HorarioDiaMock[];
  /** Serviços ou diferenciais exibidos na página de detalhes */
  servicos: string[];
}

export type ClinicaCompleta = Clinica & ClinicaDetalhesExtra;
