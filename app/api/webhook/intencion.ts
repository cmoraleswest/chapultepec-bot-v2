// Clasificación de intención y propiedad de interés del mensaje entrante.
//
// Antes esto era una lista de regex (INSULTO, RECHAZO, PIDE_FOTOS, MENCIONA_DEPTO...).
// Cada semana aparecía un caso real que el patrón no cubría — "depa" en vez de
// "depto", "asco" adentro de "mascotas", "no le llegamos al precio" sin ninguna
// palabra de la lista de rechazo — porque el español hablado tiene demasiadas
// formas de decir lo mismo para enumerarlas a mano. Se reemplazó por una sola
// llamada a Claude que clasifica con lenguaje natural, la misma tecnología que
// ya genera las respuestas de Ana. Esto no es una lista más larga, es quitar
// la lista.

import Anthropic from '@anthropic-ai/sdk'

export type Intencion =
  | 'INSULTO'
  | 'RECHAZO'
  | 'PIDE_FOTOS'
  | 'AGENDA_CITA'
  | 'CONVERSACION'

export type PropiedadInteres = 'Penthouse' | 'Departamento'

export interface Clasificacion {
  intencion: Intencion
  propiedad: PropiedadInteres | null
}

const INSTRUCCIONES = `Clasificas mensajes de WhatsApp que le llegan a Ana, asesora inmobiliaria de Parque Chapultepec (Cuernavaca). Hay dos propiedades: un PENTHOUSE de $4,500,000 y un DEPARTAMENTO de $3,000,000. Los leads escriben en español mexicano informal, con errores de dedo, sin acentos, y usan "depa" tanto como "departamento".

Clasifica el mensaje en una intención:
- INSULTO: insulta, agrede o usa groserías dirigidas a la asesora o la empresa. NO es insulto quejarse del precio o decir que no le interesa.
- RECHAZO: rechaza inequívocamente seguir la conversación — "no me interesa", "no gracias", "está muy caro", "no me alcanza", "lo voy a pensar" (como forma de cerrar la plática), "no tengo presupuesto para eso". Si dice que no quiere COMPRAR pero busca algo en RENTA, eso NO es RECHAZO — es CONVERSACION, porque Ana todavía le puede contestar sobre esa opción.
- PIDE_FOTOS: pide ver fotos, imágenes o más material visual explícitamente.
- AGENDA_CITA: quiere agendar, propone o confirma día/hora para visitar, o pregunta por disponibilidad de días — el momento en que ya está listo para pasar a coordinar una visita con un humano.
- CONVERSACION: cualquier otra cosa — preguntas, información, saludo, plática normal.

Y detecta a qué propiedad se refiere, si alguna:
- "Penthouse": menciona claramente el penthouse (o "PH").
- "Departamento": menciona claramente el departamento / depa / depto / la de 2.9 millones.
- null: no se puede saber, menciona ambas por igual, o no aplica.

Responde solo con la herramienta clasificar.`

const HERRAMIENTA: Anthropic.Tool = {
  name: 'clasificar',
  description: 'Clasifica la intención del mensaje y la propiedad de interés mencionada.',
  input_schema: {
    type: 'object',
    properties: {
      intencion: {
        type: 'string',
        enum: ['INSULTO', 'RECHAZO', 'PIDE_FOTOS', 'AGENDA_CITA', 'CONVERSACION'],
      },
      propiedad: {
        type: 'string',
        enum: ['Penthouse', 'Departamento', 'Ninguna'],
      },
    },
    required: ['intencion', 'propiedad'],
  },
}

let cliente: Anthropic | null = null

function getCliente(): Anthropic {
  if (!cliente) {
    cliente = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  }
  return cliente
}

// Si Claude falla (API caída, clave vencida, límite de tasa), degradar a
// CONVERSACION en vez de tumbar el mensaje — el lead sigue recibiendo
// respuesta por la ruta normal, solo se pierde el atajo de intención.
export async function clasificarMensaje(texto: string): Promise<Clasificacion> {
  try {
    const resp = await getCliente().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      system: INSTRUCCIONES,
      messages: [{ role: 'user', content: texto }],
      tools: [HERRAMIENTA],
      tool_choice: { type: 'tool', name: 'clasificar' },
    })

    const bloque = resp.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    const input = bloque?.input as { intencion?: string; propiedad?: string } | undefined

    const intencion: Intencion =
      input?.intencion === 'INSULTO' ||
      input?.intencion === 'RECHAZO' ||
      input?.intencion === 'PIDE_FOTOS' ||
      input?.intencion === 'AGENDA_CITA'
        ? input.intencion
        : 'CONVERSACION'

    const propiedad: PropiedadInteres | null =
      input?.propiedad === 'Penthouse' || input?.propiedad === 'Departamento' ? input.propiedad : null

    return { intencion, propiedad }
  } catch (e) {
    console.error('[Intención] Clasificación con Claude falló, degradando a CONVERSACION:', e)
    return { intencion: 'CONVERSACION', propiedad: null }
  }
}

// ── Extracción de fecha de cita ──────────────────────────────────────────────
// Cuando la intención es AGENDA_CITA, el cliente ya dijo o confirmó un día y
// hora, pero hasta ahora eso se quedaba solo como texto en la conversación —
// nadie lo guardaba en fecha_cita ni movía al lead a "Cita Agendada". Con 0
// citas agendadas en 23 conversaciones (ver claude.ts), una causa real era
// que aunque Ana cerraba bien, nada capturaba automáticamente lo que se
// acordó. Esta función lee el mensaje del cliente y, solo si confirma un día
// Y una hora concretos, regresa la fecha exacta en hora de Ciudad de México.

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MX_OFFSET_MS = 6 * 60 * 60 * 1000 // México es UTC-6 fijo, sin horario de verano desde 2022

const HERRAMIENTA_CITA: Anthropic.Tool = {
  name: 'extraer_cita',
  description: 'Extrae la fecha y hora exactas de una visita, solo si el cliente ya las confirmó de forma concreta.',
  input_schema: {
    type: 'object',
    properties: {
      fecha_hora: {
        type: 'string',
        description:
          'Fecha y hora en formato "YYYY-MM-DD HH:MM" (24 horas, hora de Ciudad de México). Cadena vacía "" si el mensaje no confirma un día Y una hora concretos.',
      },
    },
    required: ['fecha_hora'],
  },
}

export async function extraerFechaCita(texto: string): Promise<string | null> {
  const ahoraMx = new Date(Date.now() - MX_OFFSET_MS)
  const hoyStr = ahoraMx.toISOString().slice(0, 10)
  const diaSemana = DIAS_SEMANA[ahoraMx.getUTCDay()]

  const instrucciones = `Hoy es ${diaSemana} ${hoyStr}, hora de Ciudad de México. Un cliente de una inmobiliaria escribió sobre agendar una visita. Si confirma un día Y una hora concretos (aunque sea relativo, como "el jueves a las 5" o "mañana a mediodía" o "sábado a las 11"), calcula la fecha exacta (el próximo día de la semana que corresponda si no da fecha exacta) y responde con la herramienta extraer_cita. Si falta el día, falta la hora, o es vago ("cualquier día", "en la semana", "lo voy a pensar"), responde con fecha_hora vacía.`

  try {
    const resp = await getCliente().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      system: instrucciones,
      messages: [{ role: 'user', content: texto }],
      tools: [HERRAMIENTA_CITA],
      tool_choice: { type: 'tool', name: 'extraer_cita' },
    })

    const bloque = resp.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    const raw = (bloque?.input as { fecha_hora?: string } | undefined)?.fecha_hora?.trim()
    if (!raw) return null

    const [fecha, hora] = raw.split(' ')
    if (!fecha || !hora) return null

    const d = new Date(`${fecha}T${hora}:00-06:00`)
    return isNaN(d.getTime()) ? null : d.toISOString()
  } catch (e) {
    console.error('[Cita] Extracción de fecha falló:', e)
    return null
  }
}
