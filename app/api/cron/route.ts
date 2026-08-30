import { NextResponse } from 'next/server'
import { ejecutarCicloDrip, ejecutarRecordatoriosCita } from '../../../lib/drip'
import { publicarDiario } from '../../../lib/buffer'

export const dynamic = 'force-dynamic'
// Esta ruta corre TRES procesos pesados en secuencia: drip sobre todos los
// leads activos, recordatorios de cita, y publicación en 3 redes (con una
// llamada a Claude para el caption). Sin esto, Vercel la corta al límite por
// defecto (10s en Hobby) a la mitad de la ejecución, sin lanzar ningún error
// visible — el cron se ve "terminado" en el log pero solo alcanzó a procesar
// una parte de los leads. 60s es el máximo permitido en el plan Hobby.
export const maxDuration = 60

export async function GET(req: Request): Promise<NextResponse> {
  // Dos formas válidas de autenticarse: el cron nativo de Vercel manda el
  // header Authorization con CRON_SECRET, que no controlamos nosotros. Para
  // un disparador externo (cron-job.org, para el recordatorio de 2h que el
  // cron diario de Vercel no alcanza a cubrir) hace falta un secreto que sí
  // se pueda pegar en una URL — antes eso era ?t=chap2026, el mismo token
  // hardcodeado y compartido que usan leads/route.ts y reporte/route.ts.
  // Cualquiera que haya visto ese token en el repo podía disparar el cron.
  // Ahora es su propio secreto, ?secret=, contra su propia variable de
  // entorno, para poder rotarlo sin tocar el resto del sistema.
  const auth = req.headers.get('authorization')
  const isVercelCron = auth === `Bearer ${process.env.CRON_SECRET}`

  const secretParam = new URL(req.url).searchParams.get('secret')
  const tokenEsperado = process.env.CRON_SECRET_TOKEN
  const isSecretToken = !!secretParam && !!tokenEsperado && secretParam === tokenEsperado

  if (!isVercelCron && !isSecretToken) {
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
