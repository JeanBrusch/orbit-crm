"use client"

import { useMemo } from "react"
import { Megaphone, Zap, MessageCircle } from "lucide-react"
import type { CoreState } from "@/types/orbit-types"
import { useOrbitContext } from "./orbit-context"

interface LeadNodesProps {
  highlightedLeads: string[]
  coreState: CoreState
  onLeadClick?: (leadId: string) => void
}

type EmotionalAura = "intent" | "curious" | "conflicted" | "aware" | "silentGravity"
type Priority = "hot" | "warm" | "neutral" | "cold"

interface LeadNode {
  id: string
  name: string
  avatar: string
  photoUrl?: string // Real contact photo
  priority: Priority
  position: { top: string; left: string }
  badge?: { type: "messages" | "campaign" | "urgent"; count?: number }
  delay: number
  emotionalAura: EmotionalAura
  hasRecentActivity?: boolean
  hasNotification?: boolean
  isNew?: boolean // Admin-added leads
  isProvisional?: boolean // Lead from external source
}

const auraColors: Record<EmotionalAura, { ring: string; glow: string }> = {
  intent: { ring: "border-emerald-400", glow: "shadow-[0_0_16px_rgba(52,211,153,0.5)]" },
  curious: { ring: "border-[#FFC87A]", glow: "shadow-[0_0_16px_rgba(255,200,122,0.5)]" },
  conflicted: { ring: "border-orange-400", glow: "shadow-[0_0_16px_rgba(251,146,60,0.5)]" },
  aware: { ring: "border-[#2EC5FF]", glow: "shadow-[0_0_16px_rgba(46,197,255,0.5)]" },
  silentGravity: { ring: "border-cyan-300", glow: "shadow-[0_0_16px_rgba(103,232,249,0.5)]" },
}

const priorityOpacity: Record<Priority, string> = {
  hot: "opacity-100",
  warm: "opacity-90",
  neutral: "opacity-75",
  cold: "opacity-60",
}

// Static lead nodes with fixed positions (collision-safe)
const staticLeadNodes: LeadNode[] = [
  {
    id: "1",
    name: "Marina Costa",
    avatar: "MC",
    priority: "hot",
    position: { top: "32%", left: "28%" },
    badge: { type: "messages", count: 3 },
    delay: 0,
    emotionalAura: "intent",
    hasRecentActivity: true,
  },
  {
    id: "2",
    name: "Lucas Ferreira",
    avatar: "LF",
    priority: "hot",
    position: { top: "35%", left: "58%" },
    delay: 0.8,
    emotionalAura: "curious",
  },
  {
    id: "3",
    name: "Ana Rodrigues",
    avatar: "AR",
    priority: "warm",
    position: { top: "58%", left: "22%" },
    badge: { type: "campaign" },
    delay: 1.2,
    emotionalAura: "aware",
    hasRecentActivity: true,
  },
  {
    id: "4",
    name: "Pedro Santos",
    avatar: "PS",
    priority: "neutral",
    position: { top: "68%", left: "62%" },
    delay: 2,
    emotionalAura: "silentGravity",
  },
  {
    id: "5",
    name: "Julia Mendes",
    avatar: "JM",
    priority: "hot",
    position: { top: "42%", left: "12%" },
    badge: { type: "urgent" },
    delay: 1.6,
    emotionalAura: "conflicted",
    hasRecentActivity: true,
    hasNotification: true,
  },
]

// Collision detection helper - resolves overlapping positions
function resolveCollisions(nodes: LeadNode[]): LeadNode[] {
  const minDistance = 12 // Minimum percentage distance between nodes
  const resolved = [...nodes]
  
  for (let i = 0; i < resolved.length; i++) {
    const nodeA = resolved[i]
    const topA = parseFloat(nodeA.position.top)
    const leftA = parseFloat(nodeA.position.left)
    
    for (let j = i + 1; j < resolved.length; j++) {
      const nodeB = resolved[j]
      let topB = parseFloat(nodeB.position.top)
      let leftB = parseFloat(nodeB.position.left)
      
      const distance = Math.sqrt(Math.pow(topA - topB, 2) + Math.pow(leftA - leftB, 2))
      
      if (distance < minDistance && distance > 0) {
        // Push nodeB away from nodeA
        const angle = Math.atan2(topB - topA, leftB - leftA)
        const pushDistance = minDistance - distance + 2
        
        topB = Math.min(85, Math.max(15, topB + Math.sin(angle) * pushDistance))
        leftB = Math.min(85, Math.max(15, leftB + Math.cos(angle) * pushDistance))
        
        resolved[j] = {
          ...nodeB,
          position: { top: `${topB}%`, left: `${leftB}%` },
        }
      }
    }
  }
  
  return resolved
}

function BadgeContent({ badge }: { badge: LeadNode["badge"] }) {
  if (!badge) return null

  if (badge.type === "messages") {
    return (
      <div className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2EC5FF]/80 px-1 text-[9px] font-medium text-white">
        {badge.count ? badge.count : <MessageCircle className="h-2 w-2" />}
      </div>
    )
  }
  if (badge.type === "campaign") {
    return (
      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#FFC87A]/80 text-white">
        <Megaphone className="h-2.5 w-2.5" />
      </div>
    )
  }
  if (badge.type === "urgent") {
    return (
      <div className="flex h-4 w-4 animate-urgent-pulse items-center justify-center rounded-full bg-[#FF7A7A]/70 text-white">
        <Zap className="h-2.5 w-2.5" />
      </div>
    )
  }
  return null
}

function NotificationRing() {
  return (
    <>
      <div className="absolute -inset-1 animate-notification-ring rounded-full border border-[#FF7A7A]/60" />
      <div
        className="absolute -inset-2 animate-notification-ring rounded-full border border-[#FF7A7A]/40"
        style={{ animationDelay: "0.3s" }}
      />
      <div
        className="absolute -inset-3 animate-notification-ring rounded-full border border-[#FF7A7A]/20"
        style={{ animationDelay: "0.6s" }}
      />
    </>
  )
}

function FollowUpRing() {
  return (
    <>
      <div className="absolute -inset-1 animate-notification-ring rounded-full border border-amber-400/60" />
      <div
        className="absolute -inset-2 animate-notification-ring rounded-full border border-amber-400/40"
        style={{ animationDelay: "0.3s" }}
      />
      <div
        className="absolute -inset-3 animate-notification-ring rounded-full border border-amber-400/20"
        style={{ animationDelay: "0.6s" }}
      />
    </>
  )
}

export function LeadNodes({ highlightedLeads, coreState, onLeadClick }: LeadNodesProps) {
  const isResponding = coreState === "responding"
  const hasHighlights = highlightedLeads.length > 0
  
  // Get cycle status, admin leads, and follow-up leads from context
  const { hasActiveCycle, leadStates, newLeads, getLeadsWithActiveFollowUp } = useOrbitContext()
  
  // Get leads with due follow-ups for priority surfacing
  const followUpLeads = getLeadsWithActiveFollowUp()

  // Get admin-added leads
  const adminLeads = Object.values(leadStates).filter((state) => state.adminData)
  const adminLeadNodes: LeadNode[] = adminLeads.map((state) => ({
    id: state.id,
    name: state.adminData!.name,
    avatar: state.adminData!.avatar,
    photoUrl: state.adminData!.photoUrl,
    priority: "warm" as Priority,
    position: state.adminData!.position,
    delay: 0,
    emotionalAura: "aware" as EmotionalAura,
    hasRecentActivity: newLeads.includes(state.id),
    isNew: newLeads.includes(state.id),
    isProvisional: state.isProvisional,
  }))

  // Combine static and admin leads, then resolve any collisions
  const allLeadNodes = useMemo(() => {
    const combinedNodes = [...staticLeadNodes, ...adminLeadNodes]
    return resolveCollisions(combinedNodes)
  }, [adminLeadNodes])

  const handleLeadClick = (leadId: string) => {
    // Use context handler to open Lead Focus Panel as overlay
    // instead of navigating to a new page
    onLeadClick?.(leadId)
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {allLeadNodes.map((node) => {
        const isHighlighted = highlightedLeads.includes(node.id)
        const highlightDelay = isHighlighted ? highlightedLeads.indexOf(node.id) * 0.15 : 0
        const aura = auraColors[node.emotionalAura]
        
        // Check if lead has an active cycle - leads without cycles appear neutral
        const leadHasActiveCycle = hasActiveCycle(node.id)
        const isNeutral = !leadHasActiveCycle
        
        // Check if lead has a due follow-up - resurfaces as priority
        const hasFollowUpDue = followUpLeads.includes(node.id)

        return (
          <div
            key={node.id}
            className={`pointer-events-auto absolute transition-all duration-500 ${
              isResponding && hasHighlights && !isHighlighted
                ? "scale-95 opacity-40"
                : hasFollowUpDue
                  ? "opacity-100"
                  : isNeutral
                    ? "opacity-50"
                    : priorityOpacity[node.priority]
            } ${!isResponding && !node.isNew ? "animate-node-float" : ""} ${(node.priority === "hot" && !isNeutral) || hasFollowUpDue ? "animate-hot-lead-pulse" : ""} ${node.isNew ? "animate-lead-emerge" : ""}`}
            style={{
              top: node.position.top,
              left: node.position.left,
              animationDelay: `${node.delay}s`,
              transitionDelay: isResponding ? `${highlightDelay}s` : "0s",
            }}
          >
            <div
              onClick={() => handleLeadClick(node.id)}
              className="cubic-bezier-smooth group flex cursor-pointer flex-col items-center transition-all duration-[240ms] hover:scale-105"
            >
              {/* Avatar with emotional aura ring - shows real photo or initials */}
              <div className="relative">
                {node.hasNotification && !isNeutral && <NotificationRing />}
                {hasFollowUpDue && !node.hasNotification && <FollowUpRing />}

                <div
                  className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 bg-[var(--orbit-glass)] text-xs font-light text-[var(--orbit-text)] backdrop-blur-sm transition-all duration-300 ${
                    isHighlighted && isResponding
                      ? "animate-lead-highlight scale-110 border-[var(--orbit-glow)]"
                      : hasFollowUpDue
                        ? "border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.5)]"
                        : node.isNew
                          ? "border-[var(--orbit-glow)] animate-new-lead-glow"
                          : isNeutral
                            ? "border-zinc-500/50"
                            : `${aura.ring} ${aura.glow}`
                  }`}
                  style={{
                    animationDelay: isHighlighted ? `${highlightDelay}s` : "0s",
                  }}
                >
                  {node.photoUrl ? (
                    <img 
                      src={node.photoUrl || "/placeholder.svg"} 
                      alt={node.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    node.avatar
                  )}
                </div>
                {node.badge && (
                  <div className="absolute -right-1 -top-1">
                    <BadgeContent badge={node.badge} />
                  </div>
                )}
              </div>

              {/* Name label below avatar - stacked vertically and centered */}
              <div
                className={`mt-1 flex flex-col items-center text-center text-xs font-light leading-tight backdrop-blur-sm transition-all duration-[240ms] ${
                  isHighlighted && isResponding
                    ? "text-[var(--orbit-glow)]"
                    : isNeutral
                      ? "text-[var(--orbit-text-muted)]"
                      : "text-[var(--orbit-text)] group-hover:text-[var(--orbit-glow)]"
                }`}
              >
                {node.name.split(" ").map((part, i) => (
                  <span key={i}>{part}</span>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
