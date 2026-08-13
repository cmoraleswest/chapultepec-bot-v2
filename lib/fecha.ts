// Vercel corre las funciones en UTC — "medianoche" sin ajustar daba medianoche
// de Londres, no de México, así que el panel de salud y el reporte diario se
// reseteaban a las 6pm hora de México en vez de a medianoche real.
export function inicioDiaMexico(): string {
  const MX_OFFSET_MS = 6 * 60 * 60 * 1000 // México es UTC-6, sin horario de verano desde 2022
  const ahoraMx = new Date(Date.now() - MX_OFFSET_MS)
  const medianocheMx = Date.UTC(ahoraMx.getUTCFullYear(), ahoraMx.getUTCMonth(), ahoraMx.getUTCDate())
  return new Date(medianocheMx + MX_OFFSET_MS).toISOString()
}
