"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import {
  type Lead,
  type PipelineStage,
  type CoreState,
  calculateGravity,
  getDepthLayer,
  isSilent,
  followUpRemainingDays,
  STAGE_COLORS,
} from "@/types/orbit-types";
import {
  forceSimulation,
  forceCollide,
  forceManyBody,
  forceX,
  forceY,
} from "d3-force";

// ===== Radial band configuration =====
// Each stage has a base radius (px from center) and spread (random jitter)
const STAGE_BANDS: Record<string, { base: number; spread: number }> = {
  negotiation: { base: 170, spread: 25 },
  interest: { base: 230, spread: 30 },
  exploration: { base: 290, spread: 30 },
  contact: { base: 350, spread: 35 },
};

// Golden angle in degrees
const GOLDEN_ANGLE = 137.508;

// ===== Helpers =====

/** Deterministic hash from a string id, returns 0-1 */
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h % 10000) / 10000;
}

/** Get node radius in pixels based on depth */
function getNodeSizePx(depth: "surface" | "mid" | "deep"): number {
  if (depth === "surface") return 22;
  if (depth === "mid") return 18;
  return 14;
}

// Interaction type labels
const interactionTypeLabels: Record<string, string> = {
  ligacao: "ligacao",
  visita: "visita",
  contato: "contato",
  outro: "outro",
  system: "sistema",
};

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min`;
  if (hours < 24) return `${hours}h`;
  if (days === 1) return "ontem";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)} meses`;
  return `${Math.floor(days / 365)} ano${Math.floor(days / 365) > 1 ? "s" : ""}`;
}

// ===== D3-force simulation node type =====
interface SimNode {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number;
  stage: PipelineStage;
}

/** Run a one-shot d3-force simulation to resolve collisions */
function computePositions(
  leads: Lead[],
  centerX: number,
  centerY: number,
): Record<string, { x: number; y: number }> {
  // Filter out closed leads from radar positioning
  const activeLeads = leads.filter(
    (l) => l.pipelineStage !== "closed" && !isSilent(l),
  );

  if (activeLeads.length === 0) return {};

  // Create initial positions using golden angle + radial bands
  const nodes: SimNode[] = activeLeads.map((lead, i) => {
    const band = STAGE_BANDS[lead.pipelineStage] || STAGE_BANDS.contact;
    const h = hashId(lead.id);
    const radius = band.base + (h - 0.5) * 2 * band.spread;
    const angle = ((i * GOLDEN_ANGLE) % 360) * (Math.PI / 180);

    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    const depth = getDepthLayer(lead);

    return {
      id: lead.id,
      x,
      y,
      targetX: x,
      targetY: y,
      radius: getNodeSizePx(depth),
      stage: lead.pipelineStage,
    };
  });

  // Run d3-force simulation to resolve overlaps
  const sim = forceSimulation(nodes)
    .force("x", forceX<SimNode>((d) => d.targetX).strength(0.3))
    .force("y", forceY<SimNode>((d) => d.targetY).strength(0.3))
    .force("collide", forceCollide<SimNode>((d) => d.radius + 22).iterations(6))
    .force("charge", forceManyBody().strength(-30))
    .stop();

  // Run 80 ticks to converge
  for (let i = 0; i < 80; i++) sim.tick();

  // Clamp nodes so none overlap the central core (min 140px from center)
  const MIN_CORE_CLEARANCE = 140;
  const result: Record<string, { x: number; y: number }> = {};
  nodes.forEach((n) => {
    const dx = n.x - centerX;
    const dy = n.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < MIN_CORE_CLEARANCE && dist > 0) {
      const scale = MIN_CORE_CLEARANCE / dist;
      result[n.id] = { x: centerX + dx * scale, y: centerY + dy * scale };
    } else {
      result[n.id] = { x: n.x, y: n.y };
    }
  });
  return result;
}

// ===== Hover card =====
function LeadHoverCard({
  lead,
  posXPercent,
  posYPercent,
}: {
  lead: Lead;
  posXPercent: number;
  posYPercent: number;
}) {
  const lastInteraction = lead.interactions[0];
  const remaining = followUpRemainingDays(lead);

  const stageLabels: Record<PipelineStage, string> = {
    negotiation: "Negociacao",
    interest: "Interesse Concreto",
    exploration: "Exploracao",
    contact: "Contato Inicial",
    closed: "Fechado",
  };
  const stageLabel = stageLabels[lead.pipelineStage] || lead.pipelineStage;

  const cardLeft = posXPercent > 70 ? "auto" : "calc(100% + 12px)";
  const cardRight = posXPercent > 70 ? "calc(100% + 12px)" : "auto";
  const cardTop = posYPercent > 70 ? "auto" : "0";
  const cardBottom = posYPercent > 70 ? "0" : "auto";

  return (
    <div
      className="absolute z-50 w-52 rounded-xl border border-[var(--orbit-glass-border)] bg-[var(--orbit-glass)] p-3 backdrop-blur-xl shadow-lg animate-text-fade-in pointer-events-none"
      style={{
        left: cardLeft,
        right: cardRight,
        top: cardTop,
        bottom: cardBottom,
      }}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--orbit-text)]">
            {lead.name}
          </span>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--orbit-text-muted)]">
          {stageLabel}
        </span>

        {lastInteraction && (
          <div className="mt-1 flex flex-col gap-0.5 border-t border-[var(--orbit-glass-border)] pt-1.5">
            <span className="text-[10px] text-[var(--orbit-text-muted)]">
              Ultima interacao
            </span>
            <span className="text-xs text-[var(--orbit-text)]">
              {interactionTypeLabels[lastInteraction.type] ||
                lastInteraction.type}
              {" \u2022 "}
              {formatTimeAgo(lastInteraction.timestamp)}
            </span>
          </div>
        )}

        {remaining !== null && (
          <div className="flex flex-col gap-0.5 border-t border-[var(--orbit-glass-border)] pt-1.5">
            <span className="text-[10px] text-[var(--orbit-text-muted)]">
              Follow-up
            </span>
            <span
              className={`text-xs ${remaining <= 0 ? "text-amber-400" : remaining <= 1 ? "text-[var(--orbit-glow)]" : "text-[var(--orbit-text)]"}`}
            >
              {remaining <= 0
                ? "vencido"
                : `${remaining} dia${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Main component =====

interface RadarFieldProps {
  leads: Lead[];
  highlightedLeads: string[];
  coreState: CoreState;
  onLeadClick: (leadId: string) => void;
}

export function RadarField({
  leads,
  highlightedLeads,
  coreState,
  onLeadClick,
}: RadarFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredLeadId, setHoveredLeadId] = useState<string | null>(null);
  const isResponding = coreState === "responding";
  const hasHighlights = highlightedLeads.length > 0;

  // Visible leads = exclude closed and silent
  const visibleLeads = useMemo(
    () => leads.filter((l) => l.pipelineStage !== "closed" && !isSilent(l)),
    [leads],
  );

  // Container dimensions
  const [dims, setDims] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDims({
          w: containerRef.current.clientWidth,
          h: containerRef.current.clientHeight,
        });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const centerX = dims.w / 2;
  const centerY = dims.h / 2 + 40;

  // Compute positions with d3-force (one-shot)
  const positions = useMemo(() => {
    if (centerX === 0 || centerY === 0) return {};
    return computePositions(leads, centerX, centerY);
  }, [leads, centerX, centerY]);

  // Micro drift animation (organic 1px sine wave)
  const driftRef = useRef<Record<string, { dx: number; dy: number }>>({});
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let startTime = performance.now();
    const animate = (time: number) => {
      const elapsed = (time - startTime) / 1000;
      const next: Record<string, { dx: number; dy: number }> = {};
      visibleLeads.forEach((lead) => {
        const seed = hashId(lead.id) * 100;
        next[lead.id] = {
          dx: Math.sin(elapsed * 0.6 + seed) * 1,
          dy: Math.cos(elapsed * 0.5 + seed * 1.3) * 1,
        };
      });
      driftRef.current = next;
      // Force re-render via a lightweight state-free approach
      // We read driftRef in render, so we need to trigger a re-render
      setDriftTick((t) => t + 1);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [visibleLeads]);

  // A minimal counter to trigger re-renders for micro drift
  const [, setDriftTick] = useState(0);

  // Gravities for connection line opacity
  const gravities = useMemo(() => {
    const g: Record<string, number> = {};
    leads.forEach((lead) => {
      g[lead.id] = calculateGravity(lead);
    });
    return g;
  }, [leads]);

  return (
    <div ref={containerRef} className="absolute inset-0 z-[5]">
      {/* SVG layer for ambient glow + connection lines (no rotating orbit circles) */}
      <svg
        className="pointer-events-none absolute inset-0"
        width="100%"
        height="100%"
      >
        <defs>
          <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(var(--orbit-glow-rgb), 0.05)" />
            <stop offset="100%" stopColor="rgba(var(--orbit-glow-rgb), 0)" />
          </radialGradient>
        </defs>

        {/* Ambient glow */}
        <circle
          cx={centerX}
          cy={centerY}
          r={Math.min(centerX, centerY)}
          fill="url(#radarGlow)"
        />

        {/* Subtle band guides (static, no rotation) */}
        {Object.entries(STAGE_BANDS).map(([stage, band]) => (
          <circle
            key={stage}
            cx={centerX}
            cy={centerY}
            r={band.base}
            fill="none"
            stroke={STAGE_COLORS[stage as PipelineStage]}
            strokeWidth="0.5"
            strokeDasharray="4 6"
            opacity={0.3}
          />
        ))}

        {/* Connection lines from leads to center */}
        {visibleLeads.map((lead) => {
          const pos = positions[lead.id];
          const drift = driftRef.current[lead.id] || { dx: 0, dy: 0 };
          if (!pos) return null;
          const isHighlighted = highlightedLeads.includes(lead.id);
          const silent = isSilent(lead);

          return (
            <line
              key={`line-${lead.id}`}
              x1={pos.x + drift.dx}
              y1={pos.y + drift.dy}
              x2={centerX}
              y2={centerY}
              stroke={`rgba(var(--orbit-glow-rgb), ${silent ? 0.06 : isHighlighted ? 0.4 : 0.1})`}
              strokeWidth={isHighlighted && isResponding ? "1.5" : "0.5"}
              className="transition-all duration-500"
            />
          );
        })}
      </svg>

      {/* Lead nodes as HTML elements */}
      <div className="pointer-events-none absolute inset-0 z-20">
        {visibleLeads.map((lead) => {
          const pos = positions[lead.id];
          const drift = driftRef.current[lead.id] || { dx: 0, dy: 0 };
          if (!pos) return null;

          const isHighlighted = highlightedLeads.includes(lead.id);
          const depth = getDepthLayer(lead);
          const silent = isSilent(lead);
          const hasFollowUpToday = (followUpRemainingDays(lead) ?? 999) <= 1;
          const stageColor = STAGE_COLORS[lead.pipelineStage];
          const isHovered = hoveredLeadId === lead.id;

          // Depth visual mapping
          const sizeClass =
            depth === "surface"
              ? "h-11 w-11"
              : depth === "mid"
                ? "h-9 w-9"
                : "h-7 w-7";
          const textSize =
            depth === "surface"
              ? "text-xs"
              : depth === "mid"
                ? "text-[11px]"
                : "text-[10px]";

          // Silent leads are desaturated
          const silentFilter = silent
            ? "saturate(0.3) opacity(0.5)"
            : undefined;

          const opacityClass = silent
            ? "opacity-45"
            : depth === "surface"
              ? "opacity-100"
              : depth === "mid"
                ? "opacity-70"
                : "opacity-50";

          // Convert pixel position to percentage for hover card logic
          const posXPercent =
            dims.w > 0 ? ((pos.x + drift.dx) / dims.w) * 100 : 50;
          const posYPercent =
            dims.h > 0 ? ((pos.y + drift.dy) / dims.h) * 100 : 50;

          return (
            <div
              key={lead.id}
              className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700 ${
                isResponding && hasHighlights && !isHighlighted
                  ? "opacity-30"
                  : opacityClass
              }`}
              style={{
                left: `${pos.x + drift.dx}px`,
                top: `${pos.y + drift.dy}px`,
                filter: silentFilter,
              }}
              onMouseEnter={() => setHoveredLeadId(lead.id)}
              onMouseLeave={() => setHoveredLeadId(null)}
            >
              <div
                onClick={() => onLeadClick(lead.id)}
                className="group relative flex cursor-pointer flex-col items-center"
              >
                {/* Follow-up pulsing halo */}
                {hasFollowUpToday && !silent && (
                  <>
                    <div className="absolute inset-0 -m-2 animate-notification-ring rounded-full border border-[var(--orbit-glow)]/40" />
                    <div
                      className="absolute inset-0 -m-3 animate-notification-ring rounded-full border border-[var(--orbit-glow)]/20"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </>
                )}

                {/* Avatar node */}
                <div
                  className={`relative flex ${sizeClass} items-center justify-center rounded-full border-2 bg-[var(--orbit-glass)] ${textSize} font-light text-[var(--orbit-text)] backdrop-blur-sm transition-all duration-300 ${
                    isHighlighted && isResponding
                      ? "scale-110 border-[var(--orbit-glow)] shadow-[0_0_20px_rgba(var(--orbit-glow-rgb),0.6)]"
                      : silent
                        ? "border-slate-500/30"
                        : "group-hover:scale-105"
                  }`}
                  style={{
                    borderColor:
                      !isHighlighted && !silent ? stageColor : undefined,
                    boxShadow:
                      !isHighlighted && !silent
                        ? `0 0 12px ${stageColor}`
                        : undefined,
                  }}
                >
                  {lead.profile_image_url ? (
                    <img
                      src={lead.profile_image_url}
                      alt={lead.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    lead.avatar
                  )}
                </div>

                {/* Name */}
                <div
                  className={`mt-1 flex flex-col items-center text-center leading-tight ${
                    depth === "deep" ? "text-[9px]" : "text-[10px]"
                  } font-light ${
                    silent
                      ? "text-[var(--orbit-text-muted)]/60"
                      : "text-[var(--orbit-text)] group-hover:text-[var(--orbit-glow)]"
                  } transition-colors duration-200`}
                >
                  {lead.name.split(" ").map((part, i) => (
                    <span key={i}>{part}</span>
                  ))}
                </div>

                {/* Hover card */}
                {isHovered && (
                  <LeadHoverCard
                    lead={lead}
                    posXPercent={posXPercent}
                    posYPercent={posYPercent}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
