// Suite de QA — interruptor humano + arquitectura asíncrona
// Ejecutar: node --env-file=.env.local test-suite.js
// Requiere: next dev corriendo en localhost:3000

import { createClient } from '@supabase/supabase-js'

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'
const T = 'chap2026'
const NUMERO_PRUEBAS = '527774921176' // número de pruebas de Carlos, diseñado en filtros.ts para secuencia completa
const TEL_SINTETICO = '529990000001' // no colisiona con ningún lead real (verificado antes de correr)

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

const results = []
function log(name, ok, detail) {
  results.push({ name, ok, detail })
  console.log(`${ok ? '✅ PASS' : '❌ FAIL'} — ${name}${detail ? ' — ' + detail : ''}`)
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function payload(from, texto) {
  return {
    entry: [{
      changes: [{
        value: {
          messages: [{ from, id: 'wamid.test.' + Date.now(), type: 'text', text: { body: texto } }],
        },
      }],
    }],
  }
}

async function postWebhook(from, texto) {
  const start = performance.now()
  const res = await fetch(`${BASE}/api/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload(from, texto)),
  })
  const ms = performance.now() - start
  const body = await res.json()
  return { status: res.status, body, ms }
}

async function patchLead(id, updates) {
  return fetch(`${BASE}/api/leads?t=${T}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, tabla: 'leads', ...updates }),
  }).then((r) => r.json())
}

async function getLead(telefono) {
  const { data } = await db.from('leads').select('*').eq('telefono', telefono).single()
  return data
}

async function countInteracciones(leadId) {
  const { count } = await db.from('interacciones').select('id', { count: 'exact', head: true }).eq('lead_id', leadId)
  return count ?? 0
}

// ── snapshot para restaurar al final ──────────────────────────────────────
let snapshotPruebas = null
let baselineTotalLeads = 0

async function main() {
  console.log('── Baseline ──────────────────────────────────────────────')
  const { count: total0 } = await db.from('leads').select('id', { count: 'exact', head: true })
  baselineTotalLeads = total0 ?? 0
  snapshotPruebas = await getLead(NUMERO_PRUEBAS)
  console.log(`Leads totales: ${baselineTotalLeads} · Lead de pruebas: estado=${snapshotPruebas.estado} bot_activo=${snapshotPruebas.bot_activo}`)
  console.log('')

  // ═══ TEST 1 — Regresión de datos: upsertLead no corrompe ni duplica ═══
  console.log('── TEST 1: Regresión de datos (upsertLead) ─────────────────')
  try {
    // 1a. Limpieza previa por si quedó un residuo de una corrida anterior
    await db.from('leads').delete().eq('telefono', TEL_SINTETICO)

    const { data: insertado, error: e1 } = await db
      .from('leads')
      .upsert({ telefono: TEL_SINTETICO, canal_origen: 'WhatsApp' }, { onConflict: 'telefono' })
      .select('id, estado, bot_activo')
      .single()
    assert(!e1, `error en insert: ${e1?.message}`)
    assert(insertado.estado === 'Nuevo', 'INSERT debe crear estado=Nuevo por default')
    assert(insertado.bot_activo === true, 'INSERT debe crear bot_activo=true por default (columna aditiva)')
    log('1a. INSERT limpio para teléfono nuevo', true, `id=${insertado.id}`)

    const { data: actualizado, error: e2 } = await db
      .from('leads')
      .upsert({ telefono: TEL_SINTETICO, canal_origen: 'Instagram' }, { onConflict: 'telefono' })
      .select('id, canal_origen')
      .single()
    assert(!e2, `error en update: ${e2?.message}`)
    assert(actualizado.id === insertado.id, 'UPDATE debe conservar el mismo id, no crear fila nueva')
    assert(actualizado.canal_origen === 'Instagram', 'UPDATE debe reflejar el nuevo valor')
    log('1b. UPDATE exacto sin duplicar fila (mismo id)', true, `id=${actualizado.id}`)

    const { count: totalTrasInsert } = await db.from('leads').select('id', { count: 'exact', head: true })
    assert(totalTrasInsert === baselineTotalLeads + 1, `esperado ${baselineTotalLeads + 1} leads, hay ${totalTrasInsert}`)
    log('1c. Los 22 leads originales no fueron tocados (solo +1 sintético)', true, `total=${totalTrasInsert}`)
  } catch (err) {
    log('TEST 1', false, err.message)
  } finally {
    await db.from('leads').delete().eq('telefono', TEL_SINTETICO)
  }
  console.log('')

  // ═══ TEST 2 — Latencia del webhook con bot_activo=true ═══════════════
  console.log('── TEST 2: Latencia POST /api/webhook (bot_activo=true) ────')
  try {
    await db.from('leads').update({ bot_activo: true }).eq('telefono', NUMERO_PRUEBAS)
    const r = await postWebhook(NUMERO_PRUEBAS, 'Hola, sigo interesado en el penthouse')
    assert(r.status === 200, `esperado 200, llegó ${r.status}`)
    assert(r.body.status === 'ok', 'body debe ser {status:"ok"}')
    assert(r.ms < 500, `respuesta tardó ${r.ms.toFixed(0)}ms, debe ser <500ms`)
    log('2. POST responde 200 en <500ms (lógica pesada en background)', true, `${r.ms.toFixed(0)}ms`)
  } catch (err) {
    log('TEST 2', false, err.message)
  }
  console.log('')

  // ═══ TEST 3 — El agente en background completa el ciclo con Claude ═══
  console.log('── TEST 3: Ciclo Claude en segundo plano (historial→IA→enviarTexto) ─')
  try {
    const lead = await getLead(NUMERO_PRUEBAS)
    const antes = await countInteracciones(lead.id)
    const t0 = Date.now()
    await postWebhook(NUMERO_PRUEBAS, '¿El penthouse tiene rooftop privado?')
    await sleep(6000) // margen para que after() termine: Supabase + Anthropic + Meta
    const despues = await countInteracciones(lead.id)
    assert(despues >= antes + 2, `esperaba +2 interacciones (entrante+saliente), hubo ${despues - antes}`)

    const { data: ultima } = await db
      .from('interacciones')
      .select('tipo, contenido, creado_en')
      .eq('lead_id', lead.id)
      .order('creado_en', { ascending: false })
      .limit(1)
      .single()
    assert(ultima.tipo === 'Mensaje Saliente Bot', 'la última interacción debe ser una respuesta saliente del bot')
    assert(new Date(ultima.creado_en).getTime() >= t0, 'la respuesta debe ser posterior al envío del test')
    assert(ultima.contenido && ultima.contenido.length > 0, 'la respuesta de Claude no debe venir vacía')
    log('3. obtenerHistorial → generarRespuestaClaude → enviarTexto ejecutado', true, `"${ultima.contenido.slice(0, 60)}..."`)
  } catch (err) {
    log('TEST 3', false, err.message)
  }
  console.log('')

  // ═══ TEST 4A — Freno de mano: bot_activo=false aborta antes de Claude ═
  console.log('── TEST 4A: Interruptor humano OFF (0 tokens, 0 respuesta) ──')
  try {
    await db.from('leads').update({ bot_activo: false }).eq('telefono', NUMERO_PRUEBAS)
    const lead = await getLead(NUMERO_PRUEBAS)
    const antes = await countInteracciones(lead.id)

    const r = await postWebhook(NUMERO_PRUEBAS, 'Mensaje de prueba con bot apagado')
    assert(r.status === 200, `esperado 200, llegó ${r.status}`)
    await sleep(3000) // margen de seguridad: confirmar que NO llega nada tarde

    const despues = await countInteracciones(lead.id)
    assert(despues === antes + 1, `esperaba +1 (solo entrante), hubo +${despues - antes} — Claude pudo haberse invocado`)

    const leadFinal = await getLead(NUMERO_PRUEBAS)
    assert(leadFinal.bot_activo === false, 'bot_activo no debe reactivarse solo')
    log('4A. bot_activo=false → interacción guardada, Claude NUNCA invocado', true, `interacciones +${despues - antes}`)
  } catch (err) {
    log('TEST 4A', false, err.message)
  }
  console.log('')

  // ═══ TEST 4B — AGENDA_CITA apaga el bot automáticamente ══════════════
  console.log('── TEST 4B: AGENDA_CITA → Calificado + bot_activo=false ────')
  try {
    await db.from('leads').update({ bot_activo: true, estado: 'En Conversación' }).eq('telefono', NUMERO_PRUEBAS)
    await postWebhook(NUMERO_PRUEBAS, 'Quiero agendar visita el viernes a las 4pm')
    await sleep(6000)

    const lead = await getLead(NUMERO_PRUEBAS)
    assert(lead.estado === 'Calificado', `esperado estado=Calificado, quedó en ${lead.estado}`)
    assert(lead.bot_activo === false, 'AGENDA_CITA debe apagar bot_activo automáticamente')
    log('4B. Intención AGENDA_CITA califica al lead y cede control al humano', true, `estado=${lead.estado} bot_activo=${lead.bot_activo}`)
  } catch (err) {
    log('TEST 4B', false, err.message)
  }
  console.log('')

  // ═══ TEST 5 — PATCH /api/leads impacta la DB de inmediato ════════════
  console.log('── TEST 5: PATCH /api/leads (switch del dashboard) ─────────')
  try {
    const lead = await getLead(NUMERO_PRUEBAS)

    const r1 = await patchLead(lead.id, { bot_activo: true })
    assert(r1.ok === true, 'PATCH debe responder ok:true')
    const tras1 = await getLead(NUMERO_PRUEBAS)
    assert(tras1.bot_activo === true, 'PATCH bot_activo:true no se reflejó en Supabase')
    log('5a. PATCH bot_activo:true → refleja en DB al instante', true)

    const r2 = await patchLead(lead.id, { bot_activo: false })
    assert(r2.ok === true, 'PATCH debe responder ok:true')
    const tras2 = await getLead(NUMERO_PRUEBAS)
    assert(tras2.bot_activo === false, 'PATCH bot_activo:false no se reflejó en Supabase')
    log('5b. PATCH bot_activo:false → refleja en DB al instante', true)
  } catch (err) {
    log('TEST 5', false, err.message)
  }
  console.log('')

  // ═══ RESTAURACIÓN — deja todo exactamente como estaba ════════════════
  console.log('── Cleanup ───────────────────────────────────────────────')
  await db.from('leads').delete().eq('telefono', TEL_SINTETICO)
  await db.from('leads').update({
    estado: snapshotPruebas.estado,
    bot_activo: snapshotPruebas.bot_activo,
    info_general_enviada: snapshotPruebas.info_general_enviada,
  }).eq('telefono', NUMERO_PRUEBAS)
  const { count: totalFinal } = await db.from('leads').select('id', { count: 'exact', head: true })
  console.log(`Lead de pruebas restaurado a: estado=${snapshotPruebas.estado} bot_activo=${snapshotPruebas.bot_activo}`)
  console.log(`Leads totales al cierre: ${totalFinal} (baseline: ${baselineTotalLeads})`)
  if (totalFinal !== baselineTotalLeads) {
    log('CLEANUP', false, `total final ${totalFinal} != baseline ${baselineTotalLeads}`)
  }

  // ═══ RESUMEN ═══════════════════════════════════════════════════════
  console.log('')
  console.log('═══ RESUMEN ═══════════════════════════════════════════════')
  const ok = results.filter((r) => r.ok).length
  const fail = results.filter((r) => !r.ok)
  for (const r of results) console.log(`${r.ok ? '✅' : '❌'} ${r.name}`)
  console.log(`${ok}/${results.length} pruebas OK`)
  if (fail.length) {
    console.log(`${fail.length} pruebas fallidas.`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Error fatal en la suite:', err)
  process.exit(1)
})
