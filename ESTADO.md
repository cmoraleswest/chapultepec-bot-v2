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

## Bloqueador crítico activo — RECHAZADO, causa raíz identificada (2026-08-25)
La verificación de negocio del Business ID `358500678256951` fue **RECHAZADA** ("No se pudo verificar"), no solo demorada. Causa raíz confirmada con Carlos: ese Business Manager está registrado bajo el nombre **"Fernando Frausto Art"**, que NO es el negocio de Carlos — es un Business Portfolio que Carlos creó con su propia cuenta de Facebook para ayudar a un amigo, y el WhatsApp Business de Parque Chapultepec quedó construido adentro por error de arquitectura, no de un amigo. Verificar documentos de Carlos (Parque Chapultepec / bienes raíces) contra un negocio llamado "Fernando Frausto Art" no puede aprobar — el nombre no coincide con ningún documento real. **No tiene caso reintentar la verificación bajo esta identidad, nunca va a aprobar.**

Sin resolver esto: el 175 no se puede dar de alta (límite de 1 número por negocio sin verificar, ya ocupado por el 8027), el límite de mensajes del 8027 sigue topado, y las 4 plantillas de seguimiento sin aprobar (`info_ambas_propiedades`, `seguimiento_24h`, `seguimiento_48h`, `cierre_7dias`) — de hecho ya se confirmó en vivo (2026-08-25) que varias plantillas de seguimiento están siendo rechazadas por Meta con error 131049 "healthy ecosystem engagement", consistente con la cuenta LIMITED.

### Plan acordado con Carlos (2026-08-25) — seguir este orden, no saltarse pasos
No tocar ni salir de "Fernando Frausto Art" todavía — el 8027 sigue viviendo ahí y funciona para conversaciones activas dentro de la ventana de 24h (confirmado con datos reales). Romperlo antes de tener el reemplazo listo sería un retroceso.

1. Carlos crea un Business Portfolio **nuevo y separado**, con su nombre/negocio real, SIN tocar ni mezclar con el de su amigo.
2. Verificación de negocio en el portfolio nuevo, con documentos que coincidan exacto con el nombre registrado (persona física: INE + comprobante de domicilio; persona moral: acta constitutiva + RFC + comprobante de domicilio).
3. Una vez aprobado: crear un WhatsApp Business Account nuevo adentro de ese portfolio, conectar ahí el **777-175-8412** (el número público que siempre se quiso usar como definitivo).
4. Migrar credenciales del bot en Vercel al WABA/número nuevo — correr los dos en paralelo hasta confirmar que el nuevo funciona igual de bien.
5. Solo hasta entonces, Carlos se sale de "Fernando Frausto Art" (Configuración del negocio → Personas → Salir — no se puede borrar, no es el dueño legal de ese nombre de negocio aunque sea su cuenta).

Se decidió NO investigar si "Fernando Frausto Art" tiene algo mezclado del amigo — crear uno nuevo desde cero es más rápido y de riesgo cero que investigarlo, dado que ya se perdieron meses en este bloqueador.

Próxima sesión: preguntar a Carlos en qué paso del plan de arriba se quedó, ANTES de proponer nada nuevo sobre Meta/verificación — no repetir el diagnóstico, ya está hecho.

## Teléfono Android (captura de llamadas perdidas al 175)
El equipo comprado para esto salió DEFECTUOSO — no recibía ni hacía llamadas de forma confiable. MacroDroid ya estaba configurado y listo (trigger: llamada perdida → POST a `/api/leads`), pero no tiene hardware confiable donde correr. Pendiente: Carlos decide si lo regresa/cambia o compra otro equipo.

## Repositorio (nuevo, 2026-08-18)
Antes de hoy este proyecto NO tenía remote de GitHub — el deploy salía directo del Mac vía CLI de Vercel. Esto causó al menos un caso confirmado de una sesión en la nube (sin acceso al Mac) que, al no encontrar dónde ver el código real, trabajó sobre un repositorio distinto y ajeno (`cmoraleswest/chapultepec-bot`, sin -v2, rama `respaldo-mac`) y reportó cambios que nunca tocaron el sistema real. Ese repo viejo sigue sin aclarar — no confiar en nada de ahí sin confirmar con Carlos primero.

A partir de hoy: `https://github.com/cmoraleswest/chapultepec-bot-v2` (privado) es el repositorio real de este proyecto. El deploy a producción sigue siendo manual vía Vercel CLI — conectar el remoto NO cambió nada del despliegue, solo da visibilidad del código real a cualquier sesión futura.

## Galería de medios consolidada + rotación ampliada (2026-08-18)
`~/chapultepec-fotos` (repo separado, ver su propio ESTADO.md) tiene `public/galeria/` con TODO el material de marketing en un solo lugar, incluyendo 49 fotos/videos recuperados del repo viejo `chapultepec-bot` que no tenían respaldo.

`lib/buffer.ts` ya se amplió: `PIEZAS` pasó de 5 a 11 temas (las 5 piezas diseñadas de `refresh/` + 6 nuevas basadas en foto real de `galeria/`, con ángulo de inversión/plusvalía/rendimiento). El ciclo diario ahora tarda 11 días en repetirse en vez de 5. Deployado a producción y verificado que el dashboard y el webhook siguen respondiendo igual — NO se forzó ningún post de prueba real a Instagram/TikTok/Facebook, la próxima publicación automática (cron diario) ya usa la rotación nueva.

Pendiente si Carlos quiere más: agregar más piezas de foto real al array `PIEZAS` en `lib/buffer.ts` (mismo patrón: slug, tema con el ángulo de mensaje, propiedad, `fuente: 'foto'`, nombre exacto del archivo en `galeria/`) — quedan ~80 fotos/videos sin usar todavía en la galería.

## Cambios de esta sesión (2026-08-25)
- Fix real: `FICHA_AMBAS` en `config.ts` decía 235 m² para el penthouse, no coincidía con `PENTHOUSE_INFO.construccion` (336.83 m²) en el mismo archivo — corregido.
- Nueva intención `CORREDOR` en el clasificador (`intencion.ts`): detecta brokers/inmobiliarias que ofrecen representar la propiedad (no son compradores). Responde automático con condiciones de comisión compartida (50% del 5%), marca `canal_origen='Corredor'` (agregado al CHECK constraint de `leads`), se excluye del pipeline de compradores y del drip.
- Pestaña "Corredores" en el CRM (`vista=corredores`) — lista aparte, no mezclada con leads compradores.
- Botón "Borrar" en el Pipeline y en Corredores — DELETE en `/api/leads`, borra el lead y limpia `llamadas_rescatadas`/`crm_log` relacionados (con confirmación, no se puede deshacer).
- Confirmado con datos reales que el motor conversacional (Claude + Cloud API) funciona bien dentro de la ventana de 24h — el problema no es "no hay comunicación", es el reenganche a leads fríos (ver bloqueador de arriba) y el uso del selector de plantillas del CRM cuando la ventana está cerrada (ya existe, Carlos debe usarlo en vez del cuadro de texto libre cuando el semáforo está en 🔴).
- 5 piezas de brochure nuevas (diseños HTML → PNG) recibidas de Carlos, revisadas y corregidas (quitado "alberca privada"/"elevador exclusivo" — la alberca es amenidad compartida del condominio, no privada del PH). Pendiente: subirlas a `chapultepec-fotos/public/galeria/` y agregarlas a `PIEZAS` en `lib/buffer.ts` — no se alcanzó a terminar esta parte, retomar.

## Reglas para no revolver
- Este archivo, no la memoria de una sesión de chat, es la verdad. Si algo aquí contradice lo que dice una sesión vieja, gana este archivo (y si este archivo está desactualizado, se corrige aquí, no se discute en el chat y se olvida).
- Nunca mezclar con `~/chapultepec-admin` (condominio) ni con `~/chapultepec-bot` (V1 viejo, detenido, no tocar) ni con Poza Rica.
- Antes de dar cualquier diagnóstico sobre Meta/WhatsApp, verificar en vivo con `health_status` de la Graph API — no repetir el estado de la última vez sin comprobar, las cosas cambian entre sesiones.
