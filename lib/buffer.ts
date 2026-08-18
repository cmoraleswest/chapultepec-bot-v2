import Anthropic from '@anthropic-ai/sdk'
import { getSupabase } from './supabase'

const IG = '6a200357c687a22dd456797f'
const TT = '6a28eb5f8f1d11f9b26e3fa2'
const FB = '6a28eeba8f1d11f9b26e4763'
const CDN = 'https://chapultepec-fotos.vercel.app'

type PropiedadKey = 'penthouse' | 'departamento'

// ── PIEZAS DE DISEÑO (refresh ago-2026) ──────────────────────────────────────
// Cada tema tiene su versión en el formato correcto de cada red: cuadrado para
// Instagram, horizontal para Facebook y vertical para TikTok. Publicar la misma
// imagen cuadrada en las tres recortaba el texto y se veía descuidado.
// La propiedad que se promociona va amarrada al tema para que la imagen y el
// texto hablen de lo mismo.
//
// ── PIEZAS DE FOTO REAL (galeria, ago-2026) ──────────────────────────────────
// Publicar solo piezas diseñadas se repetía cada 5 días y no dejaba ver nada
// "real" — en inmobiliaria de lujo la foto auténtica (sin texto encima) genera
// más confianza que un anuncio evidente, y rompe el patrón de feed. Estas usan
// UNA sola foto de galeria/ para las tres redes (no hay recorte por formato,
// es foto cruda) y el ángulo del texto es el que cambia: mitad estilo de vida,
// mitad números duros de inversión (plusvalía, rendimiento por renta, retorno)
// — variedad de imagen Y de mensaje, no solo repetir el mismo gancho bonito.
const PIEZAS: { slug: string; tema: string; propiedad: PropiedadKey; fuente: 'diseno' | 'foto'; foto?: string }[] = [
  { slug: '01-roof-garden', tema: 'Roof garden privado de 86 m² con vista al valle de Cuernavaca', propiedad: 'penthouse', fuente: 'diseno' },
  { slug: '02-interiores',  tema: 'Interiores — sala-comedor con ventanal panorámico y acabados de lujo', propiedad: 'penthouse', fuente: 'diseno' },
  { slug: '03-ubicacion',   tema: 'Ubicación privilegiada — a 50 m del Parque Chapultepec, 1.5 h de CDMX', propiedad: 'departamento', fuente: 'diseno' },
  { slug: '04-inversion',   tema: 'Oportunidad de inversión — zona consolidada y plusvalía comprobada', propiedad: 'departamento', fuente: 'diseno' },
  { slug: '05-amenidades',  tema: 'Amenidades — alberca climatizada, jardín tropical y seguridad 24/7', propiedad: 'penthouse', fuente: 'diseno' },
  { slug: 'foto-plusvalia',    tema: 'Plusvalía comprobada — Parque Chapultepec ha subido de valor año con año, comprar aquí es asegurar patrimonio, no solo un lugar para vivir', propiedad: 'departamento', fuente: 'foto', foto: 'foto-exterior.jpg' },
  { slug: 'foto-rendimiento',  tema: 'Rendimiento por renta — con la demanda de Airbnb en Cuernavaca, un Penthouse de este nivel genera flujo mensual atractivo para quien busca invertir, no solo habitar', propiedad: 'penthouse', fuente: 'foto', foto: 'ph-alberca-real.jpg' },
  { slug: 'foto-retorno',      tema: 'Retorno de inversión — comparado con instrumentos financieros tradicionales, bienes raíces en zona consolidada da plusvalía y renta al mismo tiempo, un activo que trabaja para ti', propiedad: 'penthouse', fuente: 'foto', foto: 'ph-rooftop-hero.jpg' },
  { slug: 'foto-comparativo',  tema: 'Lo que rinde tu dinero aquí — lo que en CDMX alcanza para un departamento chico, en Cuernavaca a hora y media alcanza para esto, con plusvalía en zona en crecimiento', propiedad: 'departamento', fuente: 'foto', foto: 'depto-fachada.jpg' },
  { slug: 'foto-comparacion',  tema: 'Compara y decide — Penthouse o Departamento, mismo desarrollo, dos formas de invertir en Parque Chapultepec', propiedad: 'departamento', fuente: 'foto', foto: 'comparativa.jpg' },
  { slug: 'foto-lifestyle',    tema: 'Vida real en el Penthouse — tardes de asador en el rooftop, la razón por la que la gente compra aquí y no solo invierte', propiedad: 'penthouse', fuente: 'foto', foto: 'ph-rooftop-asador.jpg' },
]

// Formato nativo de cada red. TikTok usa el vertical de stories.
const FORMATO: Record<string, string> = {
  instagram: 'instagram-feed',
  facebook: 'facebook',
  tiktok: 'instagram-stories',
}

// Piezas "diseno" tienen recorte por red; piezas "foto" son crudas, misma URL
// para las tres — perder el recorte por formato es aceptable a cambio de que
// la foto se vea auténtica y no como un anuncio.
const imagenDe = (red: string, pieza: { slug: string; fuente: 'diseno' | 'foto'; foto?: string }) =>
  pieza.fuente === 'foto' ? `${CDN}/galeria/${pieza.foto}` : `${CDN}/refresh/${FORMATO[red]}-${pieza.slug}.jpg`

// Ambas propiedades se promocionan por igual — el rotador alterna día por
// medio entre las dos en vez de solo publicar del penthouse.
const PROPIEDADES: Record<PropiedadKey, {
  nombre: string
  specs: string
  whatsappTexto: string
  temas: string[]
  fotos: string[]
}> = {
  penthouse: {
    nombre: 'Penthouse Parque Chapultepec',
    specs: 'Penthouse $4,500,000 MXN, 336m² de construcción, rooftop privado 86m² con pérgola de parota y asador, 3 recámaras, 3.5 baños, Bajada de Chapultepec 18-A, Cuernavaca',
    whatsappTexto: 'Hola, quiero información del Penthouse',
    temas: [
      'Exclusividad y valor de reventa',
      'Vida en el rooftop — atardecer, Cuernavaca desde arriba',
      'Inversión desde CDMX — segunda casa, plusvalía, escape del caos',
      'Amenidades — alberca climatizada, jardín tropical, seguridad 24/7',
      'Ubicación privilegiada — 50m del Parque Chapultepec, 1.5h de CDMX',
      'Arquitectura de lujo — travertino, herrería negra, ventanales panorámicos',
      'Roofgarden privado 86m² — pérgola de parota, asador, vista panorámica',
    ],
    fotos: [
      'ph-rooftop-hero.jpg',
      'ph-rooftop-asador.jpg',
      'ph-alberca-jardin.jpg',
      'ph-sala-render.jpg',
      'ph-cocina-render.jpg',
    ],
  },
  departamento: {
    nombre: 'Departamento Parque Chapultepec',
    specs: 'Departamento $2,900,000 MXN, 100m² de construcción, 2 recámaras, 2 baños, balcón privado, 1 cajón de estacionamiento, Bajada de Chapultepec 18-A, Cuernavaca',
    whatsappTexto: 'Hola, quiero información del Departamento',
    temas: [
      'Nueva unidad disponible — la opción más accesible del desarrollo',
      'Cocina moderna — isla, cubierta de granito, muebles blancos',
      'Balcón privado — tu propio espacio al aire libre',
      'Amenidades — alberca climatizada, jardín tropical, seguridad 24/7',
      'Ubicación privilegiada — 50m del Parque Chapultepec, 1.5h de CDMX',
      'Ideal para primera vivienda o para renta/Airbnb',
      'Espacios que inspiran — sala-comedor integrado, piso de mármol travertino',
    ],
    fotos: [
      'depto-cocina.jpg',
      'depto-sala.jpg',
      'depto-balcon.jpg',
    ],
  },
}

async function gql(query: string, variables: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const res = await fetch('https://api.buffer.com', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.BUFFER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })
  return res.json() as Promise<Record<string, unknown>>
}

async function publicarEnCanal(
  channelId: string,
  text: string,
  imageUrl: string,
  red: 'instagram' | 'tiktok' | 'facebook',
  // 'story' publica en Historias de Instagram (formato vertical 1080x1920).
  // Las historias generan más contacto directo que el feed: la gente responde
  // a una historia sin pensarlo, y esa respuesta abre la ventana de 24 h.
  formato: 'post' | 'story' = 'post'
): Promise<{ ok: boolean; detalle: string; bufferId?: string }> {
  const metadata =
    red === 'tiktok'
      ? { tiktok: {} }
      : red === 'facebook'
        ? { facebook: { type: 'post' } }
        : formato === 'story'
          ? { instagram: { type: 'story' } }
          : { instagram: { type: 'post', shouldShareToFeed: true } }

  const input = {
    channelId,
    text,
    schedulingType: 'automatic',
    mode: 'customScheduled',
    // Buffer ahora exige dueAt con mode: customScheduled — sin esto rechazaba
    // el post con "Invalid post input". Debe ser DateTime (string ISO) y en el
    // futuro — "ahora mismo" lo rechaza, por eso se manda 2 minutos adelante.
    dueAt: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
    metadata,
    assets: [{ image: { url: imageUrl } }],
  }

  const r = await gql(
    `mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess { post { id status dueAt } }
        ... on InvalidInputError { message }
        ... on LimitReachedError { message }
        ... on UnexpectedError { message }
      }
    }`,
    { input }
  )

  // La API de Buffer regresa HTTP 200 aunque el token sea inválido o el post
  // falle — viene como { errors: [...] } o como una de las variantes de error
  // del union (InvalidInputError/LimitReachedError/UnexpectedError, todas con
  // "message" en vez de "post"). Sin este chequeo, un fetch sin excepción se
  // reportaba siempre como "OK" aunque nada se hubiera publicado.
  if (Array.isArray(r.errors) && r.errors.length > 0) {
    const msg = (r.errors as { message?: string }[]).map((e) => e.message).join('; ')
    return { ok: false, detalle: msg || 'error desconocido de Buffer' }
  }

  const createPost = (r.data as Record<string, unknown> | undefined)?.createPost as Record<string, unknown> | undefined
  if (!createPost || 'message' in createPost) {
    return { ok: false, detalle: (createPost?.message as string) || 'respuesta inesperada de Buffer' }
  }

  const post = createPost.post as Record<string, unknown> | undefined
  return { ok: true, detalle: 'OK', bufferId: post?.id as string | undefined }
}

// ── REELS ───────────────────────────────────────────────────────────────────
// El video es lo único que llega a gente que NO te sigue: Instagram y TikTok
// empujan reels mucho más que las fotos. Carlos ya tenía 4 videos del
// desarrollo sin usar en el CDN. Sale uno por semana, rotando, para no quemar
// el material y mantener presencia de video constante.
const VIDEOS: { archivo: string; gancho: string }[] = [
  { archivo: 'video1-penthouse.mp4',    gancho: 'Así se vive en el penthouse de Parque Chapultepec. 235 m², rooftop privado de 86 m² y todo el valle de Cuernavaca enfrente.' },
  { archivo: 'video2-departamento.mp4', gancho: 'El departamento de $2,900,000 en Parque Chapultepec. 100 m², dos recámaras y balcón, a 50 m del parque.' },
  { archivo: 'video3-cocina.mp4',       gancho: 'Cocina con isla, cubierta de granito y acabados de primera. Personalizas cocina y clósets a tu gusto.' },
  { archivo: 'video5-lifestyle.mp4',    gancho: 'Alberca climatizada, jardín tropical y seguridad 24/7. Cuernavaca a hora y media de CDMX.' },
]

async function publicarVideo(
  channelId: string,
  text: string,
  videoUrl: string,
  red: 'instagram' | 'tiktok'
): Promise<{ ok: boolean; detalle: string; bufferId?: string }> {
  const input = {
    channelId,
    text,
    schedulingType: 'automatic',
    mode: 'customScheduled',
    dueAt: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
    metadata: red === 'instagram'
      ? { instagram: { type: 'reel', shouldShareToFeed: true } }
      : { tiktok: {} },
    assets: [{ video: { url: videoUrl } }],
  }
  const r = await gql(
    `mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess { post { id status } }
        ... on InvalidInputError { message }
        ... on LimitReachedError { message }
        ... on UnexpectedError { message }
      }
    }`,
    { input }
  )
  if (Array.isArray(r.errors) && r.errors.length > 0) {
    return { ok: false, detalle: (r.errors as { message?: string }[]).map((e) => e.message).join('; ') }
  }
  const cp = (r.data as Record<string, unknown> | undefined)?.createPost as Record<string, unknown> | undefined
  if (!cp || 'message' in cp) return { ok: false, detalle: (cp?.message as string) || 'respuesta inesperada' }
  return { ok: true, detalle: 'OK', bufferId: (cp.post as Record<string, unknown> | undefined)?.id as string | undefined }
}

export async function publicarDiario(): Promise<{ ok: boolean; detalle: string }> {
  if (!process.env.BUFFER_API_KEY) {
    return { ok: false, detalle: 'BUFFER_API_KEY no configurada' }
  }

  // ── UNA SOLA PUBLICACIÓN POR DÍA ──────────────────────────────────────────
  // El endpoint /api/cron se puede disparar a mano (con ?t=chap2026) además
  // del cron de Vercel. Sin este candado, cada ejecución extra publicaba otra
  // vez en Instagram, TikTok y Facebook: el 10-ago-2026 salieron 2 tandas el
  // mismo día por una ejecución manual de prueba. Publicar doble en redes se
  // ve a spam y quema el alcance.
  const { getSupabase } = await import('./supabase')
  const { inicioDiaMexico } = await import('./fecha')
  const { count } = await getSupabase()
    .from('publicaciones')
    .select('id', { count: 'exact', head: true })
    .gte('creado_en', inicioDiaMexico())

  if ((count ?? 0) > 0) {
    return { ok: true, detalle: `ya se publicó hoy (${count} posts) — no se repite` }
  }

  const diaDelAno = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  // Alterna día por medio entre las dos propiedades — promoción pareja,
  // ninguna se queda sin publicar por mucho tiempo.
  const pieza = PIEZAS[diaDelAno % PIEZAS.length]
  const prop = PROPIEDADES[pieza.propiedad]
  const tema = pieza.tema

  // Generar caption con Claude — si falla (API caída, clave vencida), se usa
  // un caption genérico de respaldo en vez de que no se publique nada ese día.
  let captionBase: string
  try {
    const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const resp = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `Eres copywriter de real estate de lujo en Cuernavaca. Escribe UN caption para Instagram/TikTok sobre: ${tema}. Propiedad: ${prop.specs}. Máximo 120 palabras. Incluye 5 hashtags relevantes. Tono aspiracional pero accesible. Sin emojis excesivos. NO incluyas links ni números de teléfono en el caption — esos se agregan automáticamente al final.`,
      messages: [{ role: 'user', content: `Genera el caption del día sobre: ${tema}` }],
    })
    captionBase = (resp.content[0] as Anthropic.TextBlock).text.trim()
  } catch (e) {
    console.error('[Buffer] Error generando caption con Claude, usando respaldo:', e)
    captionBase = `${prop.nombre} — ${tema.split('—')[0].trim()}. #ParqueChapultepec #BienesRaicesCuernavaca #Morelos #VidaDeAlturas #Cuernavaca`
  }
  const whatsappUrl = `wa.me/5217772408027?text=${encodeURIComponent(prop.whatsappTexto)}`
  const CTA = `\n\n📲 Escríbenos por WhatsApp: ${whatsappUrl}\n📞 Llámanos: 777 175 84 12\n📍 Bajada de Chapultepec 18-A, Cuernavaca`
  const caption = captionBase + CTA

  const NOMBRE_RED: Record<string, string> = { instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook' }
  const db = getSupabase()

  const resultados: string[] = []
  let algunoFallo = false
  for (const [id, red] of [[IG, 'instagram'], [TT, 'tiktok'], [FB, 'facebook']] as const) {
    try {
      const r = await publicarEnCanal(id, caption, imagenDe(red, pieza), red)
      resultados.push(r.ok ? `${red}: OK` : `${red}: ERROR (${r.detalle})`)
      if (!r.ok) {
        algunoFallo = true
        continue
      }
      // Sin este insert, el panel de "Salud del sistema" del CRM siempre
      // mostraba 0 publicaciones aunque Buffer sí las hubiera aceptado.
      await db.from('publicaciones').insert({
        red: NOMBRE_RED[red],
        tipo: 'post',
        caption,
        imagen_url: imagenDe(red, pieza),
        buffer_id: r.bufferId ?? null,
        estado: 'Publicado',
      })
    } catch (e) {
      resultados.push(`${red}: ERROR (${e instanceof Error ? e.message : String(e)})`)
      algunoFallo = true
    }
  }

  // ── REEL SEMANAL (lunes) ──────────────────────────────────────────────────
  // Un solo video por semana. Si Buffer rechaza el formato de video, se anota
  // y se sigue: el resto del día ya salió y eso es lo que no se puede perder.
  const esLunes = new Date(Date.now() - 6 * 60 * 60 * 1000).getUTCDay() === 1
  if (esLunes) {
    const semana = Math.floor(diaDelAno / 7)
    const vid = VIDEOS[semana % VIDEOS.length]
    const urlVideo = `${CDN}/${vid.archivo}`
    const textoVideo = `${vid.gancho}\n\n📲 WhatsApp: wa.me/5217772408027\n📍 Bajada de Chapultepec 18-A, Cuernavaca\n\n#Cuernavaca #Morelos #BienesRaices #Penthouse #Departamento`
    for (const [canal, red] of [[IG, 'instagram'], [TT, 'tiktok']] as const) {
      try {
        const rv = await publicarVideo(canal, textoVideo, urlVideo, red)
        resultados.push(rv.ok ? `${red}-reel: OK` : `${red}-reel: ERROR (${rv.detalle})`)
        if (rv.ok) {
          await db.from('publicaciones').insert({
            red: NOMBRE_RED[red], tipo: 'reel', caption: textoVideo,
            imagen_url: urlVideo, buffer_id: rv.bufferId ?? null, estado: 'Publicado',
          })
        }
      } catch (e) {
        console.error(`[Buffer] Error publicando reel en ${red}:`, e)
        resultados.push(`${red}-reel: ERROR`)
      }
    }
  }

  // ── HISTORIA DE INSTAGRAM ─────────────────────────────────────────────────
  // Se publica la versión vertical de la misma pieza. Si el plan de Buffer no
  // permite historias, se registra el detalle y NO se rompe el día: el feed ya
  // salió y eso es lo que no se puede perder.
  try {
    const textoHistoria = `${tema}\n\nEscríbenos por WhatsApp: wa.me/5217772408027`
    const rs = await publicarEnCanal(IG, textoHistoria, imagenDe('tiktok', pieza), 'instagram', 'story')
    resultados.push(rs.ok ? 'instagram-historia: OK' : `instagram-historia: ERROR (${rs.detalle})`)
    if (rs.ok) {
      await db.from('publicaciones').insert({
        red: 'Instagram',
        tipo: 'historia',
        caption: textoHistoria,
        imagen_url: imagenDe('tiktok', pieza),
        buffer_id: rs.bufferId ?? null,
        estado: 'Publicado',
      })
    }
  } catch (e) {
    console.error('[Buffer] Error publicando historia:', e)
    resultados.push('instagram-historia: ERROR')
  }

  return { ok: !algunoFallo, detalle: resultados.join(', ') }
}
