// Helpers de moneda compartidos por el módulo Comercial R4.
// Regla de oro: una orden mensual SIEMPRE debe respetar la moneda de su renta.
// Nunca se inventa 'MXN' ni se propaga basura (montos, 'NA', 'NO', etc.).

export type Moneda = "MXN" | "USD";

/**
 * Normaliza un valor crudo a 'MXN' | 'USD'.
 * Devuelve null para cualquier valor inválido (montos, 'NA', 'NO', vacío, etc.),
 * de modo que un valor corrupto jamás se trate como una moneda real.
 */
export function normalizarMoneda(raw: unknown): Moneda | null {
  if (raw === null || raw === undefined) return null;
  const v = String(raw).trim().toUpperCase();
  return v === "MXN" || v === "USD" ? v : null;
}

/**
 * Resuelve la moneda de una orden mensual respetando la moneda de la renta.
 * Prioridad: moneda de la renta (detalles) > moneda válida ya guardada en la orden.
 * Si no hay ninguna moneda válida, regresa null (no inventa 'MXN').
 */
export function resolverMonedaOrden(input: {
  rentaMoneda?: unknown;
  ordenMoneda?: unknown;
}): Moneda | null {
  return (
    normalizarMoneda(input.rentaMoneda) ??
    normalizarMoneda(input.ordenMoneda) ??
    null
  );
}
