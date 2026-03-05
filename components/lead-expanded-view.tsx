"use client"

import React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  X,
  Send,
  ImageIcon,
  Paperclip,
  MapPin,
  Clock,
  Check,
  CheckCheck,
  Building2,
  Heart,
  Eye,
  XCircle,
  ChevronDown,
  ChevronUp,
  Share2,
  Link2,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Loader2,
  AlertCircle,
} from "lucide-react"
import type { Property } from "./atlas-map"
import { useOrbitContext } from "./orbit-context"
import { LeadMemory } from "./lead-memory"

export type LeadInternalState = "priority" | "focus" | "resolved" | "default"

export interface LeadFocusData {
  id: string
  name: string
  avatar: string
  status: "online" | "typing" | "offline"
  statusLabel: string
  lastSeen: string
  internalState: LeadInternalState
}

// Property state for the Capsule View
export type PropertyState = "sent" | "favorited" | "discarded" | "visited"

export interface SentProperty {
  property: Property
  state: PropertyState
  sentAt: Date
  stateChangedAt?: Date
}

interface Message {
  id: string
  content: string
  timestamp: string
  type: "sent" | "received"
  status?: "sent" | "delivered" | "read"
  media?: {
    type: "image" | "file"
    name: string
    url?: string
  }[]
  linkedProperty?: Property
}

const leadsDatabase: Record<string, LeadFocusData> = {
  "1": {
    id: "1",
    name: "Marina Costa",
    avatar: "MC",
    status: "online",
    statusLabel: "online",
    lastSeen: "agora",
    internalState: "priority",
  },
  "2": {
    id: "2",
    name: "Lucas Ferreira",
    avatar: "LF",
    status: "typing",
    statusLabel: "digitando...",
    lastSeen: "ha 5min",
    internalState: "default",
  },
  "3": {
    id: "3",
    name: "Ana Rodrigues",
    avatar: "AR",
    status: "offline",
    statusLabel: "visto por ultimo ha 1h",
    lastSeen: "ha 1h",
    internalState: "default",
  },
  "4": {
    id: "4",
    name: "Pedro Santos",
    avatar: "PS",
    status: "offline",
    statusLabel: "visto por ultimo ha 3h",
    lastSeen: "ha 3h",
    internalState: "resolved",
  },
  "5": {
    id: "5",
    name: "Julia Mendes",
    avatar: "JM",
    status: "online",
    statusLabel: "online",
    lastSeen: "agora",
    internalState: "focus",
  },
}

// Sample conversation data
const sampleMessages: Message[] = [
  {
    id: "1",
    content: "Ola! Vi que voces tem unidades disponiveis no Laguna Premium. Ainda tem cobertura?",
    timestamp: "10:30",
    type: "received",
  },
  {
    id: "2",
    content: "Oi Marina! Sim, temos algumas opcoes de cobertura disponiveis. Voce prefere vista mar ou piscina privativa?",
    timestamp: "10:32",
    type: "sent",
    status: "read",
  },
  {
    id: "3",
    content: "Vista mar seria incrivel! Qual a metragem?",
    timestamp: "10:33",
    type: "received",
  },
  {
    id: "4",
    content: "A cobertura com vista mar tem 248m2, com 4 suites e terraco gourmet. Posso enviar as fotos?",
    timestamp: "10:35",
    type: "sent",
    status: "read",
  },
  {
    id: "5",
    content: "Sim, por favor! E qual o valor?",
    timestamp: "10:36",
    type: "received",
  },
]

// Sample properties for the embedded Atlas
const sampleProperties: Property[] = [
  {
    id: "p1",
    name: "Laguna Premium",
    address: "Av. Beira Mar, 1200 - Ponta Negra",
    type: "penthouse",
    price: "R$ 2.450.000",
    area: "248m2",
    bedrooms: 4,
    position: { x: 35, y: 28 },
    highlight: true,
  },
  {
    id: "p2",
    name: "Marina Bay Residence",
    address: "Rua das Palmeiras, 450 - Petropolis",
    type: "apartment",
    price: "R$ 890.000",
    area: "120m2",
    bedrooms: 3,
    position: { x: 62, y: 45 },
  },
  {
    id: "p3",
    name: "Solar do Atlantico",
    address: "Av. Eng. Roberto Freire, 2100",
    type: "apartment",
    price: "R$ 650.000",
    area: "85m2",
    bedrooms: 2,
    position: { x: 48, y: 65 },
  },
  {
    id: "p4",
    name: "Edificio Dunas",
    address: "Rua Joao XXIII, 800 - Tirol",
    type: "apartment",
    price: "R$ 720.000",
    area: "95m2",
    bedrooms: 3,
    position: { x: 25, y: 55 },
  },
  {
    id: "p5",
    name: "Villa Serena",
    address: "Condominio Bosque das Arvores",
    type: "house",
    price: "R$ 1.850.000",
    area: "320m2",
    bedrooms: 5,
    position: { x: 75, y: 30 },
  },
]

export function LeadExpandedView() {
  const {
    isExpandedViewOpen,
    expandedViewLeadId,
    closeExpandedView,
    atlasProperties,
    getActiveCycle,
    getAllCycles,
    startNewCycle,
    endCycle,
    updateCycleCapsule,
    hasActiveCycle,
  } = useOrbitContext()

  const [lead, setLead] = useState<LeadFocusData | null>(null)
  const [messages, setMessages] = useState<Message[]>(sampleMessages)
  const [inputValue, setInputValue] = useState("")
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [linkedProperty, setLinkedProperty] = useState<Property | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Capsule View state
  const [sentProperties, setSentProperties] = useState<SentProperty[]>([])
  const [isCapsuleExpanded, setIsCapsuleExpanded] = useState(true)

  // Atlas state
  const [selectedMapProperty, setSelectedMapProperty] = useState<Property | null>(null)
  const [hoveredMapProperty, setHoveredMapProperty] = useState<string | null>(null)

  // Magic Link state
  const [magicLinkUrl, setMagicLinkUrl] = useState<string | null>(null)
  const [isLinkCopied, setIsLinkCopied] = useState(false)
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)

  // Combine sample and ingested properties for Atlas
  const allProperties = [...sampleProperties, ...atlasProperties]

  // Get cycle data for current lead
  const activeCycle = expandedViewLeadId ? getActiveCycle(expandedViewLeadId) : undefined
  const allCycles = expandedViewLeadId ? getAllCycles(expandedViewLeadId) : []
  const isInActiveCycle = expandedViewLeadId ? hasActiveCycle(expandedViewLeadId) : false

  // Capsule is active when at least one property has been sent AND we're in an active cycle
  const isCapsuleActive = sentProperties.length > 0 && isInActiveCycle

  useEffect(() => {
    if (expandedViewLeadId && leadsDatabase[expandedViewLeadId]) {
      setLead(leadsDatabase[expandedViewLeadId])
    } else {
      setLead(null)
    }
  }, [expandedViewLeadId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Load capsule data from active cycle when lead changes
  useEffect(() => {
    if (activeCycle) {
      setSentProperties(activeCycle.capsuleData)
    } else {
      setSentProperties([])
    }
    setMagicLinkUrl(null)
    setIsLinkCopied(false)
  }, [expandedViewLeadId, activeCycle])

  // Sync sentProperties to cycle capsule data
  useEffect(() => {
    if (expandedViewLeadId && isInActiveCycle && sentProperties.length > 0) {
      updateCycleCapsule(expandedViewLeadId, sentProperties)
    }
  }, [expandedViewLeadId, isInActiveCycle, sentProperties, updateCycleCapsule])

  // Keyboard handler for escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpandedViewOpen) {
        closeExpandedView()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isExpandedViewOpen, closeExpandedView])

  const handleSend = useCallback(() => {
    if (!inputValue.trim() && selectedImages.length === 0 && selectedFiles.length === 0) return

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      type: "sent",
      status: "sent",
      media: [
        ...selectedImages.map((img) => ({ type: "image" as const, name: img.name })),
        ...selectedFiles.map((file) => ({ type: "file" as const, name: file.name })),
      ],
    }

    setMessages((prev) => [...prev, newMessage])
    setInputValue("")
    setSelectedImages([])
    setSelectedFiles([])
  }, [inputValue, selectedImages, selectedFiles])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedImages((prev) => [...prev, ...files])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles((prev) => [...prev, ...files])
  }

  const removeSelectedImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index))
  }

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Select property from embedded Atlas
  const handleSelectPropertyFromAtlas = useCallback((property: Property) => {
    setLinkedProperty(property)
    setSelectedMapProperty(property)
  }, [])

  // Send property to lead
  const handleSendProperty = useCallback(() => {
    if (!linkedProperty || !isInActiveCycle) return

    const newSentProperty: SentProperty = {
      property: linkedProperty,
      state: "sent",
      sentAt: new Date(),
    }

    setSentProperties((prev) => [...prev, newSentProperty])

    const propertyMessage: Message = {
      id: `prop-${Date.now()}`,
      content: `Imovel enviado: ${linkedProperty.name}`,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      type: "sent",
      status: "sent",
      linkedProperty: linkedProperty,
    }

    setMessages((prev) => [...prev, propertyMessage])
    setLinkedProperty(null)
    setSelectedMapProperty(null)
  }, [linkedProperty, isInActiveCycle])

  // Toggle property state in the Capsule
  const handleTogglePropertyState = useCallback((propertyId: string, newState: PropertyState) => {
    setSentProperties((prev) =>
      prev.map((sp) =>
        sp.property.id === propertyId ? { ...sp, state: newState, stateChangedAt: new Date() } : sp
      )
    )
  }, [])

  // Get the appropriate icon and color for property state
  const getPropertyStateConfig = (state: PropertyState) => {
    switch (state) {
      case "favorited":
        return { icon: Heart, color: "text-rose-400", bg: "bg-rose-500/20", label: "Favoritado" }
      case "discarded":
        return { icon: XCircle, color: "text-zinc-400", bg: "bg-zinc-500/20", label: "Descartado" }
      case "visited":
        return { icon: Eye, color: "text-emerald-400", bg: "bg-emerald-500/20", label: "Visitado" }
      default:
        return { icon: Send, color: "text-[var(--orbit-glow)]", bg: "bg-[var(--orbit-glow)]/20", label: "Enviado" }
    }
  }

  // Generate magic link
  const handleGenerateMagicLink = useCallback(async () => {
    if (!expandedViewLeadId || sentProperties.length === 0) return

    setIsGeneratingLink(true)

    const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")

    const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
    const url = `${baseUrl}/capsule/${token}`

    await new Promise((resolve) => setTimeout(resolve, 300))

    setMagicLinkUrl(url)
    setIsGeneratingLink(false)
  }, [expandedViewLeadId, sentProperties.length])

  // Copy magic link
  const handleCopyMagicLink = useCallback(async () => {
    if (!magicLinkUrl) return

    try {
      await navigator.clipboard.writeText(magicLinkUrl)
      setIsLinkCopied(true)
      setTimeout(() => setIsLinkCopied(false), 2000)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = magicLinkUrl
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setIsLinkCopied(true)
      setTimeout(() => setIsLinkCopied(false), 2000)
    }
  }, [magicLinkUrl])

  // Get marker style for Atlas
  const getMarkerStyle = (property: Property) => {
    if (selectedMapProperty?.id === property.id || linkedProperty?.id === property.id) {
      return "border-[var(--orbit-glow)] bg-[var(--orbit-glow)] text-[var(--orbit-bg)]"
    }
    // Check if property is in sentProperties (already sent to this lead)
    const isSent = sentProperties.some((sp) => sp.property.id === property.id)
    if (isSent) {
      return "border-emerald-500/60 bg-emerald-500/20 text-emerald-400"
    }
    return property.highlight
      ? "border-[var(--orbit-accent)]/60 bg-[var(--orbit-accent)]/20 text-[var(--orbit-accent)]"
      : "border-[var(--orbit-glow)]/40 bg-[var(--orbit-glass)] text-[var(--orbit-glow)]"
  }

  if (!isExpandedViewOpen || !lead) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-backdrop-fade"
        onClick={closeExpandedView}
        aria-hidden="true"
      />

      {/* Expanded View Container - Full screen with three columns */}
      <div
        className="fixed inset-2 md:inset-4 z-50 flex flex-col rounded-2xl border border-[var(--orbit-glass-border)] bg-[var(--orbit-bg)] shadow-2xl shadow-black/50 overflow-hidden animate-panel-slide-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expanded-view-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--orbit-glass-border)] bg-[var(--orbit-glass)] px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--orbit-glow)]/20 to-[var(--orbit-glow)]/5 text-sm font-medium text-[var(--orbit-text)]">
              {lead.avatar}
              {lead.status === "online" && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--orbit-bg)] bg-emerald-400" />
              )}
            </div>

            {/* Name & Status */}
            <div className="flex-1 min-w-0">
              <h2 id="expanded-view-title" className="truncate text-sm font-medium text-[var(--orbit-text)]">
                {lead.name}
              </h2>
              <p className={`text-xs ${lead.status === "typing" ? "text-emerald-400" : "text-[var(--orbit-text-muted)]"}`}>
                {lead.statusLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Expanded View indicator */}
            <div className="flex items-center gap-1.5 rounded-full bg-[var(--orbit-glow)]/10 px-3 py-1">
              <Maximize2 className="h-3.5 w-3.5 text-[var(--orbit-glow)]" />
              <span className="text-xs font-medium text-[var(--orbit-glow)]">Vista Expandida</span>
            </div>

            {/* Close Button */}
            <button
              onClick={closeExpandedView}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--orbit-text-muted)] transition-colors hover:bg-[var(--orbit-glow)]/10 hover:text-[var(--orbit-text)]"
              aria-label="Fechar vista expandida"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Main Content - Three columns: Chat | Capsule | Atlas */}
        <div className="flex flex-1 overflow-hidden">
          {/* Column 1: WhatsApp Chat (Live) */}
          <div className="flex w-full flex-col border-r border-[var(--orbit-glass-border)] lg:w-[35%]">
            {/* Lead Memory */}
            {expandedViewLeadId && <LeadMemory leadId={expandedViewLeadId} />}

            {/* Conversation Timeline */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === "sent" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`relative max-w-[85%] rounded-2xl px-3 py-2 ${
                      message.type === "sent"
                        ? "bg-[var(--orbit-glow)]/20 text-[var(--orbit-text)] rounded-br-sm"
                        : "bg-[var(--orbit-glass)] text-[var(--orbit-text)] rounded-bl-sm"
                    }`}
                  >
                    {/* Property Card in message */}
                    {message.linkedProperty && (
                      <div className="mb-2 rounded-lg border border-[var(--orbit-glow)]/30 bg-[var(--orbit-bg)]/50 p-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--orbit-glow)]/20 text-[var(--orbit-glow)]">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-xs font-medium text-[var(--orbit-text)]">
                              {message.linkedProperty.name}
                            </p>
                            <p className="text-[10px] text-[var(--orbit-glow)]">
                              {message.linkedProperty.price} · {message.linkedProperty.area}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Media attachments */}
                    {message.media && message.media.length > 0 && (
                      <div className="mb-2 space-y-1">
                        {message.media.map((m, i) => (
                          <div key={i} className="flex items-center gap-2 rounded bg-black/20 px-2 py-1 text-xs">
                            {m.type === "image" ? (
                              <ImageIcon className="h-3 w-3 text-[var(--orbit-glow)]" />
                            ) : (
                              <Paperclip className="h-3 w-3 text-[var(--orbit-glow)]" />
                            )}
                            <span className="truncate">{m.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Message content */}
                    <p className="text-sm leading-relaxed">{message.content}</p>

                    {/* Timestamp & status */}
                    <div className={`mt-1 flex items-center gap-1 ${message.type === "sent" ? "justify-end" : ""}`}>
                      <span className="text-[10px] text-[var(--orbit-text-muted)]">{message.timestamp}</span>
                      {message.type === "sent" && message.status && (
                        <span className="text-[var(--orbit-glow)]">
                          {message.status === "read" ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Selected Media Preview */}
            {(selectedImages.length > 0 || selectedFiles.length > 0) && (
              <div className="border-t border-[var(--orbit-glass-border)] bg-[var(--orbit-glass)] px-4 py-2">
                <div className="flex flex-wrap gap-2">
                  {selectedImages.map((img, i) => (
                    <div
                      key={`img-${i}`}
                      className="flex items-center gap-2 rounded-lg bg-[var(--orbit-glow)]/10 px-2 py-1 text-xs text-[var(--orbit-text)]"
                    >
                      <ImageIcon className="h-3 w-3 text-[var(--orbit-glow)]" />
                      <span className="max-w-[100px] truncate">{img.name}</span>
                      <button onClick={() => removeSelectedImage(i)} className="text-[var(--orbit-text-muted)] hover:text-red-400">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {selectedFiles.map((file, i) => (
                    <div
                      key={`file-${i}`}
                      className="flex items-center gap-2 rounded-lg bg-[var(--orbit-accent)]/10 px-2 py-1 text-xs text-[var(--orbit-text)]"
                    >
                      <Paperclip className="h-3 w-3 text-[var(--orbit-accent)]" />
                      <span className="max-w-[100px] truncate">{file.name}</span>
                      <button onClick={() => removeSelectedFile(i)} className="text-[var(--orbit-text-muted)] hover:text-red-400">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div className="border-t border-[var(--orbit-glass-border)] bg-[var(--orbit-glass)] p-3">
              {/* Linked Property Card or prompt */}
              {linkedProperty ? (
                <div className="mb-3 rounded-xl border border-[var(--orbit-glow)]/30 bg-[var(--orbit-bg-secondary)] p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--orbit-glow)]/30 bg-[var(--orbit-glow)]/10 text-[var(--orbit-glow)]">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--orbit-text-muted)]">Imovel selecionado</p>
                      <p className="truncate text-sm font-medium text-[var(--orbit-text)]">{linkedProperty.name}</p>
                      <p className="text-xs text-[var(--orbit-glow)]">{linkedProperty.price}</p>
                    </div>
                    <button
                      onClick={() => {
                        setLinkedProperty(null)
                        setSelectedMapProperty(null)
                      }}
                      className="shrink-0 rounded-lg border border-[var(--orbit-glass-border)] bg-transparent px-2.5 py-1.5 text-[10px] font-medium text-[var(--orbit-text-muted)] transition-all hover:bg-[var(--orbit-glow)]/10 hover:text-[var(--orbit-text)]"
                    >
                      Alterar
                    </button>
                  </div>
                  <button
                    onClick={handleSendProperty}
                    disabled={!isInActiveCycle}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--orbit-glow)] py-2.5 text-sm font-medium text-[var(--orbit-bg)] transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Enviar para {lead.name.split(" ")[0]}
                  </button>
                </div>
              ) : isInActiveCycle ? (
                <div className="mb-3 rounded-xl border border-dashed border-[var(--orbit-glow)]/30 bg-[var(--orbit-bg-secondary)]/50 px-4 py-3 text-center">
                  <p className="text-xs text-[var(--orbit-text-muted)]">Selecione um imovel no mapa ao lado</p>
                </div>
              ) : (
                <div className="mb-3 rounded-xl border border-dashed border-[var(--orbit-glass-border)] bg-[var(--orbit-bg-secondary)]/50 px-4 py-3 text-center">
                  <p className="text-xs text-[var(--orbit-text-muted)]">Inicie um ciclo para enviar imoveis</p>
                  <button
                    onClick={() => expandedViewLeadId && startNewCycle(expandedViewLeadId)}
                    className="mt-2 rounded-lg bg-[var(--orbit-glow)]/10 px-3 py-1.5 text-xs font-medium text-[var(--orbit-glow)] transition-colors hover:bg-[var(--orbit-glow)]/20"
                  >
                    Iniciar ciclo
                  </button>
                </div>
              )}

              {/* Message Input */}
              <div className="flex items-end gap-2">
                <div className="flex gap-1">
                  <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--orbit-text-muted)] transition-colors hover:bg-[var(--orbit-glow)]/10 hover:text-[var(--orbit-glow)]"
                    title="Enviar imagens"
                  >
                    <ImageIcon className="h-5 w-5" />
                  </button>
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--orbit-text-muted)] transition-colors hover:bg-[var(--orbit-accent)]/10 hover:text-[var(--orbit-accent)]"
                    title="Enviar arquivos"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 rounded-2xl border border-[var(--orbit-glass-border)] bg-[var(--orbit-bg-secondary)] px-4 py-2.5 focus-within:border-[var(--orbit-glow)]/40">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Digite uma mensagem..."
                    rows={1}
                    className="w-full resize-none bg-transparent text-sm text-[var(--orbit-text)] placeholder-[var(--orbit-text-muted)] outline-none"
                    style={{ minHeight: "20px", maxHeight: "100px" }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() && selectedImages.length === 0 && selectedFiles.length === 0}
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                    inputValue.trim() || selectedImages.length > 0 || selectedFiles.length > 0
                      ? "bg-[var(--orbit-glow)] text-[var(--orbit-bg)] hover:opacity-90"
                      : "bg-[var(--orbit-glow)]/10 text-[var(--orbit-text-muted)]"
                  }`}
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Column 2: Capsule (Live & Editable) */}
          <div className="hidden w-[30%] flex-col border-r border-[var(--orbit-glass-border)] lg:flex">
            {/* Capsule Header */}
            <div className="flex items-center justify-between border-b border-[var(--orbit-glass-border)] bg-[var(--orbit-glass)] px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--orbit-glow)]/20 text-[var(--orbit-glow)]">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-[var(--orbit-text)]">Espaco de Decisao</h3>
                  <p className="text-[10px] text-[var(--orbit-text-muted)]">
                    {sentProperties.length} {sentProperties.length === 1 ? "imovel" : "imoveis"} enviados
                  </p>
                </div>
              </div>
              {isInActiveCycle && activeCycle && (
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-[var(--orbit-text-muted)]">{activeCycle.name}</span>
                </div>
              )}
            </div>

            {/* Capsule Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {sentProperties.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--orbit-glass)] text-[var(--orbit-text-muted)]">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <p className="mt-4 text-sm text-[var(--orbit-text-muted)]">Nenhum imovel enviado ainda</p>
                  <p className="mt-1 text-xs text-[var(--orbit-text-muted)]/60">
                    Selecione um imovel no mapa e envie para o lead
                  </p>
                </div>
              ) : (
                sentProperties.map((sp) => {
                  const stateConfig = getPropertyStateConfig(sp.state)
                  const StateIcon = stateConfig.icon

                  return (
                    <div
                      key={sp.property.id}
                      className={`rounded-xl border border-[var(--orbit-glass-border)] bg-[var(--orbit-glass)] p-3 transition-all ${
                        sp.state === "discarded" ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${stateConfig.bg} ${stateConfig.color}`}
                        >
                          <Building2 className="h-5 w-5" />
                          <span
                            className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full ${stateConfig.bg} border border-[var(--orbit-bg)]`}
                          >
                            <StateIcon className={`h-2.5 w-2.5 ${stateConfig.color}`} />
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-[var(--orbit-text)]">{sp.property.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-[var(--orbit-text-muted)]">{sp.property.price}</span>
                            <span className="text-[var(--orbit-text-muted)]">·</span>
                            <span className="text-[10px] text-[var(--orbit-text-muted)]">{sp.property.area}</span>
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-medium ${stateConfig.bg} ${stateConfig.color}`}>
                          {stateConfig.label}
                        </span>
                      </div>

                      {/* State Toggle Buttons */}
                      <div className="mt-3 flex gap-1.5">
                        <button
                          onClick={() => handleTogglePropertyState(sp.property.id, "sent")}
                          className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-[9px] font-medium transition-all ${
                            sp.state === "sent"
                              ? "bg-[var(--orbit-glow)] text-[var(--orbit-bg)]"
                              : "bg-[var(--orbit-glow)]/10 text-[var(--orbit-glow)] hover:bg-[var(--orbit-glow)]/20"
                          }`}
                        >
                          <Send className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleTogglePropertyState(sp.property.id, "visited")}
                          className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-[9px] font-medium transition-all ${
                            sp.state === "visited"
                              ? "bg-emerald-500 text-white"
                              : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                          }`}
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleTogglePropertyState(sp.property.id, "favorited")}
                          className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-[9px] font-medium transition-all ${
                            sp.state === "favorited"
                              ? "bg-rose-500 text-white"
                              : "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                          }`}
                        >
                          <Heart className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleTogglePropertyState(sp.property.id, "discarded")}
                          className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-[9px] font-medium transition-all ${
                            sp.state === "discarded"
                              ? "bg-zinc-500 text-white"
                              : "bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20"
                          }`}
                        >
                          <XCircle className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Timeline indicator */}
                      <div className="mt-2 flex items-center gap-1.5 text-[9px] text-[var(--orbit-text-muted)]">
                        <Clock className="h-3 w-3" />
                        <span>
                          Enviado {sp.sentAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          {sp.stateChangedAt && sp.state !== "sent" && (
                            <>
                              {" "}
                              · {stateConfig.label.toLowerCase()}{" "}
                              {sp.stateChangedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Share with Client */}
            {sentProperties.length > 0 && (
              <div className="border-t border-[var(--orbit-glass-border)] bg-[var(--orbit-glass)] p-4">
                {!magicLinkUrl ? (
                  <button
                    onClick={handleGenerateMagicLink}
                    disabled={isGeneratingLink}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--orbit-glass-border)] bg-transparent py-2.5 text-xs font-medium text-[var(--orbit-text-muted)] transition-all hover:border-[var(--orbit-glow)]/50 hover:text-[var(--orbit-glow)] disabled:opacity-50"
                  >
                    {isGeneratingLink ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
                        Gerando link...
                      </>
                    ) : (
                      <>
                        <Share2 className="h-3.5 w-3.5" />
                        Compartilhar com cliente
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-xl bg-[var(--orbit-bg)] px-3 py-2">
                      <Link2 className="h-3.5 w-3.5 shrink-0 text-[var(--orbit-glow)]" />
                      <span className="flex-1 truncate text-xs text-[var(--orbit-text-muted)]">{magicLinkUrl}</span>
                      <button
                        onClick={handleCopyMagicLink}
                        className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-medium transition-all ${
                          isLinkCopied
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-[var(--orbit-glow)]/10 text-[var(--orbit-glow)] hover:bg-[var(--orbit-glow)]/20"
                        }`}
                      >
                        {isLinkCopied ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Copiado
                          </span>
                        ) : (
                          "Copiar"
                        )}
                      </button>
                    </div>
                    <p className="text-center text-[10px] text-[var(--orbit-text-muted)]">Link exclusivo para {lead.name.split(" ")[0]}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Column 3: Atlas (Live Focus Surface) */}
          <div className="hidden flex-1 flex-col lg:flex">
            {/* Atlas Header */}
            <div className="flex items-center justify-between border-b border-[var(--orbit-glass-border)] bg-[var(--orbit-glass)] px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--orbit-glow)]/20 text-[var(--orbit-glow)]">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-[var(--orbit-text)]">Atlas</h3>
                  <p className="text-[10px] text-[var(--orbit-text-muted)]">{allProperties.length} imoveis no mapa</p>
                </div>
              </div>
              {linkedProperty && (
                <div className="flex items-center gap-1.5 rounded-full bg-[var(--orbit-glow)]/10 px-3 py-1">
                  <Check className="h-3.5 w-3.5 text-[var(--orbit-glow)]" />
                  <span className="text-xs text-[var(--orbit-glow)]">Selecionado</span>
                </div>
              )}
            </div>

            {/* Atlas Map (same Mapbox instance) */}
            <div className="relative flex-1 overflow-hidden bg-[var(--orbit-bg-secondary)]">
              {/* Stylized Map Background */}
              <div className="absolute inset-0">
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `
                      linear-gradient(rgba(var(--orbit-glow-rgb), 0.1) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(var(--orbit-glow-rgb), 0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: "40px 40px",
                  }}
                />

                {/* Topographic lines */}
                <svg className="absolute inset-0 w-full h-full opacity-10" preserveAspectRatio="none">
                  <defs>
                    <pattern id="topo-expanded" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                      <path
                        d="M0 50 Q 25 30 50 50 T 100 50"
                        fill="none"
                        stroke="rgba(var(--orbit-glow-rgb), 0.5)"
                        strokeWidth="0.5"
                      />
                      <path
                        d="M0 70 Q 35 50 70 70 T 100 70"
                        fill="none"
                        stroke="rgba(var(--orbit-glow-rgb), 0.3)"
                        strokeWidth="0.5"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#topo-expanded)" />
                </svg>

                {/* Area labels */}
                <div className="absolute top-[12%] left-[20%] text-[10px] text-[var(--orbit-text-muted)] font-medium tracking-wider">
                  PONTA NEGRA
                </div>
                <div className="absolute top-[40%] left-[55%] text-[10px] text-[var(--orbit-text-muted)] font-medium tracking-wider">
                  PETROPOLIS
                </div>
                <div className="absolute top-[60%] left-[18%] text-[10px] text-[var(--orbit-text-muted)] font-medium tracking-wider">
                  TIROL
                </div>
              </div>

              {/* Property Markers */}
              {allProperties.map((property) => (
                <button
                  key={property.id}
                  onClick={() => handleSelectPropertyFromAtlas(property)}
                  onMouseEnter={() => setHoveredMapProperty(property.id)}
                  onMouseLeave={() => setHoveredMapProperty(null)}
                  className={`absolute z-10 flex items-center justify-center transition-all duration-200 ${
                    selectedMapProperty?.id === property.id || linkedProperty?.id === property.id
                      ? "scale-125"
                      : hoveredMapProperty === property.id
                        ? "scale-110"
                        : "scale-100"
                  }`}
                  style={{
                    left: `${property.position.x}%`,
                    top: `${property.position.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  aria-label={`${property.name} - ${property.price}`}
                >
                  {/* Marker ping effect */}
                  {(property.highlight || selectedMapProperty?.id === property.id) && (
                    <span
                      className={`absolute h-8 w-8 rounded-full ${
                        selectedMapProperty?.id === property.id
                          ? "animate-ping bg-[var(--orbit-glow)]/30"
                          : "animate-semantic-pulse bg-[var(--orbit-accent)]/30"
                      }`}
                    />
                  )}

                  {/* Marker */}
                  <span
                    className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-lg transition-all ${getMarkerStyle(
                      property
                    )}`}
                  >
                    <MapPin className="h-4 w-4" />
                  </span>

                  {/* Hover tooltip */}
                  {(hoveredMapProperty === property.id || selectedMapProperty?.id === property.id) && (
                    <div
                      className="absolute bottom-full mb-2 whitespace-nowrap rounded-lg border border-[var(--orbit-glass-border)] bg-[var(--orbit-glass)] px-3 py-2 text-left shadow-xl animate-text-fade-in"
                      style={{ minWidth: "160px" }}
                    >
                      <p className="text-xs font-medium text-[var(--orbit-text)]">{property.name}</p>
                      <p className="text-[10px] text-[var(--orbit-text-muted)]">
                        {property.type === "penthouse" ? "Cobertura" : property.type === "house" ? "Casa" : "Apartamento"}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[var(--orbit-glow)]">{property.price}</p>
                      {sentProperties.some((sp) => sp.property.id === property.id) && (
                        <p className="mt-1 text-[9px] text-emerald-400">Ja enviado para este lead</p>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Selected Property Quick Info */}
            {selectedMapProperty && (
              <div className="border-t border-[var(--orbit-glass-border)] bg-[var(--orbit-glass)] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--orbit-glow)]/20 text-[var(--orbit-glow)]">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--orbit-text)]">{selectedMapProperty.name}</p>
                    <p className="text-xs text-[var(--orbit-text-muted)]">{selectedMapProperty.address}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-semibold text-[var(--orbit-glow)]">{selectedMapProperty.price}</span>
                      <span className="text-xs text-[var(--orbit-text-muted)]">{selectedMapProperty.area}</span>
                      {selectedMapProperty.bedrooms && (
                        <span className="text-xs text-[var(--orbit-text-muted)]">{selectedMapProperty.bedrooms} quartos</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
