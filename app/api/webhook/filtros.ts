// Filtros de entrada — evalúa si un número debe procesarse o ignorarse

import { NUMERO_PRUEBAS, BLOQUEADOS } from './config'

export type ResultadoFiltro = 'IGNORAR' | 'PROCESAR_PRUEBA' | 'PROCESAR_REAL'

export function evaluarFiltros(phone: string): ResultadoFiltro {
  const digitos = phone.replace(/\D/g, '')

  // Número de pruebas de Carlos — siempre procesar con secuencia completa
  if (digitos === NUMERO_PRUEBAS || digitos.endsWith(NUMERO_PRUEBAS.slice(-10))) {
    return 'PROCESAR_PRUEBA'
  }

  // Solo números mexicanos (+52)
  if (!digitos.startsWith('52')) {
    return 'IGNORAR'
  }

  // Lista negra — bloqueados permanentemente
  if (BLOQUEADOS.has(digitos) || BLOQUEADOS.has(digitos.slice(-10))) {
    return 'IGNORAR'
  }

  return 'PROCESAR_REAL'
}
