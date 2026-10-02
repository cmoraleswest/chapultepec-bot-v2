# BITÁCORA — Parque Chapultepec CRM/Bot

Historia completa del proyecto, para que ninguna sesión (de chat o de trabajo) tenga que volver a empezar de cero. `ESTADO.md` tiene el estado actual resumido; este archivo tiene el CÓMO llegamos aquí, para entender el porqué de cada decisión sin repetir errores ya resueltos.

Última actualización: 2026-09-02.

## 🔴 LEE ESTO PRIMERO — actualizado 2026-09-02, ver Fase 11 al final para el detalle completo

**Confirmado en vivo 02-sep-2026 (sesión de chat, sin acceso al Mac):** producción está al día — el deployment activo en Vercel coincide exacto con el commit `8d1976f` (HEAD de `main`). Nada de la rama `fix/estabilidad-cron-y-alertas-falsas` mencionada en la Fase 9 sigue pendiente de desplegar; ya está en `main` y en producción. Si una sesión futura ve esa rama mencionada como "sin desplegar" en las secciones de abajo, ese dato ya es viejo — confiar en este párrafo o volver a verificar contra Vercel antes de repetir el diagnóstico.

**Verificación de Meta — actualización 02-sep-2026, ver Fase 11 para el detalle completo:** sigue "En revisión", van 6 días hábiles de los 14 que Meta mismo cita como plazo normal — todavía NO está atrasado según su propio criterio, aunque se sienta lento. Confirmado por Graph API en vivo: error técnico real es el código `141010` a nivel BUSINESS ("The Business has not passed business verification"), y la aprobación del nombre para mostrar del número 8027 está atada a esa misma verificación, no es un trámite aparte. Enlaces de escalación ya obtenidos y guardados por si se pasa del plazo — ver Fase 11.

**Nuevo hallazgo sin resolver, posible causa raíz de toda la saga de Meta de abajo:** se encontró un tercer repo, `pchapultepec108-wq/chapultepec-bot`, con dos bots de WhatsApp NO oficiales (Baileys y whatsapp-web.js) diseñados para correr para siempre en el Mac de Carlos vía LaunchAgent, vinculados al mismo número 777 175 8412 que se está intentando verificar abajo. Si ese LaunchAgent sigue activo, es una explicación mucho más simple para los bloqueos "WhatsApp fuera de servicio" y rechazos de verificación que cualquier cosa de identidad de negocio. **Pendiente que Carlos verifique en su Mac — ver Fase 9.** No descartar el resto de este documento por esto: la causa raíz de la Fase 6 (identidad de negocio) puede seguir siendo válida en paralelo, no son mutuamente excluyentes.

**Verificación de Meta:** portafolio **"Carlos Morales - Parque Chapultepec WhatsApp"** (antes "Fernando Frausto Art", `business_id 358500678256951`) sigue **"En revisión"** para CARLOS ALBERTO MORALES DE LA VEGA — **re-confirmado en vivo el 30-ago** directo en el Centro de Seguridad de Meta Business Suite (captura de pantalla revisada con Carlos), sin cambio desde que se envió el 26-ago. Ya se pasó el estimado original de Meta (~2 días hábiles, o sea 28-ago) por 2 días — no es alarmante todavía (Meta ha tardado hasta 14 días hábiles en casos anteriores de este mismo proyecto), pero según el plan de la Fase 8: **siguiente paso es escribir de nuevo al chat de soporte de Meta pidiendo seguimiento — NO reintentar el formulario de verificación una tercera vez.** Pendiente que Carlos lo haga (acceso a su cuenta de Meta, ninguna sesión de chat puede hacerlo por él). No se pudo confirmar `health_status`/quality rating del número 8027 vía Graph API en esta sesión (no había token disponible sin pedirle a Carlos que lo pegara en el chat — ver el incidente de llaves expuestas más abajo en esta misma Fase 9).

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
5. **Mapa completo de repos/ramas — auditado 30-ago-2026, ver Fase 9 para el detalle.** Hay CUATRO copias del sistema, no dos:

| Repo | Rama | Dueño | Último commit | Qué es |
|---|---|---|---|---|
| `chapultepec-bot-v2` | `main` | cmoraleswest | vivo, hoy | ✅ **La única real. La única que se despliega a producción.** |
| `chapultepec-bot` | `main`+`respaldo-mac` | cmoraleswest | 16-ago (post V2, pero es V1) | 📦 **ARCHIVADO 30-ago-2026.** V1 con Baileys. La rama `respaldo-mac` tenía MÁS funcionalidad que el resto de V1 (`services/drip.js`, `omnicanal.js`, `scheduler.js`, `webhooks-ads.js`, vinculación por código de emparejamiento SMS/llamada) y se veía como "la versión avanzada real" sin serlo — autor del último commit ahí: una sesión de Claude, no Carlos. Ya no puede confundir a nadie: repo de solo lectura con etiqueta visible. |
| `chapultepec-bot` | — | `pchapultepec108-wq` (cuenta de GitHub separada) | 10-jun | 📦 **ARCHIVADO 30-ago-2026.** Copia de una versión intermedia de V1, con dos motores de WhatsApp no oficiales (Baileys + whatsapp-web.js/Puppeteer). |

Ninguna de las tres copias muertas estaba corriendo activamente cuando se auditó (ver hallazgo de LaunchAgent en Fase 9), y ahora las tres quedaron archivadas en GitHub — de solo lectura, con etiqueta visible, imposible confundirlas con la real por accidente.

**Archivados, confirmado por Carlos el 30-ago-2026 — LOS TRES:** `cmoraleswest/chapultepec-bot` (cubre `main` y `respaldo-mac`) y `pchapultepec108-wq/chapultepec-bot` — ambos ya aparecen como "Archived"/solo lectura en GitHub. Mapa de repos de la sección 4 queda 100% resuelto: la única copia activa y desplegable es `chapultepec-bot-v2`.

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

`com.chapultepec.publicar.plist` es un hallazgo nuevo sin documentar en ninguna sesión anterior. Contenido completo, confirmado por Carlos (`plutil -p`):

- **`com.chapultepec.publicar`** — corre `node /Users/maccarlosmoraless/chapultepec-bot/publicar-diario.mjs` todos los días a las **7:00 AM hora local** (`StartCalendarInterval`), justo la misma hora en que el cron real de Vercel publica en redes (13:00 UTC = 7am CDMX). Traía credenciales reales en `EnvironmentVariables` (Anthropic, Buffer, y el anon key del Supabase viejo `gnarxxwxagstuspkbvql`) — **Carlos las pegó en el chat sin querer, se le indicó rotarlas de inmediato como acción prioritaria, fuera de este documento** (no se registran los valores aquí).

**Rotación de llaves — progreso:**
- ✅ **Anthropic** — confirmado 30-ago: la llave expuesta estaba guardada en el console de Anthropic con el nombre `whatsapp-chapultepec` — DISTINTA a `chapultepec-v2-produccion` (la que usa el Vercel real, no se tocó). Carlos la borró del console. No hizo falta redeploy en Vercel porque nunca compartieron la misma llave.
- ✅ **Buffer** — confirmado 30-ago: en la cuenta de Buffer de Carlos solo existe UNA llave activa, `chapultepec-bot-v2 produccion` (creada 26-ago-2026, la real, no se tocó). La llave expuesta en el chat (`D8n8VswNRv...`) es la vieja de 30 días documentada en la Fase 8 — ya había caducado sola el 17-ago-2026, antes de la regeneración del 26-ago. No requirió ninguna acción.
- ✅ **Supabase del proyecto viejo** (`gnarxxwxagstuspkbvql`, org Supabase separada bajo la cuenta `pchapultepec108-wq`) — confirmado 30-ago: el proyecto está PAUSADO y además con "restricciones de servicio activas" desde el 14-jun-2026 por agotar la cuota del plan gratuito. La llave `anon` expuesta no puede hacer nada mientras siga así. Decisión: NO reactivar el proyecto solo para rotar una llave de un sistema ya muerto — dejarlo pausado es más seguro que reactivarlo.

**Las 3 llaves expuestas en el chat quedan resueltas — ninguna representa un riesgo activo hoy.**
- **`com.chapultepec.bot`** — corre `node /Users/maccarlosmoraless/chapultepec-bot/index.js` (el bot con Baileys) con `KeepAlive: true` + `RunAtLoad: true` — confirma que si se recarga, arranca solo y se reinicia solo indefinidamente, exactamente el mecanismo sospechado.

**Resultado final, confirmado en vivo el 30-ago-2026:** ninguno de los dos tiene rastro de haber corrido nunca — `/tmp/chapultepec-publicar.log`, `/tmp/chapultepec-bot.log` y `/tmp/chapultepec-bot-error.log` no existen (si hubieran corrido aunque fuera una vez, macOS habría creado esos archivos). **Corrección importante a la hipótesis de arriba:** esto NO confirma que el bot V1 haya causado los meses de bloqueos de verificación de Meta — no hay evidencia de que haya corrido en este Mac. La explicación de identidad de negocio de la Fase 6 sigue siendo la mejor explicación real disponible; este hallazgo solo cierra un riesgo *futuro* (si alguien recarga estos plists más adelante), no explica el pasado.

**Hecho, confirmado el 30-ago-2026:** Carlos corrió `launchctl bootout` + `mv` sobre los dos `.plist`, movidos a `~/Desktop/plists-chapultepec-v1-desactivados/`. Verificado con `ls ~/Library/LaunchAgents/ | grep -i chapultepec` → vacío. Ya no pueden recargarse solos ni siquiera después de un reinicio. El código de V1 se queda intacto en `~/chapultepec-bot` por si algún día se necesita revisar, solo se quitó el mecanismo de auto-arranque.

**Contacto con soporte de Meta — hecho, 30-ago-2026:** Carlos escribió al chat de soporte de Meta Business preguntando por el estado de la verificación de "Carlos Morales - Parque Chapultepec WhatsApp" (`business_id 358500678256951`). Respuesta del asistente: confirma estado **"pending"**, sin información nueva más allá de lo ya sabido — sugiere seguir monitoreando el Centro de Seguridad y las notificaciones/correo del admin, y verificar que los documentos coincidan exacto con el nombre legal (referencia a la discrepancia de nombre de la Fase 6, ya corregida el 26-ago). No se escaló a agente humano en esta sesión — si sigue igual varios días más, la siguiente sesión puede pedir explícitamente escalar a un humano.

**CIERRE DE LA FASE 9 — todo lo accionable de esta sesión quedó resuelto:**
- ✅ Código de estabilidad — rama `fix/estabilidad-cron-y-alertas-falsas`, **pendiente que Carlos la despliegue a producción** (`vercel --prod`) para que los fixes tomen efecto.
- ✅ 3 llaves expuestas — resueltas (1 revocada, 2 ya inertes).
- ✅ 3 repos/ramas V1 — archivados.
- ✅ LaunchAgents del Mac — desactivados y movidos, verificado.
- ✅ Seguimiento con soporte de Meta — hecho, sigue "pending", nada nuevo que hacer por ahora salvo esperar o volver a escribir en unos días.

No queda ningún pendiente accionable de esta sesión sin resolver.

## 9. Bug real encontrado y corregido — `alertarCarlos()` nunca llegaba a Carlos (30-ago-2026, continuación de la Fase 9)

Carlos reportó que las alertas de "lead quiere agendar cita" (para que él dé seguimiento manual) dejaron de llegarle. Verificado en vivo contra Supabase:

- 3 leads reales pasaron a estado "Calificado" con `bot_activo=false` los últimos 3 días (527775601413, 525543694285, 527771312084) — la detección de intención SÍ funciona.
- Carlos confirmó: ninguna de las 3 alertas le llegó al 777 492 1176 (el número correcto, no es confusión de destino).
- **178 registros `[NO ENTREGADO]`** en `interacciones`, todos contra el lead de Carlos mismo, códigos 131047 ("re-engagement... 24h") y 131049 ("healthy ecosystem engagement").

**Causa raíz confirmada:** `alertarCarlos()` en `app/api/webhook/whatsapp.ts` decidía si ya se había mandado la alerta según el HTTP 200 de `enviarTexto()` — pero ese 200 solo confirma que Meta ACEPTÓ la petición, no que la entregó. Fuera de la ventana de 24h (el caso normal para Carlos, que casi nunca le escribe al bot) Meta acepta la petición igual y avisa "failed" minutos después por el webhook de status — para entonces la función ya había regresado dando la alerta por buena, y la plantilla de respaldo (`alerta_lead_asesor`, la única que sí puede entregarse fuera de la ventana) **nunca se intentaba**. Es el mismo bug que ya se había diagnosticado y corregido en `PUT /api/leads` (`route.ts:238-248`, ver el comentario ahí) — ese arreglo nunca se replicó en `alertarCarlos()`.

**Corregido:** ahora `alertarCarlos()` revisa `ventanaAbierta()` del lead de Carlos ANTES de intentar texto libre, igual que el resto del sistema.

## 10. DESPLEGADO A PRODUCCIÓN — 30-ago-2026, sesión cerrada

Carlos hizo merge de `fix/estabilidad-cron-y-alertas-falsas` a `main` (fast-forward, `0190edf..8d1976f`) y corrió `vercel --prod` desde su Mac. Confirmado en la terminal: `✅ Production: ... [30s]` y `🔗 Aliased: https://chapultepec-bot-v2.vercel.app`. **Todos los fixes de esta sesión están en vivo:**

1. `maxDuration=60` en `/api/cron` y `/api/webhook`.
2. Drip paralelizado a 5 leads a la vez.
3. Alertas falsas de "MENSAJE NUEVO" corregidas (ya comparan mensaje entrante real, no `actualizado_en`).
4. **`alertarCarlos()` corregido** — revisa la ventana antes de intentar texto libre. Este es el que más importa: antes de este deploy, 178 alertas de "lead quiere agendar cita" se habían perdido en silencio.

**Para la próxima sesión, verificar:** con el próximo lead real que llegue a "Calificado" (intención de agendar cita), confirmar que la alerta SÍ le llegó a Carlos al 777 492 1176 — no se pudo probar en producción antes de desplegar, así que esta es la primera vez que corre con el fix puesto.

**Intento de prueba del 31-ago, sin resultado útil — anotar para no repetir el error:** Carlos probó mandándole "Test" desde su propio número (527774921176, el mismo que `NUMERO_PRUEBAS`/`TEL_CARLOS`) al bot. Confirmado en Supabase: el mensaje SÍ llegó (08:39:23), el bot SÍ contestó ("¿En qué te puedo ayudar?", 08:39:27) y quedó `ultimo_status: delivered` — el sistema básico está sano. **Pero esa prueba nunca iba a activar la alerta**, y no por ningún bug: `evaluarFiltros()` en `filtros.ts` marca los mensajes desde `NUMERO_PRUEBAS` como `PROCESAR_PRUEBA`, y en `route.ts` el parámetro `avisar` que se le pasa a `processIntelligentAgent()` es `filtro === 'PROCESAR_REAL'` — falso para `PROCESAR_PRUEBA`. Es decir: **Carlos escribiéndose a sí mismo desde el 777 492 1176 NUNCA genera alerta, por diseño** (evita que se spamee a sí mismo en cada prueba), desde mucho antes de esta sesión. Para probar `alertarCarlos()` de verdad hace falta que el mensaje llegue desde un número DISTINTO al 777 492 1176 — Carlos no tenía disponible un segundo número al cierre de esta sesión, queda pendiente para cuando lo tenga o llegue un lead real.

## ✅ CONFIRMADO EN PRODUCCIÓN — 31-ago-2026, el fix de `alertarCarlos()` funciona

Sin necesitar un segundo teléfono: se simuló un mensaje entrante real contra el webhook de producción (`curl` desde la Mac de Carlos, `POST /api/webhook`, número sintético `529990000001`, mismo que usa `test-suite.js` — verificado que no colisiona con ningún lead real). Resultado, confirmado en Supabase:

- Mensaje recibido, clasificado, ficha de las 2 propiedades + 4 fotos enviadas — mismo camino que un lead real de primer contacto.
- Los 5 envíos fallaron su entrega real (131026, número sintético sin WhatsApp) — esperado y correcto, no es el bug.
- **Carlos confirmó que le llegó la alerta a su WhatsApp (777 492 1176)** con el texto "Se le mandó la ficha de LAS DOS propiedades..." — la ventana de 24h estaba abierta (por su propia prueba de "Test" minutos antes), así que corrió por el camino de texto libre, el mismo que antes fallaba en silencio.

**El bug de los 178 fallos queda confirmado como reparado, de punta a punta, en producción real.** Lead de prueba (`529990000001`) borrado de Supabase después de confirmar — no queda basura en el CRM.

Sigue pendiente, de menor prioridad: confirmar el camino de la PLANTILLA de respaldo (cuando la ventana de Carlos esté cerrada) — la prueba de hoy solo ejercitó el camino de texto libre porque la ventana estaba abierta por coincidencia. Probar de nuevo cuando hayan pasado >24h desde el último mensaje de Carlos al bot, para confirmar que la plantilla `alerta_lead_asesor` también entrega bien.

**Pendientes que quedaron fuera de esta sesión, sin resolver:** freno anti-reintentos de `lib/drip.ts` (sección 6, sigue esperando verificación de Meta), token estático del CRM (`?t=chap2026`, decisión de arquitectura pendiente de Carlos), 115 llamadas rescatadas sin seguimiento marcado, ficha-departamento.pdf con precio viejo aún sin regenerar, administrador de respaldo en la cuenta de Meta.

## 11. Auditoría completa + seguimiento de verificación de Meta (02-sep-2026)

**Motivo de la sesión:** Carlos pidió una auditoría completa ("que todo funcione bien") y revisar Meta específicamente.

**Confirmado en vivo, sin cambios de código necesarios:**
- El deployment de producción en Vercel coincide exacto con `main` (commit `8d1976f`) — la rama de estabilidad de la Fase 9 ya está desplegada, contra lo que decían ESTADO.md/BITACORA.md en ese momento (esos archivos quedaron desactualizados en ese punto específico, ya corregido arriba en "LEE ESTO PRIMERO").
- `next build` limpio, sin errores de tipos ni sintaxis.
- Número 8027: `quality_rating GREEN`, `status CONNECTED`, app sigue suscrita al WABA.
- Buffer: token válido, publicación automática del día (02-sep 13:49 UTC) confirmada exitosa en Facebook/Instagram/TikTok.
- `[NO ENTREGADO]`: solo 2 en las últimas 48h contra 178 históricos — la reparación de `alertarCarlos()` de la Fase 9 está funcionando.
- Snapshot del CRM: 96 leads (42 No Interesado, 37 Nuevo, 11 En Conversación, 3 Calificado, 3 No Contactar), 0 corredores nuevos, interés registrado: 16 Penthouse, 7 Departamento, 73 sin definir. Sigue en 0 citas agendadas activas — mismo cuello de botella de la Fase 9.

**Verificación de Meta — seguimiento activo con soporte:**

Se contactó de nuevo el chat de soporte de Meta Business (02-sep-2026), con estos datos obtenidos en vivo vía Graph API (`health_status` del `phone_number_id` 1171134882752298) para darle al bot de soporte algo concreto en vez de solo "sigo esperando":

- Error `141010` a nivel entidad BUSINESS (`358500678256951`): "The Business has not passed business verification." — confirma que el `messaging_limit_tier: TIER_250` viene directo de la verificación pendiente.
- Hallazgo nuevo: el `health_status` también trae `"Your display name has not been approved yet. Your message limit will increase after the display name is approved."` — parecía un trámite aparte, pero el soporte de Meta confirmó que está atado sistémicamente a la verificación del negocio, se resuelve solo cuando esa se apruebe. No requiere ninguna acción separada de Carlos.
- `code_verification_status: "EXPIRED"` en el número 8027 — visto en el mismo `health_status`, sin explorar más en esta sesión; no se mencionó como problema activo por soporte de Meta. Anotar por si una sesión futura lo necesita.
- Meta confirmó explícitamente: NO reenviar el formulario de verificación ni tocar el nombre del negocio — reinicia el contador de revisión.
- Plazo que Meta mismo cita: 14 días hábiles desde el reenvío (26-ago-2026). Al 02-sep van 6 días hábiles — dentro del rango normal, no atrasado todavía según su propio criterio, aunque ya se había pasado la estimación optimista original de ~2 días hábiles.
- Enlaces de escalación obtenidos y guardados (en `~/Desktop/meta-verificacion-seguimiento.txt`, copia completa de la línea de tiempo y el caso): `https://www.whatsapp.com/contact/` (más específico, probar primero) y `https://www.facebook.com/support/` (hub general, seleccionar "WhatsApp Business Account" ahí adentro).

**Próxima acción con fecha concreta:** si para ~15-sep-2026 (14 días hábiles desde el 26-ago) la verificación sigue "En revisión" sin cambio, usar los enlaces de arriba para escalar — no repetir el formulario ni abrir el chat de soporte desde cero, ya se agotó esa vía dos veces sin resultado nuevo.

**No se tocó código en esta sesión relacionado con Meta** — todo lo de esta Fase 11 es auditoría y seguimiento administrativo, sin cambios de repo salvo esta entrada de bitácora.

## 12. Auditoría de estado + verificación de Meta muy atrasada (23-sep-2026)

**Sesión sin acceso al Mac.** Se re-clonó el repo desde GitHub (el checkout anterior no persistió entre sesiones) — confirmado que `main` local coincide exacto con `origin/main` (`0d00ad5`, commit del 3-sep: "fix: revierte cierre falso cuando la plantilla de drip nunca se entrega" — no documentado en ninguna bitácora anterior, revisar el diff en una próxima sesión si hace falta contexto).

**CRM, confirmado en vivo contra Supabase:**
- 119 leads (sin contar corredores): 58 No Interesado, 42 Nuevo, 11 En Conversación, 3 No Contactar, 3 Calificado, **2 Cita Agendada**.
- **Primera vez con citas agendadas activas desde que se audita este proyecto** (527775601413, 527773700050) — el cuello de botella de "0 citas" que se repitió en las Fases 9 y 11 parece haberse roto, sin que ninguna sesión de chat haya tocado código para lograrlo (probablemente Carlos dando seguimiento manual). No confirmado el detalle de esas 2 citas (día/hora) — revisar en el CRM directamente si hace falta.
- 2 corredores identificados, separados del pipeline correctamente.
- Publicaciones: sanas, diarias, las 3 redes con "Publicado" — última el 22-sep 13:49 UTC.
- 134 llamadas rescatadas con `seguimiento='Pendiente'` — número alto, no auditado a fondo esta sesión, posible pendiente para revisar.
- `ficha-departamento.pdf` — el `if (cual === 'Departamento') continue` que la desactivaba (Fase de 26-ago) ya NO aparece en `route.ts`. Parece haberse resuelto (Carlos regeneró la ficha y algo/alguien reactivó el envío) — **no confirmado con certeza al 100%**, solo por ausencia del código de bloqueo; verificar mandándose la ficha a sí mismo si una sesión futura necesita certeza total.

**Verificación de Meta — sigue "En revisión", ahora MUY fuera de plazo.** Confirmado en vivo por Carlos (captura del Centro de Seguridad): mismo mensaje exacto de siempre, "Gracias por enviar tu información... aproximadamente dos días laborables... En revisión", **sin cambio desde el 26-ago**. Van ~4 semanas — muy por encima de los 14 días hábiles que Meta mismo citó, y ya se pasó la fecha del 15-sep que esta misma bitácora marcó como el punto para escalar.

**Pendiente confirmar en la próxima sesión:** si Carlos ya escaló con los links guardados (`https://www.whatsapp.com/contact/`, `https://www.facebook.com/support/`) — se le indicó hacerlo en esta sesión, no se confirmó el resultado antes de que la sesión terminara. **Si la próxima sesión encuentra que sigue "En revisión" sin que Carlos haya escalado todavía, no hay que auditar nada más — solo insistir en la escalación, ya está todo diagnosticado desde la Fase 6.**

No se tocó código esta sesión.

## 13. RECHAZADA por segunda vez + soporte automatizado agotado (23-25 sep 2026)

**Carlos escaló como quedó pendiente.** Escribió a soporte de WhatsApp Business y luego a Meta Business Suite con los mensajes preparados en esta bitácora. Hallazgos del camino:

- **Pista falsa investigada a fondo, descartada:** el bot de soporte alegó que restricciones de "actividad inusual" (18-19 sep) en la cuenta publicitaria de Carlos (`Carlos MV`, ID `71069556`) estaban pausando la revisión del negocio. Se encontró un saldo real pendiente de $2.11 en esa cuenta publicitaria — Carlos lo pagó, saldo confirmado en $0.00. El mismo bot después aclaró explícitamente: **la cuenta publicitaria y la verificación del negocio son procesos independientes** — pagar el saldo no acelera ni afecta la revisión. No perseguir más esta pista (perfil bloqueado, tarjeta a re-verificar, etc.) — el bot fue dando explicaciones distintas cada vez sin resolver nada, patrón de chatbot dando vueltas, no de diagnóstico real.
- **Soporte automatizado confirmó explícitamente que NO puede transferir a un agente humano en vivo** ("Actualmente no puedo realizar una transferencia directa con un agente en vivo") — se agotaron las dos vías de chat automatizado (WhatsApp Business Support y Meta Business Suite) sin lograr escalación humana real.

**25-sep-2026 — la verificación CAMBIÓ DE ESTADO por primera vez desde el 26-ago:** ya no dice "En revisión" — ahora dice **"Se rechazó tu solicitud" / "No se pudo verificar"**, sin razón específica visible en el resumen (pendiente que Carlos revise si hay un detalle expandible). Esto es el **segundo rechazo** de este portafolio con el nombre correcto (persona física, Carlos Alberto Morales De La Vega) — coincide exacto con el escenario que la Fase 8 ya había anticipado: *"si se rechaza otra vez... van dos rechazos con nombre correcto... escalar con soporte humano, no repetir el formulario una tercera vez sin ayuda."*

**Plan vigente ahora:**
1. NO resubir documentos ni reenviar el formulario por tercera vez sin ayuda humana real — instrucción explícita de Meta, ya la ignoramos una vez sin querer al reintentar automáticamente por chat.
2. Opciones reales que quedan, ninguna de código, todas requieren acción de Carlos fuera de los canales de chat ya agotados:
   - Publicar en X/Twitter etiquetando soporte de Meta/WhatsApp con el caso — gratis, rápido, no intentado todavía.
   - Contactar un WhatsApp Business Solution Provider (Twilio, 360dialog, Gupshup, etc.) para escalar por su canal de partner — no intentado todavía, es la opción con más probabilidad real según el análisis de la Fase 12.
   - Último recurso, no activar todavía: registrar razón social propia (RFC) y verificar un portafolio nuevo desde cero bajo esa empresa formal.
3. Se le ofreció a Carlos dar acceso vía token de la Graph API para que una sesión de chat pueda consultar el estado técnico directo (sin depender de capturas de pantalla) — pendiente que decida si lo genera, con la advertencia de seguridad de regenerarlo/revocarlo después de usarlo.

## 14. Escalación real lograda — caso abierto con 360dialog (24-25 sep 2026)

**Se descartó el post en X** (Carlos no tiene cuenta) — nos fuimos directo a la opción de BSP.

**Se creó cuenta en 360dialog** (app.360dialog.com), organización "Parque Chapultepec", **sin conectar ningún número todavía** (a propósito — solo se buscaba llegar a soporte humano, no migrar infraestructura sin decidirlo antes). Fricción real al configurar 2FA (QR/código manual fallando repetido) — se resolvió borrando la entrada del autenticador y volviendo a escanear un QR fresco en vez de usar la clave manual (probable error de tecleo en la clave de 33 caracteres).

**Logrado — caso real con soporte humano de 360dialog, algo que Meta nunca dio:** vía su botón "Need help?" → Asistente de IA → escaló solo (sin que Carlos lo pidiera explícitamente) a especialista humano. **Ticket abierto, conversation ID: `215476095996116`**, respuesta estimada dentro de 4 horas (plan Regular). Mensaje enviado explicando: WhatsApp Business ya funciona con API oficial de Meta (conexión directa, no vía 360dialog), verificación de negocio (ID `358500678256951`) rechazada dos veces sin razón clara, Meta no puede escalar a humano.

**Pendiente para la próxima sesión:** revisar si 360dialog respondió el ticket `215476095996116` — si ofrecen ayuda real para destrabar la verificación de Meta (siendo partner oficial, es la vía con más probabilidad de esta bitácora). Si no dan solución después de esto, las opciones que quedan son el post de X (crear cuenta nueva) o el último recurso de registrar razón social propia — ver sección 13.

No se tocó código en esta sesión — todo administrativo.

## 15. Respuesta de 360dialog, pista nueva sin confirmar + tarjeta de marketing agregada (29-30 sep, 2 oct 2026)

**360dialog respondió (Hassaan), pero no pueden escalar directamente:** "Because this WABA is not currently managed by or shared with 360dialog, we do not have access to the account to raise an escalation with Meta on your behalf." Confirma que decidimos bien no conectar el número ahí sin decidirlo antes.

**Pista nueva, no probada todavía:** Hassaan compartió la guía de 360dialog sobre "Classic Business Verification" (`docs.360dialog.com/.../classic-business-verification`). Tiene una sección específica para cuentas rechazadas: ir a **Centro de Seguridad → buscar el botón "Contactar con Facebook"** (aparece debajo del mensaje de rechazo, NO es el chat de ayuda genérico que hemos usado) — da un número de caso específico y acceso a conversación directa con soporte de Facebook. **Pendiente que Carlos lo confirme** — se le pidió revisar si ese botón aparece, no se confirmó antes de que la sesión terminara.

**Se buscó en Gmail (cmoraleswest@gmail.com) un correo de rechazo de Meta — no se encontró ninguno.** La guía de 360dialog dice que Meta manda un correo explicando el rechazo; o nunca llegó, o usa un correo admin distinto al Gmail principal de Carlos — sin confirmar cuál correo está registrado en Meta Business Suite.

**Ticket de 360dialog (`215476095996116`) se cerró por inactividad dos veces** (Carlos no contestó a tiempo) — se puede reabrir respondiendo dentro de 5 días de cada cierre. Última respuesta de Carlos fue "Thank you, I'm reviewing the guide now." — revisar en la próxima sesión si el ticket sigue abierto o si hay que reabrirlo de nuevo.

**Confusión sin resolver, importante no repetir:** Carlos preguntó por el "CURP de Jorge Arturo Alanis" (relacionado a "Grupo Arcofin", la constructora del desarrollo, mencionada en la sección 5), asegurando que ya había compartido esa información "con todos los documentos" antes. **Se confirmó que NO existe ningún registro de eso en esta bitácora ni en esta sesión** — es casi seguro que se lo dio a OTRA sesión de chat distinta que nunca lo escribió aquí. Se explicó a Carlos que el CURP es dato personal sensible de un tercero y no se debe buscar sin su consentimiento. **Si Carlos vuelve a mencionar esto, pedirle que lo comparta de nuevo — no asumir que existe en algún lado no documentado.**

**Tarjeta de marketing agregada — "Perfil de comprador: extranjero/ingresos en dólares":** imagen revisada (cifras correctas, dato legal de zona no restringida correcto), subida por Carlos a `chapultepec-fotos/public/galeria/perfil-comprador-04-extranjero.png` (con fricción real: primero quedó en carpeta "público" nueva por error, luego en la raíz de `public/` en vez de `public/galeria/` — ambas corregidas). Agregada a `PIEZAS` en `lib/buffer.ts` (commits `b761705`, `9c90b0d` fix de extensión .jpg→.png, `7e73fde` reordenada para intentar que publicara el 30-sep).

**🔴 CONFIRMADO EN VIVO 2-oct-2026 — el deploy NUNCA se hizo.** La publicación real del 30-sep usó `ph-ficha.jpg` (la pieza vieja, antes del reordenamiento) — prueba directa de que ninguno de los 3 commits de esta pieza (`b761705`, `9c90b0d`, `7e73fde`) ha llegado a producción todavía. **Acción inmediata pendiente de Carlos: `vercel --prod` ya.** Mientras no se despliegue, la tarjeta nueva nunca va a publicarse, sin importar cuántas veces se reordene el array — el problema no es el código, es el deploy manual que no se está corriendo. Considerar en una próxima sesión si vale la pena insistir en automatizar el deploy (conectar Vercel↔GitHub) en vez de depender de que Carlos lo corra a mano cada vez — ya van varias sesiones con este mismo cuello de botella.

**✅ RESUELTO, mismo día (2-oct-2026):** Carlos corrió `git pull` + `vercel --prod` en vivo durante la sesión, confirmado exitoso (`✅ Production ... [32s]`, aliased a `chapultepec-bot-v2.vercel.app`). Todos los commits pendientes desde el `0d00ad5` (incluyendo la tarjeta nueva, el fix de extensión, el reordenamiento, y el fix de drip.ts del 3-sep) ya están en producción real. Por el cálculo de rotación (`diaDelAno % 12`), la tarjeta de "perfil-comprador-extranjero" (índice 9) ya pasó su turno adelantado (30-sep, se perdió por falta de deploy) — el próximo turno natural le toca el **12-oct-2026**, salvo que una sesión futura la vuelva a adelantar reordenando el array.

**Intentado y agotado esta sesión, sin resolver:** se buscó el botón "Contactar con Facebook" (de la guía de 360dialog, sección 15) en el Centro de Seguridad del negocio `358500678256951` — la pantalla no mostró con claridad la tarjeta de rechazo esperada (solo el borrador viejo sin terminar del 24-sep, y una sección de "Verificación del negocio" con texto cortado/ambiguo). Se decidió no seguir insistiendo en esta pista por ahora — fue tiempo invertido sin resultado claro. Pendiente real sigue siendo el mismo: la verificación de Meta sigue sin resolverse, sin una vía nueva confirmada.

## 16. Limpieza de llamadas rescatadas + bug real de envíos duplicados en el reenganche masivo (2-oct-2026)

**Auditoría encontró el contador de "148 pendientes" inflado.** Cruzando cada fila de `llamadas_rescatadas` con `seguimiento='Pendiente'` contra el estado real del lead en `leads`: 54 ya estaban en "No Interesado", 5 en "No Contactar" y 2 en "Cita Agendada" — ya resueltos en el pipeline, solo nunca se sincronizó la etiqueta de `llamadas_rescatadas`. Se corrigió con un UPDATE (no se borró nada, solo se cambió `seguimiento` a `'Resuelto en pipeline'` en esas 61 filas, y se corrigió 1 fila con `contestada=true` que seguía marcada `Pendiente`). Quedaron **86 pendientes reales** (69 Nuevo + 14 En Conversación + 2 Calificado + 1 huérfano sin lead_id).

**Se corrió el endpoint `/api/reenganche-viejos` (creado el 31-ago, nunca ejecutado hasta hoy)** con `?dias=0` para mandar la plantilla aprobada `seguimiento_48h` a los 86 pendientes reales e intentar generar citas. Carlos lo disparó visitando el link una sola vez.

**Bug real encontrado, confirmado contra la base de datos:** el endpoint procesaba por FILA de `llamadas_rescatadas`, no por persona. Alguien con 6 llamadas perdidas viejas (6 filas distintas, mismo `lead_id`) recibía la plantilla **6 veces en segundos** — confirmado con los timestamps de `interacciones` (clúster completo entre 05:32:47 y 05:32:54 UTC de un solo disparo). Resultado real: 85 personas distintas contactadas, pero 30 de ellas recibieron el mismo mensaje entre 2 y 6 veces (113 envíos totales en vez de 85). 0 errores de Meta — el número no chocó con el límite de mensajes (`TIER_250`), buena señal de salud actual del canal. No se pudo deshacer el envío duplicado (ya salió el WhatsApp), pero no tuvo consecuencia grave reportada — mismo contenido, mismo remitente.

**Corregido en el código (`app/api/reenganche-viejos/route.ts`):** ahora se agrupa por `lead_id` (o por teléfono si no hay lead_id) ANTES de mandar — una persona con varias llamadas viejas pendientes solo recibe la plantilla una vez, y se marcan TODAS sus filas de `llamadas_rescatadas` como `'Contactado'` en el mismo paso. **Pendiente: Carlos tiene que correr `vercel --prod` para que este fix llegue a producción** — mientras no se despliegue, una próxima visita a ese endpoint repetiría el mismo bug.

**Decisión explícita de Carlos, a preservar:** no borrar nunca los números de `llamadas_rescatadas` ni de `leads` aunque estén "No Interesado" o "No Contactar" — los quiere conservados para poder contactarlos en el futuro con promociones de productos nuevos. La limpieza de esta sesión fue solo de etiquetas, ningún registro ni teléfono se eliminó.

**✅ Deploy del fix confirmado el mismo día (2-oct-2026):** Carlos corrió `vercel --prod` en vivo, éxito (`✅ Production... [32s]`, aliased a `chapultepec-bot-v2.vercel.app`). El fix de agrupar por lead_id ya está en producción — una próxima visita a `/api/reenganche-viejos` ya no debería repetir el bug de plantillas duplicadas.

## 17. HALLAZGO REAL — "Información del negocio" de Meta llevaba meses mal, corregido en vivo (2-oct-2026)

**Se revisó en vivo, por primera vez, la pantalla "Información del negocio" del portafolio correcto (`business_id 358500678256951`, Configuración → ícono de maletín "Resumen" → sección "Información del negocio").** Nadie la había mirado desde que se corrigió el nombre el 25-ago — y resultó que varios campos estaban mal o vacíos, visibles para cualquiera que los buscara:

- **Nombre legal del negocio: "Parque Chapulteepc"** — el mismo typo que la Fase 6 dice haber corregido el 25-ago-2026 a "Carlos Alberto Morales De La Vega". **O nunca se guardó el cambio o se revirtió** — no se pudo determinar cuál, pero el campo llevaba el error otra vez (o seguía así siempre) al momento de esta auditoría, coincidiendo con el segundo rechazo del 25-sep.
- **Dirección: solo "México"** — sin calle, ciudad ni código postal.
- **Teléfono del negocio: vacío ("Sin teléfono").**

**Corregido en vivo con documentos reales de Carlos** (CURP, Constancia de Situación Fiscal del SAT, recibo CFE — compartidos directo en el chat para este propósito):
- Nombre legal: **Carlos Alberto Morales De La Vega** (coincide exacto con CURP `MOVC740801HMSRGR08` y RFC `MOVC740801DG0`).
- Dirección: **Pse de las Rosas 35, Col. Tabachines, Cuernavaca, Morelos, C.P. 62498** — se usó el domicilio fiscal del SAT (no el del recibo CFE, que es otro domicilio distinto: Baja de Chapultepec 108 B, C.P. 62450 — anotado aquí por si una sesión futura necesita el dato).
- Teléfono del negocio: **+52 777 175 8412** (el número de WhatsApp que se verifica — el 777 492 1176 es el personal de Carlos, usado aparte para alertas del CRM, no se tocó).
- Identificación fiscal (EIN): **MOVC740801DG0** — campo opcional nuevo que Meta agregó, no existía en intentos anteriores, "se usará para encontrar posibles registros comerciales coincidentes". Se llenó por primera vez.

**Confirmado guardado exitosamente** (captura de pantalla de "Información del negocio" mostrando los 5 campos ya corregidos). **Pendiente inmediato:** revisar la sección "Estado de la verificación del negocio" (quedó cortada al fondo de la pantalla, no visible todavía) — ahí puede estar el botón de "Solicitar revisión"/apelación que se ha buscado sin éxito en sesiones anteriores. Si aparece, usarlo con una explicación escrita señalando que el nombre legal y domicilio ya fueron corregidos. **No volver a reenviar el formulario completo de verificación sin usar esa opción de apelación primero — instrucción explícita de Meta de la Fase 8, sigue vigente.**

**Dato técnico para no repetir la misma pérdida de tiempo:** navegar a esta pantalla fue muy difícil por interfaz — Meta Business Suite nueva ("latest") muestra solo íconos sin texto en la columna de Configuración, y pegar URLs directas con `business_id` causa redirecciones erráticas (`nav_ref=typo_redirect`) si no se navega primero por clic dentro de la sesión activa. Lo que SÍ funcionó: desde dentro del negocio correcto ya cargado, editar manualmente la URL en la barra de direcciones cambiando el segmento `/settings/pages/` por `/settings/business_info/` (ruta clásica). El ícono correcto en la columna de Configuración es el **maletín (🧳), primero de la lista — NO confundir con el círculo "①" más abajo, que es "Meta One" (producto de suscripción pagada, no tiene nada que ver con verificación de negocio).

## 18. Se completó el formulario de verificación + verificación de dominio pendiente de detección (2-oct-2026, madrugada)

**Con los datos de "Información del negocio" ya corregidos (Fase 17), se encontró y completó un flujo de verificación distinto al buscado antes:** en el Centro de Seguridad apareció una tarjeta "Verificación para CARLOS ALBERTO MORALES DE LA VEGA — Solicitud pendiente, se inició el Sep 24, 2026" — un borrador de verificación viejo, nunca terminado (coincide con el hallazgo de sesiones anteriores del "borrador sin terminar del 24-sep"). Se retomó y se completó:

- Tipo de negocio: **Sociedad unipersonal** (persona física, sin registro mercantil — es lo correcto para el caso de Carlos).
- Nombre del negocio: **CARLOS ALBERTO MORALES DE LA VEGA**, con "PARQUE CHAPULTEPEC" como nombre comercial alternativo (DBA) — ambos campos se precargaron solos correctamente desde la Fase 17.
- Dirección, teléfono y sitio web: confirmados correctos (domicilio del SAT, no el del recibo CFE — ver Fase 17 para el porqué).
- **Meta no encontró ningún registro oficial que coincidiera** ("No encontramos tu negocio") — obligó a subir documentos. Se subió la Constancia de Situación Fiscal del SAT para el nombre legal (Meta la marcó como "Recomendado") y también para el teléfono (aunque el documento no muestra el número exacto — fue la mejor opción disponible entre las 4 que ofrecía el menú: Registro/licencia del negocio, Documento fiscal del negocio, Certificado de constitución, Factura de servicios públicos — ninguna es natural para un celular prepago).
- **Confirmación de conexión fallida por WhatsApp y SMS al 777 175 8412** — ninguno de los dos códigos llegó (el número es una SIM física Telcel Amigo prepago, pero el código ni por WhatsApp ni por SMS normal llegó al teléfono). No se pudo usar "Llamada telefónica" tampoco en el primer intento (el menú solo ofrecía SMS en ese momento; en un intento posterior sí reapareció la opción completa). **Pendiente para una sesión futura:** entender por qué ni WhatsApp ni SMS entregan el código a ese número — podría ser un problema real de salud del número 175-8412 que valga la pena investigar aparte.
- **Se cambió a "Verificación del dominio"** en vez de seguir con confirmación telefónica — ruta exitosa hasta el último paso.

**Verificación de dominio — completada técnicamente, pendiente que Meta la detecte:**
1. Se agregó `parquechapultepecmorelos.com` como dominio en Configuración → Dominios del portafolio `358500678256951`.
2. Meta dio una metaetiqueta: `<meta name="facebook-domain-verification" content="4g52xtr020j0ujmmw1y93mo179tmbf" />`.
3. El sitio está armado en **landingsite.ai** (editor con IA, no es código tradicional). Se encontró el lugar correcto para pegar metaetiquetas: Configuración (ícono ⚙) → Configuración de página → página "Hogar"/"Home" → campo "HTML del encabezado de página". Se agregó la metaetiqueta ahí.
4. **Se encontró y corrigió un bug preexistente real en el HTML del sitio** (no causado por esta sesión): la etiqueta `twitter:description` cerraba mal, con `."}` en vez de `.">` — esto habría podido tragarse cualquier etiqueta agregada después como si fuera parte de la misma. Corregido.
5. **Primer intento de verificar falló** porque guardar el campo de Settings NO publica el sitio automáticamente — son dos acciones distintas en landingsite.ai. Se encontró con certeza usando `pdftotext` sobre un PDF del código fuente real (`Ver código fuente de la página`) que la metaetiqueta nunca llegó al `<head>` real a pesar de estar guardada en el editor.
6. Carlos encontró el botón de "Publicar" en la pantalla principal del editor (no en Settings) y publicó el sitio — confirmado "✅ ¡Publicado! Ya está en vivo". De paso, usando el mismo chat de IA del editor, corrigió 7 enlaces de WhatsApp del sitio que apuntaban al número viejo/incorrecto (775-8412) para que apunten al 777 240 8027, el que realmente usa el bot — hallazgo y corrección propia de Carlos, no planeada en esta sesión, pero correcta.
7. **Segundo intento de "Verificar dominio" en Meta: "Error de verificación — No se puede verificar el dominio."** Instrucciones propias de Meta en esa misma pantalla dicen que puede tardar **hasta 72 horas** en detectar la metaetiqueta — se decidió no seguir insistiendo esta madrugada y esperar. Queda pendiente: reintentar "Verificar dominio" en Meta después de esperar, o usar la Sharing Debugger Tool (`developers.facebook.com/tools/debug/`) para forzar una lectura fresca de Meta y confirmar antes si la etiqueta ya es visible, sin esperar el plazo completo.

**Alternativas si la metaetiqueta sigue sin detectarse después de esperar:** Meta ofrece también "Subir un archivo HTML a tu directorio raíz" o "Actualizar el registro TXT de DNS con el registrador de dominios" — no probadas todavía, quedan como plan B.

**Estado al cierre de esta sesión (2-oct, ~2am):** formulario de verificación de negocio completo y enviado con datos correctos por primera vez desde que se abrió este caso. Verificación de dominio técnicamente lista, pendiente detección de Meta (horas). **Primera vez en toda la historia de este proyecto que el formulario se completa con el nombre legal, dirección y RFC correctos desde el inicio — las dos veces anteriores (26-ago y lo que haya generado el rechazo del 25-sep) partieron de datos con errores reales.**

## 19. Las 3 tarjetas faltantes de "Perfil de comprador" (1, 2, 3) agregadas + versión revisada de la 4 (2-oct-2026, madrugada)

Carlos mandó las tarjetas 1 ("Empresario o comerciante con capital"), 2 ("Profesionista que invierte y renta"), 3 ("Cliente de banca patrimonial") y una **versión revisada de la 4** ("Extranjero", con un beneficio nuevo agregado: "a poco más de una hora de la Ciudad de México"). Se había confirmado que el repo `chapultepec-fotos` solo tenía la tarjeta 4 original — las demás nunca llegaron a subirse en sesiones anteriores.

**Subido a `chapultepec-fotos/public/galeria/`:** `perfil-comprador-01-empresario.png`, `perfil-comprador-02-profesionista.png` (convertido de .webp a .png con Pillow), `perfil-comprador-03-banca-patrimonial.png`, y `perfil-comprador-04-extranjero-v2.png` (la versión revisada, guardada aparte — **no reemplazó la original, pendiente que Carlos decida si quiere sustituirla en la rotación o dejar ambas**). Commit `d2064d3`.

**Agregadas a `PIEZAS` en `lib/buffer.ts`** (commit `be74349`): `foto-perfil-empresario`, `foto-perfil-profesionista`, `foto-perfil-banca` — las 3 tarjetas nuevas, usando datos ya validados en sesiones anteriores (precio $4,500,000 MXN, rendimiento 10.4% bruto anual ya usado en la tarjeta 4). El arreglo `PIEZAS` pasó de 12 a 15 piezas, lo cual recorrió el cálculo de rotación (`diaDelAno % 15`) — turnos recalculados desde hoy (2-oct, índice 5 = foto-plusvalia):

- **6-oct:** foto-perfil-extranjero (la tarjeta 4 original, ya en rotación desde antes)
- **9-oct:** foto-perfil-empresario (tarjeta 1, nueva)
- **10-oct:** foto-perfil-profesionista (tarjeta 2, nueva)
- **11-oct:** foto-perfil-banca (tarjeta 3, nueva)

**🔴 PENDIENTE CRÍTICO, patrón ya conocido de este proyecto: el código está en GitHub pero NO en producción.** Hace falta que Carlos corra `git pull && vercel --prod` desde `~/chapultepec-bot-v2` antes de que cualquiera de estas piezas nuevas pueda publicarse en redes — si no se despliega antes del 9-oct, se repite exactamente el mismo problema de la Fase 15 (piezas que pasan su turno sin publicarse por falta de deploy).

**Pendiente de decisión de Carlos:** si la tarjeta 4 "v2" (con el beneficio extra) debe reemplazar a la original en la rotación, agregarse como una pieza más, o descartarse.

**✅ Deploy confirmado el mismo día (2-oct-2026):** Carlos corrió `git pull` + `vercel --prod`, éxito (`✅ Production... [36s]`, aliased a `chapultepec-bot-v2.vercel.app`). Las 3 tarjetas nuevas y el fix de reenganche duplicado ya están en producción real — los turnos del 9, 10 y 11-oct para `foto-perfil-empresario`, `foto-perfil-profesionista` y `foto-perfil-banca` ya deberían publicarse solos sin necesitar otro deploy.

**Decisión sobre la tarjeta 4 "v2":** Carlos pidió que decidiera como asesor — se eligió **reemplazar la original por la revisada** (`perfil-comprador-04-extranjero-v2.png`) en el slug `foto-perfil-extranjero`, porque es estrictamente mejor (mismo contenido + el dato real de "a poco más de una hora de CDMX") y no tenía sentido mantener dos versiones casi idénticas compitiendo por el mismo turno. Commit `bf77627`. **✅ Deploy confirmado el mismo día:** Carlos corrió `git pull` (trajo hasta `16f14cc`) + `vercel --prod`, éxito (`✅ Production... [30s]`). Con esto, todos los cambios de esta sesión —fix de reenganche duplicado, 3 tarjetas nuevas, info de negocio corregida, verificación completada, y el swap de la tarjeta 4— están en producción real.
