// Webhook de voz de Twilio para el 777 175 8412 desviado.
// Twilio llama aquí cuando entra una llamada. Intentamos comunicarla con
// Carlos por 25s; si no contesta, ocupado o falla, el resultado se procesa
// en /api/twilio/status (action del <Dial>) para mandar el paquete por WA.

import { NextRequest, NextResponse } from 'next/server'
import { NUMERO_PRUEBAS } from '../../webhook/config'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const base = new URL(req.url).origin
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="25" action="${base}/api/twilio/status" method="POST">
    <Number>+${NUMERO_PRUEBAS}</Number>
  </Dial>
</Response>`

  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } })
}
