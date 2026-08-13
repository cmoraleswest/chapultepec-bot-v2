-- Schema CRM Chapultepec V2 — PostgreSQL (Supabase)
-- Tablas: leads, interacciones, llamadas_rescatadas, publicaciones
-- NOTA: Estas tablas ya existen en el proyecto actual. Solo ejecutar si se crea DB nueva.
-- Actualizado para reflejar columnas que se agregaron directo en Supabase sin
-- pasar por este archivo (ultimo_status, bot_activo, canal_origen ampliado,
-- tabla publicaciones, y columnas faltantes de llamadas_rescatadas).

-- ══ LEADS ════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS leads (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre        TEXT,
  telefono      TEXT NOT NULL UNIQUE,
  correo        TEXT,
  interes       TEXT DEFAULT 'Sin definir',
  estado        TEXT DEFAULT 'Nuevo' CHECK (estado IN (
    'Nuevo', 'En Conversación', 'Calificado', 'Cita Agendada', 'No Interesado', 'No Contactar'
  )),
  -- canal_origen: valores usados por el código actual — WhatsApp, Instagram,
  -- Llamada Rescatada. El CHECK explícito se quitó porque ya había causado un
  -- bug real: un valor no contemplado (antes 'Redes Sociales') hacía fallar
  -- el upsert entero y el lead ni siquiera se registraba.
  canal_origen  TEXT DEFAULT 'WhatsApp',
  notas         TEXT,
  etapa_kanban  TEXT,
  info_general_enviada BOOLEAN DEFAULT FALSE,
  fecha_cita    TIMESTAMPTZ,
  drip_count    INT DEFAULT 0,
  -- ultimo_status: 'delivered' | 'read', escrito solo por el callback de
  -- estatus del webhook de Meta. NUNCA se escribe 'enviado' desde el código —
  -- si una fila trae ese valor es el DEFAULT de la columna, no una
  -- confirmación real de WhatsApp.
  ultimo_status TEXT DEFAULT 'enviado',
  -- bot_activo=false → un humano tomó el control de la conversación; el
  -- webhook deja de invocar a Claude y de mandar respuestas automáticas.
  bot_activo    BOOLEAN DEFAULT TRUE,
  creado_en     TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_telefono ON leads (telefono);
CREATE INDEX IF NOT EXISTS idx_leads_estado ON leads (estado);

-- Trigger para actualizar automáticamente actualizado_en
CREATE OR REPLACE FUNCTION trigger_actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_actualizar_ts ON leads;
CREATE TRIGGER leads_actualizar_ts
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_actualizar_timestamp();

-- ══ INTERACCIONES ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS interacciones (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,
  contenido   TEXT,
  metadata    JSONB DEFAULT '{}',
  creado_en   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interacciones_lead ON interacciones (lead_id);
CREATE INDEX IF NOT EXISTS idx_interacciones_tipo ON interacciones (tipo);
CREATE INDEX IF NOT EXISTS idx_interacciones_fecha ON interacciones (creado_en DESC);

-- ══ LLAMADAS RESCATADAS ══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS llamadas_rescatadas (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telefono        TEXT NOT NULL,
  nombre          TEXT,
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  contestada      BOOLEAN DEFAULT FALSE,
  whatsapp_enviado BOOLEAN DEFAULT FALSE,
  seguimiento     TEXT DEFAULT 'Pendiente',
  notas           TEXT,
  creado_en       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llamadas_telefono ON llamadas_rescatadas (telefono);

-- ══ PUBLICACIONES (redes sociales vía Buffer) ═══════════════════════════════
CREATE TABLE IF NOT EXISTS publicaciones (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  red         TEXT NOT NULL, -- 'Instagram' | 'Facebook' | 'TikTok'
  tipo        TEXT DEFAULT 'post', -- 'post' | 'story'
  caption     TEXT,
  imagen_url  TEXT,
  buffer_id   TEXT,
  estado      TEXT DEFAULT 'publicado',
  creado_en   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_publicaciones_fecha ON publicaciones (creado_en DESC);

-- ══ RLS (Row Level Security) ═════════════════════════════════════════════════
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE interacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE llamadas_rescatadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE publicaciones ENABLE ROW LEVEL SECURITY;

-- Política: acceso completo con service key (anon key del bot)
CREATE POLICY IF NOT EXISTS "Acceso completo leads" ON leads
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Acceso completo interacciones" ON interacciones
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Acceso completo llamadas" ON llamadas_rescatadas
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Acceso completo publicaciones" ON publicaciones
  FOR ALL USING (true) WITH CHECK (true);
