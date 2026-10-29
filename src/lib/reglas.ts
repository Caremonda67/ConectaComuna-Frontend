/**
 * Reglas del pacto que también valida la base, en cambiar_estado_pedido.
 * Viven aquí para que la pantalla y Postgres digan lo mismo: si cambia el
 * tope acá, tiene que cambiar allá.
 */

/** El anticipo no pasa de la mitad del precio acordado. */
export const TOPE_ANTICIPO = 0.5

/**
 * Monto máximo de anticipo. Se redondea hacia abajo para no pasarse nunca del
 * tope que aplica la base, que corta en el medio exacto.
 */
export function anticipoPermitido(precio: number): number {
  if (!Number.isFinite(precio) || precio <= 0) return 0
  return Math.floor(precio * TOPE_ANTICIPO)
}

export function anticipoExcedeElTope(precio: number, anticipo: number): boolean {
  if (!Number.isFinite(anticipo)) return true
  return anticipo > anticipoPermitido(precio)
}
