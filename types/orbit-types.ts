// ===== ORBIT Shared Types =====

// Pipeline stages for lead progression
export type PipelineStage =
  | "contact"
  | "exploration"
  | "interest"
  | "negotiation"
  | "closed";

// Temporal depth layer
export type DepthLayer = "surface" | "mid" | "deep";

// Interaction types
export type InteractionType =
  | "ligacao"
  | "visita"
  | "contato"
  | "outro"
  | "system";

// Core state for the central ORBIT element
export type CoreState = "idle" | "listening" | "processing" | "responding";

export interface Interaction {
  id: string;
  type: InteractionType;
  text?: string;
  timestamp: Date;
  context?: string;
}

export interface Note {
  id: string;
  text: string;
  timestamp: Date;
}

export interface Lead {
  id: string;
  name: string;
  role: string;
  avatar: string;
  phone: string;
  origin: string;
  property: string;
  pipelineStage: PipelineStage;
  isPriority: boolean;
  interactions: Interaction[];
  notes: Note[];
  followUp?: { date: Date; note?: string; isActive: boolean };
  keywords: string[];
  profile_image_url?: string;
}

// ===== Utility functions =====

/** Days since a given date */
export function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

/** Memory gravity calculation -- higher = more engagement */
export function calculateGravity(lead: Lead): number {
  const interactionCount = lead.interactions.length;
  const noteCount = lead.notes.length;
  const visitCount = lead.interactions.filter(
    (i) => i.type === "visita",
  ).length;

  let gravity = interactionCount * 2 + noteCount * 3 + visitCount * 5;

  const lastInteraction = lead.interactions[0]?.timestamp;
  const lastNote = lead.notes[0]?.timestamp;
  const lastActivity =
    lastInteraction && lastNote
      ? new Date(Math.max(lastInteraction.getTime(), lastNote.getTime()))
      : lastInteraction || lastNote;

  if (lastActivity) {
    const daysInactive = daysSince(lastActivity);
    gravity = Math.max(0, gravity - daysInactive * 0.05);
  }

  return gravity;
}

/** Get temporal depth layer based on last interaction */
export function getDepthLayer(lead: Lead): DepthLayer {
  const lastInteraction = lead.interactions[0]?.timestamp;
  if (!lastInteraction) return "deep";
  const days = daysSince(lastInteraction);
  if (days < 30) return "surface";
  if (days <= 120) return "mid";
  return "deep";
}

/** Is lead silent (no interaction > 30 days) */
export function isSilent(lead: Lead): boolean {
  const lastInteraction = lead.interactions[0]?.timestamp;
  if (!lastInteraction) return false;
  return daysSince(lastInteraction) > 30;
}
/** Follow-up remaining days (null if no active follow-up) */
export function followUpRemainingDays(lead: Lead): number | null {
  if (!lead.followUp?.isActive || !lead.followUp.date) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(lead.followUp.date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

// ===== Sample Data =====

export const leadsData: Lead[] = [
  {
    id: "1",
    name: "Marina Costa",
    role: "Lider de Produto",
    avatar: "MC",
    phone: "(84) 99912-3456",
    origin: "Portal Imovelweb",
    property: "Laguna Premium",
    pipelineStage: "interest",
    isPriority: true,
    interactions: [
      {
        id: "i1",
        type: "ligacao",
        text: "Confirmou interesse na cobertura.",
        timestamp: new Date(Date.now() - 1800000),
        context: "Laguna Premium",
      },
      {
        id: "i2",
        type: "visita",
        text: "Visita ao decorado agendada.",
        timestamp: new Date(Date.now() - 7200000),
        context: "Laguna Premium",
      },
      {
        id: "i3",
        type: "contato",
        text: "Material com plantas enviado.",
        timestamp: new Date(Date.now() - 86400000),
        context: "Laguna Premium",
      },
    ],
    notes: [
      {
        id: "n1",
        text: "Preferencia forte por vista mar. Orcamento ate R$2.5M. Marido engenheiro, ela advogada.",
        timestamp: new Date(Date.now() - 86400000),
      },
      {
        id: "n2",
        text: "Tem dois filhos, busca area com escola proxima.",
        timestamp: new Date(Date.now() - 172800000),
      },
    ],
    followUp: { date: new Date(Date.now() + 86400000 * 2), isActive: true },
    keywords: [
      "quente",
      "hot",
      "engajado",
      "respondeu",
      "ativo",
      "intencao",
      "compra",
      "prioridade",
    ],
  },
  {
    id: "2",
    name: "Lucas Ferreira",
    role: "Cliente Enterprise",
    avatar: "LF",
    phone: "(84) 99887-6543",
    origin: "Instagram Ads",
    property: "Cobertura 402",
    pipelineStage: "exploration",
    isPriority: false,
    interactions: [
      {
        id: "i4",
        type: "contato",
        text: "Primeiro contato via WhatsApp.",
        timestamp: new Date(Date.now() - 3600000),
        context: "Cobertura 402",
      },
      {
        id: "i5",
        type: "ligacao",
        text: "Nao atendeu na primeira tentativa.",
        timestamp: new Date(Date.now() - 86400000),
      },
    ],
    notes: [
      {
        id: "n3",
        text: "Investidor. Busca imovel para renda com aluguel.",
        timestamp: new Date(Date.now() - 3600000),
      },
    ],
    followUp: undefined,
    keywords: ["quente", "warm", "respondeu", "hoje", "ativo", "atmosfera"],
  },
  {
    id: "3",
    name: "Ana Rodrigues",
    role: "Parceira Estrategica",
    avatar: "AR",
    phone: "(84) 99765-4321",
    origin: "Indicacao",
    property: "Torre Oceano",
    pipelineStage: "contact",
    isPriority: false,
    interactions: [
      {
        id: "i6",
        type: "contato",
        text: "Indicacao do Dr. Roberto.",
        timestamp: new Date(Date.now() - 7200000),
      },
    ],
    notes: [
      {
        id: "n4",
        text: "Indicacao do Dr. Roberto. Alto padrao.",
        timestamp: new Date(Date.now() - 7200000),
      },
    ],
    followUp: undefined,
    keywords: [
      "target",
      "alvo",
      "estrategico",
      "intencao",
      "compra",
      "prioridade",
      "engajado",
    ],
  },
  {
    id: "4",
    name: "Pedro Santos",
    role: "Consultor Tecnico",
    avatar: "PS",
    phone: "(84) 99654-3210",
    origin: "WhatsApp Direto",
    property: "Vista Mar",
    pipelineStage: "closed",
    isPriority: false,
    interactions: [
      {
        id: "i7",
        type: "ligacao",
        text: "Ligacao de acompanhamento pos-venda.",
        timestamp: new Date(Date.now() - 86400000 * 45),
      },
    ],
    notes: [],
    followUp: undefined,
    keywords: ["silencioso", "neutro", "sem resposta", "atencao"],
  },
  {
    id: "5",
    name: "Julia Mendes",
    role: "Relacoes com Investidores",
    avatar: "JM",
    phone: "(84) 99543-2109",
    origin: "Evento Presencial",
    property: "Residencial Park",
    pipelineStage: "negotiation",
    isPriority: true,
    interactions: [
      {
        id: "i8",
        type: "visita",
        text: "Visitou o empreendimento. Gostou da area de lazer.",
        timestamp: new Date(Date.now() - 3600000),
        context: "Residencial Park",
      },
      {
        id: "i9",
        type: "ligacao",
        text: "Discutindo condicoes de pagamento.",
        timestamp: new Date(Date.now() - 86400000),
        context: "Residencial Park",
      },
      {
        id: "i10",
        type: "contato",
        text: "Proposta formal por email.",
        timestamp: new Date(Date.now() - 172800000),
        context: "Residencial Park",
      },
      {
        id: "i11",
        type: "visita",
        text: "Segunda visita com familia.",
        timestamp: new Date(Date.now() - 259200000),
        context: "Residencial Park",
      },
    ],
    notes: [
      {
        id: "n5",
        text: "Professora universitaria. Quer mudar de Parnamirim para Natal.",
        timestamp: new Date(Date.now() - 172800000),
      },
      {
        id: "n6",
        text: "Gosta de espacos abertos e contato com natureza.",
        timestamp: new Date(Date.now() - 259200000),
      },
    ],
    followUp: { date: new Date(Date.now() + 86400000), isActive: true },
    keywords: [
      "quente",
      "hot",
      "intencao",
      "compra",
      "prioridade",
      "ativo",
      "atmosfera",
    ],
  },
];

// ===== Pipeline Stage Config =====

export const PIPELINE_STAGES: { key: PipelineStage; label: string }[] = [
  { key: "contact", label: "Contato" },
  { key: "exploration", label: "Exploracao" },
  { key: "interest", label: "Interesse Concreto" },
  { key: "negotiation", label: "Negociacao" },
  { key: "closed", label: "Fechado" },
];

export const STAGE_COLORS: Record<PipelineStage, string> = {
  negotiation: "rgba(var(--orbit-glow-rgb), 0.7)",
  interest: "rgba(52, 211, 153, 0.6)",
  exploration: "rgba(251, 191, 36, 0.5)",
  contact: "rgba(148, 163, 184, 0.4)",
  closed: "rgba(100, 116, 139, 0.3)",
};
