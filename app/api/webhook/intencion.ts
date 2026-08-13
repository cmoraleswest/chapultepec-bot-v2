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

const INSTRUCCIONES = `Clasificas mensajes de WhatsApp que le llegan a Ana, asesora inmobiliaria de Parque Chapultepec (Cuernavaca). Hay dos propiedades: un PENTHOUSE de $4,500,000 y un DEPARTAMENTO de $2,800,000. Los leads escriben en español mexicano informal, con errores de dedo, sin acentos, y usan "depa" tanto como "departamento".

Clasifica el mensaje en una intención:
- INSULTO: insulta, agrede o usa groserías dirigidas a la asesora o la empresa. NO es insulto quejarse del precio o decir que no le interesa.
- RECHAZO: rechaza inequívocamente seguir la conversación — "no me interesa", "no gracias", "está muy caro", "no me alcanza", "lo voy a pensar" (como forma de cerrar la plática), "no tengo presupuesto para eso".
- PIDE_FOTOS: pide ver fotos, imágenes o más material visual explícitamente.
- AGENDA_CITA: quiere agendar, propone o confirma día/hora para visitar, o pregunta por disponibilidad de días — el momento en que ya está listo para pasar a coordinar una visita con un humano.
- CONVERSACION: cualquier otra cosa — preguntas, información, saludo, plática normal.

Y detecta a qué propiedad se refiere, si alguna:
- "Penthouse": menciona claramente el penthouse (o "PH").
- "Departamento": menciona claramente el departamento / depa / depto / la de 2.8 millones.
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
