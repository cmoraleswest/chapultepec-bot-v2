// Envío de mensajes via WhatsApp Cloud API oficial de Meta
// Soporta múltiples números (8027 y 175) sobre el mismo WABA — el que
// contesta es el mismo por el que entró el mensaje (ver phoneNumberId).

const API_VERSION = 'v25.0'

function getUrl(phoneNumberId?: string): string {
  const id = phoneNumberId || process.env.WHATSAPP_PHONE_ID
  return `https://graph.facebook.com/${API_VERSION}/${id}/messages`
}

function getHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

export async function enviarTexto(to: string, text: string, phoneNumberId?: string): Promise<boolean> {
  const res = await fetch(getUrl(phoneNumberId), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  })

  const data = await res.text()
  if (!res.ok) {
    console.error(`[WA] Error enviando texto a ${to}: ${data}`)
    return false
  }
  console.log(`[WA] Texto enviado a ${to} OK`)
  return true
}

const CDN_FOTOS = 'https://chapultepec-fotos.vercel.app'

// Primer contacto con alguien que NUNCA nos ha escrito. Solo puede salir una
// plantilla aprobada: la ventana de 24 h únicamente la abre el cliente.
// Se intenta primero `info_ambas_propiedades` — trae foto y las DOS unidades,
// que es lo que Carlos necesita — y si Meta aún no la aprueba se cae a la
// vieja `info_penthouse_chapultepec`, que solo habla del penthouse.
export async function enviarPlantilla(to: string, phoneNumberId?: string): Promise<boolean> {
  const conFoto = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: 'info_ambas_propiedades',
      language: { code: 'es_MX' },
      components: [
        { type: 'header', parameters: [{ type: 'image', image: { link: `${CDN_FOTOS}/ph-rooftop-hero.jpg` } }] },
      ],
    },
  }

  const res = await fetch(getUrl(phoneNumberId), {
    method: 'POST', headers: getHeaders(), body: JSON.stringify(conFoto),
  })
  if (res.ok) {
    console.log(`[WA] Plantilla info_ambas_propiedades enviada a ${to} OK`)
    return true
  }
  console.warn(`[WA] info_ambas_propiedades no disponible (${await res.text()}) — uso la de respaldo`)

  const resFallback = await fetch(getUrl(phoneNumberId), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: 'info_penthouse_chapultepec', language: { code: 'es_MX' } },
    }),
  })
  if (!resFallback.ok) {
    console.error(`[WA] Error enviando plantilla a ${to}: ${await resFallback.text()}`)
    return false
  }
  console.log(`[WA] Plantilla de respaldo enviada a ${to} OK`)
  return true
}

// ── AVISO A CARLOS ──────────────────────────────────────────────────────────
// Las alertas al asesor se mandaban como texto libre. WhatsApp solo permite
// texto libre a quien te escribió en las últimas 24 horas, y Carlos casi nunca
// le escribe al bot — así que la ventana estaba cerrada y TODAS las alertas se
// caían sin que nadie se enterara. Por eso nunca sabía que un lead preguntaba
// algo o quería una cita.
// Ahora: se intenta el texto libre (más completo si la ventana está abierta) y
// si Meta lo rechaza, se manda la plantilla de utilidad `alerta_lead_asesor`,
// que sí puede entregarse fuera de la ventana.
const TEL_CARLOS = '527774921176'

export async function alertarCarlos(resumen: string, lead: string, mensaje: string): Promise<void> {
  const okLibre = await enviarTexto(TEL_CARLOS, resumen)
  if (okLibre) return

  const res = await fetch(getUrl(), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: TEL_CARLOS,
      type: 'template',
      template: {
        name: 'alerta_lead_asesor',
        language: { code: 'es_MX' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: lead.slice(0, 60) },
              { type: 'text', text: (mensaje || 'sin texto').replace(/\s+/g, ' ').slice(0, 200) },
            ],
          },
        ],
      },
    }),
  })
  if (!res.ok) console.error(`[WA] No se pudo alertar a Carlos: ${await res.text()}`)
}

// Envía una plantilla aprobada con un parámetro (el nombre del lead).
// Es la ÚNICA forma de escribirle a alguien que lleva más de 24 h sin
// contestar — el texto libre lo rechaza WhatsApp con el error 131047.
export async function enviarPlantillaSeguimiento(to: string, plantilla: string, nombre: string): Promise<boolean> {
  const res = await fetch(getUrl(), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: plantilla,
        language: { code: 'es_MX' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: nombre.slice(0, 40) }] }],
      },
    }),
  })
  if (!res.ok) {
    console.error(`[WA] Plantilla ${plantilla} rechazada para ${to}: ${await res.text()}`)
    return false
  }
  return true
}

// Las 4 plantillas de venta que un humano puede elegir a mano en el CRM
// cuando la ventana de 24 h ya cerró. info_ambas_propiedades no lleva
// parámetro de cuerpo (solo la imagen del header) — mandarle el nombre como
// {{1}} como a las otras tres haría que Meta la rechace por número de
// parámetros incorrecto.
export const PLANTILLAS_CRM = ['info_ambas_propiedades', 'seguimiento_24h', 'seguimiento_48h', 'cierre_7dias'] as const
export type PlantillaCRM = (typeof PLANTILLAS_CRM)[number]

export async function enviarPlantillaElegida(to: string, plantilla: PlantillaCRM, nombre: string): Promise<boolean> {
  if (plantilla === 'info_ambas_propiedades') return enviarPlantilla(to)
  return enviarPlantillaSeguimiento(to, plantilla, nombre)
}

// Manda la ficha técnica como PDF adjunto. Un PDF el cliente lo guarda, lo
// abre en su computadora y se lo enseña a su pareja — cosa que una foto suelta
// en el chat no logra. Es la pieza que cierra ventas en inmuebles.
export async function enviarDocumento(
  to: string,
  url: string,
  nombreArchivo: string,
  caption?: string,
  phoneNumberId?: string
): Promise<boolean> {
  const res = await fetch(getUrl(phoneNumberId), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'document',
      document: { link: url, filename: nombreArchivo, caption: caption ?? '' },
    }),
  })
  if (!res.ok) {
    console.error(`[WA] Error enviando documento a ${to}: ${await res.text()}`)
    return false
  }
  console.log(`[WA] Ficha ${nombreArchivo} enviada a ${to} OK`)
  return true
}

export async function enviarImagen(to: string, imageUrl: string, caption?: string, phoneNumberId?: string): Promise<boolean> {
  const res = await fetch(getUrl(phoneNumberId), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: { link: imageUrl, caption: caption ?? '' },
    }),
  })

  const data = await res.text()
  if (!res.ok) {
    console.error(`[WA] Error enviando imagen a ${to}: ${data}`)
    return false
  }
  console.log(`[WA] Imagen enviada a ${to} OK`)
  return true
}
