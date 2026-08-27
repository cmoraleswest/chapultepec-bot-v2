# ESTADO — Chapultepec Bot V2

Fuente única de verdad de este proyecto. Se actualiza al cierre de cada sesión de trabajo, con lo que cambió y lo que quedó pendiente. Cualquier sesión nueva (con o sin acceso al Mac) debe leer esto ANTES de proponer diagnósticos o acciones, y verificar en vivo (Graph API, Vercel, git) antes de dar por buena cualquier afirmación de aquí que tenga más de unos días.

Última actualización: 2026-08-25.

## Qué es esto
Sistema autónomo de venta del Penthouse y un Departamento en el edificio Parque Chapultepec (Cuernavaca, Morelos). NO es el sistema de administración del condominio (ese vive en `~/chapultepec-admin`, es otro proyecto, no mezclar).

Objetivo del dueño: automatización al 100% del contacto con leads, para no perder tiempo ni clientes.

## Producción
- Dashboard/CRM: https://chapultepec-bot-v2.vercel.app
- Vercel project: `cmoraleswest-7788s-projects/chapultepec-bot-v2`
- Deploy: manual vía `vercel --prod --cwd /Users/maccarlosmoraless/chapultepec-bot-v2` (NO hay integración automática con GitHub todavía — ver sección Repositorio)
- CDN de fotos: chapultepec-fotos.vercel.app
- Supabase: proyecto `qntdyfhcxwmmfgamppbq`

## Números de WhatsApp
- 777 240 8027 — bot invisible (Cloud API), NUNCA se menciona en publicidad
- 777 175 8412 — cara pública (llamadas/flyers), AÚN NO conectado a Cloud API, bloqueado hasta que pase la verificación de negocio
- 777 492 1176 — número personal de pruebas de Carlos, NUNCA es un lead real
- 527771568706 (Zamir) — BLOQUEADO permanente, no contactar

## Bloqueador crítico activo — RECONCILIADO Y CONFIRMADO 2026-08-26 (ver BITÁCORA.md Fase 8 para la historia completa)
Hubo dos intentos en paralelo por dos sesiones distintas sin continuidad entre ellas. Ya se verificó en vivo cuál ganó:

- **Portafolio "Parque Chapultepec" (`286737720523042`)** — el plan del 25-ago de crear un negocio nuevo y separado. **FRACASÓ: verificación RECHAZADA** ("No se pudo verificar", sin razón específica). Solo sirve hoy como dueño de la Página de Facebook/Instagram que usa Buffer. Sus 5 cuentas de WhatsApp están vacías. No seguir insistiendo aquí sin ayuda directa de soporte de Meta.
- **Portafolio "Fernando Frausto Art" (`358500678256951`)** — el original, el que tiene el WhatsApp real. Se corrigió el campo "Nombre legal del negocio" (tenía un error de tipeo, "Parque Chapulteepc") a "Carlos Alberto Morales De La Vega" exacto como el RFC, se resubieron documentos, y Meta lo aceptó: **estado actual "En revisión"**, confirmado por el chat de soporte de Meta, resolución estimada 28-ago-2026.

**Dato que cambia el plan de fondo:** "Fernando Frausto Art" ya tiene, HOY, funcionando con calidad Alta, **los dos números conectados**: el 8027 (WABA `1923471098361486`, el que usa el bot) y el **175-8412 (WABA `1964573394173039`, nunca usado por el código)**. La vieja idea de "el 175 está baneado / no se puede conectar sin verificar" era falsa — ya está conectado, solo que nadie lo usó. Si la revisión actual se aprueba, el límite de mensajes se levanta para AMBOS números a la vez, sin necesitar ninguna migración de portafolio.

**Plan vigente:**
1. Esperar resolución (~28-ago). Verificar con `health_status` de la Graph API sobre el phone_number_id del 8027 — si `BUSINESS` deja de mostrar error 141010, ya se aprobó.
2. Si se aprueba: decidir con Carlos si migrar el bot para usar el 175 (su número público real) en vez del 8027 invisible — cambio de código (env vars + re-suscribir webhook a la WABA `1964573394173039`), no de activos de Meta, seguro de hacer con cuidado de no cortar el 8027 hasta confirmar que el 175 funciona igual en producción.
3. Si se rechaza otra vez: escalar con soporte humano de Meta, ya van dos rechazos con nombre de persona física correcto — no repetir el mismo formulario una tercera vez sin ayuda.
4. NO tocar el portafolio "Parque Chapultepec" (`286737720523042`) para temas de WhatsApp — quedó descartado para eso, solo úsalo para la Página de redes.

## Teléfono Android (captura de llamadas perdidas al 175)
El equipo comprado para esto salió DEFECTUOSO — no recibía ni hacía llamadas de forma confiable. MacroDroid ya estaba configurado y listo (trigger: llamada perdida → POST a `/api/leads`), pero no tiene hardware confiable donde correr. Pendiente: Carlos decide si lo regresa/cambia o compra otro equipo.

## Repositorio (nuevo, 2026-08-18)
Antes de hoy este proyecto NO tenía remote de GitHub — el deploy salía directo del Mac vía CLI de Vercel. Esto causó al menos un caso confirmado de una sesión en la nube (sin acceso al Mac) que, al no encontrar dónde ver el código real, trabajó sobre un repositorio distinto y ajeno (`cmoraleswest/chapultepec-bot`, sin -v2, rama `respaldo-mac`) y reportó cambios que nunca tocaron el sistema real. Ese repo viejo sigue sin aclarar — no confiar en nada de ahí sin confirmar con Carlos primero.

A partir de hoy: `https://github.com/cmoraleswest/chapultepec-bot-v2` (privado) es el repositorio real de este proyecto. El deploy a producción sigue siendo manual vía Vercel CLI — conectar el remoto NO cambió nada del despliegue, solo da visibilidad del código real a cualquier sesión futura.

## Galería de medios consolidada + rotación ampliada (2026-08-18)
`~/chapultepec-fotos` (repo separado, ver su propio ESTADO.md) tiene `public/galeria/` con TODO el material de marketing en un solo lugar, incluyendo 49 fotos/videos recuperados del repo viejo `chapultepec-bot` que no tenían respaldo.

`lib/buffer.ts` ya se amplió: `PIEZAS` pasó de 5 a 11 temas (las 5 piezas diseñadas de `refresh/` + 6 nuevas basadas en foto real de `galeria/`, con ángulo de inversión/plusvalía/rendimiento). El ciclo diario ahora tarda 11 días en repetirse en vez de 5. Deployado a producción y verificado que el dashboard y el webhook siguen respondiendo igual — NO se forzó ningún post de prueba real a Instagram/TikTok/Facebook, la próxima publicación automática (cron diario) ya usa la rotación nueva.

Pendiente si Carlos quiere más: agregar más piezas de foto real al array `PIEZAS` en `lib/buffer.ts` (mismo patrón: slug, tema con el ángulo de mensaje, propiedad, `fuente: 'foto'`, nombre exacto del archivo en `galeria/`) — quedan ~80 fotos/videos sin usar todavía en la galería.

## Publicaciones automáticas paradas y reparadas (26-ago-2026)
Las publicaciones a Instagram/TikTok/Facebook se detuvieron por completo desde el 16-ago-2026 (10 días sin publicar nada, verificado en la tabla `publicaciones` de Supabase). Causa raíz encontrada navegando a `developers.buffer.com` → `publish.buffer.com/settings/api`: la clave API de Buffer (`BUFFER_API_KEY`) se creó el 18-jul-2026 con vencimiento fijo a 30 días — **caducó el 17-ago-2026**, un día después de la última publicación exitosa. El sistema fallaba en silencio (no tumbaba el cron, solo dejaba de publicar) porque `publicarDiario()` ya maneja los errores de Buffer sin lanzar excepción.

**Reparado el mismo día:** se regeneró la clave en Buffer con vencimiento a **1 año (26-ago-2027)** en vez de los 30 días por defecto, se actualizó `BUFFER_API_KEY` en Vercel producción, se redesplegó, y se confirmó con una consulta real a la API de Buffer (`{ account { id } }`) que la clave nueva autentica correctamente.

**Nota aparte, no relacionada con la falla:** la cuenta de Buffer de Carlos mostró un aviso de que su período de prueba de un plan de pago terminó y volvió al plan gratuito. El plan gratuito SÍ permite usar la API (límites: 100 req/15min, 500/24h, 10.000/30 días — de sobra para 1 publicación diaria), así que no fue necesario pagar nada para resolver esto.

**Pendiente futuro:** esta clave vuelve a vencer el 26-ago-2027. Anotarlo para no repetir el mismo apagón silencioso de 10 días dentro de un año.

## Cambios de la sesión del 2026-08-25 (repo remoto, fusionados hoy a este checkout)
- Fix real: `FICHA_AMBAS` en `config.ts` decía 235 m² para el penthouse, no coincidía con `PENTHOUSE_INFO.construccion` (336.83 m²) en el mismo archivo — corregido.
- Nueva intención `CORREDOR` en el clasificador (`intencion.ts`): detecta brokers/inmobiliarias que ofrecen representar la propiedad (no son compradores). Responde automático con condiciones de comisión compartida (50% del 5%), marca `canal_origen='Corredor'` (agregado al CHECK constraint de `leads`), se excluye del pipeline de compradores y del drip.
- Pestaña "Corredores" en el CRM (`vista=corredores`) — lista aparte, no mezclada con leads compradores.
- Botón "Borrar" en el Pipeline y en Corredores — DELETE en `/api/leads`, borra el lead y limpia `llamadas_rescatadas`/`crm_log` relacionados (con confirmación, no se puede deshacer).
- Confirmado con datos reales que el motor conversacional (Claude + Cloud API) funciona bien dentro de la ventana de 24h — el problema no es "no hay comunicación", es el reenganche a leads fríos y el uso del selector de plantillas del CRM cuando la ventana está cerrada (ya existe, Carlos debe usarlo en vez del cuadro de texto libre cuando el semáforo está en 🔴).
- **Pendiente sin terminar esa sesión:** 5 piezas de brochure nuevas (diseños HTML → PNG) que Carlos ya entregó, revisadas y corregidas (quitado "alberca privada"/"elevador exclusivo" — la alberca es amenidad compartida del condominio, no privada del PH), pero NUNCA se subieron a `chapultepec-fotos/public/galeria/` ni se agregaron a `PIEZAS` en `lib/buffer.ts`. Retomar cuando Carlos las tenga a la mano otra vez.

## ⚠️ PENDIENTE URGENTE PARA CARLOS: rediseñar ficha-departamento (26-ago-2026)
Se descubrió que `chapultepec-fotos/public/fichas/ficha-departamento.pdf` (y su .jpg) sigue con el precio viejo **$2,800,000** — el precio real es **$3,000,000** desde hace tiempo (el texto del bot ya lo tenía bien, solo esta pieza diseñada se quedó atrás). Esta ficha se manda de verdad a leads reales cuando piden info del departamento.

**Ya se desactivó el envío de esta ficha específica** en `app/api/webhook/route.ts` (busca el comentario sobre `ficha-departamento.pdf`) para no seguir cotizando de menos — el lead sigue recibiendo el texto con el precio correcto, solo no recibe el PDF adjunto. La ficha del Penthouse SÍ está correcta y se sigue mandando normal.

**Lo que Carlos necesita hacer:** regenerar `ficha-departamento.pdf` (y el `.jpg` equivalente) con $3,000,000 y subir los archivos nuevos a `chapultepec-fotos/public/fichas/` con el mismo nombre. En cuanto estén, avisar para reactivar el envío en el código (quitar el `if (cual === 'Departamento') continue`).

También se sacó `comparativa.jpg` de la rotación de redes (`lib/buffer.ts`) por el mismo motivo — mostraba $2,800,000 para el departamento. Se reemplazó por una pieza de especificaciones del Penthouse que sí está vigente.

## Reglas para no revolver
- Este archivo, no la memoria de una sesión de chat, es la verdad. Si algo aquí contradice lo que dice una sesión vieja, gana este archivo (y si este archivo está desactualizado, se corrige aquí, no se discute en el chat y se olvida).
- Nunca mezclar con `~/chapultepec-admin` (condominio) ni con `~/chapultepec-bot` (V1 viejo, detenido, no tocar) ni con Poza Rica.
- Antes de dar cualquier diagnóstico sobre Meta/WhatsApp, verificar en vivo con `health_status` de la Graph API — no repetir el estado de la última vez sin comprobar, las cosas cambian entre sesiones.
