"use client"

import { CalendarClock, Check, X } from "lucide-react"
import { useState, useCallback } from "react"

interface FollowUpPanelProps {
  followUpDate: Date | null
  isActive: boolean
  onSetFollowUp: (date: Date) => void
  onClearFollowUp: () => void
}

function getDaysRemaining(date: Date): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

export function FollowUpPanel({
  followUpDate,
  isActive,
  onSetFollowUp,
  onClearFollowUp,
}: FollowUpPanelProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [dateValue, setDateValue] = useState("")

  const daysRemaining = followUpDate ? getDaysRemaining(followUpDate) : null

  const handleQuickSet = useCallback(
    (daysFromNow: number) => {
      const d = new Date()
      d.setDate(d.getDate() + daysFromNow)
      d.setHours(9, 0, 0, 0)
      onSetFollowUp(d)
      setShowPicker(false)
    },
    [onSetFollowUp]
  )

  const handleCustomSet = useCallback(() => {
    if (!dateValue) return
    const d = new Date(dateValue)
    d.setHours(9, 0, 0, 0)
    onSetFollowUp(d)
    setShowPicker(false)
    setDateValue("")
  }, [dateValue, onSetFollowUp])

  return (
    <div className="rounded-xl border border-[var(--orbit-glass-border)] bg-[var(--orbit-glass)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock className="h-4 w-4 text-[var(--orbit-glow)]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--orbit-text-muted)]">
          Follow-up
        </h3>
      </div>

      {isActive && followUpDate ? (
        <div className="flex flex-col gap-2">
          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  daysRemaining !== null && daysRemaining <= 0
                    ? "bg-amber-400 animate-pulse"
                    : "bg-emerald-400"
                }`}
              />
              <span className="text-sm font-medium text-[var(--orbit-text)]">
                {daysRemaining !== null && daysRemaining <= 0
                  ? "Vencido"
                  : "Ativo"}
              </span>
            </div>
            <button
              onClick={onClearFollowUp}
              className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--orbit-text-muted)] transition-colors hover:bg-[var(--orbit-glass-border)] hover:text-[var(--orbit-text)]"
              aria-label="Remover follow-up"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Days remaining */}
          <div
            className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
              daysRemaining !== null && daysRemaining <= 0
                ? "bg-amber-500/10"
                : "bg-[var(--orbit-glow)]/10"
            }`}
          >
            <span
              className={`text-2xl font-bold ${
                daysRemaining !== null && daysRemaining <= 0
                  ? "text-amber-400"
                  : "text-[var(--orbit-glow)]"
              }`}
            >
              {daysRemaining !== null ? (daysRemaining < 0 ? 0 : daysRemaining) : "-"}
            </span>
            <div className="flex flex-col">
              <span className="text-xs text-[var(--orbit-text)]">
                {daysRemaining === 1 ? "dia restante" : "dias restantes"}
              </span>
              <span className="text-[10px] text-[var(--orbit-text-muted)]">
                {followUpDate.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
      ) : showPicker ? (
        <div className="flex flex-col gap-2 animate-text-fade-in">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleQuickSet(1)}
              className="flex h-7 items-center rounded-lg bg-[var(--orbit-glow)]/10 px-2.5 text-[11px] font-medium text-[var(--orbit-glow)] transition-colors hover:bg-[var(--orbit-glow)]/20"
            >
              Amanha
            </button>
            <button
              onClick={() => handleQuickSet(3)}
              className="flex h-7 items-center rounded-lg bg-[var(--orbit-glow)]/10 px-2.5 text-[11px] font-medium text-[var(--orbit-glow)] transition-colors hover:bg-[var(--orbit-glow)]/20"
            >
              3 dias
            </button>
            <button
              onClick={() => handleQuickSet(7)}
              className="flex h-7 items-center rounded-lg bg-[var(--orbit-glow)]/10 px-2.5 text-[11px] font-medium text-[var(--orbit-glow)] transition-colors hover:bg-[var(--orbit-glow)]/20"
            >
              1 semana
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="h-7 flex-1 rounded-lg border border-[var(--orbit-glass-border)] bg-[var(--orbit-bg)] px-2 text-xs text-[var(--orbit-text)] outline-none focus:border-[var(--orbit-glow)]/40"
            />
            {dateValue && (
              <button
                onClick={handleCustomSet}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--orbit-glow)]/20 text-[var(--orbit-glow)] transition-colors hover:bg-[var(--orbit-glow)]/30"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => {
                setShowPicker(false)
                setDateValue("")
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--orbit-text-muted)] transition-colors hover:bg-[var(--orbit-glass)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-2">
          <p className="text-xs text-[var(--orbit-text-muted)]">Sem follow-up ativo</p>
          <button
            onClick={() => setShowPicker(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--orbit-glow)]/10 px-3 text-xs font-medium text-[var(--orbit-glow)] transition-colors hover:bg-[var(--orbit-glow)]/20"
          >
            <CalendarClock className="h-3.5 w-3.5" />
            Agendar follow-up
          </button>
        </div>
      )}
    </div>
  )
}
