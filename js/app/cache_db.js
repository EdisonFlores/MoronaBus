// js/app/cache_db.js
import { fetchCollection } from "../services/api.js";

const cache = new Map();        // name -> { data, ts }
const inflight = new Map();     // name -> Promise
const TTL_MS = 1000 * 60 * 10;  // 10 min

/**
 * Evalua si is fresh para decidir el flujo de la interfaz.
 */
function isFresh(entry) {
  if (!entry) return false;
  return (Date.now() - entry.ts) < TTL_MS;
}

/**
 * Obtiene get collection cache desde el estado local, la API o los datos cacheados.
 */
export async function getCollectionCache(name, { force = false, params = {} } = {}) {
  const keyName = String(name || "").trim();
  if (!keyName) return [];

  const paramsKey = JSON.stringify(params || {});
  const cacheKey = `${keyName}::${paramsKey}`;

  const existing = cache.get(cacheKey);
  if (!force && isFresh(existing)) return existing.data;

  if (inflight.has(cacheKey)) return inflight.get(cacheKey);

  /**
   * Gestiona p dentro del flujo principal del modulo.
   */
  const p = (async () => {
    const data = await fetchCollection(keyName, params);

    cache.set(cacheKey, { data, ts: Date.now() });
    inflight.delete(cacheKey);

    return Array.isArray(data) ? data : [];
  })().catch(err => {
    inflight.delete(cacheKey);
    throw err;
  });

  inflight.set(cacheKey, p);
  return p;
}

/**
 * Limpia clear collection cache para dejar la vista o el estado listo para otro flujo.
 */
export function clearCollectionCache(name, params = {}) {
  const keyName = String(name || "").trim();
  const paramsKey = JSON.stringify(params || {});
  const cacheKey = `${keyName}::${paramsKey}`;
  cache.delete(cacheKey);
}

/**
 * Limpia clear all caches para dejar la vista o el estado listo para otro flujo.
 */
export function clearAllCaches() {
  cache.clear();
  inflight.clear();
}