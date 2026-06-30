// js/app/virtual_visit.js

export const VIRTUAL_MORONA_LOC = [-2.316261, -78.124737];
export const VIRTUAL_MORONA_ENV = "urbano";

/**
 * Evalua si should show visit morona para decidir el flujo de la interfaz.
 */
export function shouldShowVisitMorona(ctxGeo = {}) {
  const c = String(ctxGeo?.canton || "").trim().toLowerCase();

  if (c === "morona") return false;
  if (c.includes("sevilla")) return false;

  if (!c) return true;

  return true;
}

/**
 * Actualiza apply visit morona y sincroniza la interfaz con el estado actual.
 */
export function applyVisitMorona({ setUserLocation, map, onAfterSet } = {}) {
  if (typeof setUserLocation === "function") setUserLocation(VIRTUAL_MORONA_LOC);
  if (map) map.setView(VIRTUAL_MORONA_LOC, 14);

  if (typeof onAfterSet === "function") {
    onAfterSet(VIRTUAL_MORONA_LOC, {
      entornoUser: VIRTUAL_MORONA_ENV,
      isVirtual: true
    });
  }

  return VIRTUAL_MORONA_LOC;
}