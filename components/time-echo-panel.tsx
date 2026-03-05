"use client"

import { useMemo } from "react"
import type { Lead } from "@/types/orbit-types"

interface TimeEchoPanelProps {
  leads: Lead[]
}

interface Echo {
  leadName: string
  description: string
  daysAgo: number
}

function formatDaysAgo(days: number): string {
  if (days < 30) return `ha ${days} dias`
  const months = Math.floor(days / 30)
  if (months < 12) return `ha ${months} ${months === 1 ? "mes" : "meses"}`
  const years = Math.floor(days / 365)
  return `ha ${years} ${years === 1 ? "ano" : "anos"}`
}

const interactionLabels: Record<string, string> = {
  ligacao: "ligacao realizada",
  visita: "visita realizada",
  contato: "contato registrado",
  outro: "interacao registrada",
  call: "ligacao realizada",
  visit: "visita realizada",
  message: "contato registrado",
}

export function TimeEchoPanel({ leads }: TimeEchoPanelProps) {
  const echoes = useMemo(() => {
    const result: Echo[] = []
    const now = Date.now()

    leads.forEach((lead) => {
      // Notes older than 180 days
      lead.notes.forEach((note) => {
        const days = Math.floor((now - note.timestamp.getTime()) / 86400000)
        if (days >= 180) {
          result.push({
            leadName: lead.name,
            description: `nota registrada ${formatDaysAgo(days)}`,
            daysAgo: days,
          })
        }
      })

      // Important interactions older than 365 days (visits)
      lead.interactions.forEach((interaction) => {
        const days = Math.floor((now - interaction.timestamp.getTime()) / 86400000)
        if (days >= 365) {
          result.push({
            leadName: lead.name,
            description: `${interactionLabels[interaction.type] || "interacao"} ${formatDaysAgo(days)}`,
            daysAgo: days,
          })
        }
      })
    })

    // Sort oldest first
    result.sort((a, b) => b.daysAgo - a.daysAgo)
    return result.slice(0, 5)
  }, [leads])

  if (echoes.length === 0) return null

  return (
    <div className="absolute bottom-6 left-6 z-30 w-56 pointer-events-none">
      <div className="flex flex-col gap-2">
        <span className="text-[9px] font-light uppercase tracking-[0.2em] text-[var(--orbit-text-muted)]/50">
          Ecos do Tempo
        </span>
        <div className="flex flex-col gap-1.5">
          {echoes.map((echo, i) => (
            <div
              key={i}
              className="flex flex-col gap-0 rounded-lg bg-[var(--orbit-glass)]/30 px-3 py-1.5 backdrop-blur-sm"
            >
              <span className="text-[11px] font-medium text-[var(--orbit-text)]/70">{echo.leadName}</span>
              <span className="text-[10px] text-[var(--orbit-text-muted)]/60">{echo.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
