// Normalización centralizada para nombres de ADC.
// No toca datos existentes: solo se usa al guardar nuevos valores o al actualizar.

export function normalizeAdcForStorage(
  name: string | null | undefined,
): string | null {
  if (!name) return null;
  const s = name
    .replace(/\u00A0/g, " ")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return null;
  return s;
}
