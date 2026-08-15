// Configuración estática del Penthouse Parque Chapultepec

const CDN = 'https://chapultepec-fotos.vercel.app'

export const FOTOS_PH: { url: string; caption: string }[] = [
  { url: `${CDN}/ph-rooftop-hero.jpg`, caption: 'Roof Garden 86 m² · Pérgola de parota · Vista panorámica de Cuernavaca' },
  { url: `${CDN}/ph-rooftop-asador.jpg`, caption: 'Asador BBQ · Sala exterior · Vista a la sierra de Morelos' },
  { url: `${CDN}/ph-alberca-jardin.jpg`, caption: 'Alberca climatizada · Jardín tropical · Seguridad 24/7' },
  { url: `${CDN}/ph-sala-render.jpg`, caption: 'Sala-comedor · Ventanal panorámico · Madera de parota' },
  { url: `${CDN}/ph-cocina-render.jpg`, caption: 'Cocina abierta con isla de granito · Ventana panorámica' },
]

export const FICHA_TECNICA = `*Penthouse Parque Chapultepec*

$4,500,000 MXN
336.83 m² de construcción
Rooftop privado de 85 m² con pérgola de parota y asador BBQ
3 recámaras · 3.5 baños
Elevador directo al penthouse
Cocina abierta con isla de granito
Baños spa con travertino italiano
2 cajones de estacionamiento + 2 bodegas

Amenidades del desarrollo:
Alberca climatizada · Jardín tropical · Seguridad 24/7 con cámaras
A 50 metros del Parque Chapultepec · 1.5 horas de CDMX

Bajada de Chapultepec 18-A, Col. Chapultepec, Cuernavaca, Morelos`

export const FICHA_DEPTO = `*Departamento Parque Chapultepec*
Nueva unidad disponible

$2,900,000 MXN
100 m² de construcción
2 recámaras · 2 baños
Balcón privado
1 cajón de estacionamiento

Amenidades del desarrollo:
Alberca climatizada · Jardín tropical · Seguridad 24/7 con cámaras
A 50 metros del Parque Chapultepec · 1.5 horas de CDMX

Bajada de Chapultepec 18-A, Col. Chapultepec, Cuernavaca, Morelos`

// El departamento solo tenía fotos de cuartos vacíos, sin muebles. Vender una
// unidad de $2,900,000 con eso resta muchísimo, y se notaba: cero leads habían
// registrado interés en el departamento. Ahora son tarjetas con el mismo
// tratamiento editorial que las del penthouse (precio, metros y recámaras
// sobre la foto), para que el producto accesible no se vea de segunda.
export const FOTOS_DEPTO: { url: string; caption: string }[] = [
  { url: `${CDN}/refresh/depto-card-sala.jpg`, caption: 'Departamento $2,900,000 · 100 m², 2 recámaras, 2 baños' },
  { url: `${CDN}/refresh/depto-card-cocina.jpg`, caption: 'Cocina con isla y granito · Personalizas antes de entregar' },
  { url: `${CDN}/refresh/depto-card-balcon.jpg`, caption: 'Balcón privado · A 50 m del Parque Chapultepec' },
]

// ── PRIMER CONTACTO ─────────────────────────────────────────────────────────
// Antes el primer contacto eran DIEZ mensajes seguidos: ficha del penthouse,
// 5 fotos, ficha del departamento, 3 fotos y la oferta de cita. Eso satura al
// lead, se siente automatizado y es la clase de avalancha que hace que la
// gente bloquee el número. Ahora es UN texto corto con las dos propiedades y
// cuatro fotos: cinco envíos en vez de diez.

export const FICHA_AMBAS = `*Parque Chapultepec* · Cuernavaca

*PENTHOUSE* — $4,500,000 MXN
235 m² · 3 recámaras · 3.5 baños
Rooftop privado de 86 m² con asador

*DEPARTAMENTO* — $2,900,000 MXN
100 m² · 2 recámaras · 2 baños · Balcón

Alberca climatizada, jardín tropical y seguridad 24/7. A 50 m del Parque Chapultepec, 1.5 h de CDMX.
Bajada de Chapultepec 18-A, Col. Chapultepec.

¿Cuál te interesa? Con gusto te agendo una visita.`

// Piezas diseñadas para chat (1080x1080, texto grande legible en miniatura).
// Se rehicieron sin el teléfono impreso: las originales traían el 777 175 8412,
// que NO es el número del bot y mandaba al cliente al canal desconectado.
// Usan fotos distintas a las que salen publicadas en redes, para que quien nos
// escribe no reciba exactamente lo mismo que ya vio en el feed.
const REFRESH = `${CDN}/refresh`

export const FOTOS_PRIMER_CONTACTO: { url: string; caption: string }[] = [
  { url: `${REFRESH}/wa-01-roof-garden.jpg`, caption: 'Penthouse · Roof garden privado de 86 m² con vista al valle' },
  { url: `${REFRESH}/wa-02-interiores.jpg`, caption: 'Acabados de primera · Travertino, latón y madera' },
  { url: `${REFRESH}/depto-card-sala.jpg`, caption: 'Departamento $2,900,000 · 100 m², 2 recámaras, 2 baños, balcón' },
  { url: `${REFRESH}/wa-05-amenidades.jpg`, caption: 'Alberca climatizada, jardín tropical y seguridad 24/7' },
]

// Set completo de piezas de chat, para reenvíos y envíos manuales.
export const FOTOS_CHAT: { url: string; caption: string }[] = [
  { url: `${REFRESH}/wa-01-roof-garden.jpg`, caption: 'Roof garden privado de 86 m²' },
  { url: `${REFRESH}/wa-02-interiores.jpg`, caption: 'Acabados de primera, listos hoy' },
  { url: `${REFRESH}/wa-03-ubicacion.jpg`, caption: 'A 50 metros del Parque Chapultepec' },
  { url: `${REFRESH}/wa-04-inversion.jpg`, caption: 'Zona consolidada, plusvalía comprobada' },
  { url: `${REFRESH}/wa-05-amenidades.jpg`, caption: 'Elevador privado, alberca propia y bodegas' },
]

// Fichas técnicas en PDF, listas para mandar como adjunto por WhatsApp.
export const FICHAS_PDF = {
  Penthouse:    { url: `${CDN}/fichas/ficha-penthouse.pdf`,    archivo: 'Ficha Penthouse - Parque Chapultepec.pdf' },
  Departamento: { url: `${CDN}/fichas/ficha-departamento.pdf`, archivo: 'Ficha Departamento - Parque Chapultepec.pdf' },
} as const

export const OFERTA_CITA = `¿Te gustaría agendar una visita al desarrollo? Responde con la palabra *VISITA* o marca al 777 175 84 12.

parquechapultepecmorelos.com | Instagram: @pchapultepec`

export const CONFIRMAR_CITA = `¡Visita confirmada!

Te esperamos en:
Bajada de Chapultepec 18-A
Col. Chapultepec, Cuernavaca, Morelos

777 175 84 12`

export const RECORDATORIO_CITA = 'Tienes tu visita agendada al Penthouse Parque Chapultepec. Bajada de Chapultepec 18-A, Cuernavaca. 777 175 84 12. ¿Necesitas cambiar el horario?'

export const NUMERO_PRUEBAS = '527774921176'

export const WHATSAPP_LINK = 'wa.me/5217772408027?text=Hola,%20quiero%20información%20del%20Penthouse'

export const TEXTO_PRELLENADO = 'Hola, quiero información del Penthouse'

export const BLOQUEADOS = new Set([
  '527771568706', // Zamir Zaguet — bloqueado permanentemente
])

export const PENTHOUSE_INFO = {
  precio: '$4,500,000 MXN',
  construccion: '336.83 m²',
  roofgarden: '86 m²',
  recamaras: 3,
  banos: 3.5,
  ubicacion: 'Bajada de Chapultepec 18-A, Col. Chapultepec, Cuernavaca, Morelos',
  distancia_parque: '50m del Parque Chapultepec',
  distancia_cdmx: '1.5h de CDMX',
  telefono: '777 175 84 12',
  instagram: '@pchapultepec',
  web: 'parquechapultepecmorelos.com',
} as const
