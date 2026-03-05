# ORBIT CRM — Setup no Replit

CRM imobiliário inteligente com Next.js 16, Supabase e Gemini AI.

---

## Estrutura dos arquivos novos/modificados

```
lib/
  supabase.ts          ← cliente Supabase + tipos DB
  data-service.ts      ← camada de dados (CRUD Supabase ↔ Lead types)
  gemini.ts            ← integração Gemini AI (query cognitiva + geração de mensagens)

app/api/
  cognitive-query/route.ts   ← POST /api/cognitive-query (busca semântica via Gemini)
  generate-message/route.ts  ← POST /api/generate-message (geração de mensagem por lead)

hooks/
  use-leads.ts         ← hook atualizado: Supabase + fallback mock data

supabase/
  schema.sql           ← migration completa (rodar no Supabase SQL Editor)

package.json           ← @supabase/supabase-js adicionado
.replit                ← config Replit (porta 3000 → 80)
.env.example           ← template de variáveis de ambiente
```

---

## Passo a passo

### 1. Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto gratuito
2. Vá em **SQL Editor** e execute todo o conteúdo de `supabase/schema.sql`
3. Vá em **Settings → API** e copie:
   - `Project URL`
   - `anon / public` key

### 2. Gemini API Key (gratuita)

1. Acesse [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Clique em **Create API Key**
3. Copie a chave gerada

### 3. Configurar Secrets no Replit

No Replit, vá em **Tools → Secrets** e adicione:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` |
| `GEMINI_API_KEY` | `AIzaSy...` |

### 4. Substituir arquivos no projeto

Copie os arquivos novos para o projeto raiz, **substituindo** os que já existem:

- `hooks/use-leads.ts` → substitui o original
- `lib/supabase.ts` → arquivo novo
- `lib/data-service.ts` → arquivo novo
- `lib/gemini.ts` → arquivo novo
- `app/api/cognitive-query/route.ts` → arquivo novo
- `app/api/generate-message/route.ts` → arquivo novo
- `package.json` → substitui o original

### 5. Instalar dependências e rodar

```bash
npm install
npm run build
npm run start
```

---

## O que muda no comportamento

| Antes | Depois |
|-------|--------|
| Dados mockados em memória (resetam ao recarregar) | Dados persistidos no Supabase |
| Busca por keyword simples | Busca semântica via Gemini AI |
| Sem geração de mensagens | API `/api/generate-message` para compor mensagens contextuais |
| Sem fallback | Se Supabase não configurado → usa mock data automaticamente |

---

## Integrar Gemini no ORBIT Core (busca cognitiva)

No `app/page.tsx`, substitua a função `handleQuerySubmit` por:

```tsx
const handleQuerySubmit = useCallback(async (query: string) => {
  setCoreState("processing")
  setCoreMessage("Analisando...")

  try {
    const leadsContext = allLeads.map(l => ({
      id: l.id,
      name: l.name,
      role: l.role,
      property: l.property,
      origin: l.origin,
      pipelineStage: l.pipelineStage,
      isPriority: l.isPriority,
      keywords: l.keywords,
      lastInteractionText: l.interactions[0]?.text,
      notesSummary: l.notes[0]?.text,
    }))

    const res = await fetch("/api/cognitive-query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, leads: leadsContext }),
    })

    const result = await res.json()
    setHighlightedLeads(result.matchedLeadIds)
    setCoreState("responding")
    setCoreMessage(result.summary)

    setTimeout(() => {
      setCoreState("idle")
      setHighlightedLeads([])
      setCoreMessage("Campo Cognitivo Ativo")
    }, 4000)
  } catch {
    setCoreState("idle")
    setCoreMessage("Erro na consulta cognitiva")
  }
}, [allLeads])
```
