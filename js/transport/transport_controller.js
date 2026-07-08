// js/transport/transport_controller.js
import { clearTransportRoute, map as leafletMap } from "../map/map.js";
import { clearTransportState } from "./core/transport_state.js";
import { getCollectionCache } from "../app/cache_db.js";

// Controladores (selector "Líneas de transporte")
import { cargarLineasTransporte as cargarUrbano } from "./urbano/urbano_controller.js";
import { cargarLineasTransporte as cargarRural } from "./rural/rural_controller.js";

// Planners (modo 🚌 desde UI general)
import { planAndShowBusStopsForPlace as planUrbanoForPlace } from "./urbano/urbano_controller.js";
import { planAndShowBusStopsForPlace as planRuralForPlace } from "./rural/rural_controller.js";

/**
 * Limpia clear transport layers para dejar la vista o el estado listo para otro flujo.
 */
export function clearTransportLayers() {
  try { clearTransportRoute?.(); } catch {}
  try { clearTransportState?.(); } catch {}
}

/**
 * Obtiene cargar lineas transporte desde el estado local, la API o los datos cacheados.
 */
export async function cargarLineasTransporte(tipo, container, ctx = {}) {
  const t = String(tipo || "").toLowerCase();

  clearTransportLayers();

  if (t === "urbano") return cargarUrbano(tipo, container, ctx);
  if (t === "rural") return cargarRural(tipo, container, ctx);

  container.innerHTML = `<div class="alert alert-warning py-2">Tipo no soportado</div>`;
}

/**
 * Normaliza o formatea norm entorno para usarlo de forma consistente.
 */
function normEntorno(v) {
  const s = String(v || "").trim().toLowerCase();
  if (s === "urbano") return "urbano";
  if (s === "rural") return "rural";
  return "";
}

/**
 * Calcula decide preferred tipo para escoger la mejor opcion disponible.
 */
function decidePreferredTipo(entornoUser, entornoDest) {
  const u = normEntorno(entornoUser);
  const d = normEntorno(entornoDest);
  if (u && d && u === d) return u;
  return "";
}

// ✅ NUEVO: cobertura bus mínima (paradas cerca de user o destino)
function llFromStop(p) {
  const u = p?.ubicacion;
  const { latitude, longitude } = u || {};
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  return [latitude, longitude];
}

/**
 * Gestiona dist meters dentro del flujo principal del modulo.
 */
function distMeters(map, a, b) {
  try { return map.distance(a, b); } catch { return Infinity; }
}

function collectGeometryLatLngs(input, output = []) {
  if (!Array.isArray(input)) return output;
  if (typeof input[0] === "number" && typeof input[1] === "number") {
    output.push([input[1], input[0]]);
    return output;
  }
  input.forEach(item => collectGeometryLatLngs(item, output));
  return output;
}

function distanceToGeometryMeters(map, pointLatLng, geometry) {
  const points = collectGeometryLatLngs(geometry?.coordinates);
  if (!points.length) return Infinity;

  let best = Infinity;
  for (const p of points) {
    const d = distMeters(map, pointLatLng, p);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Evalua si has bus coverage para decidir el flujo de la interfaz.
 */
export async function hasBusCoverage({ map, userLoc, destLoc, destGeometry = null, radiusUrb = 2200, radiusRur = 4200 } = {}) {
  if (!map || !userLoc || !destLoc) return false;

  const urbanoAll = await getCollectionCache("paradas_transporte");
  const ruralAll  = await getCollectionCache("paradas_rurales");

  const urbano = (Array.isArray(urbanoAll) ? urbanoAll : [])
    .filter(p => p?.activo && String(p?.tipo || "").toLowerCase().trim() === "urbana");

  const rural = (Array.isArray(ruralAll) ? ruralAll : [])
    .filter(p => p?.activo && String(p?.tipo || "").toLowerCase().trim() === "rural");

  /**
   * Gestiona near any dentro del flujo principal del modulo.
   */
  const nearAny = (arr, rad) => {
    for (const p of arr) {
      const ll = llFromStop(p);
      if (!ll) continue;
      const d1 = distMeters(map, userLoc, ll);
      const d2 = destGeometry
        ? distanceToGeometryMeters(map, ll, destGeometry)
        : distMeters(map, destLoc, ll);
      if (d1 <= rad || d2 <= rad) return true;
    }
    return false;
  };

  const okU = nearAny(urbano, radiusUrb);
  const okR = nearAny(rural, radiusRur);
  return okU || okR;
}

// ✅ timeout global para modo bus (evita “1 minuto pensando”)
async function withTimeout(promise, ms = 12000) {
  let t = null;
  const timeout = new Promise((_, rej) => {
    t = setTimeout(() => rej(new Error("timeout")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (t) clearTimeout(t);
  }
}

/**
 * Calcula plan and show bus stops para escoger la mejor opcion disponible.
 */
export async function planAndShowBusStops(userLoc, destPlace, ctx = {}, ui = {}) {
  if (!userLoc || !destPlace?.ubicacion) return null;

  const now = (ctx?.now instanceof Date) ? ctx.now : new Date();

  const destLoc = [destPlace.ubicacion.latitude, destPlace.ubicacion.longitude];
  const busDestGeometry = destPlace?.usar_poligono_bus === true
    ? (destPlace?.geometry || null)
    : null;

  const ok = await hasBusCoverage({
    map: leafletMap,
    userLoc,
    destLoc,
    destGeometry: busDestGeometry
  });

  if (!ok) {
    if (ui?.infoEl) {
      ui.infoEl.innerHTML = `
        <div class="alert alert-info py-2 mb-0">
          De momento no hay datos registrados en la zona para planificar <b>bus</b>. Pronto habrá cobertura.
        </div>
      `;
    }
    return null;
  }

  if (!ctx?.preserveLayers) clearTransportLayers();

  const entornoUser = ctx?.entornoUser;
  const entornoDest = destPlace?.entorno;
  const forcedTipoRaw = String(destPlace?.bus_tipo_forzado || "").toLowerCase().trim();
  const forcedTipo = (forcedTipoRaw === "urbano" || forcedTipoRaw === "rural") ? forcedTipoRaw : "";
  const preferred = forcedTipo || decidePreferredTipo(entornoUser, entornoDest);

  const baseCtx = {
    ...ctx,
    now,
    tipo: ctx?.tipo || "auto",
  };

  /**
   * Gestiona run tipo dentro del flujo principal del modulo.
   */
  async function runTipo(tipo, { dryRun, preserveLayers }, uiArg) {
    const c = { ...baseCtx, dryRun: !!dryRun, preserveLayers: !!preserveLayers };

    if (tipo === "urbano") {
      return planUrbanoForPlace(userLoc, destPlace, { ...c, tipo: "auto" }, uiArg);
    }

    return planRuralForPlace(
      userLoc,
      destPlace,
      { ...c, tipo: "rural", sentido: c?.sentido || "auto" },
      uiArg
    );
  }

  try {
    return await withTimeout((async () => {
      if (forcedTipo) {
        let evalForced = null;
        try {
          evalForced = await runTipo(forcedTipo, { dryRun: true, preserveLayers: true }, { infoEl: null });
        } catch (e) {
          console.warn(`Eval ${forcedTipo} falló:`, e);
        }

        if (evalForced) {
          clearTransportLayers();
          return runTipo(forcedTipo, { dryRun: false, preserveLayers: false }, ui);
        }

        if (ui?.infoEl) {
          ui.infoEl.innerHTML = `
            <div class="alert alert-warning py-2 mb-0">
              ❌ No se encontró una ruta en bus ${forcedTipo} para llegar a este destino.
            </div>
          `;
        }
        return null;
      }

      if (preferred) {
        let evalPreferred = null;
        try {
          evalPreferred = await runTipo(preferred, { dryRun: true, preserveLayers: true }, { infoEl: null });
        } catch (e) {
          console.warn(`Eval ${preferred} falló:`, e);
        }

        if (evalPreferred) {
          clearTransportLayers();
          return runTipo(preferred, { dryRun: false, preserveLayers: false }, ui);
        }

        const other = (preferred === "urbano") ? "rural" : "urbano";

        let evalOther = null;
        try {
          evalOther = await runTipo(other, { dryRun: true, preserveLayers: true }, { infoEl: null });
        } catch (e) {
          console.warn(`Eval ${other} falló:`, e);
        }

        if (!evalOther) {
          if (ui?.infoEl) {
            ui.infoEl.innerHTML = `
              <div class="alert alert-warning py-2 mb-0">
                ❌ No se encontró una ruta en bus para llegar a este destino.
              </div>
            `;
          }
          return null;
        }

        clearTransportLayers();
        return runTipo(other, { dryRun: false, preserveLayers: false }, ui);
      }

      const evalCtx = { ...baseCtx, dryRun: true, preserveLayers: true };

      let urbanoEval = null;
      let ruralEval = null;

      try { urbanoEval = await runTipo("urbano", evalCtx, { infoEl: null }); } catch (e) { console.warn("Eval urbano falló:", e); }
      try { ruralEval  = await runTipo("rural",  evalCtx, { infoEl: null }); } catch (e) { console.warn("Eval rural falló:", e); }

      const uScore = Number.isFinite(urbanoEval?.score) ? urbanoEval.score : Infinity;
      const rScore = Number.isFinite(ruralEval?.score) ? ruralEval.score : Infinity;

      let winner = null;
      if (uScore < rScore) winner = "urbano";
      else if (rScore < uScore) winner = "rural";
      else winner = urbanoEval ? "urbano" : (ruralEval ? "rural" : null);

      if (!winner) {
        if (ui?.infoEl) {
          ui.infoEl.innerHTML = `
            <div class="alert alert-warning py-2 mb-0">
              ❌ No se encontró una ruta en bus para llegar a este destino.
            </div>
          `;
        }
        return null;
      }

      clearTransportLayers();
      return runTipo(winner, { dryRun: false, preserveLayers: false }, ui);
    })(), 12000);
  } catch (e) {
    if (ui?.infoEl) {
      ui.infoEl.innerHTML = `
        <div class="alert alert-warning py-2 mb-0">
          ❌ No se encontró una ruta óptima en bus (tiempo de búsqueda excedido).
        </div>
      `;
    }
    return null;
  }
}
