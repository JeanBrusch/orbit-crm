import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      leads: {
        Row: {
          id: string
          name: string
          role: string
          avatar: string
          phone: string
          origin: string
          property: string
          pipeline_stage: "contact" | "exploration" | "interest" | "negotiation" | "closed"
          is_priority: boolean
          keywords: string[]
          profile_image_url: string | null
          follow_up_date: string | null
          follow_up_note: string | null
          follow_up_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["leads"]["Row"], "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>
      }
      interactions: {
        Row: {
          id: string
          lead_id: string
          type: "ligacao" | "visita" | "contato" | "outro" | "system"
          text: string | null
          context: string | null
          timestamp: string
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["interactions"]["Row"], "created_at">
        Update: Partial<Database["public"]["Tables"]["interactions"]["Insert"]>
      }
      notes: {
        Row: {
          id: string
          lead_id: string
          text: string
          timestamp: string
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["notes"]["Row"], "created_at">
        Update: Partial<Database["public"]["Tables"]["notes"]["Insert"]>
      }
    }
  }
}
