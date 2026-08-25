# BITÁCORA — Parque Chapultepec CRM/Bot

Historia completa del proyecto, para que ninguna sesión (de chat o de trabajo) tenga que volver a empezar de cero. `ESTADO.md` tiene el estado actual resumido; este archivo tiene el CÓMO llegamos aquí, para entender el porqué de cada decisión sin repetir errores ya resueltos.

Última actualización: 2026-08-25.

---

## 1. Qué es el proyecto

Sistema de venta automatizada para dos propiedades en el edificio Parque Chapultepec (Cuernavaca, Morelos):
- **Penthouse** — $4,500,000 MXN, 336.83 m², 3 recámaras, 3.5 baños, rooftop privado 85-86 m².
- **Departamento** — $2,800,000–2,900,000 MXN (verificar precio vigente), 100-112 m², 2 recámaras, 2 baños.

Objetivo del dueño (Carlos): automatización al 100% del contacto con leads — bot conversacional por WhatsApp con IA (Claude), CRM para dar seguimiento, publicación automática en redes.

**NO confundir con:**
- `~/chapultepec-admin` — sistema de administración del condominio, proyecto totalmente distinto.
- `cmoraleswest/chapultepec-bot` (sin `-v2`) — versión 1, construida con Baileys (WhatsApp no oficial). **Detenida, no se toca.** Ver sección 4.

---

## 2. Cronología — cómo llegamos aquí

### Fase 1 — Intentos de automatizar llamadas (antes de agosto)
Se intentó conectar Twilio para contestar llamadas al número público 777-175-8412. Bloqueado: Telcel no permite desviar llamadas a números de Twilio. Se abandonó esa vía; quedó pendiente una integración de Twilio/Vapi para llamadas entrantes (código existe en `app/api/twilio/`, funcional pero depende de que Telcel active el desvío — trámite con el operador, no de código).

### Fase 2 — Descubrimiento de versiones múltiples (agosto, primeras semanas)
Se encontraron **tres versiones distintas** del mismo sistema corriendo en paralelo, sin que nadie tuviera claro cuál era la real:
1. El repo de GitHub `chapultepec-bot` (rama `main`).
2. Un deployment huérfano en Vercel (`chapultepec-bot-v2.vercel.app`) sin conexión a git — resultó ser la V2 real, la que sigue viva hoy.
3. Código local en la Mac de Carlos, más avanzado que lo que había en GitHub — se respaldó en la rama `respaldo-mac` del repo viejo.

Esto generó mucha confusión porque distintas sesiones de chat, sin visibilidad del código real, hicieron diagnósticos y "arreglos" sobre repos equivocados que nunca tocaron el sistema en producción.

### Fase 3 — La saga de verificación de WhatsApp personal (semanas de agosto)
Se intentó re-registrar el número 777-175-8412 como cuenta normal de WhatsApp (app de consumidor, no API oficial) después de que la sesión se cerrara por errores de manejo (se borró `auth_session` sin verificar si había un proceso vivo). Bloqueado repetidamente por el mensaje "WhatsApp está temporalmente fuera de servicio, intenta en 1 hora" — causado por reintentos repetidos que reiniciaban el temporizador de espera de Meta. Protocolo real confirmado por soporte de Meta: un solo intento, esperar 24h limpias, usar "Llámame" si el SMS no llega en 5 min.

**Esto resultó ser, en retrospectiva, un esfuerzo parcialmente desviado** — ver Fase 6. La app de consumidor y la API oficial (Cloud API) son sistemas completamente distintos; luchar por la primera no resolvía el bloqueo real del negocio.

### Fase 4 — El misterio "[PLANTILLA ...]" (14 de agosto, resuelto el 22)
Se encontraron mensajes en la base de datos con formato `[PLANTILLA info_penthouse_chapultepec]` y terminología de API oficial de Meta, que no existían en el código del repo `chapultepec-bot`. Un diagnóstico inicial (14 de agosto) concluyó erróneamente que eran datos de prueba falsos. **Esto fue un error** — el 22 de agosto, con más evidencia (conversaciones completas y coherentes, errores reales de Meta como el código 131049), se confirmó que SÍ era un sistema real y en producción: la V2, corriendo con la API oficial de WhatsApp Business Platform, completamente aparte del repo que se llevaba semanas editando.

### Fase 5 — Localización del código real de la V2 (22 de agosto)
Se encontró el repo real: `cmoraleswest/chapultepec-bot-v2` (privado, antes sin remote de git — el deploy salía directo de la Mac vía Vercel CLI). Contiene `ESTADO.md` y `RUNBOOK.md`, escritos en sesiones anteriores específicamente para resolver este problema de continuidad. Desde entonces, todo el trabajo real se hace ahí.

Se auditó el sistema real y se confirmó: el motor conversacional (Claude + Cloud API) funciona bien dentro de la ventana de 24h — no es cierto que "no haya comunicación con clientes". Lo que sí está limitado es el reenganche a leads que dejaron de responder (plantillas de seguimiento rechazadas por Meta) y la ausencia de visibilidad clara de cuándo un lead quiere agendar cita (parcialmente ya resuelto, ver Fase 7).

### Fase 6 — La causa raíz real: identidad de negocio equivocada en Meta (25 de agosto)
La verificación de negocio del Business ID `358500678256951` fue **rechazada**, no solo demorada. Se descubrió la causa raíz: ese Business Manager está registrado como **"Fernando Frausto Art"** — un Business Portfolio que Carlos creó con su propia cuenta de Facebook para ayudar a un amigo, y el WhatsApp Business de Parque Chapultepec quedó construido adentro por error de arquitectura. Verificar documentos de Carlos contra un negocio con ese nombre nunca podía aprobar — el nombre no coincide con ningún documento real suyo.

Esto explica retroactivamente meses de bloqueo: no era un problema de esperar más tiempo, ni de reintentar el registro del número personal (Fase 3) — era un problema estructural de identidad de negocio, presente desde el origen.

**Plan acordado — ver sección 5.**

### Fase 7 — Trabajo de producto del 25 de agosto
En paralelo al tema de Meta, se hicieron mejoras reales al sistema:
- Corregido bug real: el mensaje de primer contacto decía 235 m² para el penthouse (debía ser 336.83 m², como en el resto del código).
- Nueva categoría de intención **CORREDOR**: el bot ahora detecta cuando quien escribe es un corredor/inmobiliaria ofreciendo representar la propiedad (no un comprador), responde automático con las condiciones de comisión compartida (50% del 5%), y lo separa del pipeline de compradores — nueva pestaña "Corredores" en el CRM.
- Botón "Borrar" en el CRM para prospectos que ya no tiene caso seguir (compraron en otro lado, número equivocado, etc.).
- 5 piezas de brochure nuevas revisadas y corregidas (tenían "alberca privada" y "elevador exclusivo" — en realidad son amenidades compartidas del condominio, no exclusivas del PH). Pendiente: subirlas a la galería y agregarlas a la rotación de redes (`lib/buffer.ts`).

---

## 3. Estado actual del sistema (resumen — ver `ESTADO.md` para el detalle vivo)

**Funciona:**
- Bot conversacional con IA (Claude) respondiendo por WhatsApp dentro de la ventana de 24h.
- Envío de fichas, fotos, PDFs.
- Identificación y respuesta automática a corredores/brokers.
- CRM con pipeline, bandeja de mensajes, vista de llamadas, vista de corredores, botón de borrar.
- Publicación automática diaria en redes sociales.
- Rescate de llamadas perdidas (vía Vapi/Twilio, número 8027).

**No funciona / limitado:**
- Reenganche a leads que dejaron de responder — plantillas rechazadas por Meta (cuenta en modo LIMITED).
- Número público 777-175-8412 sin conectar a la API oficial — bloqueado por la verificación de negocio rechazada.
- Alertas al asesor (número 527 774 9211 76) — el código existe y tiene lógica de respaldo con plantilla, pero no se ha confirmado con certeza que lleguen siempre.

**Detenido, no tocar:**
- Repo `chapultepec-bot` V1 (Baileys) — versión vieja, reemplazada por completo por la V2.

---

## 4. Reglas para cualquier sesión nueva

1. Lee este archivo y `ESTADO.md` ANTES de proponer cualquier diagnóstico o plan — no repetir investigación ya hecha.
2. El repo real es `cmoraleswest/chapultepec-bot-v2`. Si terminas trabajando en `chapultepec-bot` (sin `-v2`), estás en el repo equivocado — repite la Fase 4 de esta bitácora.
3. Verifica en vivo (Graph API, Vercel, git) antes de dar por buena cualquier afirmación de aquí que tenga más de unos días — las cosas cambian entre sesiones.
4. No proponer "esperar más" ni "reintentar el registro del número personal" como solución al bloqueo de Meta — la causa raíz ya está identificada (Fase 6) y tiene un plan concreto (sección 5). Si el plan cambió, esta bitácora debe actualizarse, no discutirse de cero en el chat.

---

## 5. Plan de trabajo vigente (Meta) — no empezar de cero, seguir aquí

1. Carlos crea un Business Portfolio **nuevo y separado** en Meta, con su nombre/negocio real — sin tocar ni mezclar con "Fernando Frausto Art".
2. Verificación de negocio en el portfolio nuevo, con documentos que coincidan exacto con el nombre registrado.
3. Una vez aprobado: crear un WhatsApp Business Account nuevo ahí, conectar el 777-175-8412.
4. Migrar credenciales del bot en Vercel al WABA/número nuevo — correr en paralelo con el 8027 actual hasta confirmar que el nuevo funciona igual de bien.
5. Solo hasta entonces, Carlos se sale de "Fernando Frausto Art" (no se puede borrar — no es el dueño legal de ese nombre de negocio).

**Antes de preguntar en qué paso va Carlos, revisa el chat/sesión actual — si no hay info, pregunta UNA vez en qué paso se quedó, y continúa desde ahí.**

**Estado del plan al 2026-08-25 (actualizado, tarde):** el paso 1 ya estaba hecho sin saberlo — Carlos ya tenía un Business Portfolio separado llamado **"Parque Chapultepec"** (business_id `286737720523042`), con 1 activo (página de Facebook/Instagram), sin mezcla con "Fernando Frausto Art" (business_id `358500678256951`, el que tiene el WhatsApp del bot, 0 activos en la vista de portfolios — el WABA no aparece contado ahí, verificar por qué). Confirmado por captura de pantalla de Meta Business Suite.

Aclaración de Carlos: "Parque Chapultepec" no es una razón social con RFC propio — él fue el desarrollador del proyecto, la constructora fue "Grupo Arcofin" (no confirmado si Carlos tiene RFC/poder para representar esa empresa — NO usar ese nombre a menos que se confirme). Decisión: verificar el portafolio "Parque Chapultepec" como **persona física** (Carlos Alberto Morales de la Vega, INE + comprobante de domicilio) — el nombre del portafolio no necesita ser una razón social, solo es el nombre comercial/visible; lo que falló antes fue que el negocio pertenecía a OTRA persona real (Fernando), no que "Parque Chapultepec" no tenga RFC.

**Plan revisado — paso siguiente:** Carlos entra al portafolio "Parque Chapultepec" → Configuración del negocio → Centro de seguridad → Verificación del negocio → verificar como persona física con INE + comprobante de domicilio. Una vez aprobado, crear el WhatsApp Business Account ahí y conectar el 777-175-8412 (pasos 3-5 del plan original sin cambios).

**Actualización 2026-08-24 8pm — verificación ENVIADA para Parque Chapultepec.** Carlos completó el flujo: confirmó conexión por SMS al 777-175-8412, subió documentos. Estado actual: **"En revisión"**, estimado ~2 días hábiles (Meta históricamente ha tardado hasta 14 días hábiles en casos anteriores — no alarmarse si se extiende). Nota: en la pantalla de Centro de seguridad de este portafolio también aparecía un mensaje residual de rechazo — probablemente resabio de la sesión vieja de Fernando Frausto Art, no una señal nueva sobre Parque Chapultepec; verificar en la próxima sesión que el estado "En revisión" siga siendo el vigente.

Encontrado en el camino: el portafolio "Parque Chapultepec" ya tenía 5 cuentas de WhatsApp Business vacías/de prueba (4 sin nombre distintivo + 1 "Test WhatsApp Business"), ninguna es el número live (8027, que sigue en Fernando Frausto Art). Son basura de intentos anteriores — seguras de borrar más adelante, no urgente.

**Próximo paso cuando se apruebe:** crear/usar una de esas cuentas de WhatsApp (o una nueva) dentro de "Parque Chapultepec" ya verificado, conectar el 777-175-8412 ahí, y migrar las credenciales del bot en Vercel. El 8027 en Fernando Frausto Art sigue sin tocarse hasta confirmar que el nuevo número funciona.

## 6. Estilo de comunicación acordado (2026-08-25)
Carlos compartió un prompt externo pidiendo respuestas ultra-comprimidas (sin saludos, sin explicación, formato mínimo). Se evaluó y se acordó: adoptar lo útil — mostrar solo diffs al editar código (no repetir archivos completos), ser directo, usar esta bitácora como memoria persistente en vez de resúmenes largos en el chat. **Rechazado explícitamente**: cualquier instrucción que reduzca las respuestas a una frase fija sin importar el contenido — eso oculta información crítica (como el rechazo de verificación de Meta) en vez de ahorrar tokens de forma útil.
