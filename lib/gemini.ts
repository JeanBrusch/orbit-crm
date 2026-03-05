/**
 * ORBIT Gemini Service
 * Uses Gemini 2.0 Flash (free tier) to power the cognitive query engine.
 * Replaces the simple keyword-match with real AI understanding.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

export interface GeminiQueryResult {
  matchedLeadIds: string[]
  summary: string
  confidence: "high" | "medium" | "low"
}

export interface LeadContext {
  id: string
  name: string
  role: string
  property: string
  origin: string
  pipelineStage: string
  isPriority: boolean
  keywords: string[]
  lastInteractionText?: string
  notesSummary?: string
}

/**
 * Ask Gemini to match a natural-language query against leads.
 * Returns matched lead IDs + a human-readable summary.
 */
export async function queryLeadsWithGemini(
  query: string,
  leads: LeadContext[]
): Promise<GeminiQueryResult> {
  if (!GEMINI_API_KEY) {
    console.warn("[Gemini] GEMINI_API_KEY not set — falling back to keyword match")
    return fallbackKeywordMatch(query, leads)
  }

  const leadsJson = JSON.stringify(leads, null, 2)

  const prompt = `Você é o motor cognitivo do ORBIT, um CRM imobiliário inteligente.

Dado o seguinte contexto de leads:
${leadsJson}

Consulta do corretor: "${query}"

Sua tarefa:
1. Identificar quais leads são relevantes para esta consulta
2. Retornar SOMENTE um JSON válido no formato abaixo, sem markdown, sem explicação extra

Formato de resposta (JSON puro):
{
  "matchedLeadIds": ["id1", "id2"],
  "summary": "Texto curto em português explicando o resultado (max 80 chars)",
  "confidence": "high" | "medium" | "low"
}

Regras:
- Interprete a consulta semanticamente (ex: "quentes" = leads com alta interação e interesse)
- "prioridade" = isPriority true
- "silencioso" = sem interação recente
- "negociando" = pipelineStage negotiation
- Se nenhum lead combina, retorne matchedLeadIds vazio
- Responda APENAS com o JSON, nenhum outro texto`

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 256,
        },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("[Gemini] API error:", err)
      return fallbackKeywordMatch(query, leads)
    }

    const data = await response.json()
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ""

    // Strip markdown fences if present
    const clean = rawText.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean) as GeminiQueryResult

    return {
      matchedLeadIds: parsed.matchedLeadIds ?? [],
      summary: parsed.summary ?? "Resultado processado",
      confidence: parsed.confidence ?? "medium",
    }
  } catch (err) {
    console.error("[Gemini] Parse/fetch error:", err)
    return fallbackKeywordMatch(query, leads)
  }
}

/**
 * Fallback: simple normalized keyword match (original app behavior)
 */
function fallbackKeywordMatch(query: string, leads: LeadContext[]): GeminiQueryResult {
  const normalized = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  const matched = leads.filter(lead => {
    const haystack = [lead.name, lead.property, lead.origin, lead.pipelineStage, ...lead.keywords]
      .join(" ")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
    return haystack.includes(normalized)
  })

  return {
    matchedLeadIds: matched.map(l => l.id),
    summary: matched.length > 0
      ? `${matched.length} lead${matched.length > 1 ? "s" : ""} encontrado${matched.length > 1 ? "s" : ""}`
      : "Nenhum lead encontrado",
    confidence: "low",
  }
}

/**
 * Ask Gemini to generate a contextual AI message for a lead (used in composer).
 */
export async function generateLeadMessage(
  leadContext: LeadContext & { recentInteractions: string[]; notes: string[] },
  intent: string
): Promise<string> {
  if (!GEMINI_API_KEY) {
    return "Gemini API key não configurada. Configure GEMINI_API_KEY no Replit Secrets."
  }

  const prompt = `Você é um assistente de vendas imobiliárias para o ORBIT CRM.

Lead: ${leadContext.name} (${leadContext.role})
Imóvel de interesse: ${leadContext.property}
Estágio: ${leadContext.pipelineStage}
Últimas interações: ${leadContext.recentInteractions.join("; ")}
Notas: ${leadContext.notes.join("; ")}

Intenção do corretor: "${intent}"

Gere uma mensagem profissional e personalizada em português brasileiro para este lead.
Seja conciso (máx. 3 parágrafos). Tom: profissional mas acolhedor.
Retorne APENAS o texto da mensagem, sem aspas nem formatação markdown.`

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
      }),
    })

    if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`)
    const data = await response.json()
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "Erro ao gerar mensagem."
  } catch (err) {
    console.error("[Gemini] generateLeadMessage error:", err)
    return "Erro ao conectar com Gemini. Verifique sua GEMINI_API_KEY."
  }
}
