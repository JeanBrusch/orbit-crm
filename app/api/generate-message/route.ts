import { NextRequest, NextResponse } from "next/server"
import { generateLeadMessage, type LeadContext } from "@/lib/gemini"

export async function POST(req: NextRequest) {
  try {
    const { lead, intent } = await req.json() as {
      lead: LeadContext & { recentInteractions: string[]; notes: string[] }
      intent: string
    }

    if (!lead || !intent) {
      return NextResponse.json({ error: "lead and intent are required" }, { status: 400 })
    }

    const message = await generateLeadMessage(lead, intent)
    return NextResponse.json({ message })
  } catch (err) {
    console.error("[/api/generate-message]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
