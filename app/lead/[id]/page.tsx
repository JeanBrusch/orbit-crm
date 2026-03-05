"use client";

import { useState, useCallback, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Star,
  Phone,
  MapPin,
  PanelRightOpen,
  Plus,
  X,
  Check,
  Clock,
  StickyNote,
} from "lucide-react";
import { PipelineStageBar } from "@/components/pipeline-stage-bar";
import type { PipelineStage } from "@/types/orbit-types";
import { FollowUpPanel } from "@/components/follow-up-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArcMeter } from "@/components/arc-meter";
import { Sparkline } from "@/components/sparkline";
import type {
  Lead,
  Interaction,
  InteractionType,
  Note,
} from "@/types/orbit-types";
import { fetchLead } from "@/lib/data-service";

// Compute relationship indicators from a lead
function computeIndicators(lead: Lead) {
  const interactionCount = lead.interactions.length;
  const noteCount = lead.notes.length;
  const lastDate = lead.interactions[0]?.timestamp || lead.notes[0]?.timestamp;
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

  // Generate sparkline from interactions timeline
  const sparkline: number[] = [];
  let val = 30 + ((parseInt(lead.id.replace(/\D/g, ""), 10) || 0) % 40);
  for (let i = 0; i < 12; i++) {
    val +=
      Math.sin(
        (parseInt(lead.id.replace(/\D/g, ""), 10) || 0) * 0.3 + i * 0.5,
      ) *
        15 +
      (Math.random() - 0.5) * 10;
    sparkline.push(Math.max(5, Math.min(100, val)));
  }

  const intentTokens: string[] = [];
  if (lead.property)
    intentTokens.push(`#${lead.property.toLowerCase().replace(/\s+/g, "_")}`);
  if (lead.origin)
    intentTokens.push(`#${lead.origin.toLowerCase().replace(/\s+/g, "")}`);
  if (lead.isPriority) intentTokens.push("#prioridade");

  return {
    matchScore,
    heatScore,
    sparkline,
    intentTokens,
    lastDate,
    daysInactive,
  };
}

// Get trend from sparkline
function getActivityTrend(data: number[]): { label: string; symbol: string } {
  if (data.length < 6) return { label: "estavel", symbol: "\u2192" };
  const recent = data.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const older = data.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
  const diff = recent - older;
  if (diff > 8) return { label: "interesse crescendo", symbol: "\u2191" };
  if (diff < -8) return { label: "esfriando", symbol: "\u2193" };
  return { label: "estavel", symbol: "\u2192" };
}

// Interaction type config
const interactionTypeConfig: Record<
  InteractionType,
  { label: string; color: string; bg: string }
> = {
  ligacao: {
    label: "Ligacao",
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
  },
  visita: { label: "Visita", color: "text-sky-400", bg: "bg-sky-500/15" },
  contato: { label: "Contato", color: "text-amber-400", bg: "bg-amber-500/15" },
  outro: {
    label: "Outro",
    color: "text-[var(--orbit-text-muted)]",
    bg: "bg-[var(--orbit-glass)]",
  },
  system: {
    label: "Sistema",
    color: "text-[var(--orbit-text-muted)]",
    bg: "bg-[var(--orbit-glass)]",
  },
};

const pipelineStageColors: Record<PipelineStage, { text: string; bg: string }> =
  {
    contact: { text: "text-sky-400", bg: "bg-sky-500/15" },
    exploration: { text: "text-amber-400", bg: "bg-amber-500/15" },
    interest: { text: "text-emerald-400", bg: "bg-emerald-500/15" },
    negotiation: {
      text: "text-[var(--orbit-glow)]",
      bg: "bg-[var(--orbit-glow)]/15",
    },
    closed: { text: "text-emerald-300", bg: "bg-emerald-400/15" },
  };

const pipelineStageLabels: Record<PipelineStage, string> = {
  contact: "Contato",
  exploration: "Exploracao",
  interest: "Interesse Concreto",
  negotiation: "Negociacao",
  closed: "Fechado",
};

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min`;
  if (hours < 24) return `${hours}h`;
  if (days === 1) return "ontem";
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function formatNoteDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "agora";
  if (minutes < 60) return `ha ${minutes}min`;
  if (hours < 24) return `ha ${hours}h`;
  if (days === 1) return "ontem";
  if (days < 7) return `ha ${days}d`;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Interaction form component
function InteractionForm({
  onAdd,
  onCancel,
}: {
  onAdd: (interaction: Omit<Interaction, "id">) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<InteractionType>("ligacao");
  const [text, setText] = useState("");
  const [context, setContext] = useState("");

  const handleSubmit = () => {
    onAdd({
      type,
      text: text.trim() || undefined,
      timestamp: new Date(),
      context: context.trim() || undefined,
    });
    setText("");
    setContext("");
  };

  return (
    <div className="rounded-xl border border-[var(--orbit-glow)]/20 bg-[var(--orbit-glass)] p-3 animate-text-fade-in">
      <div className="mb-3 flex items-center gap-1.5">
        {(Object.keys(interactionTypeConfig) as InteractionType[])
          .filter((t) => t !== "system")
          .map((t) => {
            const config = interactionTypeConfig[t];
            const isSelected = type === t;
            return (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-medium transition-all ${
                  isSelected
                    ? `${config.bg} ${config.color}`
                    : "text-[var(--orbit-text-muted)] hover:bg-[var(--orbit-glass)] hover:text-[var(--orbit-text)]"
                }`}
              >
                {config.label}
              </button>
            );
          })}
      </div>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Contexto opcional (ex: referencia de imovel)"
        className="mb-2 w-full rounded-lg border border-[var(--orbit-glass-border)] bg-[var(--orbit-bg)] px-3 py-2 text-sm text-[var(--orbit-text)] placeholder-[var(--orbit-text-muted)]/50 outline-none focus:border-[var(--orbit-glow)]/40"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--orbit-glow)] px-4 text-xs font-medium text-[var(--orbit-bg)] transition-opacity"
        >
          <Check className="h-3.5 w-3.5" />
          Registrar
        </button>
        <button
          onClick={onCancel}
          className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs text-[var(--orbit-text-muted)] hover:text-[var(--orbit-text)] transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Cancelar
        </button>
      </div>
    </div>
  );
}

// Note form component
function NoteForm({
  onAdd,
  onCancel,
}: {
  onAdd: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
  };

  return (
    <div className="rounded-xl border border-[var(--orbit-glow)]/20 bg-[var(--orbit-glass)] p-3 animate-text-fade-in">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Memoria livre sobre o lead..."
        rows={3}
        className="mb-2 w-full resize-none rounded-lg border border-[var(--orbit-glass-border)] bg-[var(--orbit-bg)] px-3 py-2 text-sm text-[var(--orbit-text)] placeholder-[var(--orbit-text-muted)]/50 outline-none focus:border-[var(--orbit-glow)]/40"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--orbit-glow)] px-4 text-xs font-medium text-[var(--orbit-bg)] transition-opacity disabled:opacity-40"
        >
          <Check className="h-3.5 w-3.5" />
          Salvar nota
        </button>
        <button
          onClick={onCancel}
          className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs text-[var(--orbit-text-muted)] hover:text-[var(--orbit-text)] transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function LeadPipelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceView = searchParams.get("from") || "orbit";

  const [lead, setLead] = useState<Lead | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [followUp, setFollowUp] = useState<{
    date: Date;
    isActive: boolean;
  } | null>(null);
  const [loadingLead, setLoadingLead] = useState(true);

  useEffect(() => {
    async function load() {
      setLoadingLead(true);
      try {
        const data = await fetchLead(id);
        if (data) {
          setLead(data);
          setInteractions(data.interactions);
          setNotes(data.notes);
          if (data.followUp)
            setFollowUp({
              date: data.followUp.date,
              isActive: data.followUp.isActive,
            });
        }
      } catch (err) {
        console.error("[LeadPage] fetchLead error:", err);
      } finally {
        setLoadingLead(false);
      }
    }
    load();
  }, [id]);
  const [showMobileMemory, setShowMobileMemory] = useState(false);

  // Add form states
  const [showForm, setShowForm] = useState<"interaction" | "note" | null>(null);

  // Navigate back to the correct view
  const handleBack = () => {
    if (sourceView === "stream") {
      router.push("/?view=stream");
    } else {
      router.push("/");
    }
  };

  const handleStageChange = useCallback(
    async (stage: PipelineStage) => {
      if (!lead) return;
      setLead({ ...lead, pipelineStage: stage });
      try {
        const { updateLead } = await import("@/lib/data-service");
        await updateLead(id, { pipelineStage: stage });
      } catch (err) { console.error("[LeadPage] updateStage error:", err); }
    },
    [lead, id],
  );

  const handleTogglePriority = async () => {
    if (!lead) return;
    const next = !lead.isPriority;
    setLead({ ...lead, isPriority: next });
    try {
      const { updateLead } = await import("@/lib/data-service");
      await updateLead(id, { isPriority: next });
    } catch (err) { console.error("[LeadPage] togglePriority error:", err); }
  };

  const handleAddInteraction = useCallback(
    async (interaction: Omit<Interaction, "id">) => {
      const tempId = `i-${Date.now()}`;
      const newInteraction: Interaction = { ...interaction, id: tempId };
      setInteractions((prev) => [newInteraction, ...prev]);
      setShowForm(null);
      try {
        const { addInteraction } = await import("@/lib/data-service");
        const saved = await addInteraction(id, interaction);
        setInteractions((prev) =>
          prev.map((i) => (i.id === tempId ? saved : i)),
        );
      } catch (err) {
        console.error("[LeadPage] addInteraction error:", err);
      }
    },
    [id],
  );

  const handleAddNote = useCallback(
    async (text: string) => {
      const tempId = `n-${Date.now()}`;
      const newNote: Note = { id: tempId, text, timestamp: new Date() };
      setNotes((prev) => [newNote, ...prev]);
      setShowForm(null);
      try {
        const { addNote } = await import("@/lib/data-service");
        const saved = await addNote(id, { text, timestamp: new Date() });
        setNotes((prev) => prev.map((n) => (n.id === tempId ? saved : n)));
      } catch (err) {
        console.error("[LeadPage] addNote error:", err);
      }
    },
    [id],
  );

  const handleSetFollowUp = useCallback(async (date: Date) => {
    setFollowUp({ date, isActive: true });
    try {
      const { updateLead } = await import("@/lib/data-service");
      await updateLead(id, { followUp: { date, isActive: true } });
    } catch (err) { console.error("[LeadPage] setFollowUp error:", err); }
  }, [id]);

  const handleClearFollowUp = useCallback(async () => {
    setFollowUp(null);
    try {
      const { updateLead } = await import("@/lib/data-service");
      await updateLead(id, { followUp: { date: new Date(), isActive: false } });
    } catch (err) { console.error("[LeadPage] clearFollowUp error:", err); }
  }, [id]);

  if (loadingLead) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--orbit-bg)]">
        <div className="text-[var(--orbit-text-muted)] animate-pulse">
          Carregando lead...
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--orbit-bg)]">
        <div className="text-[var(--orbit-text-muted)]">
          Lead não encontrado.
        </div>
      </div>
    );
  }

  const stageColors = pipelineStageColors[lead.pipelineStage];
  const lastInteraction = interactions[0];

  return (
    <div className="flex h-screen flex-col bg-[var(--orbit-bg)] text-[var(--orbit-text)]">
      {/* Header */}
      <header className="relative flex shrink-0 items-center justify-between border-b border-[var(--orbit-glass-border)] bg-[var(--orbit-glass)] px-4 py-3 md:px-6">
        {/* Left - Back */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm text-[var(--orbit-text-muted)] transition-colors hover:text-[var(--orbit-text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">
            {sourceView === "stream" ? "Voltar ao Stream" : "Voltar ao Orbit"}
          </span>
        </button>

        {/* Center - Lead info */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--orbit-glow)]/15 text-sm font-medium text-[var(--orbit-glow)]">
            {lead.avatar}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[var(--orbit-text)]">
                {lead.name}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${stageColors.bg} ${stageColors.text}`}
              >
                {pipelineStageLabels[lead.pipelineStage]}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--orbit-text-muted)]">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {lead.phone}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {lead.origin}
              </span>
              {lastInteraction && (
                <>
                  <span className="text-[var(--orbit-text-muted)]/30">
                    {"\u2022"}
                  </span>
                  <span className="flex items-center gap-1 text-[var(--orbit-text)]">
                    <Clock className="h-3 w-3 text-[var(--orbit-glow)]" />
                    Ultima interacao:{" "}
                    {interactionTypeConfig[
                      lastInteraction.type
                    ]?.label?.toLowerCase() || lastInteraction.type}{" "}
                    {"\u2022"} {formatTimestamp(lastInteraction.timestamp)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleTogglePriority}
            className={`rounded-lg p-2 transition-all hover:bg-[var(--orbit-glow)]/10 ${
              lead.isPriority
                ? "text-amber-400"
                : "text-[var(--orbit-text-muted)]"
            }`}
            title="Prioridade"
          >
            <Star
              className={`h-4 w-4 ${lead.isPriority ? "fill-current" : ""}`}
            />
          </button>
          <ThemeToggle />
          <button
            onClick={() => setShowMobileMemory(!showMobileMemory)}
            className="rounded-lg p-2 text-[var(--orbit-text-muted)] transition-all hover:bg-[var(--orbit-glow)]/10 hover:text-[var(--orbit-text)] lg:hidden"
            title="Notas"
          >
            <PanelRightOpen className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Center Panel */}
        <div className="flex flex-1 flex-col overflow-y-auto scrollbar-thin">
          {/* Pipeline Stage Bar */}
          <div className="border-b border-[var(--orbit-glass-border)] bg-[var(--orbit-glass)]/50 px-6 pb-8 pt-2">
            <PipelineStageBar
              currentStage={lead.pipelineStage}
              onStageChange={handleStageChange}
            />
          </div>

          {/* Indicadores do Relacionamento */}
          {lead &&
            (() => {
              const ind = computeIndicators(lead);
              const trend = getActivityTrend(ind.sparkline);
              return (
                <div className="border-b border-[var(--orbit-glass-border)] bg-[var(--orbit-glass)]/30 px-6 py-4">
                  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--orbit-text-muted)]">
                    Indicadores do Relacionamento
                  </h3>
                  <div className="flex flex-wrap items-center gap-6">
                    {/* Heat Score */}
                    <div className="flex flex-col items-center gap-1">
                      <ArcMeter
                        value={ind.heatScore}
                        size={56}
                        strokeWidth={4}
                      />
                      <span className="text-[9px] uppercase tracking-wide text-[var(--orbit-text-muted)]">
                        Heat Score
                      </span>
                    </div>

                    {/* Match Score */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex h-[36px] items-end">
                        <span className="text-2xl font-semibold text-[var(--orbit-glow)]">
                          {ind.matchScore}
                        </span>
                        <span className="mb-0.5 ml-0.5 text-xs text-[var(--orbit-text-muted)]">
                          %
                        </span>
                      </div>
                      <span className="text-[9px] uppercase tracking-wide text-[var(--orbit-text-muted)]">
                        Match Score
                      </span>
                    </div>

                    {/* Activity Trend (Sparkline) */}
                    <div className="flex flex-col items-center gap-1">
                      <Sparkline data={ind.sparkline} width={120} height={32} />
                      <span className="text-[9px] text-[var(--orbit-text-muted)]">
                        {trend.symbol} {trend.label}
                      </span>
                    </div>

                    {/* Ultima Interacao */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex h-[36px] items-end">
                        <span className="text-lg font-medium text-[var(--orbit-text)]">
                          {ind.daysInactive >= 999
                            ? "—"
                            : ind.daysInactive === 0
                              ? "Hoje"
                              : ind.daysInactive === 1
                                ? "Ontem"
                                : `${ind.daysInactive}d`}{" "}
                        </span>
                      </div>
                      <span className="text-[9px] uppercase tracking-wide text-[var(--orbit-text-muted)]">
                        Ultima Interacao
                      </span>
                    </div>
                  </div>

                  {/* Intent Tokens */}
                  {ind.intentTokens.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {ind.intentTokens.map((token) => (
                        <span
                          key={token}
                          className="rounded-full bg-[var(--orbit-glow)]/8 px-2.5 py-0.5 text-[10px] font-medium text-[var(--orbit-glow)]"
                        >
                          {token}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

          {/* Content area */}
          <div className="flex flex-1 flex-col gap-6 p-6">
            {/* Follow-up */}
            <FollowUpPanel
              followUpDate={followUp?.date || null}
              isActive={followUp?.isActive || false}
              onSetFollowUp={handleSetFollowUp}
              onClearFollowUp={handleClearFollowUp}
            />

            {/* Action buttons: Interaction + Note */}
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setShowForm(showForm === "interaction" ? null : "interaction")
                }
                className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-all ${
                  showForm === "interaction"
                    ? "bg-[var(--orbit-glow)] text-[var(--orbit-bg)]"
                    : "bg-[var(--orbit-glow)]/10 text-[var(--orbit-glow)] hover:bg-[var(--orbit-glow)]/20"
                }`}
              >
                <Phone className="h-3.5 w-3.5" />
                Interacao
              </button>
              <button
                onClick={() => setShowForm(showForm === "note" ? null : "note")}
                className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-all ${
                  showForm === "note"
                    ? "bg-[var(--orbit-glow)] text-[var(--orbit-bg)]"
                    : "bg-[var(--orbit-glow)]/10 text-[var(--orbit-glow)] hover:bg-[var(--orbit-glow)]/20"
                }`}
              >
                <StickyNote className="h-3.5 w-3.5" />
                Nota
              </button>
            </div>

            {/* Inline forms */}
            {showForm === "interaction" && (
              <InteractionForm
                onAdd={handleAddInteraction}
                onCancel={() => setShowForm(null)}
              />
            )}
            {showForm === "note" && (
              <NoteForm
                onAdd={handleAddNote}
                onCancel={() => setShowForm(null)}
              />
            )}

            {/* Activity Timeline - unified interactions + notes */}
            <div className="flex flex-col gap-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--orbit-text-muted)]">
                Historico
              </h3>

              {interactions.length === 0 && notes.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--orbit-glass)]">
                    <Phone className="h-4 w-4 text-[var(--orbit-text-muted)]" />
                  </div>
                  <p className="text-xs text-[var(--orbit-text-muted)]">
                    Nenhuma atividade registrada ainda.
                  </p>
                </div>
              ) : (
                <div className="relative pl-6">
                  <div className="absolute bottom-0 left-2.5 top-0 w-px bg-[var(--orbit-glass-border)]" />
                  <div className="flex flex-col gap-4">
                    {/* Merge and sort interactions and notes by timestamp */}
                    {[
                      ...interactions.map((i) => ({
                        ...i,
                        _type: "interaction" as const,
                      })),
                      ...notes.map((n) => ({
                        ...n,
                        _type: "note" as const,
                        type: "note" as const,
                      })),
                    ]
                      .sort(
                        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
                      )
                      .map((entry) => {
                        if (entry._type === "interaction") {
                          const config =
                            interactionTypeConfig[
                              entry.type as InteractionType
                            ] || interactionTypeConfig.outro;
                          return (
                            <div key={entry.id} className="relative">
                              <div
                                className={`absolute -left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full ${config.bg}`}
                              >
                                <Phone className={`h-3 w-3 ${config.color}`} />
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-[10px] font-semibold uppercase ${config.color}`}
                                  >
                                    {config.label}
                                  </span>
                                  <span className="text-[10px] text-[var(--orbit-text-muted)]">
                                    {formatTimestamp(entry.timestamp)}
                                  </span>
                                </div>
                                {entry.text && (
                                  <p className="text-sm leading-relaxed text-[var(--orbit-text)]">
                                    {entry.text}
                                  </p>
                                )}
                                {entry.context && (
                                  <span className="text-[11px] text-[var(--orbit-text-muted)]">
                                    {entry.context}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        }

                        // Note
                        return (
                          <div key={entry.id} className="relative">
                            <div className="absolute -left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--orbit-glass)]">
                              <StickyNote className="h-3 w-3 text-[var(--orbit-text-muted)]" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase text-[var(--orbit-text-muted)]">
                                  Nota
                                </span>
                                <span className="text-[10px] text-[var(--orbit-text-muted)]">
                                  {formatNoteDate(entry.timestamp)}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--orbit-text)]">
                                {entry.text}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Memory Notes */}
        <div
          className={`absolute right-0 top-0 z-30 h-full w-[320px] transform border-l border-[var(--orbit-glass-border)] bg-[var(--orbit-bg)] transition-transform duration-300 lg:relative lg:block lg:w-[320px] lg:translate-x-0 ${
            showMobileMemory ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 border-b border-[var(--orbit-glass-border)] px-4 py-3">
              <StickyNote className="h-4 w-4 text-[var(--orbit-glow)]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--orbit-text-muted)]">
                Memoria do Lead
              </h3>
              <span className="ml-auto rounded-full bg-[var(--orbit-glass)] px-2 py-0.5 text-[10px] text-[var(--orbit-text-muted)]">
                {notes.length} {notes.length === 1 ? "nota" : "notas"}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin">
              {notes.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--orbit-glass)]">
                    <StickyNote className="h-4 w-4 text-[var(--orbit-text-muted)]" />
                  </div>
                  <p className="text-xs text-[var(--orbit-text-muted)]">
                    Nenhuma nota ainda.
                  </p>
                  <p className="text-[10px] text-[var(--orbit-text-muted)]/60">
                    Adicione anotacoes livres sobre o lead.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="rounded-lg border border-[var(--orbit-glass-border)]/50 bg-[var(--orbit-glass)]/50 p-3"
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--orbit-text)]">
                        {note.text}
                      </p>
                      <div className="mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-[var(--orbit-text-muted)]" />
                        <span className="text-[10px] text-[var(--orbit-text-muted)]">
                          {formatNoteDate(note.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick add note */}
            <div className="border-t border-[var(--orbit-glass-border)] px-4 py-3">
              <button
                onClick={() => setShowForm("note")}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--orbit-glow)]/10 py-2 text-xs font-medium text-[var(--orbit-glow)] transition-colors hover:bg-[var(--orbit-glow)]/20"
              >
                <Plus className="h-3.5 w-3.5" />
                Nova nota
              </button>
            </div>
          </div>
        </div>

        {/* Mobile overlay */}
        {showMobileMemory && (
          <div
            className="absolute inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => setShowMobileMemory(false)}
          />
        )}
      </div>
    </div>
  );
}
