"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { X, Check, UserPlus } from "lucide-react"

interface QuickLeadCreationProps {
  initialName: string
  onClose: () => void
  onCreated: (lead: { name: string; phone?: string; origin?: string; note?: string }) => void
}

export function QuickLeadCreation({ initialName, onClose, onCreated }: QuickLeadCreationProps) {
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState("")
  const [origin, setOrigin] = useState("")
  const [note, setNote] = useState("")
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
    nameRef.current?.select()
  }, [])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!name.trim()) return
      onCreated({
        name: name.trim(),
        phone: phone.trim() || undefined,
        origin: origin.trim() || undefined,
        note: note.trim() || undefined,
      })
    },
    [name, phone, origin, note, onCreated],
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--orbit-bg)]/60 backdrop-blur-sm animate-backdrop-fade"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-[var(--orbit-glass-border)] bg-[var(--orbit-glass)] p-6 shadow-xl backdrop-blur-xl animate-text-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--orbit-glow)]/15">
              <UserPlus className="h-4 w-4 text-[var(--orbit-glow)]" />
            </div>
            <h2 className="text-sm font-medium text-[var(--orbit-text)]">Novo Lead</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--orbit-text-muted)] hover:bg-[var(--orbit-glass-border)] hover:text-[var(--orbit-text)] transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Name (required) */}
          <div className="flex flex-col gap-1">
            <label htmlFor="lead-name" className="text-[10px] font-medium uppercase tracking-wider text-[var(--orbit-text-muted)]">
              Nome *
            </label>
            <input
              ref={nameRef}
              id="lead-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-9 rounded-lg border border-[var(--orbit-glass-border)] bg-[var(--orbit-bg)] px-3 text-sm text-[var(--orbit-text)] placeholder:text-[var(--orbit-text-muted)]/50 outline-none focus:border-[var(--orbit-glow)]/40 transition-colors"
              placeholder="Nome completo"
            />
          </div>

          {/* Phone (optional) */}
          <div className="flex flex-col gap-1">
            <label htmlFor="lead-phone" className="text-[10px] font-medium uppercase tracking-wider text-[var(--orbit-text-muted)]">
              Telefone
            </label>
            <input
              id="lead-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-9 rounded-lg border border-[var(--orbit-glass-border)] bg-[var(--orbit-bg)] px-3 text-sm text-[var(--orbit-text)] placeholder:text-[var(--orbit-text-muted)]/50 outline-none focus:border-[var(--orbit-glow)]/40 transition-colors"
              placeholder="(00) 00000-0000"
            />
          </div>

          {/* Origin (optional) */}
          <div className="flex flex-col gap-1">
            <label htmlFor="lead-origin" className="text-[10px] font-medium uppercase tracking-wider text-[var(--orbit-text-muted)]">
              Origem
            </label>
            <input
              id="lead-origin"
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="h-9 rounded-lg border border-[var(--orbit-glass-border)] bg-[var(--orbit-bg)] px-3 text-sm text-[var(--orbit-text)] placeholder:text-[var(--orbit-text-muted)]/50 outline-none focus:border-[var(--orbit-glow)]/40 transition-colors"
              placeholder="WhatsApp, indicacao, portal..."
            />
          </div>

          {/* Note (optional) */}
          <div className="flex flex-col gap-1">
            <label htmlFor="lead-note" className="text-[10px] font-medium uppercase tracking-wider text-[var(--orbit-text-muted)]">
              Nota inicial
            </label>
            <textarea
              id="lead-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="resize-none rounded-lg border border-[var(--orbit-glass-border)] bg-[var(--orbit-bg)] px-3 py-2 text-sm text-[var(--orbit-text)] placeholder:text-[var(--orbit-text-muted)]/50 outline-none focus:border-[var(--orbit-glow)]/40 transition-colors"
              placeholder="Observacoes sobre o lead..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-2">
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--orbit-glow)] text-sm font-medium text-[var(--orbit-bg)] transition-opacity disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
              Criar lead
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 items-center justify-center rounded-lg px-4 text-sm text-[var(--orbit-text-muted)] hover:text-[var(--orbit-text)] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
