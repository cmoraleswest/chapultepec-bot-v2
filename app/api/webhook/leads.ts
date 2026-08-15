// Gestión de leads e interacciones en Supabase

import { getSupabase } from '../../../lib/supabase'

// Normaliza teléfonos mexicanos a formato 52XXXXXXXXXX (12 dígitos)
// WhatsApp entrega 521XXXXXXXXXX (13 dígitos) — quitamos el 1 intermedio
export function normalizarTel(tel: string): string {
  const d = tel.replace(/\D/g, '')
  if (d.length === 13 && d.startsWith('521')) return '52' + d.slice(3)
  if (d.length === 10) return '52' + d
  if (d.length === 12 && d.startsWith('52')) return d
  return d
}

export type EstadoLead = 'Nuevo' | 'En Conversación' | 'Calificado' | 'Cita Agendada' | 'No Interesado' | 'No Contactar'

export interface Lead {
  id: string
  telefono: string
  nombre: string | null
  estado: EstadoLead
  info_general_enviada: boolean
  fecha_cita: string | null
  bot_activo: boolean
  interes: string | null
}

// Crear o actualizar lead — retorna el lead con su estado actual
export async function upsertLead(
  telefono: string,
  extras: Record<string, unknown> = {}
): Promise<Lead | null> {
  const { data, error } = await getSupabase()
    .from('leads')
    .upsert(
      { telefono, canal_origen: 'WhatsApp', ...extras },
      { onConflict: 'telefono' }
    )
    .select('id, telefono, estado, info_general_enviada, fecha_cita, bot_activo, interes')
    .single()

  if (error) {
    console.error('[DB] Error upsert lead:', error.message)
    return null
  }
  return data as Lead
}

// Actualizar estado del lead
export async function actualizarEstado(
  telefono: string,
  estado: EstadoLead,
  extras: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await getSupabase()
    .from('leads')
    .update({ estado, ...extras })
    .eq('telefono', telefono)

  if (error) console.error('[DB] Error actualizando estado:', error.message)
}

// Registrar cuál propiedad prefiere el lead, detectado del mensaje
export async function actualizarInteres(telefono: string, interes: string): Promise<void> {
  const { error } = await getSupabase()
    .from('leads')
    .update({ interes })
    .eq('telefono', telefono)

  if (error) console.error('[DB] Error actualizando interés:', error.message)
}

// Marcar que ya se envió la info general + fotos
// OJO: antes esta función también escribía `interes: 'Por definir'`, un valor
// que NO existe en el CHECK constraint de la columna (solo acepta Penthouse,
// Departamento, Ambos y Sin definir). La base rechazaba el UPDATE ENTERO, así
// que `info_general_enviada` nunca se marcaba y el paquete de bienvenida se
// reenviaba cada vez que el lead escribía. Es el mismo patrón que el bug de
// canal_origen. Aquí ya no se toca `interes`: la columna tiene su propio
// default y `actualizarInteres()` puede haber guardado la propiedad real que
// le interesa al lead — sobrescribirla desde aquí borraría esa señal.
export async function marcarInfoEnviada(telefono: string): Promise<void> {
  const { error } = await getSupabase()
    .from('leads')
    .update({ info_general_enviada: true })
    .eq('telefono', telefono)

  if (error) console.error('[DB] Error marcando info enviada:', error.message)
}

// Guardar interacción (mensaje entrante o saliente)
export async function guardarInteraccion(
  leadId: string,
  direccion: 'entrante' | 'saliente',
  mensaje: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const tipo = direccion === 'entrante' ? 'Mensaje Entrante' : 'Mensaje Saliente Bot'

  const { error } = await getSupabase()
    .from('interacciones')
    .insert({ lead_id: leadId, tipo, contenido: mensaje, metadata })

  if (error) console.error('[DB] Error guardando interacción:', error.message)
}

// Obtener historial limpio para Claude (últimos 8 mensajes)
export async function obtenerHistorial(
  leadId: string
): Promise<{ tipo: string; contenido: string }[]> {
  const { data } = await getSupabase()
    .from('interacciones')
    .select('tipo, contenido')
    .eq('lead_id', leadId)
    .in('tipo', ['Mensaje Entrante', 'Mensaje Saliente Bot'])
    .order('creado_en', { ascending: false })
    .limit(12)

  const CORRUPTOS = /no puedo enviar|llamame al|llámame al|síguenos en instagram/i

  const limpio = (data ?? []).filter(
    (h) =>
      h.contenido &&
      !h.contenido.startsWith('[FOTOS') &&
      h.contenido.trim().length > 5 &&
      !CORRUPTOS.test(h.contenido)
  )

  return limpio.slice(0, 8).reverse().map((h) => ({
    tipo: h.tipo === 'Mensaje Entrante' ? 'entrante' : 'saliente',
    contenido: h.contenido,
  }))
}

// Verificar si el lead está en estado "No Contactar"
export async function estaBloquadoEnDB(telefono: string): Promise<boolean> {
  const { data } = await getSupabase()
    .from('leads')
    .select('estado')
    .eq('telefono', telefono)
    .single()

  return data?.estado === 'No Contactar'
}

// ── ¿SE LE PUEDE ESCRIBIR TEXTO LIBRE AHORA MISMO? ───────────────────────────
// WhatsApp solo permite texto libre dentro de las 24 h siguientes al último
// mensaje QUE EL CLIENTE mandó — una llamada, una plantilla nuestra o un
// mensaje de hace más de 24 h no cuentan. Esta regla se había reescrito tres
// veces por separado (envío manual, alta por llamada, motor de drip), cada
// una a su manera y una de ellas — la del drip — sin la revisión completa,
// que fue justo lo que causó que el recordatorio de la hora 1 le fallara
// siempre a quien nunca había escrito. A partir de ahora cualquier código que
// necesite mandar texto libre pasa por esta única función en vez de volver a
// escribir la consulta a mano.
export async function ventanaAbierta(leadId: string): Promise<boolean> {
  const { data } = await getSupabase()
    .from('interacciones')
    .select('creado_en')
    .eq('lead_id', leadId)
    .eq('tipo', 'Mensaje Entrante')
    .order('creado_en', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return false
  const horasDesde = (Date.now() - new Date(data.creado_en).getTime()) / 3_600_000
  return horasDesde < 24
}
