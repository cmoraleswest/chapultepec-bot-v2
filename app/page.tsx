'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const T = 'chap2026'
const API = (q: string) => `/api/leads?t=${T}&${q}`

type Lead = { id: string; nombre: string | null; telefono: string; estado: string; interes: string | null; actualizado_en: string; info_general_enviada: boolean; fecha_cita: string | null; drip_count: number; creado_en: string; ultimo_status: string | null; bot_activo: boolean }
type Interaccion = { id: string; tipo: string; contenido: string; metadata: Record<string, unknown>; creado_en: string }
type Llamada = { id: string; telefono: string; nombre: string | null; lead_id: string | null; contestada: boolean; whatsapp_enviado: boolean; seguimiento: string; notas: string | null; creado_en: string }
type Publicacion = { id: string; red: string; tipo: string; caption: string; imagen_url: string; buffer_id: string; estado: string; creado_en: string }
type Salud = { publicacionesHoy: number; ultimaPublicacion: string | null; mensajesHoy: number; ultimoMensaje: string | null }
type SoloLlamada = { id: string; nombre: string | null; telefono: string; estado: string; motivo: string; que_hacer: string; fallo_en: string }
type Bandeja = Lead & { ultimo_entrante: string | null; ultimo_mensaje: string | null; ultimo_tipo: string | null; ultimo_mensaje_en: string | null }
type Corredor = { id: string; nombre: string | null; telefono: string; actualizado_en: string; creado_en: string }

// Las 4 plantillas de venta aprobadas que se pueden mandar a mano cuando la
// ventana de 24 h ya cerró. Deben coincidir con PLANTILLAS_CRM en whatsapp.ts.
type PlantillaCRM = 'info_ambas_propiedades' | 'seguimiento_24h' | 'seguimiento_48h' | 'cierre_7dias'
const PLANTILLAS_CRM_UI: { valor: PlantillaCRM; label: string }[] = [
  { valor: 'info_ambas_propiedades', label: 'Info de las 2 propiedades' },
  { valor: 'seguimiento_24h', label: 'Seguimiento 24h' },
  { valor: 'seguimiento_48h', label: 'Seguimiento 48h' },
  { valor: 'cierre_7dias', label: 'Cierre 7 días' },
]

const COLS = ['Nuevo', 'En Conversación', 'Calificado', 'Cita Agendada', 'No Interesado', 'No Contactar']
const COL_C: Record<string, string> = { 'Nuevo': '#3b82f6', 'En Conversación': '#f59e0b', 'Calificado': '#10b981', 'Cita Agendada': '#8b5cf6', 'No Interesado': '#6b7280', 'No Contactar': '#ef4444' }
const RED_C: Record<string, string> = { 'Instagram': '#E1306C', 'Facebook': '#1877F2', 'TikTok': '#00f2ea' }
const SEG_C: Record<string, string> = { 'Pendiente': '#f59e0b', 'Contactado': '#3b82f6', 'Agendado': '#8b5cf6', 'Cerrado': '#10b981', 'Sin interés': '#6b7280' }

// Qué propiedad le interesa a cada lead — se guardaba en la base pero no se
// veía en ningún lado del panel, así que para saber a quién darle
// seguimiento de cuál unidad había que abrir la conversación completa.
const INTERES_LABEL: Record<string, string> = {
  'Penthouse': '🌟 PH $4.5M',
  'Departamento': '🏠 Depto $2.9M',
  'Ambos': '🌟🏠 Ambas',
}
const INTERES_COLOR: Record<string, string> = { 'Penthouse': '#8b5cf6', 'Departamento': '#0d9488', 'Ambos': '#2563eb' }

function hace(f: string): string {
  const ms = Date.now() - new Date(f).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// Semáforo de la ventana de 24 h de WhatsApp. Solo se puede escribir texto
// libre dentro de las 24 h siguientes al ÚLTIMO mensaje DEL CLIENTE. Pasado
// ese plazo Meta solo deja plantillas aprobadas. Sin verlo en pantalla es
// imposible saber a quién se alcanza y a quién no.
function ventana24(ultimoEntrante: string | null): { abierta: boolean; label: string; color: string; icono: string } {
  if (!ultimoEntrante) return { abierta: false, label: 'Nunca te ha escrito', color: '#ef4444', icono: '🔴' }
  const horas = (Date.now() - new Date(ultimoEntrante).getTime()) / 3600000
  if (horas >= 24) return { abierta: false, label: 'Cerrada — solo plantilla', color: '#ef4444', icono: '🔴' }
  const restan = 24 - horas
  if (restan <= 4) return { abierta: true, label: `Quedan ${Math.floor(restan)}h ${Math.floor((restan % 1) * 60)}m`, color: '#f59e0b', icono: '🟡' }
  return { abierta: true, label: `Abierta ${Math.floor(restan)}h`, color: '#10b981', icono: '🟢' }
}

// Qué plantillas ya se le mandaron a este lead y cuándo — sin esto, saber
// "cuál ya usé y cuál sigue" significaba leer todo el historial a mano
// buscando el nombre de la plantilla entre los mensajes.
function plantillasEnviadas(hist: Interaccion[]): Record<string, string> {
  const ultima: Record<string, string> = {}
  for (const msg of hist) {
    for (const p of PLANTILLAS_CRM_UI) {
      if (msg.contenido.includes(p.valor)) {
        if (!ultima[p.valor] || msg.creado_en > ultima[p.valor]) ultima[p.valor] = msg.creado_en
      }
    }
  }
  return ultima
}

// Cuándo se mandaron a mano las fotos extra del Penthouse o el Departamento
// con los botones de abajo — sin esto, un segundo clic manda las mismas 5
// fotos otra vez sin que nada lo avise.
function fotosExtraEnviadas(hist: Interaccion[]): { ph: string | null; depto: string | null } {
  const r: { ph: string | null; depto: string | null } = { ph: null, depto: null }
  for (const msg of hist) {
    if (msg.contenido.includes('[FOTOS PH — enviadas a mano]') && (!r.ph || msg.creado_en > r.ph)) r.ph = msg.creado_en
    if (msg.contenido.includes('[FOTOS DEPTO — enviadas a mano]') && (!r.depto || msg.creado_en > r.depto)) r.depto = msg.creado_en
  }
  return r
}

function fmtTel(t: string): string {
  const d = t.replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('52')) return `+52 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`
  if (d.length === 10) return `+52 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
  if (d.length === 13 && d.startsWith('521')) return `+52 ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`
  return t
}

function fechaMx(f: string): string {
  return new Date(f).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
}

const S = {
  card: { background: '#ffffff', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' } as React.CSSProperties,
  btn: (active: boolean, color?: string) => ({ padding: '12px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, background: active ? (color || '#2D6A4F') : '#f1f5f9', color: active ? '#fff' : '#475569' }) as React.CSSProperties,
  badge: (color: string) => ({ fontSize: 14, padding: '4px 12px', borderRadius: 10, background: color + '22', color, fontWeight: 700 }) as React.CSSProperties,
  th: { textAlign: 'left' as const, padding: 14, color: '#64748b', fontSize: 16, fontWeight: 700, borderBottom: '2px solid #e2e8f0' },
  td: { padding: 14, borderBottom: '1px solid #f1f5f9', fontSize: 18, color: '#1e293b' },
}

export default function CRM() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [bandeja, setBandeja] = useState<Bandeja[]>([])
  const [soloLlamada, setSoloLlamada] = useState<SoloLlamada[]>([])
  const [urgencias, setUrgencias] = useState<Lead[]>([])
  const [corredores, setCorredores] = useState<Corredor[]>([])
  const [llamadas, setLlamadas] = useState<Llamada[]>([])
  const [pubs, setPubs] = useState<Publicacion[]>([])
  const [salud, setSalud] = useState<Salud | null>(null)
  const [sel, setSel] = useState<Lead | null>(null)
  const [hist, setHist] = useState<Interaccion[]>([])
  const [vista, setVista] = useState<'bandeja' | 'solo_llamada' | 'pipeline' | 'urgencias' | 'llamadas' | 'publicaciones' | 'corredores'>('bandeja')
  const [cargando, setCargando] = useState(false)
  const [nuevoTel, setNuevoTel] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [msgExito, setMsgExito] = useState('')
  const [msgManual, setMsgManual] = useState('')
  const [enviandoMsg, setEnviandoMsg] = useState(false)
  const [enviandoPaquete, setEnviandoPaquete] = useState(false)
  const [mensajesNuevos, setMensajesNuevos] = useState<{nombre: string, texto: string, leadId: string}[]>([])
  const ultimoMsgRef = useRef<Record<string, string>>({})
  const chatBoxRef = useRef<HTMLDivElement>(null)
  const [plantillaSel, setPlantillaSel] = useState<PlantillaCRM>(PLANTILLAS_CRM_UI[0].valor)
  const [enviandoPlantilla, setEnviandoPlantilla] = useState(false)
  const [enviandoFotos, setEnviandoFotos] = useState<'ph' | 'depto' | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [r1, r2, r3, r4, r5, r6, r7, r8] = await Promise.all([
        fetch(API('vista=pipeline')).then(r => r.json()),
        fetch(API('vista=urgencias')).then(r => r.json()),
        fetch(API('vista=llamadas')).then(r => r.json()),
        fetch(API('vista=publicaciones')).then(r => r.json()),
        fetch(API('vista=salud')).then(r => r.json()),
        fetch(API('vista=bandeja')).then(r => r.json()),
        fetch(API('vista=solo_llamada')).then(r => r.json()),
        fetch(API('vista=corredores')).then(r => r.json()),
      ])
      const leadsData: Lead[] = Array.isArray(r1) ? r1 : []
      setLeads(leadsData)
      setUrgencias(Array.isArray(r2) ? r2 : [])
      setLlamadas(Array.isArray(r3) ? r3 : [])
      setPubs(Array.isArray(r4) ? r4 : [])
      if (r5 && typeof r5.mensajesHoy === 'number') setSalud(r5)
      setBandeja(Array.isArray(r6) ? r6 : [])
      setCorredores(Array.isArray(r8) ? r8 : [])
      setSoloLlamada(Array.isArray(r7) ? r7 : [])

      // Detectar leads con actividad en los últimos 30 segundos
      const ahora = Date.now()
      const nuevos: {nombre: string, texto: string, leadId: string}[] = []
      for (const lead of leadsData) {
        const prev = ultimoMsgRef.current[lead.id]
        const msDesdeUpdate = ahora - new Date(lead.actualizado_en).getTime()
        if (prev && lead.actualizado_en > prev && msDesdeUpdate < 30000) {
          nuevos.push({ nombre: lead.nombre || lead.telefono, texto: 'Respondió', leadId: lead.id })
        }
        ultimoMsgRef.current[lead.id] = lead.actualizado_en
      }
      if (nuevos.length > 0) setMensajesNuevos(prev => [...prev, ...nuevos])
    } catch (e) { console.error(e) }
    setCargando(false)
  }, [])

  useEffect(() => { cargar(); const i = setInterval(cargar, 10000); return () => clearInterval(i) }, [cargar])

  // Refresca solo el historial del chat abierto — cada 5s cuando hay un lead seleccionado
  const refreshHist = useCallback(async (leadId: string) => {
    const data = await fetch(API(`vista=historial&lead_id=${leadId}`)).then(r => r.json())
    setHist(Array.isArray(data) ? data.reverse() : [])
  }, [])

  useEffect(() => {
    if (!sel) return
    const i = setInterval(() => refreshHist(sel.id), 5000)
    return () => clearInterval(i)
  }, [sel, refreshHist])

  // Ancla el scroll de la conversación hasta abajo — al abrir un lead o al
  // llegar un mensaje nuevo, lo último que se dijo debe verse sin que haya
  // que desplazarse a mano.
  useEffect(() => {
    if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight
  }, [hist, sel])

  const verHistorial = async (lead: Lead) => {
    setSel(lead)
    await refreshHist(lead.id)
  }

  const patch = async (id: string, tabla: string, updates: Record<string, unknown>) => {
    await fetch(`/api/leads?t=${T}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, tabla, ...updates }) })
    cargar()
  }

  // Borrar un prospecto que ya no tiene caso seguir (compró en otro lado,
  // número equivocado, etc.) — pide confirmación porque no se puede deshacer.
  const borrar = async (id: string, nombre: string) => {
    if (!confirm(`¿Borrar a ${nombre} de forma permanente? Esto no se puede deshacer.`)) return
    await fetch(`/api/leads?t=${T}&id=${id}`, { method: 'DELETE' })
    if (sel?.id === id) setSel(null)
    cargar()
  }

  const enviarMensaje = async (telefono: string, leadId: string) => {
    if (!msgManual.trim()) return
    setEnviandoMsg(true)
    // Antes esto limpiaba el cuadro de texto sin importar si el envío falló —
    // se veía como que sí se mandó (el texto desaparecía) aunque WhatsApp lo
    // hubiera rechazado, y no quedaba ni rastro ni aviso de que falló.
    try {
      const res = await fetch(`/api/leads?t=${T}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefono, mensaje: msgManual }) })
      const data = await res.json()
      if (data.ok) {
        setMsgManual('')
        await refreshHist(leadId)
      } else {
        alert(`No se pudo enviar: ${data.error || 'error desconocido'}`)
      }
    } catch {
      alert('No se pudo enviar — revisa tu conexión e intenta otra vez.')
    }
    setEnviandoMsg(false)
  }

  // FOTOS_CHAT/FOTOS_DEPTO ya existían "para reenvíos y envíos manuales" pero
  // nunca tenían un botón real que las disparara — solo salían si el bot las
  // mandaba solo cuando el cliente las pedía.
  const enviarMasFotos = async (telefono: string, leadId: string, cual: 'ph' | 'depto') => {
    setEnviandoFotos(cual)
    try {
      const res = await fetch(`/api/leads?t=${T}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefono, fotos: cual }) })
      const data = await res.json()
      if (data.ok) {
        await refreshHist(leadId)
      } else {
        alert(`No se pudieron mandar las fotos: ${data.error || 'error desconocido'}`)
      }
    } catch {
      alert('No se pudo enviar — revisa tu conexión e intenta otra vez.')
    }
    setEnviandoFotos(null)
  }

  // Fuera de la ventana de 24 h el texto libre no sirve — el CRM ofrece elegir
  // una de las 4 plantillas aprobadas en vez de dejar escribir algo que Meta
  // va a rechazar con el error 131047.
  const enviarPlantillaManual = async (telefono: string, leadId: string, plantilla: PlantillaCRM) => {
    setEnviandoPlantilla(true)
    try {
      const res = await fetch(`/api/leads?t=${T}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefono, plantilla }) })
      const data = await res.json()
      if (data.ok) {
        await refreshHist(leadId)
      } else {
        alert(`No se pudo enviar la plantilla: ${data.error || 'error desconocido'}`)
      }
    } catch {
      alert('No se pudo enviar — revisa tu conexión e intenta otra vez.')
    }
    setEnviandoPlantilla(false)
  }

  // Dispara el paquete completo (ficha + fotos + oferta) a un lead existente
  const enviarPaquete = async (telefono: string, nombre: string | null, leadId: string) => {
    setEnviandoPaquete(true)
    const tel = telefono.replace(/\D/g, '').replace(/^52/, '')
    await fetch(`/api/leads?t=${T}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefono: tel, nombre: nombre || undefined }) })
    setEnviandoPaquete(false)
    await refreshHist(leadId)
  }

  const contactarLlamada = async () => {
    if (!nuevoTel || nuevoTel.length < 10) return
    setEnviando(true)
    setMsgExito('')
    const res = await fetch(`/api/leads?t=${T}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefono: nuevoTel, nombre: nuevoNombre || undefined }) })
    const data = await res.json()
    setEnviando(false)
    if (data.ok) {
      setMsgExito(`WhatsApp enviado a +52 ${nuevoTel}`)
      setNuevoTel('')
      setNuevoNombre('')
      cargar()
      setTimeout(() => setMsgExito(''), 5000)
    }
  }

  // Contadores publicaciones
  const pubHoy = pubs.filter(p => new Date(p.creado_en).toDateString() === new Date().toDateString()).length
  const pubIG = pubs.filter(p => p.red === 'Instagram').length
  const pubFB = pubs.filter(p => p.red === 'Facebook').length
  const pubTT = pubs.filter(p => p.red === 'TikTok').length
  const llamPend = llamadas.filter(l => l.seguimiento === 'Pendiente').length

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: 16, background: '#f8fafc', minHeight: '100vh' }}>

      {/* ═══ ALERTAS MENSAJES NUEVOS ═══ */}
      {mensajesNuevos.map((m, i) => (
        <div key={i} onClick={() => { setMensajesNuevos(prev => prev.filter((_, j) => j !== i)); const lead = leads.find(l => l.id === m.leadId); if (lead) verHistorial(lead) }}
          style={{ background: '#ef4444', color: '#fff', padding: '16px 20px', borderRadius: 12, marginBottom: 10, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'pulse 1s infinite', boxShadow: '0 4px 20px rgba(239,68,68,0.5)', fontSize: 20, fontWeight: 700 }}>
          <span>🔔 MENSAJE NUEVO de {m.nombre} — Toca para ver</span>
          <span style={{ fontSize: 24 }}>✕</span>
        </div>
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.7} }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, color: '#0f172a', fontWeight: 700 }}>Parque Chapultepec</h1>
          <span style={{ color: '#64748b', fontSize: 18 }}>
            <b style={{ color: '#0f172a' }}>Penthouse $4,500,000</b> · <b style={{ color: '#0f172a' }}>Departamento $2,900,000</b> · {leads.length} leads · {pubs.length} publicaciones
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => setVista('bandeja')} style={S.btn(vista === 'bandeja', '#2D6A4F')}>💬 Bandeja</button>
          <button onClick={() => setVista('solo_llamada')} style={S.btn(vista === 'solo_llamada', '#dc2626')}>📞 Solo llamada ({soloLlamada.length})</button>
          <button onClick={() => setVista('pipeline')} style={S.btn(vista === 'pipeline')}>Pipeline ({leads.length})</button>
          <button onClick={() => setVista('urgencias')} style={S.btn(vista === 'urgencias', '#f59e0b')}>Urgentes ({urgencias.length})</button>
          <button onClick={() => setVista('llamadas')} style={S.btn(vista === 'llamadas', '#8b5cf6')}>Llamadas ({llamadas.length}){llamPend > 0 && <span style={{ marginLeft: 4, background: '#ef4444', borderRadius: 8, padding: '1px 5px', fontSize: 10 }}>{llamPend}</span>}</button>
          <button onClick={() => setVista('publicaciones')} style={S.btn(vista === 'publicaciones', '#E1306C')}>Publicaciones ({pubs.length})</button>
          <button onClick={() => setVista('corredores')} style={S.btn(vista === 'corredores', '#0d9488')}>🤝 Corredores ({corredores.length})</button>
          <button onClick={cargar} style={{ ...S.btn(false), border: '1px solid #333' }}>{cargando ? '...' : '↻'}</button>
        </div>
      </div>

      {/* ═══ SALUD DEL SISTEMA ═══ */}
      {salud && (() => {
        const pubOk = salud.publicacionesHoy > 0
        const msgOk = salud.mensajesHoy > 0
        const horaCron = new Date().getUTCHours() // cron corre 13:00 UTC (7am MX)
        const yaPasoElCron = horaCron >= 13
        const pubMal = yaPasoElCron && !pubOk
        return (
          <div style={{ ...S.card, padding: 12, marginBottom: 16, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Salud del sistema hoy</span>
            <span style={{ fontSize: 13, color: pubMal ? '#ef4444' : '#10b981', fontWeight: 600 }}>
              {pubMal ? '⚠️' : '✅'} Publicaciones en redes: {salud.publicacionesHoy} hoy
              {salud.ultimaPublicacion && <span style={{ color: '#94a3b8', fontWeight: 400 }}> · última {hace(salud.ultimaPublicacion)}</span>}
            </span>
            <span style={{ fontSize: 13, color: msgOk ? '#10b981' : '#94a3b8', fontWeight: 600 }}>
              {msgOk ? '✅' : '⚪'} Mensajes contestados: {salud.mensajesHoy} hoy
              {salud.ultimoMensaje && <span style={{ color: '#94a3b8', fontWeight: 400 }}> · último {hace(salud.ultimoMensaje)}</span>}
            </span>
          </div>
        )
      })()}

      {/* ═══ BANDEJA — pantalla principal ═══ */}
      {vista === 'bandeja' && (() => {
        // Orden por urgencia real de venta, no por fecha: primero quien espera
        // respuesta, luego quien sigue vivo, y hasta abajo los descartados.
        const peso = (b: Bandeja): number => {
          if (b.estado === 'No Interesado' || b.estado === 'No Contactar') return 4
          if (b.ultimo_tipo === 'Mensaje Entrante') return 0        // te escribió y nadie contestó
          if (b.estado === 'Cita Agendada' || b.estado === 'Calificado') return 1
          if (ventana24(b.ultimo_entrante).abierta) return 2        // todavía alcanzable
          return 3
        }
        const orden = [...bandeja].sort((a, b) => peso(a) - peso(b) ||
          new Date(b.ultimo_mensaje_en ?? b.creado_en).getTime() - new Date(a.ultimo_mensaje_en ?? a.creado_en).getTime())
        const esperando = orden.filter(b => b.ultimo_tipo === 'Mensaje Entrante').length

        return (
          <div style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 20, color: '#0f172a' }}>
                Bandeja {esperando > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, padding: '2px 10px', fontSize: 15, marginLeft: 8 }}>{esperando} esperando respuesta</span>}
              </h3>
              <span style={{ fontSize: 14, color: '#64748b' }}>🟢 puedes escribir libre · 🟡 se acaba el plazo · 🔴 solo plantilla</span>
            </div>

            {orden.length === 0 && <p style={{ color: '#64748b' }}>Sin conversaciones todavía.</p>}

            {orden.map(b => {
              const v = ventana24(b.ultimo_entrante)
              const esperandoResp = b.ultimo_tipo === 'Mensaje Entrante'
              const descartado = b.estado === 'No Interesado' || b.estado === 'No Contactar'
              return (
                <div key={b.id} onClick={() => verHistorial(b)}
                  style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 12px', borderRadius: 12, marginBottom: 8, cursor: 'pointer',
                           background: esperandoResp ? '#fef2f2' : descartado ? '#f8fafc' : '#fff',
                           border: `1px solid ${esperandoResp ? '#fecaca' : '#e2e8f0'}`, opacity: descartado ? 0.6 : 1 }}>
                  <div style={{ fontSize: 22, lineHeight: 1 }}>{v.icono}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{b.nombre || fmtTel(b.telefono)}</span>
                      <span style={S.badge(COL_C[b.estado] || '#94a3b8')}>{b.estado}</span>
                      {b.interes && INTERES_LABEL[b.interes] && <span style={S.badge(INTERES_COLOR[b.interes])}>{INTERES_LABEL[b.interes]}</span>}
                      {esperandoResp && <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>● TE ESCRIBIÓ, SIN CONTESTAR</span>}
                      {!b.bot_activo && <span style={{ fontSize: 13, color: '#f59e0b', fontWeight: 700 }}>👤 tú llevas el chat</span>}
                    </div>
                    <div style={{ fontSize: 15, color: '#475569', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {b.ultimo_tipo === 'Mensaje Entrante' ? '👤 ' : '🤖 '}{(b.ultimo_mensaje || 'sin mensajes').slice(0, 90)}
                    </div>
                    <div style={{ fontSize: 13, color: v.color, marginTop: 4, fontWeight: 600 }}>
                      {v.label}{b.ultimo_mensaje_en && <span style={{ color: '#94a3b8', fontWeight: 400 }}> · hace {hace(b.ultimo_mensaje_en)}</span>}
                    </div>
                  </div>
                  <a href={`tel:+${b.telefono.replace(/\D/g, '')}`} onClick={e => e.stopPropagation()}
                    style={{ fontSize: 22, textDecoration: 'none', padding: '6px 10px' }} title="Llamar">📞</a>
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* ═══ SOLO LLAMADA — a estos WhatsApp no los alcanza ═══ */}
      {vista === 'solo_llamada' && (
        <div style={S.card}>
          <h3 style={{ margin: '0 0 6px', fontSize: 20, color: '#dc2626' }}>Solo llamada o SMS</h3>
          <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: 15 }}>
            A estos WhatsApp no los alcanza. No están perdidos: hay que marcarles o mandarles mensaje de texto.
          </p>
          {soloLlamada.length === 0 ? <p style={{ color: '#10b981', fontSize: 16 }}>✅ Ninguno. Todos son alcanzables por WhatsApp.</p> : soloLlamada.map(x => (
            <div key={x.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 12px', borderRadius: 12, marginBottom: 8, background: '#fef2f2', border: '1px solid #fecaca' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 19, fontWeight: 700, color: '#0f172a' }}>{x.nombre || fmtTel(x.telefono)}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#dc2626', marginTop: 2 }}>{x.motivo}</div>
                <div style={{ fontSize: 14, color: '#475569', marginTop: 2 }}>{x.que_hacer}</div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>Detectado hace {hace(x.fallo_en)}</div>
              </div>
              <a href={`tel:+${x.telefono.replace(/\D/g, '')}`} style={{ padding: '10px 16px', borderRadius: 10, background: '#2563eb', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>📞 Llamar</a>
              <a href={`sms:+${x.telefono.replace(/\D/g, '')}`} style={{ padding: '10px 16px', borderRadius: 10, background: '#64748b', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>💬 SMS</a>
            </div>
          ))}
        </div>
      )}

      {/* ═══ CORREDORES — no son compradores, se atienden aparte ═══ */}
      {vista === 'corredores' && (
        <div style={S.card}>
          <h3 style={{ margin: '0 0 6px', fontSize: 20, color: '#0d9488' }}>Corredores y aliados</h3>
          <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: 15 }}>
            Asesores/inmobiliarias que ofrecieron representar la propiedad. Ya se les contestó la comisión compartida (50% del 5%) automáticamente — no están en el pipeline de compradores.
          </p>
          {corredores.length === 0 ? <p style={{ color: '#64748b', fontSize: 13 }}>Ninguno todavía.</p> : corredores.map(x => (
            <div key={x.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 12px', borderRadius: 12, marginBottom: 8, background: '#f0fdfa', border: '1px solid #99f6e4' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 19, fontWeight: 700, color: '#0f172a' }}>{x.nombre || fmtTel(x.telefono)}</div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>Contactó hace {hace(x.actualizado_en)}</div>
              </div>
              <a href={`https://wa.me/52${x.telefono.replace(/\D/g,'').replace(/^52/,'')}`} target="_blank" rel="noreferrer"
                style={{ padding: '10px 16px', borderRadius: 10, background: '#25D366', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>💬 WhatsApp</a>
              <button onClick={() => borrar(x.id, x.nombre || fmtTel(x.telefono))}
                style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#ef444422', color: '#ef4444', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>🗑️ Borrar</button>
            </div>
          ))}
        </div>
      )}

      {/* ═══ PIPELINE ═══ */}
      {vista === 'pipeline' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, overflowX: 'auto' }}>
          {COLS.map(col => {
            const enCol = leads.filter(l => l.estado === col)
            return (
              <div key={col} style={{ ...S.card, padding: 10, minHeight: 200 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: `2px solid ${COL_C[col]}` }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: COL_C[col] }}>{col}</span>
                  <span style={{ fontSize: 10, color: '#64748b', background: '#1a1a2e', padding: '2px 6px', borderRadius: 10 }}>{enCol.length}</span>
                </div>
                {enCol.map(lead => (
                  <div key={lead.id} style={{ background: '#fff', borderRadius: 8, padding: 10, marginBottom: 8, borderLeft: `3px solid ${COL_C[col]}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div onClick={() => verHistorial(lead)} style={{ cursor: 'pointer', marginBottom: 8 }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{lead.nombre || fmtTel(lead.telefono)}</div>
                      {lead.nombre && <div style={{ fontSize: 15, color: '#475569' }}>{fmtTel(lead.telefono)}</div>}
                      {lead.interes && INTERES_LABEL[lead.interes] && (
                        <div style={{ marginTop: 3 }}><span style={{ ...S.badge(INTERES_COLOR[lead.interes]), fontSize: 11, padding: '2px 8px' }}>{INTERES_LABEL[lead.interes]}</span></div>
                      )}
                      <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 3, display: 'flex', gap: 6, alignItems: 'center' }}>
                        {hace(lead.actualizado_en)}
                        {lead.ultimo_status === 'read' && <span style={{ color: '#22c55e', fontWeight: 700 }}>✓✓ Leído</span>}
                        {lead.ultimo_status === 'delivered' && <span style={{ color: '#3b82f6', fontWeight: 700 }}>✓✓ Entregado</span>}
                        {lead.ultimo_status === 'enviado' && <span style={{ color: '#94a3b8' }}>✓ Enviado</span>}
                      </div>
                    </div>
                    {/* Botones rápidos */}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button onClick={e => { e.stopPropagation(); patch(lead.id, 'leads', { bot_activo: !lead.bot_activo }) }}
                        style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, border: 'none', fontWeight: 700, cursor: 'pointer', background: lead.bot_activo ? '#10b98122' : '#f59e0b22', color: lead.bot_activo ? '#10b981' : '#f59e0b' }}>
                        {lead.bot_activo ? '🤖 Bot Activo' : '👤 Control Humano'}
                      </button>
                      <a href={`https://wa.me/52${lead.telefono.replace(/\D/g,'').replace(/^52/,'')}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                        style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: '#25D366', color: '#fff', textDecoration: 'none' }}>WA</a>
                      <button onClick={e => { e.stopPropagation(); borrar(lead.id, lead.nombre || fmtTel(lead.telefono)) }}
                        style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, border: 'none', fontWeight: 700, cursor: 'pointer', background: '#ef444422', color: '#ef4444' }}>🗑️ Borrar</button>
                      {COLS.filter(c => c !== col && c !== 'No Contactar').map(c => (
                        <button key={c} onClick={e => { e.stopPropagation(); patch(lead.id, 'leads', { estado: c }) }}
                          style={{ fontSize: 9, padding: '2px 5px', borderRadius: 4, border: `1px solid ${COL_C[c]}55`, background: 'transparent', color: COL_C[c], cursor: 'pointer' }}>
                          {c === 'En Conversación' ? 'Conv.' : c === 'Cita Agendada' ? 'Cita' : c === 'No Interesado' ? 'No Int.' : c === 'Calificado' ? 'Calif.' : c}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* ═══ URGENCIAS ═══ */}
      {vista === 'urgencias' && (
        <div style={S.card}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#f59e0b' }}>Leads sin respuesta &gt; 24h</h3>
          {urgencias.length === 0 ? <p style={{ color: '#64748b', fontSize: 13 }}>Sin urgencias</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Nombre', 'Teléfono', 'Estado', 'Última actividad', 'Drips'].map(h => <th key={h} style={S.th}>{h}</th>)}
              </tr></thead>
              <tbody>{urgencias.map(u => (
                <tr key={u.id} onClick={() => verHistorial(u)} style={{ cursor: 'pointer' }}>
                  <td style={S.td}>{u.nombre || '—'}</td>
                  <td style={S.td}>{fmtTel(u.telefono)}</td>
                  <td style={S.td}><span style={S.badge(COL_C[u.estado] || '#94a3b8')}>{u.estado}</span></td>
                  <td style={S.td}>{hace(u.actualizado_en)}</td>
                  <td style={S.td}>{u.drip_count ?? 0}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}

      {/* ═══ LLAMADAS CON SEGUIMIENTO ═══ */}
      {vista === 'llamadas' && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: '#8b5cf6' }}>Llamadas — 777 175 84 12</h3>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#94a3b8' }}>
              <span>Total: <b style={{ color: '#e2e8f0' }}>{llamadas.length}</b></span>
              <span>Pendientes: <b style={{ color: '#f59e0b' }}>{llamPend}</b></span>
              <span>Contestadas: <b style={{ color: '#10b981' }}>{llamadas.filter(l => l.contestada).length}</b></span>
              <span>WA enviado: <b style={{ color: '#3b82f6' }}>{llamadas.filter(l => l.whatsapp_enviado).length}</b></span>
            </div>
          </div>
          {/* Formulario llamada perdida */}
          <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 12, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>Llamada perdida →</span>
            <input placeholder="Teléfono (10 dígitos)" value={nuevoTel} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNuevoTel(e.target.value.replace(/\D/g, '').slice(0, 10))}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #333', background: '#12121e', color: '#e2e8f0', fontSize: 13, width: 160, fontFamily: 'monospace' }} />
            <input placeholder="Nombre (opcional)" value={nuevoNombre} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNuevoNombre(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #333', background: '#12121e', color: '#e2e8f0', fontSize: 13, width: 150 }} />
            <button onClick={contactarLlamada} disabled={enviando || nuevoTel.length < 10}
              style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: nuevoTel.length >= 10 ? '#25D366' : '#333', color: '#fff', cursor: nuevoTel.length >= 10 ? 'pointer' : 'default', fontSize: 13 }}>
              {enviando ? 'Enviando...' : 'Enviar info + fotos por WA'}
            </button>
            {msgExito && <span style={{ fontSize: 12, color: '#10b981' }}>{msgExito}</span>}
          </div>

          {llamadas.length === 0 ? <p style={{ color: '#64748b', fontSize: 13 }}>Sin llamadas</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Teléfono', 'Nombre', 'Fecha', 'Contestada', 'WA enviado', 'Seguimiento', 'Acciones'].map(h => <th key={h} style={S.th}>{h}</th>)}
              </tr></thead>
              <tbody>{llamadas.map(ll => (
                <tr key={ll.id}>
                  <td style={S.td}><span style={{ fontFamily: 'monospace' }}>{fmtTel(ll.telefono)}</span></td>
                  <td style={S.td}>{ll.nombre || <span style={{ color: '#475569' }}>—</span>}</td>
                  <td style={S.td}>{fechaMx(ll.creado_en)}</td>
                  <td style={S.td}>
                    <button onClick={() => patch(ll.id, 'llamadas_rescatadas', { contestada: !ll.contestada })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>
                      {ll.contestada ? '✅' : '⬜'}
                    </button>
                  </td>
                  <td style={S.td}>
                    <button onClick={() => patch(ll.id, 'llamadas_rescatadas', { whatsapp_enviado: !ll.whatsapp_enviado })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>
                      {ll.whatsapp_enviado ? '✅' : '⬜'}
                    </button>
                  </td>
                  <td style={S.td}>
                    <select value={ll.seguimiento} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => patch(ll.id, 'llamadas_rescatadas', { seguimiento: e.target.value })}
                      style={{ background: '#1a1a2e', color: SEG_C[ll.seguimiento] || '#94a3b8', border: '1px solid #333', borderRadius: 4, padding: '3px 6px', fontSize: 11, cursor: 'pointer' }}>
                      {Object.keys(SEG_C).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={S.td}>
                    <a href={`https://wa.me/52${ll.telefono.replace(/\D/g, '').replace(/^52/, '')}`} target="_blank" rel="noreferrer"
                      style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: '#25D366', color: '#fff', textDecoration: 'none', marginRight: 4 }}>
                      WA
                    </a>
                    <a href={`tel:+52${ll.telefono.replace(/\D/g, '').replace(/^52/, '')}`}
                      style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: '#3b82f6', color: '#fff', textDecoration: 'none' }}>
                      Llamar
                    </a>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}

      {/* ═══ PUBLICACIONES ═══ */}
      {vista === 'publicaciones' && (
        <div>
          {/* Resumen */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Hoy', valor: pubHoy, color: '#10b981' },
              { label: 'Instagram', valor: pubIG, color: '#E1306C' },
              { label: 'Facebook', valor: pubFB, color: '#1877F2' },
              { label: 'TikTok', valor: pubTT, color: '#00f2ea' },
            ].map(c => (
              <div key={c.label} style={{ ...S.card, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: c.color }}>{c.valor}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Tabla */}
          <div style={S.card}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, color: '#E1306C' }}>Historial de publicaciones</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Red', 'Tipo', 'Caption', 'Imagen', 'Fecha', 'Estado'].map(h => <th key={h} style={S.th}>{h}</th>)}
              </tr></thead>
              <tbody>{pubs.map(p => (
                <tr key={p.id}>
                  <td style={S.td}><span style={S.badge(RED_C[p.red] || '#94a3b8')}>{p.red}</span></td>
                  <td style={S.td}><span style={{ fontSize: 11, color: p.tipo === 'story' ? '#f59e0b' : '#94a3b8' }}>{p.tipo}</span></td>
                  <td style={{ ...S.td, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.caption || <span style={{ color: '#475569' }}>— story sin texto —</span>}</td>
                  <td style={S.td}><span style={{ fontSize: 11, color: '#64748b' }}>{p.imagen_url}</span></td>
                  <td style={S.td}>{fechaMx(p.creado_en)}</td>
                  <td style={S.td}><span style={S.badge('#10b981')}>{p.estado}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ MODAL DETALLE LEAD ═══ */}
      {sel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setSel(null)}>
          <div onClick={e => e.stopPropagation()} style={{ ...S.card, width: 520, maxHeight: '80vh', overflow: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17 }}>{sel.nombre || fmtTel(sel.telefono)}</h3>
                {sel.nombre && <div style={{ color: '#64748b', fontSize: 13, fontFamily: 'monospace' }}>{fmtTel(sel.telefono)}</div>}
                <div style={{ marginTop: 4, display: 'flex', gap: 6 }}>
                  <span style={S.badge(COL_C[sel.estado])}>{sel.estado}</span>
                  {sel.interes && INTERES_LABEL[sel.interes] && <span style={S.badge(INTERES_COLOR[sel.interes])}>{INTERES_LABEL[sel.interes]}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <a href={`https://wa.me/52${sel.telefono.replace(/\D/g, '').replace(/^52/, '')}`} target="_blank" rel="noreferrer"
                  style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: '#25D366', color: '#fff', textDecoration: 'none' }}>WhatsApp</a>
                <a href={`tel:+52${sel.telefono.replace(/\D/g, '').replace(/^52/, '')}`}
                  style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: '#3b82f6', color: '#fff', textDecoration: 'none' }}>Llamar</a>
                <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>
            </div>
            {/* La conversación va PRIMERO, pegada al encabezado — antes había
                cinco bloques (botones de etapa, ficha completa, banner de
                ventana, input) antes de llegar a los mensajes, así que abrir
                un lead significaba deslizar hacia abajo para ver de qué se
                trataba. Lo que se quiere ver primero al abrir un lead es la
                plática, no los botones de acción. */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>
                {(() => { const v = ventana24(bandeja.find(b => b.id === sel.id)?.ultimo_entrante ?? null); return <>{v.icono} {v.label}</> })()}
                {' · último mensaje hace '}{hace(hist[hist.length - 1]?.creado_en ?? sel.actualizado_en)}
              </span>
            </div>

            {hist.length === 0 ? <p style={{ color: '#94a3b8', fontSize: 15 }}>Sin mensajes</p> : (() => {
                // Orden cronológico natural: lo más viejo arriba, lo más
                // reciente abajo, como cualquier chat — el scroll se ancla
                // solo hasta el fondo, así que no hace falta invertir nada.
                const pendiente = hist[hist.length - 1]?.tipo === 'Mensaje Entrante'

                // El tipo real que guarda la base es 'Mensaje Entrante' /
                // 'Mensaje Saliente Bot' / 'Nota Manual'. El código comparaba
                // contra 'entrante', que NUNCA coincide: por eso todos los
                // mensajes se pintaban en verde como si los hubiera dicho el
                // bot, incluidos los del cliente.
                const estilo = (msg: Interaccion) => {
                  const manual = !!(msg.metadata && typeof msg.metadata === 'object' && 'manual' in msg.metadata)
                  if (msg.contenido.startsWith('[NO ENTREGADO]'))
                    return { bg: '#fef2f2', linea: '#ef4444', txt: '#dc2626', quien: '⚠️ NO LLEGÓ' }
                  if (msg.tipo === 'Mensaje Entrante')
                    return { bg: '#eff6ff', linea: '#3b82f6', txt: '#1d4ed8', quien: '👤 CLIENTE' }
                  if (msg.tipo === 'Nota Manual')
                    return { bg: '#fffbeb', linea: '#f59e0b', txt: '#b45309', quien: '📌 NOTA' }
                  if (manual)
                    return { bg: '#faf5ff', linea: '#a855f7', txt: '#7e22ce', quien: '🙋 TÚ' }
                  return { bg: '#f0fdf4', linea: '#22c55e', txt: '#15803d', quien: '🤖 ANA' }
                }

                return (
                  <>
                    {pendiente && (
                      <div style={{ background: '#ef4444', color: '#fff', padding: '12px 16px', borderRadius: 10, marginBottom: 12, fontWeight: 700, fontSize: 16 }}>
                        ⏳ PENDIENTE DE CONTESTAR — el último mensaje es del cliente
                      </div>
                    )}
                    {/* Contenedor con scroll propio — el resto del panel (header,
                        botones, ventana de 24h, input) se queda fijo arriba. */}
                    <div ref={chatBoxRef} style={{ maxHeight: '45vh', overflowY: 'auto', paddingRight: 4 }}>
                      {hist.map((msg, i) => {
                        const e = estilo(msg)
                        const esUltimo = i === hist.length - 1
                        return (
                          <div key={msg.id} style={{ marginBottom: 10, padding: 12, borderRadius: 10, background: e.bg,
                            borderLeft: `4px solid ${e.linea}`, boxShadow: esUltimo ? `0 0 0 2px ${e.linea}55` : 'none' }}>
                            <div style={{ color: e.txt, fontSize: 13, fontWeight: 800, marginBottom: 4 }}>
                              {e.quien} · {fechaMx(msg.creado_en)}
                              {esUltimo && <span style={{ marginLeft: 8, background: e.linea, color: '#fff', borderRadius: 6, padding: '1px 8px', fontSize: 11 }}>ÚLTIMO</span>}
                            </div>
                            <div style={{ fontSize: 16, color: '#0f172a', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.contenido}</div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )
              })()}

            {/* Enviar mensaje manual — texto libre si la ventana está abierta,
                si no, solo se puede elegir una de las 4 plantillas aprobadas.
                Dejar escribir texto libre fuera de la ventana solo produce el
                error 131047, así que aquí ni se ofrece la opción. Va justo
                debajo de los mensajes, como cualquier chat normal. */}
            {ventana24(bandeja.find(b => b.id === sel.id)?.ultimo_entrante ?? null).abierta ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input placeholder="Escribe un mensaje..." value={msgManual} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMsgManual(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') enviarMensaje(sel.telefono, sel.id) }}
                  style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: '2px solid #e2e8f0', background: '#fff', color: '#0f172a', fontSize: 16 }} />
                <button onClick={() => enviarMensaje(sel.telefono, sel.id)} disabled={enviandoMsg || !msgManual.trim()}
                  style={{ padding: '12px 20px', borderRadius: 10, border: 'none', background: '#25D366', color: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>
                  {enviandoMsg ? '...' : 'Enviar'}
                </button>
              </div>
            ) : null}
            {/* Enviar más fotos a mano — solo con ventana abierta, misma regla
                que el texto libre. Las fotos ya existían listas para esto en
                config.ts, solo les faltaba un botón. Si ya se mandaron antes
                a este mismo lead, el botón lo dice y pide confirmar antes de
                repetir el mismo set — Carlos pidió explícitamente que no se
                repitan fotos sin querer. */}
            {ventana24(bandeja.find(b => b.id === sel.id)?.ultimo_entrante ?? null).abierta && (() => {
              const yaFotos = fotosExtraEnviadas(hist)
              const clickFotos = (cual: 'ph' | 'depto') => {
                const yaEn = cual === 'ph' ? yaFotos.ph : yaFotos.depto
                if (yaEn && !confirm(`Ya le mandaste estas fotos hace ${hace(yaEn)}. ¿Mandarlas otra vez?`)) return
                enviarMasFotos(sel.telefono, sel.id, cual)
              }
              return (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => clickFotos('ph')} disabled={enviandoFotos !== null}
                    style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #8b5cf644', background: 'transparent', color: '#8b5cf6', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                    {enviandoFotos === 'ph' ? 'Enviando...' : yaFotos.ph ? `✓ Fotos del Penthouse — hace ${hace(yaFotos.ph)}` : '📸 Más fotos del Penthouse'}
                  </button>
                  <button onClick={() => clickFotos('depto')} disabled={enviandoFotos !== null}
                    style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #0d948844', background: 'transparent', color: '#0d9488', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                    {enviandoFotos === 'depto' ? 'Enviando...' : yaFotos.depto ? `✓ Fotos del Depto — hace ${hace(yaFotos.depto)}` : '📸 Más fotos del Departamento'}
                  </button>
                </div>
              )
            })()}
            {!ventana24(bandeja.find(b => b.id === sel.id)?.ultimo_entrante ?? null).abierta && (() => {
              const yaEnviadas = plantillasEnviadas(hist)
              return (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select value={plantillaSel} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPlantillaSel(e.target.value as PlantillaCRM)}
                      style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: '2px solid #e2e8f0', background: '#fff', color: '#0f172a', fontSize: 16 }}>
                      {PLANTILLAS_CRM_UI.map(p => (
                        <option key={p.valor} value={p.valor}>
                          {p.label}{yaEnviadas[p.valor] ? ` — ✓ enviada hace ${hace(yaEnviadas[p.valor])}` : ''}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => enviarPlantillaManual(sel.telefono, sel.id, plantillaSel)} disabled={enviandoPlantilla}
                      style={{ padding: '12px 20px', borderRadius: 10, border: 'none', background: '#f59e0b', color: '#fff', cursor: 'pointer', fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {enviandoPlantilla ? '...' : 'Enviar plantilla'}
                    </button>
                  </div>
                  {Object.keys(yaEnviadas).length > 0 && (
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
                      Ya enviadas a este lead: {PLANTILLAS_CRM_UI.filter(p => yaEnviadas[p.valor]).map(p => p.label).join(' · ')}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Acciones secundarias — cambiar etapa a mano y reenviar el
                paquete completo. Se usan mucho menos seguido que leer y
                contestar, así que van hasta abajo en vez de ser lo primero
                que tapa la conversación. */}
            <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 18, paddingTop: 14 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {COLS.filter(c => c !== sel.estado).map(c => (
                  <button key={c} onClick={() => { patch(sel.id, 'leads', { estado: c }); setSel(null) }}
                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: `1px solid ${COL_C[c]}44`, background: 'transparent', color: COL_C[c], cursor: 'pointer' }}>
                    → {c}
                  </button>
                ))}
              </div>
              <button onClick={() => enviarPaquete(sel.telefono, sel.nombre, sel.id)} disabled={enviandoPaquete}
                style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid #2D6A4F44', background: 'transparent', color: '#2D6A4F', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                {enviandoPaquete ? 'Enviando...' : '📦 Reenviar ficha + fotos + oferta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
