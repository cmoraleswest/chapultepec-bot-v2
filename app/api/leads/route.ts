import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '../../../lib/supabase'
import { enviarTexto, enviarImagen, enviarPlantilla, enviarPlantillaElegida, PLANTILLAS_CRM, type PlantillaCRM } from '../webhook/whatsapp'
import { FICHA_AMBAS, FOTOS_PRIMER_CONTACTO, FOTOS_PH, FOTOS_DEPTO } from '../webhook/config'
import { inicioDiaMexico } from '../../../lib/fecha'
import { ventanaAbierta } from '../webhook/leads'

export const dynamic = 'force-dynamic'

function auth(req: NextRequest): boolean {
  const t = req.nextUrl.searchParams.get('t')
  const a = req.headers.get('authorization')
  return t === 'chap2026' || a === 'Bearer chap2026'
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!auth(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = getSupabase()
  const vista = req.nextUrl.searchParams.get('vista')

  if (vista === 'urgencias') {
    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data } = await db
      .from('leads')
      .select('id, nombre, telefono, estado, actualizado_en, drip_count')
      .not('estado', 'in', '("No Contactar","No Interesado")')
      .lt('actualizado_en', hace24h)
      .order('actualizado_en', { ascending: true })
    return NextResponse.json(data ?? [])
  }

  // ── BANDEJA ───────────────────────────────────────────────────────────────
  // Una sola lista ordenada por el último mensaje, con el dato clave para
  // decidir: cuándo escribió el cliente por última vez. De ahí sale el
  // semáforo de la ventana de 24 h de WhatsApp.
  if (vista === 'bandeja') {
    const { data } = await db
      .from('bandeja')
      .select('*')
      .order('ultimo_mensaje_en', { ascending: false, nullsFirst: false })
      .limit(200)
    return NextResponse.json(data ?? [])
  }

  // Leads a los que WhatsApp NO alcanza: sin WhatsApp (131026) o bloqueados
  // por Meta (130472). No se pierden — pasan a una lista de contacto directo.
  if (vista === 'solo_llamada') {
    const { data } = await db.from('solo_llamada').select('*').order('fallo_en', { ascending: false })
    return NextResponse.json(data ?? [])
  }

  if (vista === 'llamadas') {
    const { data } = await db
      .from('llamadas_rescatadas')
      .select('id, telefono, nombre, lead_id, contestada, whatsapp_enviado, seguimiento, notas, creado_en')
      .order('creado_en', { ascending: false })
      .limit(100)
    return NextResponse.json(data ?? [])
  }

  if (vista === 'publicaciones') {
    const { data } = await db
      .from('publicaciones')
      .select('id, red, tipo, caption, imagen_url, buffer_id, estado, creado_en')
      .order('creado_en', { ascending: false })
      .limit(100)
    return NextResponse.json(data ?? [])
  }

  if (vista === 'salud') {
    const desdeHoy = inicioDiaMexico()

    const [pubHoy, ultimaPub, msgHoy, ultimoMsg] = await Promise.all([
      db.from('publicaciones').select('id', { count: 'exact', head: true }).gte('creado_en', desdeHoy),
      db.from('publicaciones').select('creado_en').order('creado_en', { ascending: false }).limit(1).single(),
      db.from('interacciones').select('id', { count: 'exact', head: true }).eq('tipo', 'Mensaje Saliente Bot').gte('creado_en', desdeHoy),
      db.from('interacciones').select('creado_en').eq('tipo', 'Mensaje Saliente Bot').order('creado_en', { ascending: false }).limit(1).single(),
    ])

    return NextResponse.json({
      publicacionesHoy: pubHoy.count ?? 0,
      ultimaPublicacion: ultimaPub.data?.creado_en ?? null,
      mensajesHoy: msgHoy.count ?? 0,
      ultimoMensaje: ultimoMsg.data?.creado_en ?? null,
    })
  }

  if (vista === 'historial') {
    const leadId = req.nextUrl.searchParams.get('lead_id')
    if (!leadId) return NextResponse.json({ error: 'lead_id requerido' }, { status: 400 })
    const { data } = await db
      .from('interacciones')
      .select('id, tipo, contenido, metadata, creado_en')
      .eq('lead_id', leadId)
      .order('creado_en', { ascending: false })
      .limit(50)
    return NextResponse.json(data ?? [])
  }

  const { data } = await db
    .from('leads')
    .select('id, nombre, telefono, estado, interes, actualizado_en, info_general_enviada, fecha_cita, drip_count, creado_en, bot_activo')
    .order('actualizado_en', { ascending: false })
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  if (!auth(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json() as {
    id: string
    tabla?: string
    estado?: string
    notas?: string
    nombre?: string
    seguimiento?: string
    contestada?: boolean
    whatsapp_enviado?: boolean
    bot_activo?: boolean
  }
  if (!body.id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  const tabla = body.tabla || 'leads'
  const updates: Record<string, unknown> = {}

  if (body.estado) updates.estado = body.estado
  if (body.notas !== undefined) updates.notas = body.notas
  if (body.nombre !== undefined) updates.nombre = body.nombre
  if (body.seguimiento) updates.seguimiento = body.seguimiento
  if (body.contestada !== undefined) updates.contestada = body.contestada
  if (body.whatsapp_enviado !== undefined) updates.whatsapp_enviado = body.whatsapp_enviado
  if (body.bot_activo !== undefined) updates.bot_activo = body.bot_activo

  const { error } = await getSupabase()
    .from(tabla)
    .update(updates)
    .eq('id', body.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// PUT /api/leads — enviar mensaje manual a un lead
export async function PUT(req: NextRequest): Promise<NextResponse> {
  if (!auth(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json() as { telefono: string; mensaje?: string; plantilla?: string; fotos?: 'ph' | 'depto'; nota?: string }
  if (!body.telefono || (!body.mensaje && !body.plantilla && !body.fotos && !body.nota)) {
    return NextResponse.json({ error: 'telefono y (mensaje, plantilla, fotos o nota) requeridos' }, { status: 400 })
  }

  const tel = body.telefono.replace(/\D/g, '')
  const telWA = tel.startsWith('52') ? tel : `52${tel}`

  const db = getSupabase()
  const { data: lead } = await db.from('leads').select('id, nombre').eq('telefono', telWA).single()

  // ── NOTA MANUAL ─────────────────────────────────────────────────────────
  // Para cuando Carlos ya contestó al cliente a mano, por fuera del CRM (por
  // ejemplo por WhatsApp normal en el 175), y solo quiere dejar registro de
  // qué pasó. No manda nada por WhatsApp, no depende de la ventana de 24h.
  if (body.nota) {
    if (!lead) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 })
    await db.from('interacciones').insert({
      lead_id: lead.id,
      tipo: 'Nota Manual',
      contenido: body.nota,
      metadata: { manual: true },
    })
    return NextResponse.json({ ok: true })
  }

  // ── ENVIAR MÁS FOTOS A MANO ────────────────────────────────────────────────
  // FOTOS_CHAT y FOTOS_DEPTO ya existían "para reenvíos y envíos manuales"
  // (ver config.ts) pero nunca se conectaron a ningún botón — la única forma
  // de mandarlas era que el bot las disparara solo cuando el cliente las
  // pedía. Las imágenes tienen la misma regla de ventana que el texto libre,
  // así que aquí también se revisa antes de intentar.
  if (body.fotos) {
    if (!lead) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 })
    if (!(await ventanaAbierta(lead.id))) {
      return NextResponse.json({ error: 'Ventana cerrada — no se pueden mandar fotos sueltas fuera de la ventana de 24h, solo plantilla' }, { status: 400 })
    }
    const set = body.fotos === 'ph' ? FOTOS_PH : FOTOS_DEPTO
    let ok = true
    for (const foto of set) {
      const enviada = await enviarImagen(telWA, foto.url, foto.caption)
      if (!enviada) ok = false
    }
    await db.from('interacciones').insert({
      lead_id: lead.id,
      tipo: 'Mensaje Saliente Bot',
      contenido: ok ? `[FOTOS ${body.fotos.toUpperCase()} — enviadas a mano]` : `[FALLÓ] [FOTOS ${body.fotos.toUpperCase()} — enviadas a mano]`,
      metadata: { manual: true, fotos: body.fotos },
    })
    return ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ ok: false, error: 'Alguna foto no se pudo enviar' }, { status: 502 })
  }

  // ── PLANTILLA ELEGIDA A MANO ──────────────────────────────────────────────
  // El CRM manda esto cuando la ventana ya está cerrada y quien usa el panel
  // escogió una de las 4 plantillas aprobadas del selector, en vez de texto
  // libre que Meta rechazaría de todos modos.
  if (body.plantilla) {
    if (!PLANTILLAS_CRM.includes(body.plantilla as PlantillaCRM)) {
      return NextResponse.json({ error: 'Plantilla no reconocida' }, { status: 400 })
    }
    const ok = await enviarPlantillaElegida(telWA, body.plantilla as PlantillaCRM, lead?.nombre || 'que tal')
    if (ok && lead) {
      await db.from('interacciones').insert({
        lead_id: lead.id,
        tipo: 'Mensaje Saliente Bot',
        contenido: `[Plantilla ${body.plantilla} — elegida a mano]`,
        metadata: { manual: true, via: 'plantilla', plantilla: body.plantilla },
      })
    }
    return ok
      ? NextResponse.json({ ok: true, via: 'plantilla' })
      : NextResponse.json({ ok: false, error: 'Meta rechazó la plantilla' }, { status: 502 })
  }

  // ── VENTANA DE 24 HORAS ────────────────────────────────────────────────────
  // enviarTexto() devuelve true en cuanto Meta ACEPTA la petición (HTTP 200),
  // no cuando el mensaje realmente se entrega. Fuera de la ventana de 24 h
  // Meta acepta igual y horas después avisa "failed" por el webhook — para
  // entonces este endpoint ya había respondido ok:true y nunca intentó la
  // plantilla de respaldo. Por eso se veían leads marcados como enviados que
  // en realidad nunca recibieron nada. Ahora se revisa la ventana ANTES de
  // intentar texto libre, con la misma función que usan POST /api/leads y
  // lib/drip.ts — un solo lugar que decide esto, no una consulta reescrita
  // en cada archivo (esa duplicación fue justo lo que dejó un hueco en el
  // recordatorio de la hora 1 del drip).
  const dentroDeVentana = lead ? await ventanaAbierta(lead.id) : false

  // Solo llega aquí con body.mensaje garantizado — la validación de arriba
  // exige mensaje o plantilla, y la rama de plantilla ya regresó.
  const mensaje = body.mensaje as string

  // Texto libre primero solo si el cliente escribió en las últimas 24 h —
  // fuera de ese margen está condenado a fallar (131047), así que se salta
  // directo a la plantilla aprobada.
  const enviado = dentroDeVentana ? await enviarTexto(telWA, mensaje) : false

  if (enviado) {
    if (lead) {
      await db.from('interacciones').insert({ lead_id: lead.id, tipo: 'Mensaje Saliente Bot', contenido: `[Manual] ${mensaje}`, metadata: { manual: true } })
    }
    return NextResponse.json({ ok: true })
  }

  // ── FUERA DE LA VENTANA DE 24 HORAS ───────────────────────────────────────
  // WhatsApp bloquea el texto libre pasadas 24 h sin respuesta del cliente
  // (error 131047). Decirle a Carlos "pídele que te escriba" es inútil: si
  // pudiera contactarlo no necesitaría el CRM. Se manda entonces la plantilla
  // aprobada, que sí puede salir en cualquier momento y reabre la conversación.
  // Cuando el cliente responde, la ventana se abre y ya se le puede escribir
  // libremente.
  const okPlantilla = await enviarPlantilla(telWA)

  if (okPlantilla) {
    if (lead) {
      await db.from('interacciones').insert({
        lead_id: lead.id,
        tipo: 'Mensaje Saliente Bot',
        contenido: `[Plantilla — fuera de ventana 24h] Tu mensaje no se pudo mandar tal cual, se envió la plantilla aprobada para reabrir la conversación. Tu texto era: "${mensaje}"`,
        metadata: { manual: true, via: 'plantilla' },
      })
    }
    return NextResponse.json({
      ok: true,
      via: 'plantilla',
      mensaje: 'Pasaron más de 24h sin respuesta del cliente, así que WhatsApp no deja mandar texto libre. Se le envió la plantilla aprobada para reabrir la conversación. En cuanto conteste, ya le puedes escribir normal.',
    })
  }

  if (lead) {
    await db.from('interacciones').insert({
      lead_id: lead.id,
      tipo: 'Nota Manual',
      contenido: `[NO ENTREGADO] No se pudo mandar ni texto ni plantilla. Este número probablemente no tiene WhatsApp — hay que llamarle.`,
      metadata: { manual: true },
    })
  }
  return NextResponse.json({ ok: false, error: 'No se pudo entregar ni como plantilla. Ese número probablemente no tiene WhatsApp: llámalo por teléfono.' }, { status: 502 })
}

// POST /api/leads — registrar llamada perdida y contactar por WhatsApp
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!auth(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json() as { telefono: string; nombre?: string }
  if (!body.telefono) return NextResponse.json({ error: 'telefono requerido' }, { status: 400 })

  const tel = body.telefono.replace(/\D/g, '')
  const telWA = tel.startsWith('52') ? tel : `52${tel}`

  const db = getSupabase()

  // ── 1. EL LEAD SE CREA PRIMERO ────────────────────────────────────────────
  // Antes la llamada se insertaba ANTES del lead y sin lead_id, así que el
  // vínculo quedaba nulo SIEMPRE (82 de 82 llamadas históricas sin vincular).
  // Desde el CRM era imposible saltar de una llamada al historial del lead,
  // que es justo lo que se necesita para darle seguimiento.
  // ── ¿YA DIJO QUE NO? ──────────────────────────────────────────────────────
  // Un lead que respondió "no le llegamos al precio" quedó como No Interesado
  // y aun así este endpoint le reenvió la ficha completa con fotos. Si la
  // persona ya se descartó o pidió no ser contactada, aquí no se le manda
  // NADA: solo se registra la llamada y se avisa a Carlos para que juzgue él.
  const { data: previo } = await db.from('leads').select('id, estado').eq('telefono', telWA).maybeSingle()
  if (previo && (previo.estado === 'No Interesado' || previo.estado === 'No Contactar')) {
    await db.from('llamadas_rescatadas').insert({
      telefono: telWA, lead_id: previo.id, nombre: body.nombre || null,
      seguimiento: `Llamó de nuevo — estaba en "${previo.estado}"`,
      contestada: false, whatsapp_enviado: false,
    })
    await enviarTexto('527774921176', `📞 +${telWA} volvió a llamar, pero está marcado como "${previo.estado}". No se le mandó nada. Decide tú si le llamas.`)
    return NextResponse.json({ ok: true, mensaje: 'Llamada registrada — lead descartado, no se envió info' })
  }

  // El estado solo se pone en 'Nuevo' cuando el lead no existía. Antes el
  // upsert lo regresaba a 'Nuevo' siempre, borrando el avance del embudo.
  const { data: lead } = await db.from('leads').upsert(
    previo
      ? { telefono: telWA, canal_origen: 'Llamada Rescatada' }
      : { telefono: telWA, canal_origen: 'Llamada Rescatada', estado: 'Nuevo' },
    { onConflict: 'telefono' }
  ).select('id, info_general_enviada').single()

  // ── 2. ¿YA SE LE MANDÓ EL PAQUETE HACE POCO? ──────────────────────────────
  // 82 llamadas venían de solo 50 números: los repetidores recibían la ficha y
  // todas las fotos otra vez en cada llamada. Eso es spam y quema al lead.
  // Si ya se le envió en las últimas 12 horas, se registra la llamada y se
  // avisa a Carlos, pero no se le vuelve a disparar el paquete completo.
  const hace12h = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  const { data: envioReciente } = await db
    .from('llamadas_rescatadas')
    .select('id')
    .eq('telefono', telWA)
    .eq('whatsapp_enviado', true)
    .gte('creado_en', hace12h)
    .limit(1)

  const yaContactado = (envioReciente?.length ?? 0) > 0

  // Este camino (llamada rescatada / alta manual desde el CRM) mandaba SOLO el
  // penthouse: la plantilla aprobada `info_penthouse_chapultepec` + FOTOS_PH.
  // Medido en la base: 38 leads recibieron la ficha del penthouse y solo 1 la
  // del departamento. Todo el que llamaba por teléfono nunca se enteraba de la
  // unidad de $2,900,000. Ahora, después de la plantilla (que es obligatoria
  // para abrir conversación con alguien que no nos ha escrito), se manda la
  // ficha con AMBAS propiedades y las fotos de las dos, igual que el webhook.
  let envioCompleto = true
  if (yaContactado) {
    await enviarTexto('527774921176', `📞 +${telWA} volvió a llamar (ya tiene la info desde hace menos de 12h). Llámalo tú — no se le reenvió nada.`)
  } else {
    // ── ¿EL CLIENTE NOS HA ESCRITO EN LAS ÚLTIMAS 24 H? ────────────────────
    // La ventana SOLO la abre el cliente. A quien nunca nos escribió (el
    // caso típico: llamó por teléfono y colgamos su número aquí) WhatsApp le
    // rechaza texto libre e imágenes: únicamente pasa la plantilla. Antes se
    // intentaban igual la ficha y las 4 fotos, que siempre fallaban y
    // llenaban el CRM y el WhatsApp de Carlos de alertas de error inútiles.
    const yaEscribioReciente = lead ? await ventanaAbierta(lead.id) : false

    const okPlantilla = await enviarPlantilla(telWA)
    envioCompleto = okPlantilla

    if (yaEscribioReciente) {
      // Ya nos escribió antes: aquí sí pasa todo el paquete.
      const okFicha = await enviarTexto(telWA, FICHA_AMBAS)
      let okFotos = true
      for (const foto of FOTOS_PRIMER_CONTACTO) {
        const ok = await enviarImagen(telWA, foto.url, foto.caption)
        if (!ok) okFotos = false
      }
      envioCompleto = okPlantilla && okFicha && okFotos
    }
  }

  // ── 3. LA LLAMADA SE REGISTRA YA VINCULADA AL LEAD ────────────────────────
  await db.from('llamadas_rescatadas').insert({
    telefono: telWA,
    lead_id: lead?.id ?? null,
    nombre: body.nombre || null,
    seguimiento: yaContactado ? 'Recontacto — llamar' : 'Pendiente',
    contestada: false,
    whatsapp_enviado: envioCompleto && !yaContactado,
  })

  // info_general_enviada solo se marca si de verdad se entregó; si no, el
  // webhook reintenta el paquete la próxima vez que el lead escriba.
  if (lead && envioCompleto && !yaContactado) {
    await db.from('leads').update({ info_general_enviada: true }).eq('id', lead.id)
  }

  if (yaContactado) {
    return NextResponse.json({ ok: true, mensaje: `Llamada repetida de +${telWA} registrada — no se reenvió info` })
  }

  if (!envioCompleto) {
    return NextResponse.json({ ok: false, error: 'WhatsApp rechazó el envío — revisa el token' }, { status: 502 })
  }

  // Registrar interacción en historial — "tipo" debe ser 'Mensaje Saliente Bot'
  // (el mismo valor que usa guardarInteraccion() en el webhook). El valor
  // 'saliente' viola el check constraint de la tabla y nunca se guardaba,
  // en NINGÚN envío hecho por este endpoint hasta ahora.
  // El historial registra lo que DE VERDAD se mandó. Antes escribía siempre
  // FICHA_TECNICA / [FOTOS PH] / OFERTA_CITA aunque lo enviado fuera otra cosa,
  // así que el CRM mostraba un historial que no correspondía con lo que el
  // cliente tenía en su teléfono.
  if (lead) {
    await db.from('interacciones').insert([
      { lead_id: lead.id, tipo: 'Mensaje Saliente Bot', contenido: '[PLANTILLA info_penthouse_chapultepec]' },
      { lead_id: lead.id, tipo: 'Mensaje Saliente Bot', contenido: FICHA_AMBAS },
      { lead_id: lead.id, tipo: 'Mensaje Saliente Bot', contenido: '[FOTOS PRIMER CONTACTO]' },
    ])
  }

  return NextResponse.json({ ok: true, mensaje: `WhatsApp enviado a +${telWA}` })
}
