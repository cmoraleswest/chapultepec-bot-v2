import { getSupabase } from './supabase'
import { enviarTexto, alertarCarlos, enviarPlantillaSeguimiento, enviarPlantillaCita } from '../app/api/webhook/whatsapp'
import { BLOQUEADOS } from '../app/api/webhook/config'
import { ventanaAbierta } from '../app/api/webhook/leads'

interface Lead {
  id: string
  nombre: string | null
  telefono: string
  estado: string
  actualizado_en: string
  drip_count: number
}

interface ReglaDrip {
  nombre: string
  estados: string[]
  horasSin: number
  maxEnvios: number
  nuevoEstado?: string
  plantilla: (nombre: string | null) => string
  // Plantilla aprobada por Meta. Obligatoria en toda regla de 24 h o más:
  // fuera de la ventana de 24 h el texto libre SIEMPRE se rechaza (131047).
  plantillaWa?: string
}

const REGLAS: ReglaDrip[] = [
  {
    nombre: 'bienvenida_recordatorio',
    estados: ['Nuevo'],
    horasSin: 1,
    maxEnvios: 1,
    plantilla: (n) =>
      `Hola${n ? ` ${n.split(' ')[0]}` : ''}, vi que solicitaste información sobre Parque Chapultepec. ¿Tienes alguna duda sobre el Penthouse? Estoy aquí para ayudarte.`,
  },
  {
    nombre: 'seguimiento_a',
    estados: ['En Conversación'],
    horasSin: 24,
    maxEnvios: 2,
    plantillaWa: 'seguimiento_24h',
    plantilla: (n) =>
      `${n ? n.split(' ')[0] : 'Hola'}, ¿tuviste oportunidad de revisar la información del Penthouse Parque Chapultepec?\n\n$4,500,000 MXN · 336m² · Rooftop privado\n\n¿Te gustaría agendar una visita sin compromiso?`,
  },
  {
    nombre: 'seguimiento_b',
    estados: ['En Conversación'],
    horasSin: 48,
    maxEnvios: 1,
    plantillaWa: 'seguimiento_48h',
    plantilla: (n) =>
      `${n ? n.split(' ')[0] : 'Hola'}, solo quería recordarte que quedan pocas unidades disponibles en Parque Chapultepec.\n\nSi tienes preguntas sobre financiamiento o quieres apartar con un pequeño depósito, con gusto te explico.`,
  },
  {
    nombre: 'urgencia_calificado',
    estados: ['Calificado'],
    horasSin: 48,
    maxEnvios: 1,
    plantillaWa: 'seguimiento_48h',
    plantilla: (n) =>
      `${n ? n.split(' ')[0] : 'Hola'}, varios clientes han visitado el Penthouse esta semana.\n\nNo queremos que te quedes sin verlo. ¿Podemos agendar tu visita esta semana?`,
  },
  {
    nombre: 'cierre',
    estados: ['Nuevo', 'En Conversación', 'Calificado'],
    horasSin: 168,
    maxEnvios: 1,
    nuevoEstado: 'No Interesado',
    plantillaWa: 'cierre_7dias',
    plantilla: (n) =>
      `${n ? n.split(' ')[0] : 'Hola'}, entendemos si el momento no es el ideal.\n\nSi en algún momento quieres retomar la conversación sobre Parque Chapultepec, aquí estaremos. ¡Mucho éxito!`,
  },
]

async function contarEnvios(leadId: string, nombreRegla: string): Promise<number> {
  const { count } = await getSupabase()
    .from('interacciones')
    .select('id', { count: 'exact', head: true })
    .eq('lead_id', leadId)
    .eq('tipo', 'Mensaje Saliente Bot')
    .contains('metadata', { drip_regla: nombreRegla })

  return count ?? 0
}

interface PendienteLlamada {
  telefono: string
  nombre: string | null
  estado: string
  regla: string
}

// Corre `fn` sobre `items` con hasta `limite` en vuelo a la vez, en vez de
// uno por uno. Antes el ciclo de drip procesaba los ~56 leads activos 100%
// en secuencia (varias consultas a Supabase + un envío a Meta por lead, todo
// esperado uno tras otro) — con datos reales eso ya se acerca o pasa el
// límite de duración de la función en Vercel, y el cron se cortaba a la
// mitad sin avisar. 5 a la vez es suficiente para bajar el tiempo total
// varias veces sin acercarse a los límites de tasa de la API de WhatsApp.
async function conLimite<T>(items: T[], limite: number, fn: (item: T) => Promise<void>): Promise<void> {
  let indice = 0
  async function trabajador(): Promise<void> {
    while (indice < items.length) {
      const item = items[indice++]
      await fn(item)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, items.length) }, trabajador))
}

export async function ejecutarCicloDrip(): Promise<{ enviados: number; errores: number; paraLlamar: number }> {
  const db = getSupabase()
  let enviados = 0
  let errores = 0
  const paraLlamar: PendienteLlamada[] = []

  const { data: leads } = await db
    .from('leads')
    .select('id, nombre, telefono, estado, actualizado_en, drip_count')
    .not('estado', 'in', '("No Contactar","No Interesado","Cita Agendada")')
    .neq('canal_origen', 'Corredor')

  if (!leads?.length) return { enviados, errores, paraLlamar: 0 }

  const ahora = Date.now()

  await conLimite(leads as Lead[], 5, async (lead) => {
    const digitos = lead.telefono.replace(/\D/g, '')
    if (BLOQUEADOS.has(digitos)) return

    // Un número que ya rechazó con 131026 (sin WhatsApp) no lo va a tener la
    // próxima vez que se le intente — no es un problema de ventana ni de
    // plantilla, es que la app no está instalada ahí. Antes el drip lo
    // reintentaba en cada ciclo durante días hasta que "cierre" lo cerraba
    // solo, acumulando fallas sin sentido. Un solo 131026 ya visto basta
    // para dejar de insistir; la vista "Solo llamada" del CRM ya lo cubre.
    const { count: sinWhatsapp } = await db
      .from('interacciones')
      .select('id', { count: 'exact', head: true })
      .eq('lead_id', lead.id)
      .like('contenido', '%131026%')
    if ((sinWhatsapp ?? 0) > 0) return

    const msDesdeUpdate = ahora - new Date(lead.actualizado_en).getTime()
    const horasDesdeUpdate = msDesdeUpdate / (1000 * 60 * 60)

    for (const regla of REGLAS) {
      if (!regla.estados.includes(lead.estado)) continue
      if (horasDesdeUpdate < regla.horasSin) continue

      try {
        const yaEnviados = await contarEnvios(lead.id, regla.nombre)
        if (yaEnviados >= regla.maxEnvios) continue

        // ── REGLA DE LAS 24 HORAS DE WHATSAPP ────────────────────────────
        // WhatsApp NO permite texto libre a quien no te ha escrito en las
        // últimas 24 h (error 131047). Todas las reglas de 24 h en adelante
        // estaban condenadas a fallar por definición: cada mañana el cron
        // intentaba enviarlas y Meta las rechazaba todas. Nunca funcionaron.
        // En vez de insistir contra una pared (y quemar la calidad del número
        // acumulando fallos), esos leads se juntan y se le reportan a Carlos
        // en UN solo mensaje para que los llame por teléfono, que es el canal
        // que sí funciona pasadas las 24 h.
        if (regla.horasSin >= 24) {
          // Automático de verdad: se manda la PLANTILLA aprobada, que sí puede
          // salir fuera de la ventana. Solo si Meta la rechaza (plantilla aún
          // sin aprobar, o el número cae en el experimento 130472) el lead pasa
          // a la lista de llamadas, que es el último recurso, no el primero.
          const okPlantilla = regla.plantillaWa
            ? await enviarPlantillaSeguimiento(lead.telefono, regla.plantillaWa, (lead.nombre || '').split(' ')[0] || 'que tal')
            : false

          if (okPlantilla) {
            await db.from('interacciones').insert({
              lead_id: lead.id,
              tipo: 'Mensaje Saliente Bot',
              contenido: `[PLANTILLA ${regla.plantillaWa}] seguimiento automático`,
              metadata: { drip_regla: regla.nombre },
            })
            await db.from('leads').update({ drip_count: (lead.drip_count ?? 0) + 1 }).eq('id', lead.id)
            enviados++
          } else {
            paraLlamar.push({ telefono: lead.telefono, nombre: lead.nombre, estado: lead.estado, regla: regla.nombre })
            await db.from('interacciones').insert({
              lead_id: lead.id,
              tipo: 'Nota Manual',
              contenido: `[PARA LLAMAR] ${Math.floor(horasDesdeUpdate)} h sin moverse y WhatsApp no lo alcanza. Hay que llamarle.`,
              metadata: { drip_regla: regla.nombre },
            })
          }

          if (regla.nuevoEstado) {
            await db.from('leads').update({ estado: regla.nuevoEstado }).eq('id', lead.id)
          }
          break
        }

        // ── ¿SIGUE ABIERTA LA VENTANA? ──────────────────────────────────────
        // Esta rama es para reglas de menos de 24 h (hoy solo
        // bienvenida_recordatorio, a la hora 1). Se asumía que si el lead
        // llevaba menos de un día en "Nuevo" la ventana seguía abierta, pero
        // eso solo es cierto si escribió por WhatsApp en las últimas 24 h. Un
        // lead de "Llamada Rescatada" no abre ventana con la llamada — solo
        // un mensaje real — y ya recibió la ficha por plantilla al momento
        // de registrar la llamada (ver app/api/leads/route.ts). Mandarle
        // este texto libre encima estaba condenado a fallar con 131047 el
        // 100% de las veces. ventanaAbierta() es la misma función que usa
        // todo el sistema para esta pregunta — un solo lugar, no una
        // consulta reescrita aquí que alguien puede olvidar actualizar.
        if (!(await ventanaAbierta(lead.id))) continue

        const texto = regla.plantilla(lead.nombre)
        const ok = await enviarTexto(lead.telefono, texto)

        // Si WhatsApp rechazó el envío (token vencido, rate limit, etc.) no se
        // registra como enviado ni se avanza el estado del lead — de lo
        // contrario un lead real podía terminar marcado "No Interesado" por
        // la regla de cierre sin haber recibido nunca el mensaje.
        if (!ok) {
          errores++
          break
        }

        await db.from('interacciones').insert({
          lead_id: lead.id,
          tipo: 'Mensaje Saliente Bot',
          contenido: texto,
          metadata: { drip_regla: regla.nombre },
        })

        await db
          .from('leads')
          .update({ drip_count: (lead.drip_count ?? 0) + 1 })
          .eq('id', lead.id)

        if (regla.nuevoEstado) {
          await db
            .from('leads')
            .update({ estado: regla.nuevoEstado })
            .eq('id', lead.id)
        }

        enviados++
        break // una regla por lead por ciclo
      } catch (e) {
        console.error(`[Drip] Error con ${lead.telefono}:`, e)
        errores++
      }
    }
  })

  // Un solo aviso con la lista completa del día. Uno por lead sería spam para
  // Carlos y acabaría ignorándolos, que es justo lo que pasaba antes.
  if (paraLlamar.length > 0) {
    const lista = paraLlamar
      .slice(0, 15)
      .map((p) => `• ${p.nombre || `+${p.telefono}`} — ${p.estado}`)
      .join('\n')
    const extra = paraLlamar.length > 15 ? `\n…y ${paraLlamar.length - 15} más en el CRM.` : ''
    await alertarCarlos(
      `📞 ${paraLlamar.length} leads necesitan LLAMADA hoy\n\nLlevan más de 24 h sin moverse, así que WhatsApp ya no los alcanza.\n\n${lista}${extra}\n\nchapultepec-bot-v2.vercel.app`,
      'Seguimiento diario',
      `${paraLlamar.length} leads necesitan llamada telefonica hoy. Ver el panel del CRM.`
    )
  }

  return { enviados, errores, paraLlamar: paraLlamar.length }
}

// ── RECORDATORIOS DE CITA (24h y 2h antes) ───────────────────────────────────
// Antes de esto, capturar día y hora de la cita no llevaba a ningún aviso
// posterior — el cliente confirmaba y ahí se quedaba hasta el día de la
// visita. Esto revisa periódicamente los leads en "Cita Agendada" y avisa
// dos veces: ~24h antes y ~2h antes, sin repetir el mismo aviso dos veces
// para la misma cita (si se reagenda, la fecha nueva es otra ventana).
//
// OJO — limitación real, no teórica: este motor solo se ejecuta cuando algo
// lo llama. El cron de /api/cron corre una vez al día a las 7am hora de
// México. Eso alcanza para el recordatorio de 24h (la ventana de tolerancia
// es amplia), pero el de 2h necesita revisarse cada 15-30 minutos para no
// perder la ventana casi siempre — con una corrida diaria prácticamente
// nunca va a coincidir. Para que el de 2h funcione de verdad hace falta un
// disparador más frecuente (cron externo gratuito tipo cron-job.org pegándole
// a /api/cron cada 15-30 min, o subir el plan de Vercel a Pro).
interface LeadConCita {
  id: string
  nombre: string | null
  telefono: string
  fecha_cita: string
}

type VentanaRecordatorio = '24h' | '2h'

async function yaSeRecordo(leadId: string, ventana: VentanaRecordatorio, fechaCita: string): Promise<boolean> {
  const { count } = await getSupabase()
    .from('interacciones')
    .select('id', { count: 'exact', head: true })
    .eq('lead_id', leadId)
    .contains('metadata', { recordatorio_cita: ventana, fecha_cita: fechaCita })

  return (count ?? 0) > 0
}

function fechaCitaTexto(fechaCita: string): string {
  return new Date(fechaCita).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City', weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

// Día y hora como strings separados — la plantilla recordatorio_cita_chapultepec
// los recibe como {{2}} y {{3}} en vez de una sola fecha compuesta en {{1}}.
function diaCitaTexto(fechaCita: string): string {
  return new Date(fechaCita).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', weekday: 'long', day: 'numeric', month: 'long' })
}
function horaCitaTexto(fechaCita: string): string {
  return new Date(fechaCita).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', hour: 'numeric', minute: '2-digit', hour12: true })
}

export async function ejecutarRecordatoriosCita(): Promise<{ enviados: number; pendientesAvisar: number }> {
  const db = getSupabase()
  let enviados = 0
  const paraAvisar: { telefono: string; nombre: string | null; fechaTexto: string; ventana: VentanaRecordatorio }[] = []

  const { data: leads } = await db
    .from('leads')
    .select('id, nombre, telefono, fecha_cita')
    .eq('estado', 'Cita Agendada')
    .not('fecha_cita', 'is', null)

  const ahora = Date.now()

  for (const lead of (leads ?? []) as LeadConCita[]) {
    const digitos = lead.telefono.replace(/\D/g, '')
    if (BLOQUEADOS.has(digitos)) continue

    const horasFaltan = (new Date(lead.fecha_cita).getTime() - ahora) / 3_600_000
    if (horasFaltan <= 0) continue // la cita ya pasó

    let ventana: VentanaRecordatorio | null = null
    if (horasFaltan <= 25 && horasFaltan >= 18) ventana = '24h'
    else if (horasFaltan <= 2.5 && horasFaltan >= 0.5) ventana = '2h'
    if (!ventana) continue

    if (await yaSeRecordo(lead.id, ventana, lead.fecha_cita)) continue

    const fechaTexto = fechaCitaTexto(lead.fecha_cita)
    const primerNombre = lead.nombre ? ` ${lead.nombre.split(' ')[0]}` : ''
    const texto = ventana === '24h'
      ? `Hola${primerNombre}, te recuerdo tu visita a Parque Chapultepec mañana ${fechaTexto} en Bajada de Chapultepec 18-A. ¿Sigue en pie?`
      : `Hola${primerNombre}, tu visita a Parque Chapultepec es en unas 2 horas, ${fechaTexto}, en Bajada de Chapultepec 18-A. ¡Te esperamos!`

    // 1) Plantilla dedicada primero — funciona sin importar la ventana de 24h,
    //    en cuanto Meta la apruebe. 2) Si Meta aún la rechaza (no aprobada
    //    todavía), texto libre de respaldo — solo llega si el cliente escribió
    //    en las últimas 24h. 3) Si las dos fallan, se avisa a Carlos con el
    //    día y hora reales para que le escriba o llame directamente. En
    //    cualquiera de los tres casos se guarda la misma metadata de
    //    dedup — un intento fallido no se vuelve a reintentar en el próximo
    //    ciclo, así que nunca queda en bucle mandando lo mismo.
    const viaPlantilla = await enviarPlantillaCita(
      lead.telefono, lead.nombre || 'que tal', diaCitaTexto(lead.fecha_cita), horaCitaTexto(lead.fecha_cita)
    )
    const ok = viaPlantilla || (await enviarTexto(lead.telefono, texto))

    if (ok) {
      await db.from('interacciones').insert({
        lead_id: lead.id,
        tipo: 'Mensaje Saliente Bot',
        contenido: viaPlantilla ? `[Plantilla recordatorio_cita_chapultepec] ${texto}` : texto,
        metadata: { recordatorio_cita: ventana, fecha_cita: lead.fecha_cita, via: viaPlantilla ? 'plantilla' : 'texto_libre' },
      })
      enviados++
    } else {
      await db.from('interacciones').insert({
        lead_id: lead.id,
        tipo: 'Nota Manual',
        contenido: `[RECORDATORIO NO ENVIADO] Cita ${fechaTexto} — ni la plantilla ni el texto libre pudieron mandarse. Avísale tú.`,
        metadata: { recordatorio_cita: ventana, fecha_cita: lead.fecha_cita, fallo: true },
      })
      paraAvisar.push({ telefono: lead.telefono, nombre: lead.nombre, fechaTexto, ventana })
    }
  }

  if (paraAvisar.length > 0) {
    const lista = paraAvisar
      .map((p) => `• ${p.nombre || `+${p.telefono}`} — ${p.fechaTexto} (recordatorio ${p.ventana})`)
      .join('\n')
    await alertarCarlos(
      `⏰ ${paraAvisar.length} recordatorio(s) de cita no se pudieron mandar por WhatsApp — falta la plantilla aprobada. Avísales tú:\n\n${lista}`,
      'Recordatorios de cita',
      `${paraAvisar.length} recordatorios de cita pendientes de avisar a mano`
    )
  }

  return { enviados, pendientesAvisar: paraAvisar.length }
}
