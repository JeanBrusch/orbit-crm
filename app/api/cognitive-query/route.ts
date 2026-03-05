import { NextRequest, NextResponse } from "next/server"
import { queryLeadsWithGemini, type LeadContext } from "@/lib/gemini"

export async function POST(req: NextRequest) {
  try {
    const { query, leads } = await req.json() as {
      query: string
      leads: LeadContext[]
    }

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "query is required" }, { status: 400 })
    }

    if (!Array.isArray(leads)) {
      return NextResponse.json({ error: "leads must be an array" }, { status: 400 })
    }

    const result = await queryLeadsWithGemini(query, leads)
    return NextResponse.json(result)
  } catch (err) {
    console.error("[/api/cognitive-query]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
