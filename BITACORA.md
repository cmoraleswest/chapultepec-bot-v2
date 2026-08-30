# BITÁCORA — Parque Chapultepec CRM/Bot

Historia completa del proyecto, para que ninguna sesión (de chat o de trabajo) tenga que volver a empezar de cero. `ESTADO.md` tiene el estado actual resumido; este archivo tiene el CÓMO llegamos aquí, para entender el porqué de cada decisión sin repetir errores ya resueltos.

Última actualización: 2026-08-30.

## 🔴 LEE ESTO PRIMERO — actualizado 2026-08-30, ver Fase 9 al final para el detalle completo

**Nuevo hallazgo sin resolver, posible causa raíz de toda la saga de Meta de abajo:** se encontró un tercer repo, `pchapultepec108-wq/chapultepec-bot`, con dos bots de WhatsApp NO oficiales (Baileys y whatsapp-web.js) diseñados para correr para siempre en el Mac de Carlos vía LaunchAgent, vinculados al mismo número 777 175 8412 que se está intentando verificar abajo. Si ese LaunchAgent sigue activo, es una explicación mucho más simple para los bloqueos "WhatsApp fuera de servicio" y rechazos de verificación que cualquier cosa de identidad de negocio. **Pendiente que Carlos verifique en su Mac — ver Fase 9.** No descartar el resto de este documento por esto: la causa raíz de la Fase 6 (identidad de negocio) puede seguir siendo válida en paralelo, no son mutuamente excluyentes.

**Verificación de Meta:** portafolio **"Carlos Morales - Parque Chapultepec WhatsApp"** (antes "Fernando Frausto Art", `business_id 358500678256951`) sigue **"En revisión"** para CARLOS ALBERTO MORALES DE LA VEGA, confirmado en vivo el 28-ago tanto por `health_status` de la Graph API como por el Centro de Seguridad de Meta — sin cambio desde que se envió el 26-ago. Estimado de Meta: ~2 días hábiles. **Si sigue igual pasado el 28-ago, escribir de nuevo al chat de soporte de Meta pidiendo seguimiento — no reintentar el formulario de verificación otra vez.**

El otro portafolio, **"Parque Chapultepec" (`286737720523042`)** — el que se creó en el plan viejo de la sección 5 — quedó **RECHAZADO** y descartado para WhatsApp. Solo se usa para la Página de Facebook/Instagram que publica Buffer.

**Dato importante para cuando se apruebe:** el portafolio bueno ya tiene, HOY, los dos números conectados con calidad Alta — el 8027 (WABA `1923471098361486`, el que usa el bot) y el **175-8412 (WABA `1964573394173039`, nunca usado por el código)**. No hace falta crear nada nuevo ni migrar de portafolio — cuando se apruebe, el límite de mensajes se levanta para ambos a la vez. Ahí decidir con Carlos si vale la pena cambiar el bot al 175 (su número público real) en vez del 8027 invisible.

**Reparado hoy (26 al 28-ago):**
- `BUFFER_API_KEY` había caducado (duraba solo 30 días) y detuvo las publicaciones automáticas 10 días — regenerada con vencimiento a 1 año, **confirmado con una publicación real exitosa en las 3 redes el 27-ago 13:49 UTC**.
- Precio del departamento corregido de $2,800,000/$2,900,000 a **$3,000,000** en: código (ya estaba bien), `ficha-departamento.pdf/jpg` (editado a nivel píxel con Python/PIL, es la que se manda a leads reales), 4 piezas de la galería (`depto-ficha.jpg`, `depto-hero.jpg`, `ph-imagen-wa.jpg`, `comparativa.jpg`), y la etiqueta `INTERES_LABEL` del CRM en `app/page.tsx` (decía "$2.9M").
- Seguridad de la cuenta de Meta de Carlos: se quitó un número de teléfono viejo que ya no controla de los contactos de recuperación, se creó una llave de acceso (passkey) en su Mac, y se activó autenticación en dos pasos por SMS. **Sigue pendiente:** agregar un administrador de respaldo — Carlos no tiene a nadie de confianza para agregar, sin resolver.
- Portafolio renombrado de "Fernando Frausto Art" a "Carlos Morales - Parque Chapultepec WhatsApp" (cosmético, no afectó la verificación).
- 4 fotos reales nuevas del departamento amueblado agregadas a la galería (`depto-real-*.jpg`); una ya está en la rotación de `lib/buffer.ts`.
- Vista "Llamadas" del CRM: se agregó tiempo relativo ("· hace 1d") junto a la fecha — ya estaba ordenada correctamente (reciente arriba), no había bug real ahí.
- **Confirmado con Meta:** las plantillas `seguimiento_24h`, `seguimiento_48h`, `cierre_7dias`, `info_ambas_propiedades`, `info_penthouse_chapultepec`, `recordatorio_cita_chapultepec` y `alerta_lead_asesor` están TODAS aprobadas — el dato viejo de "4 plantillas sin aprobar" ya no aplica.

**Pendiente real sin resolver:**
1. Freno anti-reintentos en `lib/drip.ts` (ver sección 6) — se encontraron 147 reintentos al mismo número en 2 meses, patrón que Meta puede leer como spam. Esperar a que resuelva la verificación antes de tocar esa lógica.
2. Administrador de respaldo en la cuenta de Meta — depende de que Carlos tenga a alguien de confianza.
3. Cero citas agendadas activas en el CRM — el embudo conversa pero no cierra visita; 3 leads Calificados (`527771312084`, `525543694285`, `527775601413`) con ventana cerrada, necesitan plantilla o llamada.
4. `~80` fotos/videos sin revisar visualmente todavía en `chapultepec-fotos/public/galeria/` (se revisó una parte por calidad — ver ESTADO.md de ese repo).

---

**Nota de nombre:** el portafolio de Meta al que este documento se refiere como "Fernando Frausto Art" se RENOMBRÓ el 26-ago-2026 a **"Carlos Morales - Parque Chapultepec WhatsApp"** (mismo business_id `358500678256951`, solo cambió el nombre visible — no se movió ningún activo). El nombre viejo se deja tal cual en el resto de este archivo porque así se llamaba en el momento de cada evento histórico; en Meta ya no aparece con ese nombre.

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

## 5. Plan de Meta del 25-ago — SUPERADO, ver Fase 8 arriba para el plan vigente

**Este plan falló (el portafolio nuevo fue rechazado) — se deja completo abajo solo como registro histórico de qué se intentó. No seguir estos pasos, leer la Fase 8 en su lugar.**

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

**Corrección + dato para la migración (2026-08-24 9pm):** Carlos SÍ tiene control total sobre "Fernando Frausto Art" — la pantalla de Configuración del negocio dice explícito "Carlos MV puede eliminar el portfolio comercial cuando quiera". No es un tema de permisos de otra persona; el "no me deja borrarlo" de antes fue probablemente porque Meta bloquea el borrado mientras el portfolio tenga activos asignados (no por falta de dueño).

Inventario de "Fernando Frausto Art": **5 cuentas de WhatsApp** + **1 app: "Parque Chapultepec Bot"** (esta es la app de Meta for Developers que tiene el token/webhook del bot conectado — ver `WHATSAPP_TOKEN` en Vercel). Cuando llegue el paso de migración, esta app necesita moverse o recrearse dentro del portafolio "Parque Chapultepec" — como Carlos controla ambos negocios, Meta permite compartir/transferir activos entre ellos sin fricción. Anotar esto para la Fase 4 del plan (migrar credenciales en Vercel).

### Fase 8 — El plan de portafolio nuevo FRACASÓ, se reparó el original en su lugar (26 de agosto)

**El plan de la sección 5 (crear un portafolio nuevo "Parque Chapultepec" y migrar el 175 ahí) YA NO ES EL PLAN VIGENTE — falló.** Verificado en vivo el 26-ago: el portafolio "Parque Chapultepec" (`286737720523042`) tiene su verificación de negocio en estado **"Rechazada"** ("No se pudo verificar", sin razón específica mostrada por Meta). Ese portafolio solo sirve hoy para la Página de Facebook/Instagram que usa Buffer para publicar — no tiene ningún WhatsApp real conectado (sus 5 cuentas de WhatsApp están vacías, confirmado).

En paralelo, sin saber del plan de la sección 5 (esta sesión no había leído la bitácora todavía), se corrigió el problema real dentro de **"Fernando Frausto Art" (`358500678256951`)** — el campo "Nombre legal del negocio" tenía un error de tipeo ("Parque Chapulteepc" en vez del nombre real de Carlos), se corrigió a "Carlos Alberto Morales De La Vega" exacto como el RFC, se volvieron a subir documentos, y Meta aceptó la solicitud: **estado actual "En revisión"**, confirmado también por el chat de soporte de Meta, resolución estimada ~28-ago-2026.

**Dato clave que cambia todo el plan:** "Fernando Frausto Art" YA TIENE, hoy, funcionando, con calidad Alta, **ambos números conectados** — el 8027 (WABA `1923471098361486`, el que usa el bot) Y el 175-8412 (WABA `1964573394173039`, nunca usado por el código). La afirmación histórica de que "el 175 está baneado" o que "no se puede conectar mientras el negocio no esté verificado" era falsa — alguien ya lo conectó exitosamente en algún momento, simplemente nadie lo usó en el bot.

**PLAN VIGENTE ahora (reemplaza la sección 5 por completo):**
1. Esperar la resolución de la revisión de "Fernando Frausto Art" (~28-ago). Si se aprueba: el límite de mensajes se levanta automáticamente para TODO el portafolio, incluyendo ambos números, sin necesitar ninguna migración.
2. Si se aprueba, decidir con Carlos si migrar el bot para que use el 175 (el número real de su publicidad) en vez del 8027 invisible — es un cambio de código (env vars + re-suscribir webhook a la WABA `1964573394173039`), no de activos de Meta, así que es seguro hacerlo cuando se decida, con cuidado de no perder la conexión actual del 8027 hasta confirmar que el 175 funciona igual de bien en producción.
3. Si la revisión de "Fernando Frausto Art" también se rechaza: replantear con Meta soporte directamente, dado que van dos rechazos con nombres de persona física correctos — puede requerir escalar el caso, no repetir el mismo formulario una tercera vez sin ayuda humana de Meta.
4. El portafolio "Parque Chapultepec" (`286737720523042`) NO se va a seguir usando para intentar verificar WhatsApp — se queda solo como dueño de la Página de Facebook/Instagram. Sus 5 cuentas de WhatsApp vacías y su verificación rechazada no requieren ninguna acción.

**No repetir el error de la sección 5** (ya tachada abajo, se deja como registro histórico de qué se intentó y por qué no funcionó) — la próxima sesión debe leer esta Fase 8, no la sección 5, para saber el estado real.

## 6. Pendiente — freno anti-reintentos (detectado 26-ago-2026)
Carlos compartió un video de TikTok sobre cuentas de WhatsApp restringidas por Meta al detectar "actividad que parece spam, mensajes automáticos o masivos". Esa pantalla específica es de la app de consumidor (no aplica igual a la API oficial que usa este bot), pero el mecanismo de fondo es el mismo que ya se había visto en producción: el error 131049 ("healthy ecosystem engagement") usa literalmente ese lenguaje.

Se encontró en la auditoría del mismo día que el sistema reintentó el mismo mensaje 147 veces en 2 meses al número de pruebas de Carlos, y varias veces en un solo día a leads reales — ese patrón de reintento es justo lo que Meta interpreta como comportamiento automatizado sospechoso.

**Pendiente:** revisar `lib/drip.ts` y el manejador de `statuses` en `app/api/webhook/route.ts` para agregar un freno que evite reintentar el mismo mensaje al mismo número más de 1-2 veces por día. No se hizo todavía — esperar a que se resuelva la verificación de negocio (~28-ago) antes de tocar esta lógica, para no mezclar dos cambios a la vez sobre el mismo sistema.

## 7. Estilo de comunicación acordado (2026-08-25)
Carlos compartió un prompt externo pidiendo respuestas ultra-comprimidas (sin saludos, sin explicación, formato mínimo). Se evaluó y se acordó: adoptar lo útil — mostrar solo diffs al editar código (no repetir archivos completos), ser directo, usar esta bitácora como memoria persistente en vez de resúmenes largos en el chat. **Rechazado explícitamente**: cualquier instrucción que reduzca las respuestas a una frase fija sin importar el contenido — eso oculta información crítica (como el rechazo de verificación de Meta) en vez de ahorrar tokens de forma útil.

## 8. Fase 9 — Auditoría de estabilidad + repo V1 no documentado (30-ago-2026)

**Motivo de la sesión:** Carlos reportó "se traba, se congela y se frena con datos reales" (95 leads activos) y pidió auditoría completa antes de tocar nada.

**Diagnóstico, confirmado en vivo contra Supabase real** (proyecto `qntdyfhcxwmmfgamppbq`, 95 leads, 1255 interacciones vía MCP de Supabase): el volumen de datos NO es el problema — las vistas `bandeja` y `solo_llamada` resuelven instantáneo a este tamaño (se descarta la sospecha inicial de falta de índices). La causa real es tiempo de ejecución server-side:

1. `app/api/cron/route.ts` y `app/api/webhook/route.ts` no tenían `maxDuration` — corrían con el límite por defecto de Vercel (10s en Hobby). El cron encadena drip + recordatorios de cita + publicación en 3 redes en secuencia; el webhook encadena hasta 3 llamadas a Claude en `after()`. Sin el límite explícito, Vercel puede cortar la ejecución a la mitad sin ningún error visible en los logs.
2. `lib/drip.ts` procesaba los ~56 leads activos 100% en secuencia (varias consultas a Supabase + un envío a Meta por lead, todo esperado uno tras otro) — con datos reales esto ya se acerca al límite de duración.
3. `app/page.tsx` disparaba la alerta "🔔 MENSAJE NUEVO" comparando `actualizado_en` de cada lead — columna que cambia con CUALQUIER update a la fila, no solo cuando escribe el cliente. Cada acción de Carlos en el CRM (mover de columna, apagar el bot, borrar) generaba una alerta falsa que se acumulaba sin limpiarse sola — coincide exactamente con el síntoma reportado de que el panel "se siente cada vez más lento" durante una sesión larga de trabajo real.

**Reparado y subido a la rama `fix/estabilidad-cron-y-alertas-falsas`** (NO mergeada a `main`, NO desplegada — el deploy sigue siendo manual vía Vercel CLI, así que esta rama no cambia nada en producción hasta que Carlos revise el diff y decida desplegar): `maxDuration = 60` en ambas rutas, `lib/drip.ts` paralelizado a 5 leads a la vez (función `conLimite`), y la detección de "mensaje nuevo" movida a comparar el último mensaje ENTRANTE real de la vista `bandeja` en vez de `actualizado_en`. Validado con `tsc --noEmit` y `next build` limpios — no se corrió `test-suite.js` porque escribe en la base de producción real y requiere llaves que esta sesión no tenía.

**Explícitamente NO tocado, a propósito:** el freno anti-reintentos de `lib/drip.ts` (sección 6, sigue esperando la verificación de Meta) y la autenticación del CRM por token estático `?t=chap2026` (embebido en el bundle del cliente — cualquiera con la URL del RUNBOOK tiene control total; es un cambio de arquitectura que Carlos debe aprobar aparte, no es un problema de rendimiento).

**Hallazgo nuevo, no documentado en ninguna sesión anterior — repo `pchapultepec108-wq/chapultepec-bot`:** Carlos lo compartió a mitad de la sesión mencionando que ha intentado (sin lograrlo del todo) darle a cada proyecto su propia cuenta de GitHub, y que por eso hay cuentas y versiones distintas regadas. Este repo en particular:

- Es una copia/backup de la V1 (mismo autor de commits, `cmoraleswest@gmail.com`, pero alojado en la cuenta `pchapultepec108-wq`) — NO es el mismo repo que `cmoraleswest/chapultepec-bot` (rama `respaldo-mac`) mencionado en la Fase 2. Puede haber una TERCERA copia de la V1 dando vueltas — no se auditó esa por falta de tiempo en esta sesión.
- Contiene DOS bots de WhatsApp no oficiales: `index.js` (Baileys) y `bot.js` (whatsapp-web.js + Puppeteer/Chrome headless). Ambos se vinculan por QR a un número real, no usan la API oficial de Meta.
- `import-whatsapp.js:65` confirma que el número es **777 175 8412** — el mismo número de la saga de verificación de las Fases 3 y 6.
- `TRD.md` de ese repo documenta que corre como **LaunchAgent de macOS con `KeepAlive`**, y `index.js:417-421` tiene lógica explícita para reconectarse cuando "otro cliente" (código 440) le quita la sesión — es decir, está diseñado para pelear por el control de la sesión de WhatsApp de ese número, indefinidamente, si el LaunchAgent sigue instalado.
- Apunta a un Supabase distinto (`gnarxxwxagstuspkbvql.supabase.co`), así que no corrompe los datos reales del CRM — pero si sigue corriendo, puede estar contestando a leads reales con precios viejos ($2,800,000 en vez de $3,000,000) sin que aparezca en ningún lado del CRM real.

**Hipótesis fuerte, NO confirmada — pendiente que Carlos la verifique en su Mac, ninguna sesión de chat tiene acceso:**
```bash
launchctl list | grep -i chapultepec
ls -la ~/Library/LaunchAgents/ | grep -i chapultepec
ps aux | grep -iE "chapultepec-bot|baileys|whatsapp-web" | grep -v grep
```
Si alguno muestra algo: es un cliente no oficial peleando por la sesión del mismo número que se está intentando verificar con la API oficial — candidato muy fuerte para explicar meses de bloqueos "WhatsApp fuera de servicio" y rechazos de verificación, más simple que la explicación de identidad de negocio de la Fase 6 (que puede seguir siendo válida en paralelo — no son excluyentes). Apagarlo y borrar el LaunchAgent antes de seguir con cualquier diagnóstico de Meta.

**Resultado, confirmado en vivo el 30-ago-2026 por Carlos:**
```
launchctl list | grep -i chapultepec        →  (vacío — nada cargado ahora mismo)
ps aux | grep -iE "chapultepec-bot|baileys|whatsapp-web"   →  (vacío — nada corriendo ahora mismo)
ls -la ~/Library/LaunchAgents/ | grep -i chapultepec:
  com.chapultepec.bot.plist       (8-jun-2026)
  com.chapultepec.publicar.plist  (6-jun-2026)
```
**Conclusión parcial:** ahora mismo NINGÚN proceso está peleando por la sesión de WhatsApp — la hipótesis de "conflicto activo hoy" queda descartada para este momento puntual. Pero los dos `.plist` siguen guardados en `~/Library/LaunchAgents/`, solo que no cargados en esta sesión del sistema — si el Mac se reinicia y algo los vuelve a cargar (o alguien corre `launchctl load` sobre ellos), se reactivarían solos sin aviso. Es una bomba de tiempo, no un peligro descartado del todo.

`com.chapultepec.publicar.plist` es un hallazgo nuevo sin documentar en ninguna sesión anterior — no se sabe todavía qué programa dispara ni con qué frecuencia (posible candidato: los scripts `publicar-diario.mjs`/`programar-semana.js` del repo V1, que publicarían en redes por su cuenta, separado del cron de Buffer que usa V2 hoy). **Pendiente:** Carlos comparte el contenido de ambos plist (`plutil -p ~/Library/LaunchAgents/com.chapultepec.bot.plist` y lo mismo para `publicar`) para confirmar qué comando/ruta ejecutan, y luego decidir si se borran los archivos por completo (recomendado, ya que V1 está oficialmente retirado) o se dejan pero marcados como deshabilitados explícitamente.
