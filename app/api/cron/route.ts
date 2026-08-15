import { NextResponse } from 'next/server'
import { ejecutarCicloDrip, ejecutarRecordatoriosCita } from '../../../lib/drip'
import { publicarDiario } from '../../../lib/buffer'

export const dynamic = 'force-dynamic'

export async function GET(req: Request): Promise<NextResponse> {
  const auth = req.headers.get('authorization')
  const isVercelCron = auth === `Bearer ${process.env.CRON_SECRET}`
  const isManual = new URL(req.url).searchParams.get('t') === 'chap2026'

  if (!isVercelCron && !isManual) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const resultado: Record<string, unknown> = { ts: new Date().toISOString() }

  // Drip siempre se ejecuta
  try {
    resultado.drip = await ejecutarCicloDrip()
  } catch (e) {
    resultado.drip = { error: String(e) }
  }

  // Recordatorios de cita 24h/2h — ver nota de frecuencia en lib/drip.ts:
  // con este cron diario, el de 24h sí alcanza a dispararse; el de 2h
  // necesita un disparador más frecuente para funcionar de verdad.
  try {
    resultado.recordatorios = await ejecutarRecordatoriosCita()
  } catch (e) {
    resultado.recordatorios = { error: String(e) }
  }

  // Buffer: publica diario (cron corre 1x al día a las 7AM MX)
  try {
    resultado.buffer = await publicarDiario()
  } catch (e) {
    resultado.buffer = { error: String(e) }
  }

  return NextResponse.json(resultado)
}
