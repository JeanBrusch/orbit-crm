"use client"

import { motion } from "framer-motion"
import { ArcMeter } from "./arc-meter"
import { Sparkline } from "./sparkline"
import { STRATA_STAGES, type StrataLead } from "@/hooks/use-leads"
import { isSilent } from "@/types/orbit-types"

export type ZoomTier = "overview" | "mid" | "detail"

interface LeadCardProps {
  lead: StrataLead
  onClick: (leadId: string) => void
  index: number
  zoomTier?: ZoomTier
}

// Get the stage color for a given stage index
function getStageColor(stageIndex: number): string {
  return STRATA_STAGES[Math.min(3, Math.max(0, stageIndex))]?.color ?? "#94a3b8"
}

// Derive activity trend from sparkline
function getTrend(data: number[]): { label: string; symbol: string } {
  if (data.length < 4) return { label: "estavel", symbol: "\u2192" }
  const recent = data.slice(-3).reduce((a, b) => a + b, 0) / 3
  const older = data.slice(-6, -3).reduce((a, b) => a + b, 0) / 3
  const diff = recent - older
  if (diff > 8) return { label: "crescendo", symbol: "\u2191" }
  if (diff < -8) return { label: "esfriando", symbol: "\u2193" }
  return { label: "estavel", symbol: "\u2192" }
}

/* ============================
   COMPACT CARD (mid zoom)
   avatar + name + heat
   ============================ */
function CompactCard({ lead, onClick, index, stageColor }: {
  lead: StrataLead
  onClick: (id: string) => void
  index: number
  stageColor: string
}) {
  const silent = isSilent(lead)

  return (
    <motion.div
      layoutId={`strata-lead-${lead.id}`}
      onClick={() => onClick(lead.id)}
      className="group cursor-pointer select-none"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: silent ? 0.55 : 1, scale: 1 }}
      transition={{
        layout: { type: "spring", stiffness: 200, damping: 30 },
        opacity: { delay: index * 0.01, duration: 0.25 },
        scale: { delay: index * 0.01, duration: 0.25 },
      }}
      whileHover={{ scale: 1.06, y: -2, opacity: 1 }}
    >
      <div
        className="flex w-[160px] items-center gap-2.5 rounded-lg border bg-[var(--orbit-glass)] px-2.5 py-2 backdrop-blur-xl transition-shadow duration-200 group-hover:shadow-md"
        style={{
          borderColor: silent ? "var(--orbit-glass-border)" : `${stageColor}30`,
          boxShadow: silent ? "none" : `0 1px 10px ${stageColor}12`,
        }}
      >
        {/* Avatar */}
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold"
          style={{
            border: `1.5px solid ${stageColor}`,
            color: "var(--orbit-text)",
            backgroundColor: `${stageColor}10`,
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

        {/* Name + Heat */}
        <div className="flex flex-1 flex-col gap-0 min-w-0">
          <span className="truncate text-[11px] font-semibold text-[var(--orbit-text)]">
            {lead.name}
          </span>
          <div className="flex items-center gap-1.5 text-[9px]">
            <span style={{ color: stageColor }} className="font-semibold">
              {lead.heatScore}
            </span>
            <span className="text-[var(--orbit-text-muted)]">
              {lead.lastInteractionAgo}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ============================
   FULL DETAIL CARD (detail zoom)
   3-part layout
   ============================ */
function DetailCard({ lead, onClick, index, stageColor }: {
  lead: StrataLead
  onClick: (id: string) => void
  index: number
  stageColor: string
}) {
  const trend = getTrend(lead.activityHistory)
  const silent = isSilent(lead)

  return (
    <motion.div
      layoutId={`strata-lead-${lead.id}`}
      onClick={() => onClick(lead.id)}
      className="group cursor-pointer select-none"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: silent ? 0.5 : 1, scale: 1 }}
      transition={{
        layout: { type: "spring", stiffness: 200, damping: 30 },
        opacity: { delay: index * 0.02, duration: 0.3 },
        scale: { delay: index * 0.02, duration: 0.3 },
      }}
      whileHover={{ scale: 1.035, y: -3 }}
    >
      <div
        className="relative flex w-[220px] flex-col rounded-xl border bg-[var(--orbit-glass)] backdrop-blur-xl transition-shadow duration-200 group-hover:shadow-lg"
        style={{
          borderColor: `${stageColor}30`,
          boxShadow: `0 2px 16px ${stageColor}18, 0 0 0 1px ${stageColor}10`,
        }}
      >
        {/* ===== TOPO: Name + Match + Time ===== */}
        <div className="flex items-start gap-2.5 p-3 pb-2">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-medium"
            style={{
              border: `2px solid ${stageColor}`,
              boxShadow: `0 0 8px ${stageColor}30`,
              color: "var(--orbit-text)",
              backgroundColor: `${stageColor}10`,
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

          <div className="flex flex-1 flex-col gap-0.5 min-w-0">
            <span className="truncate text-xs font-semibold text-[var(--orbit-text)]">
              {lead.name}
            </span>
            <div className="flex items-center gap-2 text-[10px]">
              <span style={{ color: stageColor }} className="font-semibold">
                {'Match '}
                {lead.matchScore}%
              </span>
              <span className="text-[var(--orbit-text-muted)]">
                {lead.lastInteractionAgo}
              </span>
            </div>
          </div>
        </div>

        {/* ===== CENTRO: Heat Score + Activity Sparkline ===== */}
        <div className="flex items-center justify-between gap-3 px-3 pb-2">
          <div className="flex flex-col items-center gap-0">
            <ArcMeter value={lead.heatScore} size={48} strokeWidth={3.5} accentColor={stageColor} />
            <span className="text-[8px] uppercase tracking-wide text-[var(--orbit-text-muted)]">Heat</span>
          </div>
          <div className="flex flex-1 flex-col items-end gap-0.5">
            <Sparkline data={lead.activityHistory} width={100} height={26} strokeColor={stageColor} />
            <span className="text-[9px] text-[var(--orbit-text-muted)]">
              {trend.symbol}{' '}{trend.label}
            </span>
          </div>
        </div>

        {/* ===== BASE: Intent Tokens ===== */}
        <div className="flex flex-wrap gap-1 px-3 pb-2">
          {lead.intentTokens.slice(0, 3).map((token) => (
            <span
              key={token}
              className="rounded-full px-2 py-0.5 text-[9px] font-medium"
              style={{
                backgroundColor: `${stageColor}12`,
                color: stageColor,
              }}
            >
              {token}
            </span>
          ))}
        </div>

        {/* ===== BADGE OPERACIONAL ===== */}
        <div className="flex items-center justify-between border-t px-3 py-1.5" style={{ borderColor: `${stageColor}15` }}>
          {lead.operationalBadge ? (
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: `${stageColor}15`,
                color: stageColor,
              }}
            >
              {lead.operationalBadge}
            </span>
          ) : (
            <span className="rounded-full bg-[var(--orbit-glass)] px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-[var(--orbit-text-muted)]">
              {STRATA_STAGES[lead.stageIndex]?.label ?? "Contato"}
            </span>
          )}
          {lead.isPriority && (
            <span
              className="text-[9px] font-semibold"
              style={{ color: stageColor }}
            >
              PRIORIDADE
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ============================
   CLUSTER CARD (overview zoom)
   shows group of leads
   ============================ */
export interface ClusterData {
  id: string
  stageIndex: number
  leads: StrataLead[]
}

interface ClusterCardProps {
  cluster: ClusterData
  onClick: (leadId: string) => void
}

export function ClusterCard({ cluster, onClick }: ClusterCardProps) {
  const stageColor = getStageColor(cluster.stageIndex)
  const count = cluster.leads.length
  const stageLabel = STRATA_STAGES[cluster.stageIndex]?.label ?? "Contato"
  const displayAvatars = cluster.leads.slice(0, 3)
  const topLead = cluster.leads[0]

  return (
    <motion.div
      layoutId={`strata-cluster-${cluster.id}`}
      onClick={() => topLead && onClick(topLead.id)}
      className="group cursor-pointer select-none"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: "spring", stiffness: 180, damping: 25 }}
      whileHover={{ scale: 1.08, y: -2 }}
    >
      <div
        className="flex w-[140px] flex-col items-center gap-2 rounded-xl border bg-[var(--orbit-glass)] px-3 py-3 backdrop-blur-xl"
        style={{
          borderColor: `${stageColor}25`,
          boxShadow: `0 2px 20px ${stageColor}15`,
        }}
      >
        {/* Avatar group */}
        <div className="flex items-center -space-x-2">
          {displayAvatars.map((lead, i) => (
            <div
              key={lead.id}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-semibold"
              style={{
                border: `1.5px solid ${stageColor}`,
                backgroundColor: `${stageColor}15`,
                color: "var(--orbit-text)",
                zIndex: 3 - i,
              }}
            >
              {lead.avatar}
            </div>
          ))}
          {count > 3 && (
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-bold"
              style={{
                border: `1.5px solid ${stageColor}`,
                backgroundColor: `${stageColor}20`,
                color: stageColor,
                zIndex: 0,
              }}
            >
              +{count - 3}
            </div>
          )}
        </div>

        {/* Count badge */}
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
          style={{
            backgroundColor: `${stageColor}15`,
            color: stageColor,
          }}
        >
          +{count} leads
        </span>

        {/* Stage label */}
        <span
          className="text-[9px] font-semibold uppercase tracking-widest"
          style={{ color: stageColor }}
        >
          {stageLabel}
        </span>
      </div>
    </motion.div>
  )
}

/* ============================
   MAIN LeadCard export
   delegates by zoomTier
   ============================ */
export function LeadCard({ lead, onClick, index, zoomTier = "detail" }: LeadCardProps) {
  const stageColor = getStageColor(lead.stageIndex)

  if (zoomTier === "mid") {
    return <CompactCard lead={lead} onClick={onClick} index={index} stageColor={stageColor} />
  }

  return <DetailCard lead={lead} onClick={onClick} index={index} stageColor={stageColor} />
}
