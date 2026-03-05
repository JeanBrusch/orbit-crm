"use client";

/**
 * use-leads — ORBIT CRM
 * Fetches leads from Supabase on mount.
 * Falls back to mock data if Supabase is not configured (dev mode).
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { leadsData, type Lead, type PipelineStage } from "@/types/orbit-types";
import {
  fetchLeads,
  createLead,
  updateLead,
  addInteraction,
  addNote,
} from "@/lib/data-service";
import type { Interaction, Note } from "@/types/orbit-types";

// Extended lead data for Strata Stream
export interface StrataLead extends Lead {
  matchScore: number;
  heatScore: number;
  timelineScore: number;
  stageIndex: number;
  intentTokens: string[];
  lastInteractionAgo: string;
  activityHistory: number[];
  operationalBadge: string | null;
}

export type ViewMode = "orbit" | "stream";

const stageToIndex: Record<PipelineStage, number> = {
  contact: 0,
  exploration: 0,
  interest: 1,
  negotiation: 2,
  closed: 3,
};

export const STRATA_STAGES = [
  { key: "exploration", label: "Exploracao", color: "#3b82f6" },
  { key: "interest", label: "Interesse", color: "#eab308" },
  { key: "negotiation", label: "Negociacao", color: "#f97316" },
  { key: "closing", label: "Fechamento", color: "#22c55e" },
] as const;

function generateSparkline(seed: number, length = 12): number[] {
  const data: number[] = [];
  let val = 30 + (seed % 40);
  for (let i = 0; i < length; i++) {
    val += Math.sin(seed * 0.3 + i * 0.5) * 15 + (Math.random() - 0.5) * 10;
    data.push(Math.max(5, Math.min(100, val)));
  }
  return data;
}

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min`;
  if (hours < 24) return `${hours}h`;
  if (days === 1) return "ontem";
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}m`;
}

const intentTokenMap: Record<string, string[]> = {
  "1": ["#vistamar", "#cobertura", "#premium"],
  "2": ["#investimento", "#renda", "#aluguel"],
  "3": ["#indicacao", "#altopadrao", "#exclusivo"],
  "4": ["#posvenda", "#acompanhamento"],
  "5": ["#familia", "#lazer", "#natureza"],
};

function deriveOperationalBadge(lead: Lead): string | null {
  if (lead.followUp?.isActive && lead.followUp.date) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(lead.followUp.date);
    target.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((target.getTime() - now.getTime()) / 86400000);
    if (daysUntil <= 0) return "FOLLOW-UP HOJE";
    if (daysUntil === 1) return "FOLLOW-UP AMANHA";
  }
  const lastInteraction = lead.interactions[0];
  if (lastInteraction) {
    const daysSince = Math.floor(
      (Date.now() - lastInteraction.timestamp.getTime()) / 86400000,
    );
    if (lastInteraction.type === "visita" && daysSince < 3)
      return "VISITA RECENTE";
    if (lead.pipelineStage === "negotiation") return "PROPOSTA ENVIADA";
    if (daysSince > 7) return "AGUARDANDO RESPOSTA";
  }
  if (lead.pipelineStage === "closed") return "FECHADO";
  return null;
}

// Check if Supabase is configured
function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("orbit");

  // Load leads from Supabase (or mock data as fallback)
  useEffect(() => {
    async function loadLeads() {
      setLoading(true);
      setError(null);
      try {
        if (isSupabaseConfigured()) {
          const data = await fetchLeads();
          setLeads(data);
        } else {
          // Fallback to mock data for local dev without Supabase
          console.warn("[useLeads] Supabase not configured — using mock data");
          setLeads(leadsData);
        }
      } catch (err) {
        console.error("[useLeads] Failed to fetch leads:", err);
        setError("Erro ao carregar leads do banco de dados");
        setLeads(leadsData); // fallback
      } finally {
        setLoading(false);
      }
    }
    loadLeads();
  }, []);

  // Enrich leads with Strata-specific data
  const strataLeads: StrataLead[] = useMemo(() => {
    return leads.map((lead, idx) => {
      const interactionCount = lead.interactions.length;
      const noteCount = lead.notes.length;
      const lastDate =
        lead.interactions[0]?.timestamp || lead.notes[0]?.timestamp;
      const daysInactive = lastDate
        ? Math.floor((Date.now() - lastDate.getTime()) / 86400000)
        : 999;

      const matchScore = Math.min(
        100,
        Math.max(
          10,
          interactionCount * 15 +
            noteCount * 10 +
            (lead.isPriority ? 20 : 0) -
            daysInactive * 2,
        ),
      );
      const heatScore = Math.min(
        100,
        Math.max(5, Math.max(0, 100 - daysInactive * 3) + interactionCount * 8),
      );
      const stageIndex = stageToIndex[lead.pipelineStage];
      const stageBase = stageIndex / 3;
      const stageRange = 1 / 3;
      const seed = parseInt(lead.id.replace(/\D/g, ""), 10) || idx;
      const inStageOffset = (((seed * 7 + 13) % 100) / 100) * stageRange * 0.7;
      const timelineScore = Math.max(
        0.03,
        Math.min(0.97, stageBase + inStageOffset + 0.05),
      );
      const tokens = intentTokenMap[lead.id] || [
        `#${lead.origin.toLowerCase().replace(/\s+/g, "")}`,
        `#${lead.property.toLowerCase().replace(/\s+/g, "_")}`,
      ];
      const operationalBadge = deriveOperationalBadge(lead);

      return {
        ...lead,
        matchScore,
        heatScore,
        timelineScore,
        stageIndex,
        intentTokens: tokens,
        lastInteractionAgo: lastDate ? formatTimeAgo(lastDate) : "sem contato",
        activityHistory: generateSparkline(seed),
        operationalBadge,
      };
    });
  }, [leads]);

  // Add lead (persists to Supabase if configured)
  const addLead = useCallback(async (lead: Lead) => {
    try {
      if (isSupabaseConfigured()) {
        // Garante UUID válido independente do id gerado pelo app
        const uuid = crypto.randomUUID();
        const created = await createLead({
          id: uuid,
          name: lead.name,
          role: lead.role,
          avatar: lead.avatar,
          phone: lead.phone,
          origin: lead.origin,
          property: lead.property,
          pipelineStage: lead.pipelineStage,
          isPriority: lead.isPriority,
          keywords: lead.keywords,
          followUp: lead.followUp,
        });
        setLeads((prev) => [
          ...prev,
          { ...created, interactions: [], notes: [] },
        ]);
      } else {
        setLeads((prev) => [...prev, lead]);
      }
    } catch (err) {
      console.error("[useLeads] addLead error:", err);
      setLeads((prev) => [...prev, lead]); // optimistic fallback
    }
  }, []);

  // Update lead stage (persists to Supabase if configured)
  const updateLeadStage = useCallback(
    async (leadId: string, stage: PipelineStage) => {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, pipelineStage: stage } : l)),
      );
      if (isSupabaseConfigured()) {
        try {
          await updateLead(leadId, { pipelineStage: stage });
        } catch (err) {
          console.error("[useLeads] updateLeadStage error:", err);
        }
      }
    },
    [],
  );

  // Add interaction to a lead
  const addLeadInteraction = useCallback(
    async (leadId: string, interaction: Omit<Interaction, "id">) => {
      const tempId = `temp-${Date.now()}`;
      const newInteraction: Interaction = { ...interaction, id: tempId };

      // Optimistic update
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? { ...l, interactions: [newInteraction, ...l.interactions] }
            : l,
        ),
      );

      if (isSupabaseConfigured()) {
        try {
          const saved = await addInteraction(leadId, interaction);
          setLeads((prev) =>
            prev.map((l) =>
              l.id === leadId
                ? {
                    ...l,
                    interactions: l.interactions.map((i) =>
                      i.id === tempId ? saved : i,
                    ),
                  }
                : l,
            ),
          );
        } catch (err) {
          console.error("[useLeads] addLeadInteraction error:", err);
        }
      }
    },
    [],
  );

  // Add note to a lead
  const addLeadNote = useCallback(
    async (leadId: string, note: Omit<Note, "id">) => {
      const tempId = `temp-${Date.now()}`;
      const newNote: Note = { ...note, id: tempId };

      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, notes: [newNote, ...l.notes] } : l,
        ),
      );

      if (isSupabaseConfigured()) {
        try {
          const saved = await addNote(leadId, note);
          setLeads((prev) =>
            prev.map((l) =>
              l.id === leadId
                ? {
                    ...l,
                    notes: l.notes.map((n) => (n.id === tempId ? saved : n)),
                  }
                : l,
            ),
          );
        } catch (err) {
          console.error("[useLeads] addLeadNote error:", err);
        }
      }
    },
    [],
  );

  return {
    leads,
    strataLeads,
    loading,
    error,
    selectedLead,
    setSelectedLead,
    viewMode,
    setViewMode,
    addLead,
    updateLeadStage,
    addLeadInteraction,
    addLeadNote,
  };
}
