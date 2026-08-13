# CRM Chapultepec — Qué hacer cuando algo falla

Guía de referencia rápida. Escrita después de una sesión larga de reparación (2026-07-18/19) para que la próxima vez no haya que repetir todo el proceso de diagnóstico desde cero.

## Primero, mira esto — no adivines

1. Abre el CRM: `https://chapultepec-bot-v2.vercel.app/?t=chap2026`
2. Arriba del Pipeline está el panel "Salud del sistema hoy" — muestra si ya se publicó en redes y cuántos mensajes se han contestado hoy.
3. Todos los días a las 4pm llega un WhatsApp de reporte automático al número de pruebas. Si deja de llegar, algo se rompió.

Si ninguno de los dos funciona o se ve raro, sigue las secciones de abajo.

## "No me llegan mensajes de WhatsApp"

Prueba directo contra Meta, sin pasar por el código:
```
curl -s "https://graph.facebook.com/v21.0/{WHATSAPP_PHONE_ID}?fields=display_phone_number,quality_rating,status" \
  -H "Authorization: Bearer {WHATSAPP_TOKEN}"
```
- Si dice `"Session has expired"` → el token venció. Hay que generar uno nuevo, permanente, desde Business Settings → Usuarios del sistema → esa app → Generar token (permisos `whatsapp_business_messaging` y `whatsapp_business_management`, expiración Nunca).
- Si dice `"status": "CONNECTED"` y `"quality_rating": "GREEN"` → el número está sano, el problema es otra cosa (revisa el webhook abajo).

**IMPORTANTE — el WABA real (1923471098361486) vive en el negocio "Fernando Frausto Art" de Meta Business, NO en "Parque Chapultepec"**, aunque el nombre visible de la cuenta de WhatsApp diga "Parque Chapultepec". Si algún día hay que buscar el WABA de nuevo, es ahí donde está, no en el otro portfolio.

## "El bot no contesta cuando alguien escribe" (aunque el envío SÍ funcione)

Esto es un problema de webhook, no de token. Verifica:
```
curl -s "https://chapultepec-bot-v2.vercel.app/api/webhook?hub.mode=subscribe&hub.verify_token=chapultepec2026&hub.challenge=test123"
```
Debe regresar `test123`. Si sí, pero aun así no llegan mensajes, revisa que la app esté suscrita al WABA:
```
curl -s "https://graph.facebook.com/v21.0/{WABA_ID}/subscribed_apps" -H "Authorization: Bearer {WHATSAPP_TOKEN}"
```
Si la app correcta (Parque Chapultepec Bot, id 1689055112368391) no aparece ahí, hay que volver a suscribirla:
```
curl -s -X POST "https://graph.facebook.com/v21.0/{WABA_ID}/subscribed_apps" -H "Authorization: Bearer {WHATSAPP_TOKEN}"
```

## "No se está publicando en redes sociales"

Prueba el token de Buffer directo:
```
curl -s https://api.buffer.com -H "Authorization: Bearer {BUFFER_API_KEY}" -H "Content-Type: application/json" \
  -d '{"query":"query { organizations { id name } }"}'
```
Si dice `"Access token is not valid"` → hay que generar uno nuevo en buffer.com → perfil → Buffer API.

Si el token es válido pero el post falla con "Invalid post input: dueAt...", revisa que `lib/buffer.ts` siga mandando `dueAt` como fecha ISO en el futuro (no un número, no "ahora mismo") — Buffer cambió sus reglas una vez ya en esta historia.

## "El CRM dice que se envió algo pero no llegó"

No confíes en el estado de la base de datos por sí solo — siempre confirma contra la API real de Meta o de Buffer con los comandos de arriba. El código ya está corregido para no mentir sobre esto (ver `whatsapp.ts`, `drip.ts`, `buffer.ts` — todos regresan `true`/`false` real, no asumido), pero si algo se ve raro, la prueba directa contra el proveedor es la que manda.

## Variables de entorno — la trampa del "\n"

Al guardar una variable en Vercel, si el valor termina con literalmente los caracteres `\` y `n` pegados (no un salto de línea real), Meta y Supabase la rechazan. Para revisar todas de una vez:
```
vercel env pull /tmp/check.env --environment=production --yes
```
y buscar cuál termina en `\n` literal antes de la comilla de cierre.

Para volver a guardar una variable sin repetir ese error:
```
vercel env rm NOMBRE_VARIABLE production --yes
vercel env add NOMBRE_VARIABLE production --value 'valor exacto aquí' --no-sensitive --yes
```
El flag `--no-sensitive` es importante — sin él, Vercel guarda la variable en modo "Sensitive" y ni siquiera este mismo proceso puede volver a leerla después para confirmar que quedó bien.

## Zona horaria

Los servidores corren en UTC, no en hora de México. Cualquier cálculo de "hoy" o "medianoche" en el código debe usar la función `inicioDiaMexico()` de `lib/fecha.ts` — nunca `new Date().setHours(0,0,0,0)` directo, porque eso calcula medianoche de Londres.

## Bugs de regex ya corregidos — no repetir el patrón

Los archivos `app/api/webhook/intencion.ts` usan expresiones regulares para detectar intención (insulto, quiere fotos, quiere agendar). Cualquier palabra corta sin `\b` (límite de palabra) al inicio puede hacer falso positivo dentro de otra palabra — ejemplo real: "asco" sin `\b` se activaba dentro de "mascotas" y el bot insultaba de vuelta a un lead real. Si se agrega una palabra nueva a cualquiera de estos regex, siempre con `\b` al inicio.

## Si Claude (la IA) falla

Ya tiene respaldo — si el API de Anthropic falla al contestar un lead, el sistema manda un mensaje genérico ("dame un momento, te contacta un asesor") en vez de quedarse en silencio, cede el control a un humano, y te avisa por WhatsApp al número de pruebas. Si ves ese aviso repetido seguido, revisa que `ANTHROPIC_API_KEY` siga siendo válida.

## Pendiente conocido, no es un bug

La automatización de llamadas del 777 175 8412 vía Twilio (código en `app/api/twilio/`) está lista pero depende de que Telcel active el desvío de llamadas hacia el número de Twilio +1 814 992 4734 — eso es un trámite con el operador, no algo que se arregle con código.
