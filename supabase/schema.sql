-- =============================================
-- ORBIT CRM - Supabase Schema Migration
-- Run this in your Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- LEADS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS leads (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT '',
  avatar        TEXT NOT NULL,
  phone         TEXT NOT NULL DEFAULT '',
  origin        TEXT NOT NULL DEFAULT '',
  property      TEXT NOT NULL DEFAULT '',
  pipeline_stage TEXT NOT NULL DEFAULT 'contact'
    CHECK (pipeline_stage IN ('contact','exploration','interest','negotiation','closed')),
  is_priority   BOOLEAN NOT NULL DEFAULT FALSE,
  keywords      TEXT[] NOT NULL DEFAULT '{}',
  profile_image_url TEXT,
  follow_up_date    TIMESTAMPTZ,
  follow_up_note    TEXT,
  follow_up_active  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- INTERACTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS interactions (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id   UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type      TEXT NOT NULL DEFAULT 'contato'
    CHECK (type IN ('ligacao','visita','contato','outro','system')),
  text      TEXT,
  context   TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS interactions_lead_id_idx ON interactions(lead_id);
CREATE INDEX IF NOT EXISTS interactions_timestamp_idx ON interactions(timestamp DESC);

-- =============================================
-- NOTES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS notes (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id   UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  text      TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notes_lead_id_idx ON notes(lead_id);

-- =============================================
-- AUTO-UPDATE updated_at trigger
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- Enable for production - disable for dev with anon key
-- =============================================

-- For development (anon key access):
ALTER TABLE leads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes        ENABLE ROW LEVEL SECURITY;

-- Allow anon read/write for all (dev mode - lock down in production)
CREATE POLICY "Allow all for anon" ON leads        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON interactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON notes        FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- SEED DATA (initial 5 leads from app)
-- =============================================

INSERT INTO leads (id, name, role, avatar, phone, origin, property, pipeline_stage, is_priority, keywords, follow_up_date, follow_up_active) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Marina Costa',   'Lider de Produto',        'MC', '(84) 99912-3456', 'Portal Imovelweb', 'Laguna Premium',    'interest',     true,  ARRAY['quente','hot','engajado','ativo','prioridade'], NOW() + INTERVAL '2 days', true),
  ('11111111-0000-0000-0000-000000000002', 'Lucas Ferreira', 'Cliente Enterprise',      'LF', '(84) 99887-6543', 'Instagram Ads',    'Cobertura 402',     'exploration',  false, ARRAY['quente','warm','respondeu','ativo'],             NULL, false),
  ('11111111-0000-0000-0000-000000000003', 'Ana Rodrigues',  'Parceira Estrategica',    'AR', '(84) 99765-4321', 'Indicacao',        'Torre Oceano',      'contact',      false, ARRAY['target','alvo','estrategico','prioridade'],      NULL, false),
  ('11111111-0000-0000-0000-000000000004', 'Pedro Santos',   'Consultor Tecnico',       'PS', '(84) 99654-3210', 'WhatsApp Direto',  'Vista Mar',         'closed',       false, ARRAY['silencioso','neutro','atencao'],                 NULL, false),
  ('11111111-0000-0000-0000-000000000005', 'Julia Mendes',   'Relacoes com Investidores','JM', '(84) 99543-2109', 'Evento Presencial','Residencial Park',  'negotiation',  true,  ARRAY['quente','hot','prioridade','ativo'],             NOW() + INTERVAL '1 day',  true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO interactions (lead_id, type, text, context, timestamp) VALUES
  ('11111111-0000-0000-0000-000000000001', 'ligacao', 'Confirmou interesse na cobertura.',     'Laguna Premium',   NOW() - INTERVAL '30 minutes'),
  ('11111111-0000-0000-0000-000000000001', 'visita',  'Visita ao decorado agendada.',          'Laguna Premium',   NOW() - INTERVAL '2 hours'),
  ('11111111-0000-0000-0000-000000000001', 'contato', 'Material com plantas enviado.',         'Laguna Premium',   NOW() - INTERVAL '1 day'),
  ('11111111-0000-0000-0000-000000000002', 'contato', 'Primeiro contato via WhatsApp.',        'Cobertura 402',    NOW() - INTERVAL '1 hour'),
  ('11111111-0000-0000-0000-000000000002', 'ligacao', 'Nao atendeu na primeira tentativa.',    NULL,               NOW() - INTERVAL '1 day'),
  ('11111111-0000-0000-0000-000000000003', 'contato', 'Indicacao do Dr. Roberto.',             NULL,               NOW() - INTERVAL '2 hours'),
  ('11111111-0000-0000-0000-000000000004', 'ligacao', 'Ligacao de acompanhamento pos-venda.',  NULL,               NOW() - INTERVAL '45 days'),
  ('11111111-0000-0000-0000-000000000005', 'visita',  'Visitou o empreendimento.',             'Residencial Park', NOW() - INTERVAL '1 hour'),
  ('11111111-0000-0000-0000-000000000005', 'ligacao', 'Discutindo condicoes de pagamento.',    'Residencial Park', NOW() - INTERVAL '1 day'),
  ('11111111-0000-0000-0000-000000000005', 'contato', 'Proposta formal por email.',            'Residencial Park', NOW() - INTERVAL '2 days'),
  ('11111111-0000-0000-0000-000000000005', 'visita',  'Segunda visita com familia.',           'Residencial Park', NOW() - INTERVAL '3 days');

INSERT INTO notes (lead_id, text, timestamp) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Preferencia forte por vista mar. Orcamento ate R$2.5M. Marido engenheiro, ela advogada.', NOW() - INTERVAL '1 day'),
  ('11111111-0000-0000-0000-000000000001', 'Tem dois filhos, busca area com escola proxima.',                                         NOW() - INTERVAL '2 days'),
  ('11111111-0000-0000-0000-000000000002', 'Investidor. Busca imovel para renda com aluguel.',                                        NOW() - INTERVAL '1 hour'),
  ('11111111-0000-0000-0000-000000000003', 'Indicacao do Dr. Roberto. Alto padrao.',                                                  NOW() - INTERVAL '2 hours'),
  ('11111111-0000-0000-0000-000000000005', 'Professora universitaria. Quer mudar de Parnamirim para Natal.',                          NOW() - INTERVAL '2 days'),
  ('11111111-0000-0000-0000-000000000005', 'Gosta de espacos abertos e contato com natureza.',                                        NOW() - INTERVAL '3 days');
