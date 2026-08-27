# ESTADO — Chapultepec Bot V2

Fuente única de verdad de este proyecto. Se actualiza al cierre de cada sesión de trabajo, con lo que cambió y lo que quedó pendiente. Cualquier sesión nueva (con o sin acceso al Mac) debe leer esto ANTES de proponer diagnósticos o acciones, y verificar en vivo (Graph API, Vercel, git) antes de dar por buena cualquier afirmación de aquí que tenga más de unos días.

Última actualización: 2026-08-18.

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

## Bloqueador crítico activo (verificado en vivo 2026-08-17)
La verificación de negocio de Meta para el Business ID `358500678256951` sigue sin pasar, 9+ días después de haberse enviado como "pending" el 2026-08-08. `health_status` de la API sigue devolviendo `can_send_message: LIMITED` con error 141010 "The Business has not passed business verification". Mientras esto no se resuelva:
- El 175 no se puede dar de alta (límite de 1 número por negocio sin verificar).
- El límite de mensajes del 8027 sigue topado (display name sin aprobar).
- 4 plantillas de seguimiento siguen sin aprobación (`info_ambas_propiedades`, `seguimiento_24h`, `seguimiento_48h`, `cierre_7dias`).

Acción pendiente de Carlos: revisar `business.facebook.com/latest/settings/security_center?business_id=358500678256951` y confirmar si sigue en revisión o si hay algo que resolver ahí.

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

## Reglas para no revolver
- Este archivo, no la memoria de una sesión de chat, es la verdad. Si algo aquí contradice lo que dice una sesión vieja, gana este archivo (y si este archivo está desactualizado, se corrige aquí, no se discute en el chat y se olvida).
- Nunca mezclar con `~/chapultepec-admin` (condominio) ni con `~/chapultepec-bot` (V1 viejo, detenido, no tocar) ni con Poza Rica.
- Antes de dar cualquier diagnóstico sobre Meta/WhatsApp, verificar en vivo con `health_status` de la Graph API — no repetir el estado de la última vez sin comprobar, las cosas cambian entre sesiones.
