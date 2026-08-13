// Resultado de la llamada desviada del 175 (action del <Dial> en /voice).
// Si Carlos no contestó (DialCallStatus distinto de "completed"), se dispara
// el mismo flujo de "Llamada Rescatada" que ya existe en el CRM — ficha,
// fotos y registro del lead — sin que nadie copie ni pegue nada.

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const form = await req.formData()
  const dialCallStatus = form.get('DialCallStatus')?.toString() ?? ''
  const from = form.get('From')?.toString() ?? ''

  console.log(`[Twilio] DialCallStatus=${dialCallStatus} from=${from}`)

  if (dialCallStatus !== 'completed' && from) {
    const digitos = from.replace(/\D/g, '')
    const telWA = digitos.startsWith('52') ? digitos : `52${digitos}`

    try {
      const base = new URL(req.url).origin
      await fetch(`${base}/api/leads?t=chap2026`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono: telWA }),
      })
    } catch (e) {
      console.error('[Twilio] Error disparando llamada rescatada:', e)
    }
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="es-MX">Gracias por llamar a Parque Chapultepec. Te acabamos de enviar la información por WhatsApp.</Say>
</Response>`

  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
}
