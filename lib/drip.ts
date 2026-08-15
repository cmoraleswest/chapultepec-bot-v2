import { getSupabase } from './supabase'
import { enviarTexto, alertarCarlos, enviarPlantillaSeguimiento } from '../app/api/webhook/whatsapp'
import { BLOQUEADOS } from '../app/api/webhook/config'

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

export async function ejecutarCicloDrip(): Promise<{ enviados: number; errores: number; paraLlamar: number }> {
  const db = getSupabase()
  let enviados = 0
  let errores = 0
  const paraLlamar: PendienteLlamada[] = []

  const { data: leads } = await db
    .from('leads')
    .select('id, nombre, telefono, estado, actualizado_en, drip_count')
    .not('estado', 'in', '("No Contactar","No Interesado","Cita Agendada")')

  if (!leads?.length) return { enviados, errores, paraLlamar: 0 }

  const ahora = Date.now()

  for (const lead of leads as Lead[]) {
    const digitos = lead.telefono.replace(/\D/g, '')
    if (BLOQUEADOS.has(digitos)) continue

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
  }

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

    // No existe todavía una plantilla aprobada de "recordatorio de cita" —
    // solo se puede mandar como texto libre, que únicamente llega si el
    // cliente escribió en las últimas 24h. Si falla, se avisa a Carlos con
    // el día y hora reales para que él le escriba o llame directamente.
    const ok = await enviarTexto(lead.telefono, texto)

    if (ok) {
      await db.from('interacciones').insert({
        lead_id: lead.id,
        tipo: 'Mensaje Saliente Bot',
        contenido: texto,
        metadata: { recordatorio_cita: ventana, fecha_cita: lead.fecha_cita },
      })
      enviados++
    } else {
      await db.from('interacciones').insert({
        lead_id: lead.id,
        tipo: 'Nota Manual',
        contenido: `[RECORDATORIO NO ENVIADO] Cita ${fechaTexto} — WhatsApp no dejó texto libre (falta plantilla aprobada de recordatorio). Avísale tú.`,
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
