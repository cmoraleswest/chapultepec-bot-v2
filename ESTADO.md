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

## Reglas para no revolver
- Este archivo, no la memoria de una sesión de chat, es la verdad. Si algo aquí contradice lo que dice una sesión vieja, gana este archivo (y si este archivo está desactualizado, se corrige aquí, no se discute en el chat y se olvida).
- Nunca mezclar con `~/chapultepec-admin` (condominio) ni con `~/chapultepec-bot` (V1 viejo, detenido, no tocar) ni con Poza Rica.
- Antes de dar cualquier diagnóstico sobre Meta/WhatsApp, verificar en vivo con `health_status` de la Graph API — no repetir el estado de la última vez sin comprobar, las cosas cambian entre sesiones.
