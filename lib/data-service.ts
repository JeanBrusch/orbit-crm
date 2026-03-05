/**
 * ORBIT Data Service
 * Handles all Supabase reads/writes and maps DB rows → Lead types.
 */
import { supabase } from "@/lib/supabase"
import type { Lead, Interaction, Note, PipelineStage, InteractionType } from "@/types/orbit-types"

// ─── Type mappers ────────────────────────────────────────────────────────────

function dbRowToLead(
  row: {
    id: string; name: string; role: string; avatar: string; phone: string
    origin: string; property: string; pipeline_stage: string; is_priority: boolean
    keywords: string[]; profile_image_url: string | null
    follow_up_date: string | null; follow_up_note: string | null; follow_up_active: boolean
  },
  interactions: Interaction[],
  notes: Note[],
): Lead {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    avatar: row.avatar,
    phone: row.phone,
    origin: row.origin,
    property: row.property,
    pipelineStage: row.pipeline_stage as PipelineStage,
    isPriority: row.is_priority,
    keywords: row.keywords ?? [],
    profile_image_url: row.profile_image_url ?? undefined,
    interactions,
    notes,
    followUp: row.follow_up_active && row.follow_up_date
      ? { date: new Date(row.follow_up_date), note: row.follow_up_note ?? undefined, isActive: true }
      : undefined,
  }
}

function dbRowToInteraction(row: {
  id: string; lead_id: string; type: string; text: string | null; context: string | null; timestamp: string
}): Interaction {
  return {
    id: row.id,
    type: row.type as InteractionType,
    text: row.text ?? undefined,
    context: row.context ?? undefined,
    timestamp: new Date(row.timestamp),
  }
}

function dbRowToNote(row: { id: string; lead_id: string; text: string; timestamp: string }): Note {
  return {
    id: row.id,
    text: row.text,
    timestamp: new Date(row.timestamp),
  }
}

// ─── Fetch all leads (with nested interactions + notes) ───────────────────────

export async function fetchLeads(): Promise<Lead[]> {
  const [leadsRes, interactionsRes, notesRes] = await Promise.all([
    supabase.from("leads").select("*").order("created_at", { ascending: false }),
    supabase.from("interactions").select("*").order("timestamp", { ascending: false }),
    supabase.from("notes").select("*").order("timestamp", { ascending: false }),
  ])

  if (leadsRes.error) throw new Error(`fetchLeads: ${leadsRes.error.message}`)
  if (interactionsRes.error) throw new Error(`fetchInteractions: ${interactionsRes.error.message}`)
  if (notesRes.error) throw new Error(`fetchNotes: ${notesRes.error.message}`)

  const interactionsByLead = new Map<string, Interaction[]>()
  const notesByLead = new Map<string, Note[]>()

  for (const row of interactionsRes.data ?? []) {
    const arr = interactionsByLead.get(row.lead_id) ?? []
    arr.push(dbRowToInteraction(row))
    interactionsByLead.set(row.lead_id, arr)
  }

  for (const row of notesRes.data ?? []) {
    const arr = notesByLead.get(row.lead_id) ?? []
    arr.push(dbRowToNote(row))
    notesByLead.set(row.lead_id, arr)
  }

  return (leadsRes.data ?? []).map(row =>
    dbRowToLead(row, interactionsByLead.get(row.id) ?? [], notesByLead.get(row.id) ?? [])
  )
}

// ─── Fetch single lead ────────────────────────────────────────────────────────

export async function fetchLead(id: string): Promise<Lead | null> {
  const [leadRes, interactionsRes, notesRes] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).single(),
    supabase.from("interactions").select("*").eq("lead_id", id).order("timestamp", { ascending: false }),
    supabase.from("notes").select("*").eq("lead_id", id).order("timestamp", { ascending: false }),
  ])

  if (leadRes.error) return null
  if (!leadRes.data) return null

  return dbRowToLead(
    leadRes.data,
    (interactionsRes.data ?? []).map(dbRowToInteraction),
    (notesRes.data ?? []).map(dbRowToNote),
  )
}

// ─── Create lead ─────────────────────────────────────────────────────────────

export async function createLead(lead: Omit<Lead, "interactions" | "notes">): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .insert({
      id: lead.id,
      name: lead.name,
      role: lead.role,
      avatar: lead.avatar,
      phone: lead.phone,
      origin: lead.origin,
      property: lead.property,
      pipeline_stage: lead.pipelineStage,
      is_priority: lead.isPriority,
      keywords: lead.keywords,
      profile_image_url: lead.profile_image_url ?? null,
      follow_up_date: lead.followUp?.date?.toISOString() ?? null,
      follow_up_note: lead.followUp?.note ?? null,
      follow_up_active: lead.followUp?.isActive ?? false,
    })
    .select()
    .single()

  if (error) throw new Error(`createLead: ${error.message}`)
  return dbRowToLead(data, [], [])
}

// ─── Update lead ─────────────────────────────────────────────────────────────

export async function updateLead(id: string, updates: Partial<Lead>): Promise<void> {
  const dbUpdates: Record<string, unknown> = {}

  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.role !== undefined) dbUpdates.role = updates.role
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone
  if (updates.origin !== undefined) dbUpdates.origin = updates.origin
  if (updates.property !== undefined) dbUpdates.property = updates.property
  if (updates.pipelineStage !== undefined) dbUpdates.pipeline_stage = updates.pipelineStage
  if (updates.isPriority !== undefined) dbUpdates.is_priority = updates.isPriority
  if (updates.keywords !== undefined) dbUpdates.keywords = updates.keywords
  if (updates.followUp !== undefined) {
    dbUpdates.follow_up_date = updates.followUp?.date?.toISOString() ?? null
    dbUpdates.follow_up_note = updates.followUp?.note ?? null
    dbUpdates.follow_up_active = updates.followUp?.isActive ?? false
  }

  const { error } = await supabase.from("leads").update(dbUpdates).eq("id", id)
  if (error) throw new Error(`updateLead: ${error.message}`)
}

// ─── Add interaction ──────────────────────────────────────────────────────────

export async function addInteraction(
  leadId: string,
  interaction: Omit<Interaction, "id">
): Promise<Interaction> {
  const { data, error } = await supabase
    .from("interactions")
    .insert({
      lead_id: leadId,
      type: interaction.type,
      text: interaction.text ?? null,
      context: interaction.context ?? null,
      timestamp: interaction.timestamp.toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error(`addInteraction: ${error.message}`)
  return dbRowToInteraction(data)
}

// ─── Add note ─────────────────────────────────────────────────────────────────

export async function addNote(leadId: string, note: Omit<Note, "id">): Promise<Note> {
  const { data, error } = await supabase
    .from("notes")
    .insert({
      lead_id: leadId,
      text: note.text,
      timestamp: note.timestamp.toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error(`addNote: ${error.message}`)
  return dbRowToNote(data)
}

// ─── Delete lead ──────────────────────────────────────────────────────────────

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from("leads").delete().eq("id", id)
  if (error) throw new Error(`deleteLead: ${error.message}`)
}
