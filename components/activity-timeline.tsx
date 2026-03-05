"use client"

import { useState, useCallback } from "react"
import {
  Phone,
  MapPin,
  MessageCircle,
  StickyNote,
  Plus,
  X,
  Check,
} from "lucide-react"

export type ActivityType = "call" | "visit" | "message" | "note"

export interface ActivityEntry {
  id: string
  type: ActivityType
  text: string
  timestamp: Date
  context?: string
}

const activityConfig: Record<
  ActivityType,
  { label: string; icon: typeof Phone; color: string; bg: string }
> = {
  call: {
    label: "Ligacao",
    icon: Phone,
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
  },
  visit: {
    label: "Visita",
    icon: MapPin,
    color: "text-sky-400",
    bg: "bg-sky-500/15",
  },
  message: {
    label: "Mensagem",
    icon: MessageCircle,
    color: "text-amber-400",
    bg: "bg-amber-500/15",
  },
  note: {
    label: "Nota",
    icon: StickyNote,
    color: "text-[var(--orbit-text-muted)]",
    bg: "bg-[var(--orbit-glass)]",
  },
}

function formatTimestamp(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "agora"
  if (minutes < 60) return `ha ${minutes}min`
  if (hours < 24) return `ha ${hours}h`
  if (days === 1) return "ontem"
  if (days < 7) return `ha ${days}d`
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

interface ActivityTimelineProps {
  activities: ActivityEntry[]
  onAddActivity: (activity: Omit<ActivityEntry, "id">) => void
}

export function ActivityTimeline({ activities, onAddActivity }: ActivityTimelineProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newType, setNewType] = useState<ActivityType>("call")
  const [newText, setNewText] = useState("")
  const [newContext, setNewContext] = useState("")

  const handleAdd = useCallback(() => {
    if (!newText.trim()) return
    onAddActivity({
      type: newType,
      text: newText.trim(),
      timestamp: new Date(),
      context: newContext.trim() || undefined,
    })
    setNewText("")
    setNewContext("")
    setShowAddForm(false)
  }, [newType, newText, newContext, onAddActivity])

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--orbit-text-muted)]">
          Atividade Recente
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex h-7 items-center gap-1.5 rounded-lg bg-[var(--orbit-glow)]/10 px-2.5 text-[11px] font-medium text-[var(--orbit-glow)] transition-colors hover:bg-[var(--orbit-glow)]/20"
        >
          {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showAddForm ? "Cancelar" : "Registrar"}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="rounded-xl border border-[var(--orbit-glow)]/20 bg-[var(--orbit-glass)] p-3 animate-text-fade-in">
          {/* Type selector */}
          <div className="mb-3 flex items-center gap-1.5">
            {(Object.keys(activityConfig) as ActivityType[]).map((type) => {
              const config = activityConfig[type]
              const Icon = config.icon
              const isSelected = newType === type
              return (
                <button
                  key={type}
                  onClick={() => setNewType(type)}
                  className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-medium transition-all ${
                    isSelected
                      ? `${config.bg} ${config.color}`
                      : "text-[var(--orbit-text-muted)] hover:bg-[var(--orbit-glass)] hover:text-[var(--orbit-text)]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {config.label}
                </button>
              )
            })}
          </div>

          {/* Text input */}
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Descreva a interacao..."
            rows={2}
            className="mb-2 w-full resize-none rounded-lg border border-[var(--orbit-glass-border)] bg-[var(--orbit-bg)] px-3 py-2 text-sm text-[var(--orbit-text)] placeholder-[var(--orbit-text-muted)]/50 outline-none focus:border-[var(--orbit-glow)]/40"
          />

          {/* Context input */}
          <input
            value={newContext}
            onChange={(e) => setNewContext(e.target.value)}
            placeholder="Contexto (ex: nome do imovel)"
            className="mb-3 w-full rounded-lg border border-[var(--orbit-glass-border)] bg-[var(--orbit-bg)] px-3 py-1.5 text-xs text-[var(--orbit-text)] placeholder-[var(--orbit-text-muted)]/50 outline-none focus:border-[var(--orbit-glow)]/40"
          />

          {/* Submit */}
          <button
            onClick={handleAdd}
            disabled={!newText.trim()}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--orbit-glow)] px-4 text-xs font-medium text-[var(--orbit-bg)] transition-opacity disabled:opacity-40"
          >
            <Check className="h-3.5 w-3.5" />
            Salvar
          </button>
        </div>
      )}

      {/* Timeline */}
      {activities.length === 0 ? (
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
          {/* Vertical line */}
          <div className="absolute bottom-0 left-2.5 top-0 w-px bg-[var(--orbit-glass-border)]" />

          <div className="flex flex-col gap-4">
            {activities.map((activity) => {
              const config = activityConfig[activity.type]
              const Icon = config.icon

              return (
                <div key={activity.id} className="relative">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full ${config.bg}`}
                  >
                    <Icon className={`h-3 w-3 ${config.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold uppercase ${config.color}`}>
                        {config.label}
                      </span>
                      <span className="text-[10px] text-[var(--orbit-text-muted)]">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-[var(--orbit-text)]">
                      {activity.text}
                    </p>
                    {activity.context && (
                      <span className="text-[11px] text-[var(--orbit-text-muted)]">
                        {activity.context}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
