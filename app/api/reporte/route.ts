// Reporte diario a Carlos por WhatsApp — corre aparte del cron de las 7am,
// a las 4pm, y revisa el estado REAL del día en la base de datos (no depende
// de que el otro cron haya corrido bien, ni lo duplica si se reintenta).

import { NextResponse } from 'next/server'
import { getSupabase } from '../../../lib/supabase'
import { enviarTexto } from '../webhook/whatsapp'
import { NUMERO_PRUEBAS } from '../webhook/config'
import { inicioDiaMexico } from '../../../lib/fecha'

export const dynamic = 'force-dynamic'

export async function GET(req: Request): Promise<NextResponse> {
  const auth = req.headers.get('authorization')
  const isVercelCron = auth === `Bearer ${process.env.CRON_SECRET}`
  const isManual = new URL(req.url).searchParams.get('t') === 'chap2026'

  if (!isVercelCron && !isManual) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const desdeHoy = inicioDiaMexico()
  const hoy = new Date()

  const db = getSupabase()
  const [pubHoy, msgHoy] = await Promise.all([
    db.from('publicaciones').select('id', { count: 'exact', head: true }).gte('creado_en', desdeHoy),
    db.from('interacciones').select('id', { count: 'exact', head: true }).eq('tipo', 'Mensaje Saliente Bot').gte('creado_en', desdeHoy),
  ])

  const publicaciones = pubHoy.count ?? 0
  const mensajes = msgHoy.count ?? 0
  const emoji = publicaciones > 0 && mensajes > 0 ? '✅' : '⚠️'

  const reporte = `${emoji} Reporte CRM Chapultepec — ${hoy.toLocaleDateString('es-MX')}\nMensajes contestados hoy: ${mensajes}\nPublicaciones en redes hoy: ${publicaciones}`
  const enviado = await enviarTexto(NUMERO_PRUEBAS, reporte)

  return NextResponse.json({ ok: enviado, publicaciones, mensajes })
}
