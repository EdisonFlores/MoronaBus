// js/app/normalize.js

export function normalizeString(str) {

  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Normaliza o formatea normalize key para usarlo de forma consistente.
 */
export function normalizeKey(str) {

  return normalizeString(str)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Gestiona equal normalized dentro del flujo principal del modulo.
 */
export function equalNormalized(a, b) {
  return normalizeKey(a) === normalizeKey(b);
}

/**
 * Gestiona includes normalized dentro del flujo principal del modulo.
 */
export function includesNormalized(text, search) {

  const t = normalizeKey(text);
  const s = normalizeKey(search);

  if (!t || !s) return false;

  return t.includes(s);
}
/**
 * Obtiene get lat lng from doc desde el estado local, la API o los datos cacheados.
 */
export function getLatLngFromDoc(doc) {
  const u = doc?.ubicacion || doc?.["ubicación"] || null;

  const lat = u?.latitude ?? u?.lat ?? null;
  const lng = u?.longitude ?? u?.lng ?? null;

  if (typeof lat !== "number" || typeof lng !== "number") return null;

  return [lat, lng];
}