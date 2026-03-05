"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { StickyNote, Plus, Clock } from "lucide-react"

export interface MemoryNote {
  id: string
  text: string
  timestamp: Date
}

interface LeadMemoryPanelProps {
  notes: MemoryNote[]
  onAddNote: (text: string) => void
}

function formatNoteDate(date: Date): string {
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
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function LeadMemoryPanel({ notes, onAddNote }: LeadMemoryPanelProps) {
  const [newNote, setNewNote] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(() => {
    if (!newNote.trim()) return
    onAddNote(newNote.trim())
    setNewNote("")
  }, [newNote, onAddNote])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [newNote])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--orbit-glass-border)] px-4 py-3">
        <StickyNote className="h-4 w-4 text-[var(--orbit-glow)]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--orbit-text-muted)]">
          Memoria do Lead
        </h3>
        <span className="ml-auto rounded-full bg-[var(--orbit-glass)] px-2 py-0.5 text-[10px] text-[var(--orbit-text-muted)]">
          {notes.length} {notes.length === 1 ? "nota" : "notas"}
        </span>
      </div>

      {/* Notes list */}
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

      {/* Add note input */}
      <div className="border-t border-[var(--orbit-glass-border)] px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nova anotacao..."
            rows={1}
            className="min-h-[36px] max-h-[120px] flex-1 resize-none rounded-lg border border-[var(--orbit-glass-border)] bg-[var(--orbit-bg)] px-3 py-2 text-sm text-[var(--orbit-text)] placeholder-[var(--orbit-text-muted)]/50 outline-none focus:border-[var(--orbit-glow)]/40"
          />
          <button
            onClick={handleSubmit}
            disabled={!newNote.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--orbit-glow)] text-[var(--orbit-bg)] transition-opacity disabled:opacity-40"
            aria-label="Adicionar nota"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
