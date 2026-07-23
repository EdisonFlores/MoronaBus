// js/app/selects.js
import { getCollectionCache } from "./cache_db.js";

/**
 * Normaliza o formatea norm lite para usarlo de forma consistente.
 */
function normLite(value) {
  return String(value || "").trim().toLowerCase();
}

/**
 * Evalua si is sevilla morona canton para decidir el flujo de la interfaz.
 */
function isSevillaMoronaCanton(value) {
  const v = normLite(value);
  return v === "morona" || v === "sevilla don bosco" || v.includes("sevilla");
}

/**
 * Evalua si matches sevilla morona canton para decidir el flujo de la interfaz.
 */
function matchesSevillaMoronaCanton(value) {
  const city = String(value || "").trim();
  return city === "Sevilla Don Bosco" || city === "Morona";
}

/* =====================================================
   PROVINCIAS desde colección "provincias"
===================================================== */
export async function getProvinciasFS() {
  const docs = await getCollectionCache("provincias");
  const arr = Array.isArray(docs) ? [...docs] : [];

  arr.sort((a, b) => {
    const an = String(a?.Nombre || a?.nombre || "").trim();
    const bn = String(b?.Nombre || b?.nombre || "").trim();
    return an.localeCompare(bn);
  });

  return arr;
}

/* =====================================================
   CANTONES por código de provincia
===================================================== */
export async function getCantonesFSByCodigoProvincia(codigo_provincia) {
  const docs = await getCollectionCache("cantones");
  const arr = Array.isArray(docs) ? docs : [];
  const cp = String(codigo_provincia || "").trim();

  const filtered = arr.filter(c => String(c?.codigo_provincia || "").trim() === cp);

  filtered.sort((a, b) => {
    const an = String(a?.nombre || a?.Nombre || "").trim();
    const bn = String(b?.nombre || b?.Nombre || "").trim();
    return an.localeCompare(bn);
  });

  return filtered;
}

/* =====================================================
   Tipos de comida desde colección "lugares"
===================================================== */
export async function getTiposComidaFromLugar({ provincia, canton, specialSevilla } = {}) {
  const docs = await getCollectionCache("lugares");
  const arr = Array.isArray(docs) ? docs : [];

  const provSel = String(provincia || "").trim();
  const cantonSel = String(canton || "").trim();
  const sharedCoverage = specialSevilla === true || isSevillaMoronaCanton(cantonSel);

  const set = new Set();

  arr.forEach(l => {
    if (!l?.activo) return;
    if (String(l?.provincia || "").trim() !== provSel) return;

    const sub = String(l?.subcategoria || "").trim().toLowerCase();
    if (sub !== "alimentacion") return;

    const ciudad = String(l?.ciudad || "").trim();

    if (sharedCoverage) {
      if (!matchesSevillaMoronaCanton(ciudad)) return;
    } else {
      if (ciudad !== cantonSel) return;
    }

    const tc = String(l?.tipocomida || "").trim();
    if (tc) set.add(tc);
  });

  return [...set].sort((a, b) => a.localeCompare(b));
}
