// js/app/helpers.js

/**
 * Limpia clear route info para dejar la vista o el estado listo para otro flujo.
 */
export function clearRouteInfo(infoBox) {
  infoBox.innerHTML = "";
}

/**
 * Normaliza o formatea format duration from seconds para usarlo de forma consistente.
 */
export function formatDurationFromSeconds(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));

  if (s < 60) return `${s} s`;

  const totalMin = Math.round(s / 60);

  if (totalMin < 60) return `${totalMin} min`;

  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;

  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
