import type {
  ClinicaCompleta,
  ClinicaDetalhesExtra,
  HorarioDiaMock,
  MedicoMock,
} from "@/types/clinic";
import { CLINICAS } from "./clinics";

/** Gera grade semanal a partir do horário resumido do card (dados estáticos). */
function gradeSemanal(
  segASex: string,
  sabado: string | "fechado",
): HorarioDiaMock[] {
  const diasUteis = [
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
  ];
  const arr: HorarioDiaMock[] = diasUteis.map((dia) => ({
    dia,
    intervalos: [segASex],
  }));
  arr.push(
    sabado === "fechado"
      ? { dia: "Sábado", intervalos: [], fechado: true }
      : { dia: "Sábado", intervalos: [sabado] },
  );
  arr.push({ dia: "Domingo", intervalos: [], fechado: true });
  return arr;
}

function gradeComAlmoco(
  manha: string,
  tarde: string,
  sabadoManha: string | "fechado",
): HorarioDiaMock[] {
  const diasUteis = [
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
  ];
  const arr: HorarioDiaMock[] = diasUteis.map((dia) => ({
    dia,
    intervalos: [manha, tarde],
  }));
  arr.push(
    sabadoManha === "fechado"
      ? { dia: "Sábado", intervalos: [], fechado: true }
      : { dia: "Sábado", intervalos: [sabadoManha] },
  );
  arr.push({ dia: "Domingo", intervalos: [], fechado: true });
  return arr;
}

/**
 * Mock database: mapa id → detalhes extras.
 * Os dados da listagem (nome, endereço, telefone, horário resumido, etc.)
 * vêm de `CLINICAS`; aqui só entram campos adicionais da “tabela” de detalhes.
 */
export const MOCK_CLINIC_DETAILS_DB: Record<number, ClinicaDetalhesExtra> = {
  1: {
    email: "contato@saolucas.com.br",
    descricao:
      "A Clínica São Lucas atua há mais de 15 anos no Jardins com foco em cardiologia preventiva, atendimento geral e saúde da mulher. Estrutura com sala de repouso, eletrocardiograma e agendamento online.",
    medicos: [
      {
        id: "m1-1",
        nome: "Dr. Carlos Mendes",
        crm: "CRM-SP 128.447",
        especialidade: "Cardiologia",
        bio: "Especialista em insuficiência cardíaca e hipertensão; atendimento em português e inglês.",
      },
      {
        id: "m1-2",
        nome: "Dra. Ana Paula Souza",
        crm: "CRM-SP 156.902",
        especialidade: "Ginecologia",
        bio: "Ginecologia clínica e obstetrícia de baixo risco; consultas com hora marcada.",
      },
      {
        id: "m1-3",
        nome: "Dr. Roberto Lima",
        crm: "CRM-SP 98.221",
        especialidade: "Clínica Geral",
        bio: "Clínico geral com ênfase em check-ups e acompanhamento de doenças crônicas.",
      },
    ],
    horariosSemana: gradeSemanal("08:00 - 18:00", "08:00 - 12:00"),
    servicos: [
      "Consultas e retornos",
      "Eletrocardiograma",
      "Vacinação (conforme calendário)",
      "Telemedicina para retorno",
    ],
  },
  2: {
    email: "agendamento@cmpaulista.com.br",
    descricao:
      "Centro multidisciplinar na Paulista com neurologia, ortopedia, fisioterapia e nutrição. Corpo clínico amplo e salas de reabilitação.",
    medicos: [
      {
        id: "m2-1",
        nome: "Dra. Fernanda Rocha",
        crm: "CRM-SP 201.334",
        especialidade: "Neurologia",
        bio: "Cefaleia, distúrbios do sono e doenças neurodegenerativas leves.",
      },
      {
        id: "m2-2",
        nome: "Dr. Gustavo Almeida",
        crm: "CRM-SP 167.889",
        especialidade: "Ortopedia",
        bio: "Ombro, joelho e coluna; indicação cirúrgica quando necessário.",
      },
      {
        id: "m2-3",
        nome: "Dra. Juliana Prado",
        crm: "CRN-3 45.112",
        especialidade: "Nutrição",
        bio: "Planos alimentares para emagrecimento, esporte e doenças metabólicas.",
      },
      {
        id: "m2-4",
        nome: "Dr. Pedro Nogueira",
        crm: "CREFITO 098765",
        especialidade: "Fisioterapia",
        bio: "RPG, pilates clínico e reabilitação pós-cirúrgica.",
      },
    ],
    horariosSemana: gradeComAlmoco("07:00 - 13:00", "14:00 - 20:00", "08:00 - 13:00"),
    servicos: [
      "Fisioterapia e pilates",
      "Avaliação nutricional",
      "Exames de imagem (parceiros)",
      "Estacionamento conveniado",
    ],
  },
  3: {
    email: "recepcao@saudevida.com.br",
    descricao:
      "Instituto com ambiente acolhedor em Pinheiros, focado em dermatologia clínica e pediatria. Atendimento por convênio e particular.",
    medicos: [
      {
        id: "m3-1",
        nome: "Dra. Mariana Duarte",
        crm: "CRM-SP 189.556",
        especialidade: "Dermatologia",
        bio: "Acne, rosácea, câncer de pele (mapeamento) e procedimentos mínimos.",
      },
      {
        id: "m3-2",
        nome: "Dr. Lucas Ferreira",
        crm: "CRM-SP 212.003",
        especialidade: "Pediatria",
        bio: "Puericultura, vacinas e orientação a pais de primeira viagem.",
      },
    ],
    horariosSemana: gradeSemanal("09:00 - 17:00", "09:00 - 13:00"),
    servicos: [
      "Puericultura",
      "Mapeamento de pintas",
      "Pequenos procedimentos dermatológicos",
    ],
  },
  4: {
    email: "contato@maiscuidar.com.br",
    descricao:
      "Clínica especializada em olhos e ouvido, com sala escura para exames e microscopia. Localização privilegiada na Augusta.",
    medicos: [
      {
        id: "m4-1",
        nome: "Dr. Rafael Costa",
        crm: "CRM-SP 145.667",
        especialidade: "Oftalmologia",
        bio: "Catarata, glaucoma e refração; cirurgias em hospital parceiro.",
      },
      {
        id: "m4-2",
        nome: "Dra. Beatriz Martins",
        crm: "CRM-SP 178.990",
        especialidade: "Otorrinolaringologia",
        bio: "Rinite, sinusite e audição; testes auditivos no local.",
      },
    ],
    horariosSemana: gradeComAlmoco("08:00 - 12:00", "14:00 - 19:00", "08:00 - 12:00"),
    servicos: [
      "Campimetria e OCT (agendamento)",
      "Teste auditivo",
      "Lentes de contato",
    ],
  },
  5: {
    email: "central@viverbem.com.br",
    descricao:
      "Hospital-dia com foco em saúde mental e endócrino. Equipe multidisciplinar e salas de grupo para terapia.",
    medicos: [
      {
        id: "m5-1",
        nome: "Dra. Camila Torres",
        crm: "CRM-SP 223.441",
        especialidade: "Psiquiatria",
        bio: "Transtornos de humor e ansiedade; acompanhamento com psicólogos da casa.",
      },
      {
        id: "m5-2",
        nome: "Dr. André Vieira",
        crm: "CRM-SP 134.778",
        especialidade: "Psicologia",
        bio: "TCC e abordagem breve; atendimento adulto e adolescente.",
      },
      {
        id: "m5-3",
        nome: "Dra. Helena Braga",
        crm: "CRM-SP 199.002",
        especialidade: "Endocrinologia",
        bio: "Diabetes, tireoide e obesidade.",
      },
    ],
    horariosSemana: gradeComAlmoco("07:00 - 13:00", "14:00 - 22:00", "08:00 - 14:00"),
    servicos: [
      "Grupos terapêuticos",
      "Orientação nutricional para diabetes",
      "Plantão de triagem telefônica",
    ],
  },
  6: {
    email: "atendimento@clinicapopularcidade.com.br",
    descricao:
      "Rede de atenção básica com preços acessíveis e foco em clínica geral, pediatria e ortopedia. Ideal para famílias do entorno de Santana.",
    medicos: [
      {
        id: "m6-1",
        nome: "Dr. Paulo Henrique Dias",
        crm: "CRM-SP 87.334",
        especialidade: "Clínica Geral",
        bio: "Consultas de rotina e encaminhamentos.",
      },
      {
        id: "m6-2",
        nome: "Dra. Larissa Gomes",
        crm: "CRM-SP 205.118",
        especialidade: "Pediatria",
        bio: "Atendimento infantil e puericultura.",
      },
      {
        id: "m6-3",
        nome: "Dr. Marcos Silveira",
        crm: "CRM-SP 112.905",
        especialidade: "Ortopedia",
        bio: "Fraturas simples, gesso e orientação pós-trauma.",
      },
    ],
    horariosSemana: gradeSemanal("08:00 - 17:00", "fechado"),
    servicos: [
      "Consultas populares",
      "Pequenos curativos",
      "Encaminhamento à rede pública",
    ],
  },
  7: {
    email: "oncologia@medcenter.com.br",
    descricao:
      "Unidade de referência em oncologia e hematologia com protocolos alinhados a centros de excelência. Ambiente preparado para quimioterapia ambulatorial.",
    medicos: [
      {
        id: "m7-1",
        nome: "Dr. Eduardo Sampaio",
        crm: "CRM-SP 88.990",
        especialidade: "Oncologia",
        bio: "Oncologia clínica e discussão de casos em tumor board semanal.",
      },
      {
        id: "m7-2",
        nome: "Dra. Isabela Moura",
        crm: "CRM-SP 176.223",
        especialidade: "Hematologia",
        bio: "Anemias, linfomas e acompanhamento de quimioterapia.",
      },
      {
        id: "m7-3",
        nome: "Dr. Felipe Cardoso",
        crm: "CRM-SP 154.667",
        especialidade: "Cardiologia",
        bio: "Cardio-oncologia e avaliação pré-tratamento.",
      },
    ],
    horariosSemana: gradeComAlmoco("07:30 - 12:30", "13:30 - 20:00", "fechado"),
    servicos: [
      "Quimioterapia ambulatorial",
      "Infusões",
      "Suporte enfermagem 24h (linha telefônica)",
    ],
  },
  8: {
    email: "contato@bemestarconsultorios.com.br",
    descricao:
      "Consultórios focados em trato digestivo e proctologia, com preparo orientado e sigilo no atendimento.",
    medicos: [
      {
        id: "m8-1",
        nome: "Dr. Thiago Ramos",
        crm: "CRM-SP 141.556",
        especialidade: "Gastroenterologia",
        bio: "Endoscopia digestiva em centro credenciado; hepatites e refluxo.",
      },
      {
        id: "m8-2",
        nome: "Dr. Vinícius Pacheco",
        crm: "CRM-SP 168.334",
        especialidade: "Proctologia",
        bio: "Doenças anorretais e rastreamento de câncer colorretal.",
      },
    ],
    horariosSemana: gradeSemanal("08:00 - 18:00", "08:00 - 12:00"),
    servicos: [
      "Preparo para colonoscopia (orientação)",
      "Teste do fígado gorduroso",
    ],
  },
  9: {
    email: "agenda@pequenoprincipe.com.br",
    descricao:
      "Referência em pediatria na região, com neuropediatria e fonoaudiologia no mesmo endereço. Brinquedoteca e sala de espera infantil.",
    medicos: [
      {
        id: "m9-1",
        nome: "Dra. Renata Oliveira",
        crm: "CRM-SP 192.445",
        especialidade: "Pediatria",
        bio: "Puericultura e vacinação completa.",
      },
      {
        id: "m9-2",
        nome: "Dr. Bruno Carvalho",
        crm: "CRM-SP 207.889",
        especialidade: "Neuropediatria",
        bio: "TDAH, TEA e epilepsia infantil.",
      },
      {
        id: "m9-3",
        nome: "Dra. Patrícia Leme",
        crm: "CRFa 98765",
        especialidade: "Fonoaudiologia",
        bio: "Fala, linguagem e deglutição.",
      },
    ],
    horariosSemana: gradeComAlmoco("07:00 - 12:00", "13:00 - 19:00", "08:00 - 13:00"),
    servicos: [
      "Vacinação",
      "Avaliação do desenvolvimento",
      "Sala de espera com monitoramento infantil",
    ],
  },
  10: {
    email: "recepcao@espacohigienopolis.com.br",
    descricao:
      "Espaço médico em Higienópolis com dermatologia, ginecologia e endocrinologia. Atendimento personalizado e horários estendidos em alguns dias.",
    medicos: [
      {
        id: "m10-1",
        nome: "Dra. Luiza Freitas",
        crm: "CRM-SP 183.221",
        especialidade: "Dermatologia",
        bio: "Cosmiatria e dermatologia clínica.",
      },
      {
        id: "m10-2",
        nome: "Dra. Gabriela Nunes",
        crm: "CRM-SP 195.667",
        especialidade: "Ginecologia",
        bio: "Saúde da mulher e planejamento familiar.",
      },
      {
        id: "m10-3",
        nome: "Dr. Daniel Castro",
        crm: "CRM-SP 171.998",
        especialidade: "Endocrinologia",
        bio: "Tireoide, diabetes e reprodução assistida (orientação).",
      },
    ],
    horariosSemana: gradeSemanal("08:00 - 18:00", "08:00 - 12:00"),
    servicos: [
      "Pequenos procedimentos dermatológicos",
      "Ultrassom obstétrico (parceiro)",
      "Exames laboratoriais (coleta)",
    ],
  },
};

export function getClinicaCompletaPorId(id: number): ClinicaCompleta | null {
  const base = CLINICAS.find((c) => c.id === id);
  const extra = MOCK_CLINIC_DETAILS_DB[id];
  if (!base || !extra) return null;
  return { ...base, ...extra };
}

/** Lista todos os ids que existem no mock de detalhes (útil para testes). */
export const MOCK_CLINIC_DETAIL_IDS = Object.keys(MOCK_CLINIC_DETAILS_DB).map(
  Number,
);
