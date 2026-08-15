// Controlador central — webhook de WhatsApp Cloud API
// Recibe mensajes de Meta, orquesta filtros → intención → IA → respuesta

import { NextRequest, NextResponse, after } from 'next/server'
import { evaluarFiltros } from './filtros'
import { clasificarMensaje, extraerFechaCita } from './intencion'
import { generarRespuestaClaude } from './claude'
import { enviarTexto, enviarImagen, enviarDocumento, alertarCarlos } from './whatsapp'
import {
  upsertLead,
  actualizarEstado,
  actualizarInteres,
  marcarInfoEnviada,
  guardarInteraccion,
  obtenerHistorial,
  estaBloquadoEnDB,
  normalizarTel,
  type Lead,
} from './leads'
import { FOTOS_DEPTO, FICHA_AMBAS, FOTOS_PRIMER_CONTACTO, FOTOS_CHAT, FICHAS_PDF } from './config'

// ── GET: Verificación del webhook de Meta ────────────────────────────────────
export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = req.nextUrl.searchParams
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Token inválido' }, { status: 403 })
}

// ── POST: Mensaje entrante de WhatsApp ───────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ok = NextResponse.json({ status: 'ok' }, { status: 200 })

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return ok
  }

  // Extraer mensaje del payload de Meta
  const entry = (body.entry as Record<string, unknown>[])?.[0]
  const change = (entry?.changes as Record<string, unknown>[])?.[0]
  const value = change?.value as Record<string, unknown> | undefined

  // ── STATUS UPDATE (entregado/leído) ──────────────────────────────────
  const statuses = value?.statuses as Record<string, unknown>[] | undefined
  if (statuses?.[0]) {
    const st = statuses[0]
    const status = st.status as string // sent, delivered, read, failed
    const recipientId = normalizarTel((st.recipient_id as string) ?? '')
    console.log(`[WH] Status: ${status} → ${recipientId}`)

    const { getSupabase } = await import('../../../lib/supabase')
    const db = getSupabase()

    if (status === 'delivered' || status === 'read') {
      await db
        .from('leads')
        .update({ ultimo_status: status, actualizado_en: new Date().toISOString() })
        .eq('telefono', recipientId)
      return ok
    }

    // ── FALLO DE ENTREGA ────────────────────────────────────────────────────
    // Antes 'failed' se ignoraba por completo: Meta acepta el mensaje por API
    // (devuelve 200 con su id) y recién después avisa por este webhook que NO
    // se pudo entregar. Como no se registraba, el CRM mostraba como enviados
    // mensajes que el cliente nunca recibió, y nadie se enteraba nunca.
    if (status === 'failed') {
      const errores = (st.errors as Record<string, unknown>[] | undefined) ?? []
      const detalle = errores
        .map((e) => `${e.code}: ${e.title ?? ''} ${(e.error_data as Record<string, string>)?.details ?? ''}`.trim())
        .join(' | ') || 'sin detalle'
      console.error(`[WH] ENVÍO FALLIDO → ${recipientId} :: ${detalle}`)

      const { data: leadFallo } = await db.from('leads').select('id').eq('telefono', recipientId).single()
      if (leadFallo) {
        await db.from('leads')
          .update({ ultimo_status: 'fallido', actualizado_en: new Date().toISOString() })
          .eq('id', leadFallo.id)
        await db.from('interacciones').insert({
          lead_id: leadFallo.id,
          tipo: 'Nota Manual',
          contenido: `[NO ENTREGADO] WhatsApp rechazó la entrega — ${detalle}`,
          metadata: { status: 'failed', errores },
        })

        // Un lead al que no le podemos escribir es un lead que se pierde en
        // silencio. Se avisa a Carlos para que levante el teléfono, que es el
        // único canal que sí funciona en estos casos.
        // Un solo aviso por lead por hora. Un paquete de 5 mensajes que falla
        // generaba 5 alertas idénticas seguidas: eso es spam y hace que Carlos
        // deje de leerlas, que es peor que no avisar.
        const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString()
        const { count: yaAvisado } = await db
          .from('interacciones')
          .select('id', { count: 'exact', head: true })
          .eq('lead_id', leadFallo.id)
          .like('contenido', '[NO ENTREGADO]%')
          .gte('creado_en', haceUnaHora)

        if ((yaAvisado ?? 0) <= 1) {
          const codigos = errores.map((e) => Number(e.code))
          let motivo: string
          let queHacer: string

          if (codigos.includes(131026)) {
            motivo = 'Ese número no tiene WhatsApp (o está mal escrito).'
            queHacer = 'Márcale por teléfono. Por WhatsApp no se puede.'
          } else if (codigos.includes(130472)) {
            motivo = 'Meta bloquea mensajes de marketing a este número (experimento 130472).'
            queHacer = 'Márcale por teléfono.'
          } else if (codigos.includes(131047)) {
            motivo = 'Pasaron más de 24 h desde su último mensaje, WhatsApp ya no deja texto libre.'
            queHacer = 'Desde el CRM mándale un mensaje: el sistema le manda sola la plantilla aprobada y reabre la conversación.'
          } else {
            motivo = detalle
            queHacer = 'Revísalo en el CRM.'
          }

          await alertarCarlos(
            `⚠️ No le llegó el mensaje a +${recipientId}\n\n${motivo}\n\n${queHacer}`,
            `+${recipientId}`,
            `${motivo} ${queHacer}`
          )
        }
      }
    }
    return ok
  }

  const messages = value?.messages as Record<string, unknown>[] | undefined
  const message = messages?.[0]

  if (!message) {
    console.log('[WH] No message in payload')
    return ok
  }

  const from = normalizarTel((message.from as string) ?? '')
  const tipo = (message.type as string) ?? ''
  const texto = tipo === 'text'
    ? ((message.text as Record<string, string>)?.body ?? '')
    : ''
  const msgId = (message.id as string) ?? ''
  // Metadata trae el número de teléfono (8027 o 175) por el que entró este
  // mensaje — se usa para contestar desde el mismo número, no siempre el 8027.
  const metadata = value?.metadata as Record<string, unknown> | undefined
  const phoneNumberId = (metadata?.phone_number_id as string) ?? undefined

  console.log(`[WH] from=${from} tipo=${tipo} texto=${texto.slice(0, 50)}`)

  if (!from) return ok

  // ── FILTRO 1: País, bloqueados, pruebas ────────────────────────────────
  const filtro = evaluarFiltros(from)
  console.log(`[WH] filtro=${filtro}`)
  if (filtro === 'IGNORAR') return ok

  // ── MENSAJE NO-TEXTO (audio, imagen, sticker, documento) ───────────────
  // Antes esto se descartaba sin dejar ningún rastro — un lead real mandando
  // una nota de voz o una foto desaparecía por completo, sin registro ni
  // aviso a Carlos. Ahora se registra el lead, se avisa, y se le pide texto.
  if (!texto.trim()) {
    const leadNoTexto = await upsertLead(from, { canal_origen: 'WhatsApp' })
    if (leadNoTexto) {
      await guardarInteraccion(leadNoTexto.id, 'entrante', `[Mensaje ${tipo || 'no-texto'} — no se pudo leer el contenido]`)
      if (filtro === 'PROCESAR_REAL') {
        const nombre = leadNoTexto.nombre || from
        await alertarCarlos(
          `🔔 ${nombre} mandó un ${tipo || 'archivo'} (no texto) — revísalo en el CRM.`,
          nombre,
          `mandó un ${tipo || 'archivo'}, no texto`
        )
        await enviarTexto(from, 'Recibí tu mensaje pero no puedo escuchar audios ni ver imágenes todavía — ¿me lo puedes escribir en texto?', phoneNumberId)
      }
    }
    return ok
  }

  // ── FILTRO 2: Verificar bloqueo en DB ──────────────────────────────────
  if (filtro === 'PROCESAR_REAL') {
    const bloqueadoDB = await estaBloquadoEnDB(from)
    if (bloqueadoDB) return ok
  }

  // ── REGISTRAR LEAD ─────────────────────────────────────────────────────
  const esDeRedes = texto.toLowerCase().includes('quiero información del penthouse') || texto.toLowerCase().includes('quiero informacion del penthouse')
  // 'Redes Sociales' no existe en el CHECK constraint de canal_origen (leads_canal_origen_check) → violaba la
  // restricción, upsertLead fallaba, lead quedaba null y el mensaje se descartaba sin registrar al lead.
  const canalOrigen = esDeRedes ? 'Instagram' : 'WhatsApp'

  const lead = await upsertLead(from, { canal_origen: canalOrigen })

  // Si la base de datos falla justo aquí (Supabase caído, red, etc.), antes
  // el lead se quedaba sin ninguna respuesta y sin ningún aviso — ni siquiera
  // un mensaje genérico. Se manda algo mínimo sin depender de la DB, y se
  // avisa a Carlos, en vez de fallar en silencio total.
  if (!lead) {
    await enviarTexto(from, 'Recibí tu mensaje, dame un momento y te contesto.', phoneNumberId)
    await enviarTexto('527774921176', `⚠️ No se pudo registrar el lead ${from} — la base de datos falló. Revisa Supabase.`)
    return ok
  }

  // Guardar mensaje entrante
  {
    await guardarInteraccion(lead.id, 'entrante', texto)
    // Mover de Nuevo a En Conversación
    if (lead.estado === 'Nuevo') {
      await actualizarEstado(from, 'En Conversación')
    }
  }

  // ── PROCESAMIENTO EN SEGUNDO PLANO ──────────────────────────────────────
  // after() corre esto tras el 200 a Meta sin bloquear la respuesta, y sin
  // el riesgo de que Vercel congele la función a medio ejecutar (lo que sí
  // pasaría con una llamada suelta sin await). Se agenda SIEMPRE, incluso con
  // el bot apagado — la clasificación de intención/propiedad y el aviso a
  // Carlos deben correr igual; lo único que se salta ahí adentro es la
  // respuesta automática.
  after(() => processIntelligentAgent(from, lead, texto, phoneNumberId, filtro === 'PROCESAR_REAL'))

  return ok
}

// ── Agente inteligente — corre en segundo plano tras responder 200 a Meta ────
async function processIntelligentAgent(from: string, lead: Lead, texto: string, phoneNumberId?: string, avisar = false): Promise<void> {
  const { intencion, propiedad } = await clasificarMensaje(texto)
  const nombre = lead.nombre || `+${from}`

  // Detectar cuál propiedad le interesa — se guarda aunque el bot esté
  // apagado, porque la señal es del lead, no de la respuesta del bot.
  if (propiedad && lead.interes !== propiedad) {
    await actualizarInteres(from, propiedad)
  }

  // ── INTERRUPTOR HUMANO ──────────────────────────────────────────────────
  // bot_activo = false → humano tiene el control. No se invoca a Claude ni
  // ninguna respuesta automática; solo se avisa a Carlos, ya con la
  // clasificación e interés registrados arriba.
  if (lead.bot_activo === false) {
    if (avisar) {
      await alertarCarlos(
        `🔔 ${nombre} (tú tienes el control, el bot está apagado)\n\nDijo: "${texto.slice(0, 150)}"\n\nchapultepec-bot-v2.vercel.app`,
        nombre,
        texto
      )
    }
    return
  }

  // Carlos recibe la conversación COMPLETA en un solo mensaje: lo que dijo el
  // cliente y lo que Ana contestó. Antes solo le llegaba la parte del cliente,
  // así que no podía supervisar si la respuesta automática había sido buena.
  const avisarConversacion = async (respuestaAna: string): Promise<void> => {
    if (!avisar) return
    await alertarCarlos(
      `🔔 ${nombre}\n\nCliente: "${texto.slice(0, 150)}"\n\nAna: "${respuestaAna.slice(0, 200)}"\n\nchapultepec-bot-v2.vercel.app`,
      nombre,
      `Cliente dijo: ${texto.slice(0, 70)} — Ana: ${respuestaAna.slice(0, 90)}`
    )
  }

  // ── INSULTO → bloquear ────────────────────────────────────────────────
  if (intencion === 'INSULTO') {
    const msg = 'Lamento la molestia. No te enviaré más mensajes.'
    await enviarTexto(from, msg, phoneNumberId)
    await actualizarEstado(from, 'No Contactar')
    await guardarInteraccion(lead.id, 'saliente', msg)
    await avisarConversacion(`${msg}  [lead marcado NO CONTACTAR]`)
    return
  }

  // ── RECHAZO → respetar ────────────────────────────────────────────────
  if (intencion === 'RECHAZO') {
    const msg = 'Entendido. Si en algún momento necesitas información, aquí estaré. Buen día.'
    await enviarTexto(from, msg, phoneNumberId)
    await actualizarEstado(from, 'No Interesado')
    await guardarInteraccion(lead.id, 'saliente', msg)
    await avisarConversacion(`${msg}  [lead marcado NO INTERESADO — ya no se le insiste]`)
    return
  }

  // ── PRIMER CONTACTO → enviar ficha + fotos + oferta UNA sola vez ──────
  // Solo se marca info_general_enviada si TODO se entregó de verdad — si algo
  // falla (token vencido, rate limit, etc.) el paquete se reintenta completo
  // la próxima vez que el lead escriba, en vez de darse por enviado en falso.
  if (!lead.info_general_enviada) {
    const okTexto = await enviarTexto(from, FICHA_AMBAS, phoneNumberId)
    await guardarInteraccion(lead.id, 'saliente', okTexto ? FICHA_AMBAS : `[FALLÓ] ${FICHA_AMBAS}`)
    if (!okTexto) return

    let okFotos = true
    for (const foto of FOTOS_PRIMER_CONTACTO) {
      const ok = await enviarImagen(from, foto.url, foto.caption, phoneNumberId)
      if (!ok) okFotos = false
    }
    await guardarInteraccion(lead.id, 'saliente', okFotos ? '[FOTOS PRIMER CONTACTO]' : '[FALLÓ] [FOTOS PRIMER CONTACTO]')
    if (!okFotos) return

    await marcarInfoEnviada(from)
    await avisarConversacion('Se le mandó la ficha de LAS DOS propiedades (Penthouse $4,500,000 y Departamento $2,900,000) con 4 fotos.')
    return
  }

  // ── YA RECIBIÓ EL PAQUETE → si vuelve a pedir fotos, reenviar ambas ──────
  if (intencion === 'PIDE_FOTOS') {
    let okFotos = true
    for (const foto of [...FOTOS_CHAT, ...FOTOS_DEPTO]) {
      const ok = await enviarImagen(from, foto.url, foto.caption, phoneNumberId)
      if (!ok) okFotos = false
    }
    await guardarInteraccion(lead.id, 'saliente', okFotos ? '[FOTOS PH+DEPTO]' : '[FALLÓ] [FOTOS PH+DEPTO]')

    // Además de las fotos va la ficha en PDF de la propiedad que le interesa.
    // Si todavía no dijo cuál, se le mandan las dos: que decida con todo a la
    // vista en vez de tener que volver a preguntar.
    const cuales = lead.interes === 'Penthouse' || lead.interes === 'Departamento'
      ? [lead.interes]
      : (['Penthouse', 'Departamento'] as const)
    for (const cual of cuales) {
      const f = FICHAS_PDF[cual as 'Penthouse' | 'Departamento']
      const okDoc = await enviarDocumento(from, f.url, f.archivo, `Ficha técnica — ${cual}`, phoneNumberId)
      await guardarInteraccion(lead.id, 'saliente', okDoc ? `[FICHA PDF ${cual}]` : `[FALLÓ] [FICHA PDF ${cual}]`)
    }

    await avisarConversacion('Pidió fotos — se le mandaron las fotos y la ficha técnica en PDF.')
    return
  }

  // ── CONVERSACIÓN NATURAL vía Claude (Ana) ─────────────────────────────
  if (intencion === 'AGENDA_CITA') {
    // Si el cliente ya confirmó día Y hora concretos, se captura la cita real
    // en vez de dejarla perdida como texto en la conversación. Si solo está
    // proponiendo o todavía no confirma, se queda en Calificado como antes.
    const fechaCita = await extraerFechaCita(texto)
    if (fechaCita) {
      await actualizarEstado(from, 'Cita Agendada', { bot_activo: false, fecha_cita: fechaCita })
      await avisarConversacion(`📅 Cita agendada automáticamente para ${new Date(fechaCita).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' })}`)
    } else {
      // Lead calificado → freno de mano: el bot se apaga y cede control al humano
      await actualizarEstado(from, 'Calificado', { bot_activo: false })
    }
  }

  // Si Claude falla (API caída, clave vencida, etc.) el lead no se queda en
  // silencio — recibe un mensaje de respaldo y el control pasa a un humano,
  // en vez de que el error se pierda sin que nadie se entere.
  try {
    const historial = await obtenerHistorial(lead.id)
    const respuesta = await generarRespuestaClaude(historial, texto)
    await enviarTexto(from, respuesta, phoneNumberId)
    await guardarInteraccion(lead.id, 'saliente', respuesta)
    await avisarConversacion(respuesta)
  } catch (e) {
    console.error('[Webhook] Error generando respuesta con Claude:', e)
    const respaldo = 'Dame un momento para confirmarte eso — en breve te contacta un asesor. También puedes llamar al 777 175 84 12.'
    await enviarTexto(from, respaldo, phoneNumberId)
    await guardarInteraccion(lead.id, 'saliente', `[RESPALDO - Claude falló] ${respaldo}`)
    await actualizarEstado(from, lead.estado, { bot_activo: false })
    await enviarTexto('527774921176', `⚠️ Claude falló respondiendo a ${lead.nombre || from} — se cedió control manual. Revisa el CRM.`)
  }
}
