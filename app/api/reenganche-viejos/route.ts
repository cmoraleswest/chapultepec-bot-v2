// Endpoint de UN SOLO USO — reenganche manual a leads de llamadas rescatadas
// viejas (>30 días) sin seguimiento. Se creó el 31-ago-2026 a petición de
// Carlos para intentar revivir 59 leads que llevan más de un mes sin
// respuesta, después de advertirle del riesgo de mandar una ráfaga de
// plantillas mientras la verificación de negocio de Meta sigue pendiente —
// decisión suya, informada.
//
// NO es un cron ni corre solo — solo se dispara visitando esta URL con el
// token. Es idempotente: solo toca llamadas_rescatadas con seguimiento =
// 'Pendiente', y las marca 'Contactado' después de intentar, así que
// visitarla dos veces no vuelve a mandar a quien ya se procesó.
//
// Nunca toca leads en estado 'No Interesado' o 'No Contactar' — esos ya
// dijeron que no, o pidieron no ser contactados.

import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '../../../lib/supabase'
import { enviarPlantillaSeguimiento } from '../webhook/whatsapp'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function auth(req: NextRequest): boolean {
  const t = req.nextUrl.searchParams.get('t')
  return t === 'chap2026'
}

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

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!auth(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = getSupabase()

  const dias = Number(req.nextUrl.searchParams.get('dias') ?? '30')
  const haceDias = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString()

  const { data: llamadas } = await db
    .from('llamadas_rescatadas')
    .select('id, telefono, lead_id')
    .eq('seguimiento', 'Pendiente')
    .lt('creado_en', haceDias)

  if (!llamadas?.length) {
    return NextResponse.json({ ok: true, detalle: 'No hay llamadas pendientes viejas que procesar.' })
  }

  let enviados = 0
  let omitidos = 0
  let errores = 0
  const detalle: string[] = []

  await conLimite(llamadas, 5, async (llamada) => {
    const { data: lead } = await db
      .from('leads')
      .select('id, nombre, estado')
      .eq('telefono', llamada.telefono)
      .maybeSingle()

    // Nunca recontactar a quien ya dijo que no, o pidió no ser contactado.
    if (!lead || lead.estado === 'No Interesado' || lead.estado === 'No Contactar' || lead.estado === 'Cita Agendada') {
      omitidos++
      return
    }

    try {
      const nombre = (lead.nombre || '').split(' ')[0] || 'que tal'
      const ok = await enviarPlantillaSeguimiento(llamada.telefono, 'seguimiento_48h', nombre)

      if (ok) {
        await db.from('interacciones').insert({
          lead_id: lead.id,
          tipo: 'Mensaje Saliente Bot',
          contenido: '[PLANTILLA seguimiento_48h] reenganche manual — llamada vieja sin seguimiento',
          metadata: { reenganche_masivo: true, fecha: '2026-08-31' },
        })
        enviados++
      } else {
        await db.from('interacciones').insert({
          lead_id: lead.id,
          tipo: 'Nota Manual',
          contenido: '[NO ENTREGADO] Meta rechazó la plantilla de reenganche masivo',
          metadata: { reenganche_masivo: true },
        })
        errores++
      }

      // Se marca 'Contactado' se haya logrado entregar o no — ya se intentó,
      // no queda como 'Pendiente' esperando un segundo intento automático.
      await db.from('llamadas_rescatadas').update({ seguimiento: 'Contactado' }).eq('id', llamada.id)
      detalle.push(`${llamada.telefono}: ${ok ? 'OK' : 'ERROR'}`)
    } catch (e) {
      errores++
      detalle.push(`${llamada.telefono}: EXCEPCION ${e instanceof Error ? e.message : String(e)}`)
    }
  })

  return NextResponse.json({ ok: true, enviados, omitidos, errores, total: llamadas.length, detalle })
}
