"use client"

import { useMemo, useRef, useEffect, useState, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { LeadCard, ClusterCard, type ZoomTier, type ClusterData } from "./lead-card"
import { STRATA_STAGES, type StrataLead } from "@/hooks/use-leads"
import { ZoomIn, ZoomOut } from "lucide-react"

interface StrataStreamProps {
  leads: StrataLead[]
  onLeadClick: (leadId: string) => void
}

// ============================================================
// ZOOM CONFIG
// ============================================================
const ZOOM_MIN = 0.25
const ZOOM_MAX = 1.0
const ZOOM_STEP = 0.05
const ZOOM_OVERVIEW_THRESHOLD = 0.4
const ZOOM_DETAIL_THRESHOLD = 0.72
const ZOOM_DEFAULT = 0.85

function getZoomTier(zoom: number): ZoomTier {
  if (zoom <= ZOOM_OVERVIEW_THRESHOLD) return "overview"
  if (zoom >= ZOOM_DETAIL_THRESHOLD) return "detail"
  return "mid"
}

// ============================================================
// DENSITY-AWARE STAGE GEOMETRY (Elastic Pipeline)
// ============================================================
const STAGE_H_PADDING = 120         // padding left of first / right of last stage
const STAGE_BASE_W = 480            // base width per stage (minimum)
const STAGE_W_PER_LEAD = {
  overview: 0,
  mid: 65,                          // ~65px expansion per lead in mid zoom
  detail: 85,                       // ~85px expansion per lead in detail zoom
} as const

// Vertical card distribution
const CARD_V_GAP_MID = 68           // vertical gap between consecutive cards (mid)
const CARD_V_GAP_DETAIL = 240       // vertical gap between consecutive cards (detail)
const CARD_H_MID = 52
const CARD_H_DETAIL = 220
const CARD_W_MID = 180
const CARD_W_DETAIL = 240

// How many columns to use at a given count (detail mode)
// Max 6 cards per lane per spec
function columnCount(n: number): number {
  if (n <= 6) return 1
  if (n <= 12) return 2
  if (n <= 18) return 3
  return 4
}

interface StageBand {
  stageIndex: number
  x: number      // left edge of this stage band
  width: number  // total horizontal space for this stage
  cx: number     // horizontal center of this stage (for flow path node)
}

function computeStageBands(
  leadsByStage: Record<number, StrataLead[]>,
  tier: ZoomTier,
  paddingX: number,
): StageBand[] {
  const spacingPerLead = STAGE_W_PER_LEAD[tier]
  const MAX_STAGE_W = tier === 'overview' ? 800 : 1600  // Accommodate many leads without infinite growth
  let cursor = paddingX
  return [0, 1, 2, 3].map((si) => {
    const count = (leadsByStage[si] ?? []).length
    const elasticWidth = count > 0 ? count * spacingPerLead : 0
    const width = Math.min(STAGE_BASE_W + elasticWidth, MAX_STAGE_W)
    const band: StageBand = { stageIndex: si, x: cursor, width, cx: cursor + width / 2 }
    cursor += width + 240  // Inter-stage gap increases with pipeline density
    return band
  })
}

function totalCanvasWidth(bands: StageBand[], paddingX: number): number {
  const last = bands[bands.length - 1]
  return last.x + last.width + paddingX
}

// ============================================================
// FLOW PATH — built from stage band centers
// ============================================================
function buildFlowPath(bands: StageBand[], yCenter: number): string {
  const pts = bands.map((b) => ({ x: b.cx, y: yCenter }))
  // Add slight vertical sine to make it feel organic
  const amplitude = 40
  const wavedPts = pts.map((p, i) => ({
    x: p.x,
    y: p.y + (i % 2 === 0 ? amplitude * 0.5 : -amplitude * 0.5),
  }))

  let d = `M ${wavedPts[0].x} ${wavedPts[0].y}`
  for (let i = 1; i < wavedPts.length; i++) {
    const prev = wavedPts[i - 1]
    const curr = wavedPts[i]
    const cpx1 = prev.x + (curr.x - prev.x) * 0.5
    const cpx2 = curr.x - (curr.x - prev.x) * 0.5
    d += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`
  }
  return d
}

// ============================================================
// PARTICLE
// ============================================================
function FlowParticle({ pathD, duration, delay, color }: {
  pathD: string
  duration: number
  delay: number
  color: string
}) {
  return (
    <circle r="2.5" fill={color} opacity="0">
      <animateMotion
        dur={`${duration}s`}
        repeatCount="indefinite"
        begin={`${delay}s`}
        path={pathD}
        fill="freeze"
      />
      <animate
        attributeName="opacity"
        values="0;0.6;0.6;0"
        keyTimes="0;0.08;0.88;1"
        dur={`${duration}s`}
        repeatCount="indefinite"
        begin={`${delay}s`}
      />
    </circle>
  )
}

// ============================================================
// CLUSTER LOGIC (overview)
// ============================================================
function buildClusters(leads: StrataLead[]): ClusterData[] {
  const byStage: Record<number, StrataLead[]> = {}
  leads.forEach((l) => {
    const si = Math.min(3, Math.max(0, l.stageIndex))
    if (!byStage[si]) byStage[si] = []
    byStage[si].push(l)
  })

  return Object.entries(byStage)
    .map(([si, stageLeads]) => ({
      id: `cluster-${si}`,
      stageIndex: Number(si),
      leads: stageLeads.sort((a, b) => b.heatScore - a.heatScore),
    }))
    .filter((c) => c.leads.length > 0)
    .sort((a, b) => a.stageIndex - b.stageIndex)
}

// ============================================================
// VERTICAL COLLISION SOLVER
// Distributes cards vertically within a stage band, resolved
// to avoid overlap. Uses alternating-column layout for detail.
// ============================================================
interface CardPlacement {
  id: string
  x: number
  y: number
  above: boolean
}

function placeCardsMid(
  leads: StrataLead[],
  band: StageBand,
  yCenter: number,
): CardPlacement[] {
  if (leads.length === 0) return []

  const cardX = band.cx - CARD_W_MID / 2
  const verticalSpacing = CARD_V_GAP_MID  // Total spacing between card centers

  // Split leads into two groups: above and below centerline
  const half = Math.ceil(leads.length / 2)
  const aboveCount = half
  const belowCount = leads.length - half

  // Calculate total heights for each group
  const aboveH = (aboveCount - 1) * verticalSpacing
  const belowH = (belowCount - 1) * verticalSpacing

  return leads.map((lead, i) => {
    const above = i < half
    const localIdx = above ? i : i - half
    
    if (above) {
      // Cards above centerline, starting from top of group
      const startY = yCenter - aboveH / 2
      return { 
        id: lead.id, 
        x: cardX, 
        y: startY + localIdx * verticalSpacing,
        above: true 
      }
    } else {
      // Cards below centerline, starting from bottom of group
      const startY = yCenter + belowH / 2 - (belowCount - 1) * verticalSpacing
      return { 
        id: lead.id, 
        x: cardX, 
        y: startY + localIdx * verticalSpacing,
        above: false 
      }
    }
  })
}

function placeCardsDetail(
  leads: StrataLead[],
  band: StageBand,
  yCenter: number,
): CardPlacement[] {
  if (leads.length === 0) return []

  const cols = columnCount(leads.length)
  const colSpacing = CARD_W_DETAIL + 32   // Card width + generous gap
  const rowSpacing = CARD_H_DETAIL + 28   // Card height + generous gap

  // Total grid size
  const rows = Math.ceil(leads.length / cols)
  const gridW = cols > 1 ? (cols - 1) * colSpacing + CARD_W_DETAIL : CARD_W_DETAIL
  const gridH = rows > 1 ? (rows - 1) * rowSpacing + CARD_H_DETAIL : CARD_H_DETAIL

  // Anchor the grid centered at (band.cx, yCenter)
  const startX = band.cx - gridW / 2
  const startY = yCenter - gridH / 2

  return leads.map((lead, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    return {
      id: lead.id,
      x: startX + col * colSpacing,
      y: startY + row * rowSpacing,
      above: row < rows / 2,
    }
  })
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export function StrataStream({ leads, onLeadClick }: StrataStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })
  const [ready, setReady] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(ZOOM_DEFAULT)

  const zoomTier = getZoomTier(zoomLevel)

  // Measure container
  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      setDims({ w: Math.max(rect.width, 800), h: Math.max(rect.height, 500) })
    }
    measure()
    const t = setTimeout(() => { measure(); setReady(true) }, 60)
    window.addEventListener("resize", measure)
    return () => { window.removeEventListener("resize", measure); clearTimeout(t) }
  }, [])

  // Handle trackpad pinch / ctrl+scroll
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = -e.deltaY * 0.003
        setZoomLevel((prev) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prev + delta)))
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  // Active (non-closed) leads
  const activeLeads = useMemo(
    () => leads.filter((l) => l.pipelineStage !== "closed"),
    [leads],
  )

  // Leads grouped by stage
  const leadsByStage = useMemo(() => {
    const byStage: Record<number, StrataLead[]> = { 0: [], 1: [], 2: [], 3: [] }
    activeLeads.forEach((l) => {
      const si = Math.min(3, Math.max(0, l.stageIndex))
      byStage[si].push(l)
    })
    // Sort within each stage by heatScore descending
    Object.keys(byStage).forEach((k) => {
      byStage[Number(k)].sort((a, b) => b.heatScore - a.heatScore)
    })
    return byStage
  }, [activeLeads])

  // Density-aware stage bands
  const stageBands = useMemo(
    () => computeStageBands(leadsByStage, zoomTier, STAGE_H_PADDING),
    [leadsByStage, zoomTier],
  )

  // Total canvas width driven by density
  const canvasWidth = useMemo(
    () => Math.max(dims.w, totalCanvasWidth(stageBands, STAGE_H_PADDING)),
    [dims.w, stageBands],
  )

  const yCenter = dims.h * 0.46

  // Flow path through stage band centers
  const flowPath = useMemo(
    () => (dims.h > 0 ? buildFlowPath(stageBands, yCenter) : ""),
    [stageBands, yCenter, dims.h],
  )

  // Clusters for overview mode
  const clusters = useMemo(() => buildClusters(activeLeads), [activeLeads])

  // Cluster positions: each cluster centered at its band center
  const clusterPositions = useMemo(() => {
    const CLUSTER_W = 140
    const CLUSTER_H = 110
    const positions: Record<string, { x: number; y: number }> = {}
    clusters.forEach((cluster) => {
      const band = stageBands[cluster.stageIndex]
      positions[cluster.id] = {
        x: band.cx - CLUSTER_W / 2,
        y: yCenter - CLUSTER_H / 2 - 20,
      }
    })
    return positions
  }, [clusters, stageBands, yCenter])

  // Card positions — density-aware, no overlap
  const cardPositions = useMemo(() => {
    if (!ready || zoomTier === "overview") return {} as Record<string, CardPlacement>

    const positions: Record<string, CardPlacement> = {}

    stageBands.forEach((band) => {
      const stageLeads = leadsByStage[band.stageIndex] ?? []
      const placements =
        zoomTier === "mid"
          ? placeCardsMid(stageLeads, band, yCenter)
          : placeCardsDetail(stageLeads, band, yCenter)

      placements.forEach((p) => {
        positions[p.id] = p
      })
    })

    return positions
  }, [ready, zoomTier, stageBands, leadsByStage, yCenter])

  // Compute required canvas height to fit all cards
  const canvasHeight = useMemo(() => {
    if (!ready || zoomTier === "overview") return dims.h
    const placements = Object.values(cardPositions)
    if (placements.length === 0) return dims.h
    const cardH = zoomTier === "mid" ? CARD_H_MID : CARD_H_DETAIL
    const minY = Math.min(...placements.map((p) => p.y))
    const maxY = Math.max(...placements.map((p) => p.y + cardH))
    return Math.max(dims.h, maxY - minY + 120)
  }, [ready, zoomTier, cardPositions, dims.h])

  const zoomIn = () => setZoomLevel((prev) => Math.min(ZOOM_MAX, prev + ZOOM_STEP * 3))
  const zoomOut = () => setZoomLevel((prev) => Math.max(ZOOM_MIN, prev - ZOOM_STEP * 3))

  return (
    <div
      ref={containerRef}
      className="strata-stream-container relative h-full w-full overflow-x-auto overflow-y-auto"
    >
      {/* Zoom HUD - bottom center, fixed over scroll */}
      <div className="pointer-events-auto sticky bottom-4 left-0 z-50 flex justify-center">
        <div className="flex items-center gap-2 rounded-xl border border-[var(--orbit-glass-border)] bg-[var(--orbit-glass)] px-2 py-1.5 backdrop-blur-xl shadow-lg">
          <button
            onClick={zoomOut}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--orbit-text-muted)] transition-colors hover:bg-[var(--orbit-glass-border)] hover:text-[var(--orbit-text)]"
            aria-label="Afastar"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-center gap-1">
            {(["overview", "mid", "detail"] as ZoomTier[]).map((tier) => (
              <div
                key={tier}
                className="cursor-default rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest transition-all duration-300"
                style={{
                  backgroundColor: zoomTier === tier ? "var(--orbit-glow)" : "transparent",
                  color: zoomTier === tier ? "var(--orbit-bg)" : "var(--orbit-text-muted)",
                  opacity: zoomTier === tier ? 1 : 0.5,
                }}
              >
                {tier === "overview" ? "geral" : tier === "mid" ? "medio" : "detalhe"}
              </div>
            ))}
          </div>

          <div className="mx-1 h-4 w-px bg-[var(--orbit-glass-border)]" />

          <span className="text-[9px] font-bold tabular-nums text-[var(--orbit-text-muted)]">
            {Math.round(zoomLevel * 100)}%
          </span>

          <button
            onClick={zoomIn}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--orbit-text-muted)] transition-colors hover:bg-[var(--orbit-glass-border)] hover:text-[var(--orbit-text)]"
            aria-label="Aproximar"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable canvas */}
      <div
        className="relative"
        style={{
          width: canvasWidth,
          height: canvasHeight,
          minHeight: "100%",
          willChange: "contents",
        }}
      >
        {/* SVG layer — flow path + particles + markers */}
        {dims.h > 0 && (
          <svg
            className="pointer-events-none absolute inset-0"
            width={canvasWidth}
            height={canvasHeight}
            style={{ overflow: "visible" }}
          >
            <defs>
              <linearGradient id="strataFlowGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.7" />
                <stop offset="33%"  stopColor="#eab308" stopOpacity="0.7" />
                <stop offset="66%"  stopColor="#f97316" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0.7" />
              </linearGradient>
              <linearGradient id="strataFlowGlow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.06" />
                <stop offset="33%"  stopColor="#eab308" stopOpacity="0.06" />
                <stop offset="66%"  stopColor="#f97316" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0.06" />
              </linearGradient>
            </defs>

            {/* Stage band background columns */}
            {stageBands.map((band, i) => (
              <rect
                key={band.stageIndex}
                x={band.x}
                y={0}
                width={band.width}
                height={canvasHeight}
                fill={STRATA_STAGES[band.stageIndex].color}
                opacity={i % 2 === 0 ? 0.025 : 0.015}
                rx={0}
              />
            ))}

            {/* Wide glow ribbon */}
            <path
              d={flowPath}
              fill="none"
              stroke="url(#strataFlowGlow)"
              strokeWidth="64"
              strokeLinecap="round"
            />

            {/* Main flow line */}
            <path
              ref={pathRef}
              d={flowPath}
              fill="none"
              stroke="url(#strataFlowGrad)"
              strokeWidth="2"
              strokeLinecap="round"
              className="strata-flow-line"
            />

            {/* Particles */}
            {[0, 1, 2, 3, 4].map((i) => (
              <FlowParticle
                key={i}
                pathD={flowPath}
                duration={14 + i * 2}
                delay={i * 2.8}
                color={STRATA_STAGES[i % 4].color}
              />
            ))}

            {/* Stage node dots on the flow path */}
            {stageBands.map((band) => {
              const stage = STRATA_STAGES[band.stageIndex]
              // Find the y position on the waved path for this band
              const amplitude = 40
              const waveY = yCenter + (band.stageIndex % 2 === 0 ? amplitude * 0.5 : -amplitude * 0.5)
              return (
                <g key={band.stageIndex}>
                  <circle cx={band.cx} cy={waveY} r="14" fill={stage.color} opacity="0.08" />
                  <circle
                    cx={band.cx}
                    cy={waveY}
                    r="5"
                    fill={stage.color}
                    opacity="0.95"
                    stroke="var(--orbit-bg)"
                    strokeWidth="2"
                  />
                </g>
              )
            })}

            {/* Stage width separators */}
            {stageBands.slice(0, -1).map((band) => (
              <line
                key={`sep-${band.stageIndex}`}
                x1={band.x + band.width}
                y1={0}
                x2={band.x + band.width}
                y2={canvasHeight}
                stroke="var(--orbit-glass-border)"
                strokeWidth="1"
                strokeDasharray="4 6"
                opacity="0.4"
              />
            ))}
          </svg>
        )}

        {/* Stage labels (density counts) */}
        {stageBands.map((band) => {
          const stage = STRATA_STAGES[band.stageIndex]
          const count = (leadsByStage[band.stageIndex] ?? []).length
          const amplitude = 40
          const waveY = yCenter + (band.stageIndex % 2 === 0 ? amplitude * 0.5 : -amplitude * 0.5)

          return (
            <div
              key={`label-${band.stageIndex}`}
              className="pointer-events-none absolute flex flex-col items-center gap-1"
              style={{
                left: band.cx,
                top: waveY + 20,
                transform: "translateX(-50%)",
              }}
            >
              <span
                className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: stage.color }}
              >
                {stage.label}
              </span>
              <span
                className="rounded-full px-1.5 py-0 text-[9px] font-bold tabular-nums"
                style={{ backgroundColor: `${stage.color}15`, color: stage.color }}
              >
                {count}
              </span>
            </div>
          )
        })}

        {/* ============================================================
            RENDER by zoom tier
            ============================================================ */}
        <AnimatePresence mode="popLayout">
          {zoomTier === "overview" ? (
            /* --- OVERVIEW: Cluster cards centered in each stage band --- */
            clusters.map((cluster) => {
              const pos = clusterPositions[cluster.id]
              if (!pos) return null
              return (
                <motion.div
                  key={cluster.id}
                  className="absolute"
                  style={{ willChange: "transform, opacity", zIndex: 10 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1, left: pos.x, top: pos.y }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{
                    left: { type: "spring", stiffness: 120, damping: 25 },
                    top: { type: "spring", stiffness: 120, damping: 25 },
                    opacity: { duration: 0.25 },
                    scale: { duration: 0.25 },
                  }}
                >
                  <ClusterCard cluster={cluster} onClick={onLeadClick} />
                </motion.div>
              )
            })
          ) : (
            /* --- MID / DETAIL: Individual cards, density-placed, no overlap --- */
            activeLeads.map((lead, i) => {
              const pos = cardPositions[lead.id]
              if (!pos) return null

              return (
                <motion.div
                  key={lead.id}
                  className="absolute"
                  style={{ willChange: "transform, opacity", zIndex: 10 }}
                  initial={{ opacity: 0, y: pos.above ? -16 : 16, scale: 0.92 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    left: pos.x,
                    top: pos.y,
                  }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{
                    left: { type: "spring", stiffness: 130, damping: 26 },
                    top: { type: "spring", stiffness: 130, damping: 26 },
                    opacity: { delay: i * 0.006, duration: 0.22 },
                    scale: { delay: i * 0.006, duration: 0.22 },
                  }}
                >
                  <LeadCard lead={lead} onClick={onLeadClick} index={i} zoomTier={zoomTier} />
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
