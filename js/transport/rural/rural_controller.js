// js/transport/rural/rural_controller.js
import { map } from "../../map/map.js";
import { getCollectionCache } from "../../app/cache_db.js";
import { translateNode } from "../../app/i18n.js";

import { renderLineaExtraControls } from "../core/transport_ui.js";
import {
  getLineasByTipo,
  getParadasByLinea,
  normStr,
  titleCase,
  isLineOperatingNow,
  formatLineScheduleHTML
} from "../core/transport_data.js";

import {
  buildStopPopupHTML,
  startPopupLiveUpdate,
  stopPopupLiveUpdate,
  computeStopOffsets
} from "../core/transport_time.js";

import {
  drawDashedAccessRoute,
  buildLineRouteFollowingStreets,
  getAccessRouteMetrics
} from "../core/transport_osrm.js";

import {
  clearTransportState,
  setCurrentLinea,
  setCurrentParadas,
  setCurrentStopMarkers,
  setCurrentStopOffsets,
  setStopsLayer,
  setRouteLayer,
  setAccessLayer
} from "../core/transport_state.js";
import { getUserLocation } from "../../app/state.js";

/* =====================================================
   validación geo (provincia/cantón/parroquia)
===================================================== */
function normLite(s) {
  return String(s || "").trim().toLowerCase();
}

function normGeoKey(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/* =====================================================
   LIMITES (RURAL)
===================================================== */
const RURAL_BOARD_STEPS = [150, 300, 500, 800, 1000, 1200, 1500, 2000, 2600, 3200];
const RURAL_DEST_STEPS = [250, 450, 650, 900, 1200, 1500, 2000, 2600, 3200, 4500, 6500];

const LEVELS_RURAL = Math.max(RURAL_BOARD_STEPS.length, RURAL_DEST_STEPS.length);
const EXAGGERATED_WALK_WARN_M = 2300;
const WALK_AFTER_ALIGHT_M = 700;

/* =====================================================
   MODAL (Bootstrap) - INFO LÍNEA
===================================================== */
function ensureTransportModal() {
  let el = document.getElementById("tm-linea-modal");
  if (el) return el;

  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="modal fade" id="tm-linea-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">

          <div class="modal-header">
            <h5 class="modal-title" id="tm-linea-modal-title">Información de la línea</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>

          <div class="modal-body">
            <div id="tm-linea-modal-body" class="small"></div>

            <div class="alert alert-info py-2 mt-3 mb-0">
              ℹ️ <b>Nota:</b> horarios, tiempos y “próximo bus” son <b>aproximados</b>.
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
          </div>

        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap.firstElementChild);
  return document.getElementById("tm-linea-modal");
}

/**
 * Gestiona hhmm now dentro del flujo principal del modulo.
 */
function hhmmNow(date = new Date()) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Muestra show linea modal al usuario.
 */
function showLineaModal(linea, now = new Date()) {
  const modalEl = ensureTransportModal();
  const titleEl = modalEl.querySelector("#tm-linea-modal-title");
  const bodyEl = modalEl.querySelector("#tm-linea-modal-body");

  const code = linea?.codigo || "";
  const name = linea?.nombre ? ` - ${linea.nombre}` : "";

  const isOp = isLineOperatingNow(linea, now);

  titleEl.textContent = `🚌 ${code}${name}`;

  const scheduleHTML = formatLineScheduleHTML(linea);

  bodyEl.innerHTML = `
    <div class="alert ${isOp ? "alert-success" : "alert-warning"} py-2 mb-2">
      ${isOp ? "✅ <b>Operativa</b>" : "⛔ <b>Fuera de servicio</b>"}<br>
      Hora actual: <b>${hhmmNow(now)}</b>
    </div>
    <div class="p-2 border rounded">${scheduleHTML}</div>
  `;

  const modal = window.bootstrap?.Modal?.getOrCreateInstance(modalEl, {
    backdrop: true,
    keyboard: true
  });
  modal?.show();
}

/* =====================================================
   MODAL (Bootstrap) - PRÓXIMAS SALIDAS / RETORNOS (tabs)
===================================================== */
function ensureDeparturesModal() {
  let el = document.getElementById("tm-dep-modal");
  if (el) return el;

  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="modal fade" id="tm-dep-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">

          <div class="modal-header">
            <h5 class="modal-title" id="tm-dep-modal-title">Próximas salidas (1 hora)</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>

          <div class="modal-body">
            <ul class="nav nav-tabs" id="tm-dep-tabs" role="tablist">
              <li class="nav-item" role="presentation">
                <button class="nav-link active" id="tm-tab-salidas" data-bs-toggle="tab" data-bs-target="#tm-pane-salidas" type="button" role="tab">
                  Salidas (Ida)
                </button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link" id="tm-tab-retornos" data-bs-toggle="tab" data-bs-target="#tm-pane-retornos" type="button" role="tab">
                  Retornos (Vuelta)
                </button>
              </li>
            </ul>

            <div class="tab-content border border-top-0 rounded-bottom p-2" id="tm-dep-tabcontent">
              <div class="tab-pane fade show active" id="tm-pane-salidas" role="tabpanel">
                <div id="tm-dep-modal-body-salidas" class="small"></div>
              </div>
              <div class="tab-pane fade" id="tm-pane-retornos" role="tabpanel">
                <div id="tm-dep-modal-body-retornos" class="small"></div>
              </div>
            </div>

            <div class="text-muted small mt-2">
              ℹ️ Listas filtradas por la próxima hora. Horarios aproximados.
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
          </div>

        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap.firstElementChild);
  return document.getElementById("tm-dep-modal");
}

/**
 * Muestra show departures modal al usuario.
 */
function showDeparturesModal(htmlSalidas, htmlRetornos, now = new Date()) {
  const modalEl = ensureDeparturesModal();
  const titleEl = modalEl.querySelector("#tm-dep-modal-title");
  const bodySal = modalEl.querySelector("#tm-dep-modal-body-salidas");
  const bodyRet = modalEl.querySelector("#tm-dep-modal-body-retornos");

  titleEl.textContent = `Próxima hora (${hhmmNow(now)} → ${hhmmNow(new Date(now.getTime() + 60 * 60000))})`;

  bodySal.innerHTML = htmlSalidas;
  bodyRet.innerHTML = htmlRetornos;

  const modal = window.bootstrap?.Modal?.getOrCreateInstance(modalEl, {
    backdrop: true,
    keyboard: true
  });
  modal?.show();
}

/* =====================================================
   LIMPIEZA
===================================================== */
export function clearTransportLayers() {
  try { stopPopupLiveUpdate(); } catch {}
  try { clearTransportState(); } catch {}
}

/* =====================================================
   HELPERS GEOM
===================================================== */
function getParadaLatLng(p) {
  const { latitude, longitude } = p?.ubicacion || {};
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  return [latitude, longitude];
}

/**
 * Gestiona dist meters dentro del flujo principal del modulo.
 */
function distMeters(a, b) {
  return map.distance(a, b);
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

function distanceToGeometryMeters(pointLatLng, geometry) {
  const points = collectGeometryLatLngs(geometry?.coordinates);
  if (!points.length) return Infinity;

  let best = Infinity;
  for (const p of points) {
    const d = distMeters(pointLatLng, p);
    if (d < best) best = d;
  }
  return best;
}

function stopParishKey(stop = {}) {
  return normGeoKey(stop.parroquia || stop.ciudad || stop.sector || stop.barrio || "");
}

function filterRuralLinesByDestinationParish(lineas = [], stopsByLine = new Map(), destPlace = {}) {
  if (destPlace?.tipo_territorial !== "parroquias") return lineas;
  if (Array.isArray(destPlace?.bus_lineas_permitidas?.rural)) return lineas;

  const parishKey = normGeoKey(destPlace.parroquia || destPlace.nombre);
  const destLoc = destPlace?.ubicacion
    ? [destPlace.ubicacion.latitude, destPlace.ubicacion.longitude]
    : null;

  if (!parishKey && !destLoc) return lineas;

  const byParishName = (Array.isArray(lineas) ? lineas : []).filter(linea => {
    const stops = stopsByLine.get(linea?.codigo) || [];
    return parishKey && stops.some(stop => stopParishKey(stop) === parishKey);
  });

  if (!destLoc || typeof destLoc[0] !== "number" || typeof destLoc[1] !== "number") return lineas;

  const byRouteGeometry = (Array.isArray(lineas) ? lineas : []).filter(linea => {
    const stops = stopsByLine.get(linea?.codigo) || [];
    return ["ida", "vuelta"].some(sentido => {
      const ordered = cutStopsAtEnd(buildOrderedStopsForLinea(stops, sentido, linea), sentido);
      const coords = ordered.map(getParadaLatLng).filter(Boolean);
      const nearestRoutePoint = findCandidatePointsOnPath(destLoc, coords)[0];
      return nearestRoutePoint?.d <= 6500;
    });
  });

  const allowedCodes = new Set([
    ...byParishName.map(linea => linea?.codigo),
    ...byRouteGeometry.map(linea => linea?.codigo)
  ]);
  return (Array.isArray(lineas) ? lineas : []).filter(linea => allowedCodes.has(linea?.codigo));
}

/**
 * Obtiene get denom desde el estado local, la API o los datos cacheados.
 */
function getDenom(p) {
  return String(p?.denominacion || "").toLowerCase().trim();
}

/**
 * Obtiene get marker spec desde el estado local, la API o los datos cacheados.
 */
function getMarkerSpec(p, linea) {
  const denom = getDenom(p);
  const color = linea?.color || "#000";

  if (denom === "referencial") {
    return {
      draw: true,
      popup: false,
      style: {
        radius: 2.6,
        color,
        fillColor: color,
        fillOpacity: 0.85,
        weight: 1,
        opacity: 0.9
      }
    };
  }

  return {
    draw: true,
    popup: true,
    style: {
      radius: 7,
      color,
      fillColor: color,
      fillOpacity: 0.9,
      weight: 2,
      opacity: 1
    }
  };
}

/**
 * Evalua si is stop candidate for board alight para decidir el flujo de la interfaz.
 */
function isStopCandidateForBoardAlight(p) {
  const denom = getDenom(p);
  if (denom === "referencial") return false;
  const uso = String(p?.uso || "").toLowerCase().trim();
  return denom === "parada" || uso === "fija" || uso === "recorrido";
}

/**
 * Busca find nearest coord on path dentro de las colecciones disponibles.
 */
function findNearestCoordOnPath(point, coords, distanceFn = null) {
  let best = null;
  let min = Infinity;
  for (const ll of coords) {
    const d = typeof distanceFn === "function" ? distanceFn(ll) : distMeters(point, ll);
    if (d < min) {
      min = d;
      best = ll;
    }
  }
  return best ? { ll: best, d: min } : null;
}

/**
 * Proyecta un destino sobre cada segmento del trazado y devuelve el punto
 * continuo más cercano, no solamente el vértice o la parada más próximos.
 */
function findCandidatePointsOnPath(point, coords, distanceFn = null) {
  if (!Array.isArray(coords) || coords.length < 2 || !point) return [];

  const earthRadius = 6371000;
  const latRef = Number(point[0]) * Math.PI / 180;
  const toXY = ll => ({
    x: (Number(ll[1]) - Number(point[1])) * Math.PI / 180 * earthRadius * Math.cos(latRef),
    y: (Number(ll[0]) - Number(point[0])) * Math.PI / 180 * earthRadius
  });

  const candidates = [];

  for (let i = 0; i < coords.length - 1; i++) {
    const a = toXY(coords[i]);
    const b = toXY(coords[i + 1]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = (dx * dx) + (dy * dy);
    const t = lengthSquared > 0
      ? Math.max(0, Math.min(1, -((a.x * dx) + (a.y * dy)) / lengthSquared))
      : 0;
    const projected = [
      Number(coords[i][0]) + (Number(coords[i + 1][0]) - Number(coords[i][0])) * t,
      Number(coords[i][1]) + (Number(coords[i + 1][1]) - Number(coords[i][1])) * t
    ];
    const distance = typeof distanceFn === "function"
      ? distanceFn(projected)
      : distMeters(point, projected);

    candidates.push({ ll: projected, d: distance, segmentIndex: i, t });
  }

  candidates.sort((a, b) => a.d - b.d);
  return candidates.filter((candidate, index, list) =>
    list.findIndex(other => distMeters(other.ll, candidate.ll) < 12) === index
  );
}

function isDestinationBeyondPathEnd(destination, path, projectedPoint) {
  if (!destination || !Array.isArray(path) || path.length < 2 || !projectedPoint) return false;
  const end = path[path.length - 1];
  const previous = path[path.length - 2];
  if (distMeters(projectedPoint, end) > 25) return false;

  const routeLat = Number(end[0]) - Number(previous[0]);
  const routeLng = Number(end[1]) - Number(previous[1]);
  const destLat = Number(destination[0]) - Number(end[0]);
  const destLng = Number(destination[1]) - Number(end[1]);
  return (routeLat * destLat) + (routeLng * destLng) > 0;
}

/**
 * Busca find nearest stop dentro de las colecciones disponibles.
 */
function findNearestStop(point, stops) {
  let best = null;
  let min = Infinity;
  for (const p of stops) {
    const ll = getParadaLatLng(p);
    if (!ll) continue;
    const d = distMeters(point, ll);
    if (d < min) {
      min = d;
      best = p;
    }
  }
  return best ? { stop: best, ll: getParadaLatLng(best), d: min } : null;
}

/**
 * Busca find nearest coord index dentro de las colecciones disponibles.
 */
function findNearestCoordIndex(coords, targetLL) {
  if (!coords?.length || !targetLL) return -1;
  let bestIdx = -1;
  let min = Infinity;
  for (let i = 0; i < coords.length; i++) {
    const d = distMeters(coords[i], targetLL);
    if (d < min) {
      min = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/* =====================================================
   NUMERAL + PREFIJO
===================================================== */
function parseCodigoParts(codigo) {
  const c = String(codigo || "").trim().toLowerCase();
  const m = c.match(/^([a-z_]+?)(\d+)$/);
  if (!m) return { prefix: c, num: null };
  return { prefix: m[1], num: Number(m[2]) };
}

/**
 * Obtiene get numeral desde el estado local, la API o los datos cacheados.
 */
function getNumeral(p) {
  const n = Number(p?.numeral);
  if (Number.isFinite(n)) return n;

  const o = Number(p?.orden);
  if (Number.isFinite(o)) return o;

  const { num } = parseCodigoParts(p?.codigo);
  return Number.isFinite(num) ? num : Infinity;
}

/**
 * Obtiene get prefix desde el estado local, la API o los datos cacheados.
 */
function getPrefix(p) {
  const { prefix } = parseCodigoParts(p?.codigo);
  return String(prefix || "").toLowerCase().trim();
}

/**
 * Gestiona sort by numeral stable dentro del flujo principal del modulo.
 */
function sortByNumeralStable(arr) {
  return [...arr].sort((a, b) => {
    const na = getNumeral(a);
    const nb = getNumeral(b);
    if (na !== nb) return na - nb;
    return String(a?.codigo || "").localeCompare(String(b?.codigo || ""));
  });
}

/* =====================================================
   Paradas por lineasruralpasan (robusto)
===================================================== */
function normCode(x) {
  const s = String(x ?? "").trim().toLowerCase();
  return s.replace(/\s+/g, "").replace(/[-_]/g, "");
}

/**
 * Gestiona extract codes from lineasruralpasan dentro del flujo principal del modulo.
 */
function extractCodesFromLineasruralpasan(p) {
  const arr = Array.isArray(p?.lineasruralpasan) ? p.lineasruralpasan : [];
  const out = [];
  for (const it of arr) {
    if (typeof it === "string" || typeof it === "number") {
      out.push(normCode(it));
      continue;
    }
    if (it && typeof it === "object") {
      if (it.codigo != null) out.push(normCode(it.codigo));
      else if (it.code != null) out.push(normCode(it.code));
      else if (it.id != null) out.push(normCode(it.id));
    }
  }
  return out.filter(Boolean);
}

/**
 * Gestiona belongs to linea by array dentro del flujo principal del modulo.
 */
function belongsToLineaByArray(p, codigoLinea) {
  const need = normCode(codigoLinea);
  if (!need) return false;
  return extractCodesFromLineasruralpasan(p).includes(need);
}

/**
 * Obtiene get paradas rurales by linea pasan desde el estado local, la API o los datos cacheados.
 */
async function getParadasRuralesByLineaPasan(codigoLinea) {
  const code = normCode(codigoLinea);

  const all = await getCollectionCache("paradas-rurales");
  const arr = Array.isArray(all) ? all : [];

  const filtered = arr.filter(p => {
    if (!p?.activo) return false;
    if (normStr(p?.tipo) && normStr(p?.tipo) !== "rural") return false;

    const codes = extractCodesFromLineasruralpasan(p);
    return codes.includes(code);
  });

  if (filtered.length) return filtered;

  try {
    const fb = await getParadasByLinea(String(codigoLinea || ""), { tipo: "rural", sentido: "Ida" });
    return Array.isArray(fb) ? fb : [];
  } catch {
    return [];
  }
}

/* =====================================================
   ESQUEMAS DE ORDEN
===================================================== */
function usesSevillaSchema(linea) {
  return normLite(linea?.denominacion) === "entra sevilla";
}

/**
 * Gestiona dedup by codigo dentro del flujo principal del modulo.
 */
function dedupByCodigo(arr) {
  const seen = new Set();
  const out = [];
  for (const p of (Array.isArray(arr) ? arr : [])) {
    const key = String(p?.codigo || "").trim();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/**
 * Construye build ordered stops sevilla para mostrar contenido o preparar datos de la interfaz.
 */
function buildOrderedStops_Sevilla(paradasAll, sentidoLower, linea) {
  const s = normStr(sentidoLower);
  const codigoLinea = linea?.codigo;

  const base = (Array.isArray(paradasAll) ? paradasAll : [])
    .filter(p => normStr(p?.sentido) === s)
    .filter(p => belongsToLineaByArray(p, codigoLinea));

  /**
   * Gestiona pref dentro del flujo principal del modulo.
   */
  const pref = (p) => getPrefix(p);
  const isFixedByPrefix =
    (p) => pref(p).startsWith("pfi") || pref(p).startsWith("pfis") || pref(p).startsWith("pfv") || pref(p).startsWith("pfvs");

  /**
   * Evalua si is rec para decidir el flujo de la interfaz.
   */
  const isRec = (p) => normStr(p?.uso) === "recorrido";
  /**
   * Evalua si is fija para decidir el flujo de la interfaz.
   */
  const isFija = (p) => normStr(p?.uso) === "fija" || isFixedByPrefix(p);

  /**
   * Evalua si is pfi para decidir el flujo de la interfaz.
   */
  const isPfi = (p) => pref(p).startsWith("pfi") && !pref(p).startsWith("pfis");
  /**
   * Evalua si is pfis para decidir el flujo de la interfaz.
   */
  const isPfis = (p) => pref(p).startsWith("pfis");
  /**
   * Evalua si is pfvs para decidir el flujo de la interfaz.
   */
  const isPfvs = (p) => pref(p).startsWith("pfvs");
  /**
   * Evalua si is pfv para decidir el flujo de la interfaz.
   */
  const isPfv = (p) => pref(p).startsWith("pfv") && !pref(p).startsWith("pfvs");

  const recorrido = sortByNumeralStable(base.filter(isRec));
  const fijas = base.filter(p => isFija(p) && !isRec(p));

  if (s === "ida") {
    const pfi = sortByNumeralStable(fijas.filter(isPfi));
    const pfis = sortByNumeralStable(fijas.filter(isPfis));
    return dedupByCodigo([...pfi, ...pfis, ...recorrido]);
  }

  if (s === "vuelta") {
    const pfvs = sortByNumeralStable(fijas.filter(isPfvs));
    const pfv = sortByNumeralStable(fijas.filter(isPfv));
    return dedupByCodigo([...recorrido, ...pfvs, ...pfv]);
  }

  return dedupByCodigo(sortByNumeralStable(base));
}

/**
 * Construye build ordered stops by linea pasan para mostrar contenido o preparar datos de la interfaz.
 */
function buildOrderedStops_ByLineaPasan(paradasAll, sentido, codigoLinea) {
  const s = normStr(sentido);
  const code = normCode(codigoLinea);

  const base = (Array.isArray(paradasAll) ? paradasAll : [])
    .filter(p => normStr(p?.sentido) === s)
    .filter(p => extractCodesFromLineasruralpasan(p).includes(code));

  if (!base.length) return [];

  /**
   * Evalua si is rec para decidir el flujo de la interfaz.
   */
  const isRec = (p) => normStr(p?.uso) === "recorrido";
  /**
   * Evalua si is fija para decidir el flujo de la interfaz.
   */
  const isFija = (p) => normStr(p?.uso) === "fija" || (!isRec(p));

  let out = [];

  if (s === "ida") {
    const fijas = sortByNumeralStable(base.filter(isFija));
    const rec = sortByNumeralStable(base.filter(isRec));
    out = [...fijas, ...rec];
  } else if (s === "vuelta") {
    const rec = sortByNumeralStable(base.filter(isRec));
    const fijas = sortByNumeralStable(base.filter(isFija));
    out = [...rec, ...fijas];
  } else {
    out = sortByNumeralStable(base);
  }

  const seen = new Set();
  const final = [];
  for (const p of out) {
    const key = String(p?.codigo || "").trim();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    final.push(p);
  }
  return final;
}

/**
 * Construye build ordered stops for linea para mostrar contenido o preparar datos de la interfaz.
 */
function buildOrderedStopsForLinea(paradasAll, sentidoLower, linea) {
  const s = normStr(sentidoLower);

  if (usesSevillaSchema(linea)) {
    return buildOrderedStops_Sevilla(paradasAll, s, linea);
  }

  const out = buildOrderedStops_ByLineaPasan(paradasAll, s, linea);
  if (!out.length) return buildOrderedStops_Sevilla(paradasAll, s, linea);
  return out;
}

/* =====================================================
   FIN DE RUTA
===================================================== */
function cutStopsAtEnd(paradas, sentidoLower) {
  if (!Array.isArray(paradas) || !paradas.length) return [];

  let lastIdx = -1;
  for (let i = 0; i < paradas.length; i++) {
    if (paradas[i]?.finderuta === true) lastIdx = i;
  }
  if (lastIdx !== -1) return paradas.slice(0, lastIdx + 1);

  if (normStr(sentidoLower) === "ida") {
    let lastRec = -1;
    for (let i = 0; i < paradas.length; i++) {
      if (normStr(paradas[i]?.uso) === "recorrido") lastRec = i;
    }
    if (lastRec !== -1) return paradas.slice(0, lastRec + 1);
  }

  return paradas;
}

/* =====================================================
   dibujar tramo "auto" dentro del layer del transporte
===================================================== */
async function drawDriveOSRMIntoLayer(layerGroup, fromLL, toLL, color = "#0d6efd") {
  try {
    if (!layerGroup || !fromLL || !toLL) return null;

    const [lat1, lon1] = fromLL;
    const [lat2, lon2] = toLL;

    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;

    const res = await fetch(url);
    const data = await res.json();
    if (!data.routes?.length) return null;

    const r = data.routes[0];
    const coords = r.geometry.coordinates.map(c => [c[1], c[0]]);
    const line = L.polyline(coords, { color, weight: 5 }).addTo(layerGroup);

    return { route: r, line };
  } catch {
    return null;
  }
}

/* =====================================================
   DIBUJO RUTA RURAL
===================================================== */
async function drawRuralRouteCoordsSmart(coordsOrdered, linea, routesGroup) {
  const color = linea?.color || "#000";

  if (coordsOrdered.length < 2) return null;
  const geometry = await buildLineRouteFollowingStreets(coordsOrdered);
  if (!geometry?.coords?.length) return null;

  const lineLayer = L.polyline(geometry.coords, {
    color: geometry.usedFallback ? "#ff9800" : color,
    weight: 4,
    opacity: geometry.usedFallback ? 0.8 : 0.9,
    dashArray: geometry.usedFallback ? "8,10" : null
  }).addTo(routesGroup);
  const end = geometry.coords[geometry.coords.length - 1];
  return { any: Boolean(lineLayer), endLL: end || null };
}

async function drawRuralRouteSmart(paradas, linea, routesGroup) {
  const coordsOrdered = (Array.isArray(paradas) ? paradas : [])
    .map(p => getParadaLatLng(p))
    .filter(Boolean);
  return drawRuralRouteCoordsSmart(coordsOrdered, linea, routesGroup);
}

/* =====================================================
   HORARIO: parse / generación
===================================================== */
function parseHHMM(s) {
  const m = String(s || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

/**
 * Normaliza o formatea fmt hhmm para usarlo de forma consistente.
 */
function fmtHHMM(mins) {
  const m = ((mins % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Gestiona now minutes dentro del flujo principal del modulo.
 */
function nowMinutes(now = new Date()) {
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Obtiene get freq min desde el estado local, la API o los datos cacheados.
 */
function getFreqMin(linea) {
  const a = Number(linea?.frecuencia_min);
  const b = Number(linea?.frecuencia_max);
  if (Number.isFinite(a) && a > 0) return a;
  if (Number.isFinite(b) && b > 0) return b;
  return null;
}

/**
 * Gestiona departures next hour dentro del flujo principal del modulo.
 */
function departuresNextHour(linea, sentidoLower, now = new Date(), windowMin = 60) {
  const start = nowMinutes(now);
  const end = start + windowMin;

  const ida = Array.isArray(linea?.horario_ida) ? linea.horario_ida : [];
  const ret = Array.isArray(linea?.horario_retorno) ? linea.horario_retorno : [];

  const listRaw = (normStr(sentidoLower) === "vuelta") ? ret : ida;
  const list = (Array.isArray(listRaw) ? listRaw : [])
    .map(parseHHMM)
    .filter(v => v != null)
    .sort((a, b) => a - b);

  if (list.length) {
    return list.filter(t => t >= start && t <= end).map(fmtHHMM);
  }

  const ini = parseHHMM(linea?.horario_inicio);
  const fin = parseHHMM(linea?.horario_fin);
  const freq = getFreqMin(linea);
  if (ini == null || fin == null || !freq) return [];

  const out = [];
  /**
   * Gestiona in window dentro del flujo principal del modulo.
   */
  const inWindow = (t) => t >= start && t <= end;

  if (ini <= fin) {
    let t = Math.max(start, ini);
    const k = Math.ceil((t - ini) / freq);
    t = ini + k * freq;
    while (t <= Math.min(end, fin)) {
      if (inWindow(t)) out.push(fmtHHMM(t));
      t += freq;
    }
    return out;
  }

  const maxT = Math.min(end, 24 * 60 - 1);

  if (start >= ini) {
    let t = start;
    const k = Math.ceil((t - ini) / freq);
    t = ini + k * freq;
    while (t <= maxT) {
      if (inWindow(t)) out.push(fmtHHMM(t));
      t += freq;
    }
  } else {
    const maxM = Math.min(end, fin);
    let t = start;
    const k = Math.ceil((t - 0) / freq);
    t = 0 + k * freq;
    while (t <= maxM) {
      if (inWindow(t)) out.push(fmtHHMM(t));
      t += freq;
    }
  }

  return out;
}

function getNearestDeparture(linea, sentidoLower, now = new Date()) {
  const raw = normStr(sentidoLower) === "vuelta"
    ? linea?.horario_retorno
    : linea?.horario_ida;
  const current = nowMinutes(now);
  const departures = (Array.isArray(raw) ? raw : [])
    .map(value => ({ label: String(value || "").trim(), minutes: parseHHMM(value) }))
    .filter(item => item.minutes != null)
    .sort((a, b) => a.minutes - b.minutes);

  const next = departures.find(item => item.minutes >= current);
  if (!next) return null;
  return {
    time: next.label || fmtHHMM(next.minutes),
    minutesAway: Math.max(0, next.minutes - current)
  };
}

/* =====================================================
   BOTÓN: próximas salidas
===================================================== */
function upsertDeparturesButton(container, lineas, ctx = {}) {
  const extraWrap = container.querySelector("#linea-extra");
  if (!extraWrap) return;

  let btn = extraWrap.querySelector("#btn-next-departures");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "btn-next-departures";
    btn.type = "button";
    btn.className = "btn btn-primary w-100 mt-2 d-flex align-items-center justify-content-center gap-2";
    btn.innerHTML = `🕐 <span>Ver próximas salidas de líneas</span>`;
    extraWrap.appendChild(btn);
  }

  btn.onclick = async () => {
    const now = new Date();
    const rowsSal = [];
    const rowsRet = [];

    const sorted = [...(Array.isArray(lineas) ? lineas : [])]
      .sort((a, b) => (Number(a?.orden) || 0) - (Number(b?.orden) || 0));

    for (const l of sorted) {
      if (!l?.activo) continue;
      if (normStr(l?.tipo) !== "rural") continue;

      const op = isLineOperatingNow(l, now);

      const salidas = departuresNextHour(l, "ida", now, 60);
      if (salidas.length) {
        rowsSal.push(`
          <div class="p-2 border rounded mb-2">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div>
                <div style="font-weight:700">${l.codigo || ""} ${l.nombre ? `- ${l.nombre}` : ""}</div>
              </div>
              <span class="badge ${op ? "text-bg-success" : "text-bg-warning"}">${op ? "Operativa" : "Fuera de servicio"}</span>
            </div>
            <div class="mt-2">
              <b>Salidas (ida) en la próxima hora:</b><br>
              ${salidas.map(x => `<span class="badge text-bg-light border me-1 mb-1">${x}</span>`).join("")}
            </div>
          </div>
        `);
      }

      const retornos = departuresNextHour(l, "vuelta", now, 60);
      if (retornos.length) {
        rowsRet.push(`
          <div class="p-2 border rounded mb-2">
            <div class="d-flex justify-content-between align-items-start gap-2">
              <div>
                <div style="font-weight:700">${l.codigo || ""} ${l.nombre ? `- ${l.nombre}` : ""}</div>
              </div>
              <span class="badge ${op ? "text-bg-success" : "text-bg-warning"}">${op ? "Operativa" : "Fuera de servicio"}</span>
            </div>
            <div class="mt-2">
              <b>Retornos (vuelta) en la próxima hora:</b><br>
              ${retornos.map(x => `<span class="badge text-bg-light border me-1 mb-1">${x}</span>`).join("")}
            </div>
          </div>
        `);
      }
    }

    const htmlSal = rowsSal.length
      ? rowsSal.join("")
      : `<div class="alert alert-warning py-2 mb-0">No hay salidas (ida) registradas en la próxima hora.</div>`;

    const htmlRet = rowsRet.length
      ? rowsRet.join("")
      : `<div class="alert alert-warning py-2 mb-0">No hay retornos (vuelta) registrados en la próxima hora.</div>`;

    showDeparturesModal(htmlSal, htmlRet, now);
  };
}

/* =====================================================
   CARGAR LÍNEAS (RURAL)
===================================================== */
export async function cargarLineasTransporte(tipo, container, ctx = {}) {
  container.innerHTML = "";
  clearTransportLayers();

  const t = String(tipo || "").toLowerCase();
  if (t !== "rural") return;

  const now = (ctx?.now instanceof Date) ? ctx.now : new Date();

  const lineas = await getLineasByTipo("rural", {
    ...ctx,
    ignoreGeoFilter: ctx?.ignoreGeoFilter === true || ctx?.specialSevilla === true
  });

  if (!lineas.length) {
    container.innerHTML = `
      <div class="tm-empty-state">
        <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
        <div>
          <b>No hay líneas disponibles</b>
          <span>No se encontraron rutas rurales para el filtro actual.</span>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <select id="select-linea" class="form-select mb-2">
      <option value="">Seleccione línea</option>
    </select>
    <div id="linea-extra"></div>
  `;

  const selectLinea = container.querySelector("#select-linea");

  lineas
    .sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0))
    .forEach(l => {
      selectLinea.innerHTML += `<option value="${l.codigo}">${l.codigo} - ${l.nombre}</option>`;
    });

  upsertDeparturesButton(container, lineas, ctx);

  let currentLineaSel = null;
  const sentidosCache = ["Ida", "Vuelta"];
  let currentSentido = "";

  container.onchange = async (ev) => {
    const target = ev.target;
    if (!target || !target.id) return;

    if (target.id === "select-linea") {
      const codigo = target.value;
      const linea = lineas.find(l => l.codigo === codigo);

      clearTransportLayers();
      const extraWrap = container.querySelector("#linea-extra");
      if (extraWrap) extraWrap.innerHTML = "";

      currentLineaSel = linea || null;
      currentSentido = "";

      if (!linea) return;

      showLineaModal(linea, new Date());

      renderLineaExtraControls(container, {
        sentidos: sentidosCache,
        showCobertura: false,
        coberturas: [],
      });

      upsertDeparturesButton(container, lineas, ctx);
      return;
    }

    if (!currentLineaSel) return;

    if (target.id === "select-sentido") {
      const sentidoSel = titleCase(normStr(target.value));

      clearTransportLayers();
      currentSentido = sentidoSel;

      renderLineaExtraControls(container, {
        sentidos: sentidosCache,
        showCobertura: false,
        coberturas: [],
      });

      upsertDeparturesButton(container, lineas, ctx);

      if (!sentidoSel) return;

      await mostrarRutaLinea(currentLineaSel, { sentido: currentSentido }, ctx);
      return;
    }
  };
}

/* =====================================================
   MOSTRAR RUTA (RURAL)
===================================================== */
export async function mostrarRutaLinea(linea, opts = {}, ctx = {}) {
  clearTransportLayers();
  setCurrentLinea(linea);

  const sentidoSel = titleCase(normStr(opts.sentido));
  const sentidoLower = normStr(sentidoSel);

  const paradasRaw = usesSevillaSchema(linea)
    ? await getParadasByLinea(linea.codigo, { ...ctx, tipo: "rural", sentido: sentidoSel })
    : await getParadasRuralesByLineaPasan(linea.codigo);

  if (!paradasRaw?.length) return;

  const ordered = buildOrderedStopsForLinea(paradasRaw, sentidoLower, linea);
  const paradas = cutStopsAtEnd(ordered, sentidoLower);

  setCurrentParadas(paradas);
  setCurrentStopOffsets(computeStopOffsets(paradas, linea));

  const layerParadas = L.layerGroup().addTo(map);
  setStopsLayer(layerParadas);

  const routesGroup = L.layerGroup().addTo(map);
  setRouteLayer(routesGroup);

  const stopMarkers = [];
  const coords = [];

  for (const p of paradas) {
    const ll = getParadaLatLng(p);
    if (!ll) continue;

    coords.push(ll);

    const spec = getMarkerSpec(p, linea);
    if (!spec?.draw) continue;

    const marker = L.circleMarker(ll, spec.style).addTo(layerParadas);

    if (spec.popup) {
      marker.bindPopup(buildStopPopupHTML(p, linea), { autoPan: true });

      marker.on("popupopen", () => {
        marker.setPopupContent(buildStopPopupHTML(p, linea));
        startPopupLiveUpdate(marker, p);
      });

      marker.on("popupclose", () => stopPopupLiveUpdate());

      stopMarkers.push({ marker, parada: p });
    } else {
      stopMarkers.push({ marker, parada: p });
    }
  }

  setCurrentStopMarkers(stopMarkers);

  try {
    const userLoc = getUserLocation?.();
    if (userLoc && stopMarkers.length) {
      let bestMarker = null;
      let bestLL = null;
      let bestD = Infinity;

      for (const it of stopMarkers) {
        const m = it?.marker;
        const p = it?.parada;
        if (!m || !p) continue;

        const denom = String(p?.denominacion || "").toLowerCase().trim();
        if (denom === "referencial") continue;

        const llObj = m.getLatLng?.();
        if (!llObj) continue;

        const d = map.distance(userLoc, llObj);
        if (d < bestD) {
          bestD = d;
          bestMarker = m;
          bestLL = [llObj.lat, llObj.lng];
        }
      }

      if (bestMarker && bestLL) {
        bestMarker.setStyle({
          color: "#2e7d32",
          fillColor: "#2e7d32",
          fillOpacity: 1,
          weight: 4
        });
        if (bestMarker.setRadius) bestMarker.setRadius(9);
        bestMarker.bindTooltip("🟢 Parada más cercana", { direction: "top", sticky: true });

        const accessLayer = L.layerGroup().addTo(map);
        setAccessLayer(accessLayer);

        await drawDashedAccessRoute(userLoc, bestLL, "#2e7d32");
      }
    }
  } catch {}

  if (coords.length < 2) return;

  await drawRuralRouteSmart(paradas, linea, routesGroup);
  map.fitBounds(L.latLngBounds(coords).pad(0.12));
}

/* =====================================================
   MODO BUS (RURAL)
===================================================== */
function llKey(ll) {
  if (!ll) return "";
  return `${Number(ll[0]).toFixed(6)},${Number(ll[1]).toFixed(6)}`;
}

/**
 * Construye build index by lat lng para mostrar contenido o preparar datos de la interfaz.
 */
function buildIndexByLatLng(coords) {
  const m = new Map();
  for (let i = 0; i < coords.length; i++) {
    const k = llKey(coords[i]);
    if (!m.has(k)) m.set(k, i);
  }
  return m;
}

/**
 * Gestiona with timeout dentro del flujo principal del modulo.
 */
async function withTimeout(promise, ms = 12000) {
  let t = null;
  const timeout = new Promise((_, rej) => {
    t = setTimeout(() => rej(new Error("timeout")), ms);
  });
  try {
    const out = await Promise.race([promise, timeout]);
    return out;
  } finally {
    if (t) clearTimeout(t);
  }
}

/**
 * Calcula plan and show bus stops for place para escoger la mejor opcion disponible.
 */
export async function planAndShowBusStopsForPlace(userLoc, destPlace, ctx = {}, ui = {}) {
  try {
    return await withTimeout(_planAndShowBusStopsForPlace(userLoc, destPlace, ctx, ui), 12000);
  } catch (e) {
    if (ui?.infoEl && !ctx?.dryRun) {
      ui.infoEl.innerHTML = `
        <div class="alert alert-warning py-2 mb-0">
          ❌ No se encontró una ruta óptima en bus (tiempo de búsqueda excedido).
        </div>
      `;
    }
    return null;
  }
}

/**
 * Gestiona plan and show bus stops for place dentro del flujo principal del modulo.
 */
async function _planAndShowBusStopsForPlace(userLoc, destPlace, ctx = {}, ui = {}) {
  if (!userLoc || !destPlace?.ubicacion) return null;

  if (!ctx?.preserveLayers) clearTransportLayers();

  const now = (ctx?.now instanceof Date) ? ctx.now : new Date();
  const destLoc = [destPlace.ubicacion.latitude, destPlace.ubicacion.longitude];
  const destDistance = destPlace?.usar_poligono_bus === true && destPlace?.geometry
    ? (ll) => distanceToGeometryMeters(ll, destPlace.geometry)
    : (ll) => distMeters(destLoc, ll);

  let lineasAll = await getLineasByTipo("rural", {
    ...ctx,
    // Las líneas rurales pueden cruzar parroquias y cantones. La validez se
    // decide por la cercanía real de su recorrido, no por el contexto activo.
    ignoreGeoFilter: true
  });

  if (!lineasAll?.length) {
    if (ui?.infoEl && !ctx?.dryRun) {
      ui.infoEl.innerHTML = `
        <div class="tm-empty-state">
          <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
          <div>
            <b>No hay líneas rurales disponibles</b>
            <span>Prueba con otra ubicación o cambia el filtro seleccionado.</span>
          </div>
        </div>
      `;
    }
    return null;
  }

  const stopsCacheByLinea = new Map();

  for (const linea of lineasAll) {
    if (!linea?.codigo) continue;
    const stops = await getParadasRuralesByLineaPasan(linea.codigo);
    stopsCacheByLinea.set(linea.codigo, stops || []);
  }

  const allowedRuralCodes = destPlace?.bus_lineas_permitidas?.rural;
  if (Array.isArray(allowedRuralCodes)) {
    const allowed = new Set(allowedRuralCodes.map(code => normStr(code)));
    lineasAll = lineasAll.filter(l => allowed.has(normStr(l?.codigo)));
  }

  let lineas = filterRuralLinesByDestinationParish(lineasAll, stopsCacheByLinea, destPlace);
  const selectedLineCode = normStr(ctx?.selectedLineCode || "");
  if (selectedLineCode) {
    lineas = lineas.filter(linea => normStr(linea?.codigo) === selectedLineCode);
  }

  if (!lineas.length) {
    if (ui?.infoEl && !ctx?.dryRun) {
      ui.infoEl.innerHTML = `
        <div class="alert alert-warning py-2 mb-0">
          ❌ No se encontraron líneas rurales con paradas registradas en <b>${destPlace?.nombre || "esta parroquia"}</b>.
        </div>
      `;
    }
    return null;
  }

  const requireOpNow = (ctx?.requireOperatingNow !== false);
  if (requireOpNow) {
    // No se eliminan anticipadamente las líneas fuera de horario: una de ellas
    // puede ser la única que realmente alcanza el destino. Se ordenan para
    // evaluar primero las operativas y la prioridad se resuelve más abajo.
    lineas = [...lineas].sort((a, b) =>
      Number(isLineOperatingNow(b, now)) - Number(isLineOperatingNow(a, now))
    );
  }

  let routesGroup = null;
  let layerStops = null;
  let walkLayer = null;

  if (!ctx?.dryRun) {
    walkLayer = L.layerGroup().addTo(map);
    setAccessLayer(walkLayer);

    routesGroup = L.layerGroup().addTo(map);
    setRouteLayer(routesGroup);

    layerStops = L.layerGroup().addTo(map);
    setStopsLayer(layerStops);
  }

  let best = null;
  const candidatePool = new Map();
  const W_TIME = 12;

  const reqSentido = normStr(ctx?.selectedSentido || ctx?.sentido || "auto");
  const sentidosToTry = (reqSentido === "ida" || reqSentido === "vuelta") ? [reqSentido] : ["ida", "vuelta"];

  for (let level = 0; level < LEVELS_RURAL; level++) {
    const maxBoard = RURAL_BOARD_STEPS[Math.min(level, RURAL_BOARD_STEPS.length - 1)];
    const maxDestBase = RURAL_DEST_STEPS[Math.min(level, RURAL_DEST_STEPS.length - 1)];
    const customMaxDest = Number(destPlace?.bus_max_dest_meters);
    const maxDest = Number.isFinite(customMaxDest) && customMaxDest > 0
      ? Math.max(maxDestBase, customMaxDest)
      : (destPlace?.tipo_territorial === "parroquias"
        ? Math.max(maxDestBase, 6500)
        : maxDestBase);

    for (const linea of lineas) {
      if (!linea?.activo) continue;

      let baseStops = stopsCacheByLinea.get(linea.codigo);
      if (!baseStops) {
        baseStops = await getParadasRuralesByLineaPasan(linea.codigo);
        stopsCacheByLinea.set(linea.codigo, baseStops || []);
      }
      if (!baseStops?.length) continue;

      for (const sentidoTry of sentidosToTry) {
        const sentidoLower = normStr(sentidoTry);

        const ordered = buildOrderedStopsForLinea(baseStops, sentidoLower, linea);
        const paradas = cutStopsAtEnd(ordered, sentidoLower);

        const coords = paradas.map(getParadaLatLng).filter(Boolean);
        if (coords.length < 2) continue;

        const visibles = paradas.filter(isStopCandidateForBoardAlight);
        if (visibles.length < 2) continue;

        const nearestStopUser = findNearestStop(userLoc, visibles);
        const nearestRouteUser = findCandidatePointsOnPath(userLoc, coords)[0];

        let boardLL = null;
        let boardDist = Infinity;
        let boardLabel = "";
        let usesRouteBoardPoint = false;

        if (nearestStopUser && nearestStopUser.d <= Math.min(maxBoard, WALK_AFTER_ALIGHT_M)) {
          boardLL = nearestStopUser.ll;
          boardDist = nearestStopUser.d;
          boardLabel = "Parada";
        } else if (nearestRouteUser && nearestRouteUser.d <= maxBoard) {
          boardLL = nearestRouteUser.ll;
          boardDist = nearestRouteUser.d;
          boardLabel = "Punto más cercano de la vía";
          usesRouteBoardPoint = true;
        } else {
          continue;
        }

        const idxBoard = findNearestCoordIndex(coords, boardLL);
        if (idxBoard < 0) continue;

        // La evaluación debe ser rápida: se usa la geometría registrada y solo
        // se consulta OSRM para la línea ganadora al momento de dibujarla.
        const roadCoords = coords;
        const idxBoardOnRoad = findNearestCoordIndex(roadCoords, boardLL);
        if (idxBoardOnRoad < 0) continue;

        const remainingPath = roadCoords.slice(idxBoardOnRoad);

        let nearestDestinationStop = null;
        for (let stopIndex = idxBoard + 1; stopIndex < paradas.length; stopIndex++) {
          const stop = paradas[stopIndex];
          if (!isStopCandidateForBoardAlight(stop)) continue;
          const ll = getParadaLatLng(stop);
          if (!ll) continue;
          const d = destDistance(ll);
          if (!nearestDestinationStop || d < nearestDestinationStop.d) {
            nearestDestinationStop = { stop, ll, d, stopIndex };
          }
        }

        const usesRoutePoint = !nearestDestinationStop || nearestDestinationStop.d > WALK_AFTER_ALIGHT_M;
        const projectionTarget = usesRoutePoint ? destLoc : nearestDestinationStop.ll;
        const projectedAlight = findCandidatePointsOnPath(
          projectionTarget,
          remainingPath,
          usesRoutePoint ? destDistance : undefined
        )[0];
        if (!projectedAlight) continue;

        const alightLL = projectedAlight.ll;
        const walkToDest = destDistance(alightLL);
        if (walkToDest > maxDest) continue;

        const idxAlight = usesRoutePoint
          ? Math.max(idxBoard, findNearestCoordIndex(coords, alightLL))
          : nearestDestinationStop.stopIndex;
        const idxAlightOnRoad = idxBoardOnRoad + projectedAlight.segmentIndex;
        const tramoCoords = roadCoords.slice(idxBoardOnRoad, idxAlightOnRoad + 1);
        if (!tramoCoords.length) continue;
        if (distMeters(tramoCoords[tramoCoords.length - 1], alightLL) > 2) {
          tramoCoords.push(alightLL);
        }
        if (tramoCoords.length < 2 || distMeters(tramoCoords[0], tramoCoords[tramoCoords.length - 1]) < 10) continue;

        let tramoDist = 0;
        for (let j = 1; j < tramoCoords.length; j++) {
          tramoDist += distMeters(tramoCoords[j - 1], tramoCoords[j]);
        }

        const dtMin = 0;
        const beyondLastStop = isDestinationBeyondPathEnd(destLoc, remainingPath, alightLL);
        const useAuto = beyondLastStop || walkToDest > WALK_AFTER_ALIGHT_M;
        const nextDeparture = getNearestDeparture(linea, sentidoLower, now);
        const extra = useAuto ? 0 : walkToDest;
        const score = boardDist + extra + tramoDist + (dtMin * W_TIME);

        const cand = {
          linea,
          sentido: sentidoTry,
          sentidoLower,
          paradas,
          coords,
          visibles,
          boardLL,
          boardDist,
          boardLabel,
          usesRouteBoardPoint,
          idxBoard,
          alightLL,
          alightLabel: usesRoutePoint ? "Punto más cercano de la vía" : "Parada",
          projectionTarget,
          idxAlight,
          tramoCoords,
          routeUsedFallback: false,
          fromIdx: idxBoard,
          toIdx: idxAlight,
          walkToDest,
          useAuto,
          beyondLastStop,
          usesRoutePoint,
          operatingNow: isLineOperatingNow(linea, now),
          nextDeparture,
          hasTurnsToday: Boolean(nextDeparture),
          dtMin,
          score,
          _driveMeters: Infinity
        };

        const candidateKey = `${linea?.codigo || linea?.id}|${sentidoLower}|${usesRoutePoint ? "via" : "parada"}`;
        const storedCandidate = candidatePool.get(candidateKey);
        if (!storedCandidate || cand.score < storedCandidate.score) {
          candidatePool.set(candidateKey, cand);
        }

        const candidatePriority =
          (cand.hasTurnsToday ? 0 : 4) +
          (cand.operatingNow ? 0 : 2) +
          (cand.usesRoutePoint ? 1 : 0);
        const bestPriority = best
          ? ((best.hasTurnsToday ? 0 : 4) +
            (best.operatingNow ? 0 : 2) +
            (best.usesRoutePoint ? 1 : 0))
          : Infinity;
        const hasBetterPriority = !best || candidatePriority < bestPriority;
        const hasSamePriority = best && candidatePriority === bestPriority;
        const isCloserToDestination = hasSamePriority && cand.walkToDest < best.walkToDest - 10;
        const isEquivalentDistance = hasSamePriority && Math.abs(cand.walkToDest - best.walkToDest) <= 10;
        if (hasBetterPriority || isCloserToDestination || (isEquivalentDistance && cand.score < best.score)) best = cand;
      }
    }

    if (selectedLineCode && best) break;
    if (!selectedLineCode && candidatePool.size >= 4) break;
  }

  if (!best) {
    if (ui?.infoEl && !ctx?.dryRun) {
      ui.infoEl.innerHTML = `
        <div class="alert alert-warning py-2 mb-2">
          ❌ No se encontró una ruta rural cercana con límites razonables.
        </div>
      `;
    }
    return null;
  }

  if (ctx?.dryRun) {
    const metrics = {
      walk1: best.boardDist || 0,
      walk2: best.walkToDest || 0,
      stopsCount: Math.max(0, (best.toIdx - best.fromIdx))
    };
    return {
      tipo: "rural",
      linea: best.linea,
      sentido: titleCase(normStr(best.sentido)),
      useAuto: best.useAuto,
      metrics,
      score: best.score
    };
  }

  // Se validan las alternativas más cercanas contra su geometría vial real.
  // Así una diagonal entre puntos rurales separados no puede hacer parecer que
  // una línea pasa junto al destino cuando en realidad circula por otra vía.
  const allCandidates = [...candidatePool.values()];
  const byDistance = [...allCandidates].sort((a, b) =>
    a.walkToDest - b.walkToDest || a.score - b.score
  );
  const upcomingByDistance = allCandidates
    .filter(candidate => candidate.hasTurnsToday)
    .sort((a, b) => a.walkToDest - b.walkToDest || a.score - b.score);
  const shortlistMap = new Map();
  [...upcomingByDistance.slice(0, 3), ...byDistance.slice(0, 3)].forEach(candidate => {
    const key = `${candidate.linea?.codigo || candidate.linea?.id}|${candidate.sentidoLower}|${candidate.usesRoutePoint}`;
    shortlistMap.set(key, candidate);
  });
  const shortlist = [...shortlistMap.values()];

  let refinedCandidates = (await Promise.all(shortlist.map(async candidate => {
    const roadGeometry = await buildLineRouteFollowingStreets(candidate.coords);
    if (!roadGeometry?.coords?.length || roadGeometry.usedFallback) return null;

    const boardProjection = findCandidatePointsOnPath(
      candidate.usesRouteBoardPoint ? userLoc : candidate.boardLL,
      roadGeometry.coords
    )[0];
    if (!boardProjection) return null;

    const boardLL = boardProjection.ll;
    const remainingRoadPath = roadGeometry.coords.slice(boardProjection.segmentIndex);
    if (distMeters(remainingRoadPath[0], boardLL) > 2) {
      remainingRoadPath.unshift(boardLL);
    } else {
      remainingRoadPath[0] = boardLL;
    }

    const roadProjection = findCandidatePointsOnPath(
      candidate.projectionTarget,
      remainingRoadPath,
      candidate.usesRoutePoint ? destDistance : undefined
    )[0];
    if (!roadProjection) return null;

    const alightLL = roadProjection.ll;
    const straightToDest = destDistance(alightLL);
    const tramoCoords = remainingRoadPath.slice(0, roadProjection.segmentIndex + 1);
    if (distMeters(tramoCoords[tramoCoords.length - 1], alightLL) > 2) {
      tramoCoords.push(alightLL);
    }
    if (tramoCoords.length < 2) return null;

    const beyondLastStop = isDestinationBeyondPathEnd(destLoc, remainingRoadPath, alightLL);
    return {
      ...candidate,
      boardLL,
      straightToBoard: distMeters(userLoc, boardLL),
      alightLL,
      tramoCoords,
      straightToDest,
      beyondLastStop,
      routeUsedFallback: false
    };
  }))).filter(Boolean);

  refinedCandidates = await Promise.all(refinedCandidates.map(async candidate => {
    const [accessMetrics, boardingMetrics] = await Promise.all([
      getAccessRouteMetrics(candidate.alightLL, destLoc, "foot"),
      getAccessRouteMetrics(userLoc, candidate.boardLL, "foot")
    ]);
    const networkDistance = Number(accessMetrics?.distance);
    const hasNetworkDistance = Number.isFinite(networkDistance) && networkDistance >= 0;
    const walkToDest = hasNetworkDistance ? networkDistance : candidate.straightToDest;
    const boardingNetworkDistance = Number(boardingMetrics?.distance);
    const hasBoardingNetworkDistance = Number.isFinite(boardingNetworkDistance) && boardingNetworkDistance >= 0;
    const boardDist = hasBoardingNetworkDistance ? boardingNetworkDistance : candidate.straightToBoard;

    return {
      ...candidate,
      boardDist,
      boardingRouteAvailable: hasBoardingNetworkDistance,
      accessRouteAvailable: hasNetworkDistance,
      accessRouteDuration: Number(accessMetrics?.duration) || null,
      walkToDest,
      passesNearBoarding: boardDist <= WALK_AFTER_ALIGHT_M,
      passesNearDestination: walkToDest <= WALK_AFTER_ALIGHT_M,
      useAuto: candidate.beyondLastStop || walkToDest > WALK_AFTER_ALIGHT_M
    };
  }));

  refinedCandidates.sort((a, b) =>
    Number(b.passesNearBoarding) - Number(a.passesNearBoarding) ||
    Number(b.passesNearDestination) - Number(a.passesNearDestination) ||
    Number(b.hasTurnsToday) - Number(a.hasTurnsToday) ||
    Number(b.operatingNow) - Number(a.operatingNow) ||
    Number(b.accessRouteAvailable) - Number(a.accessRouteAvailable) ||
    a.walkToDest - b.walkToDest ||
    Number(a.usesRoutePoint) - Number(b.usesRoutePoint) ||
    a.score - b.score
  );

  if (!refinedCandidates.length) return null;

  const ruralAlternatives = refinedCandidates.slice(0, 4);
  if (!selectedLineCode && ruralAlternatives.length > 0 && ui?.infoEl) {
    ui.infoEl.innerHTML = `
      <div class="tm-route-options">
        <div class="tm-route-options__heading">
          <b>Opciones de bus rural</b>
          <span>Selecciona una línea para mostrar su recorrido.</span>
        </div>
        ${ruralAlternatives.map((candidate, index) => `
          <article class="tm-route-option">
            <div class="tm-route-option__top">
              <span class="tm-route-option__rank">${index + 1}</span>
              <div>
                <b>${candidate.linea.codigo} - ${candidate.linea.nombre || ""}</b>
                <small>${candidate.operatingNow ? "Operativa ahora" : "Fuera de servicio ahora"}</small>
              </div>
            </div>
            <div class="tm-route-option__metrics">
              <span>Subida: ${Math.round(candidate.boardDist)} m</span>
              <span>Destino: ${candidate.useAuto ? "Auto" : `${Math.round(candidate.walkToDest)} m`}</span>
              <span>${candidate.nextDeparture?.time ? `Salida: ${candidate.nextDeparture.time}` : "Sin más salidas hoy"}</span>
            </div>
            <button type="button" class="btn btn-primary tm-route-option__button" data-rural-option="${index}">
              <i class="bi bi-map" aria-hidden="true"></i> Ver ruta
            </button>
          </article>
        `).join("")}
      </div>
    `;
    translateNode(ui.infoEl);
    window.dispatchEvent(new CustomEvent("moronabus:bus-route-options"));
    ui.infoEl.querySelectorAll("[data-rural-option]").forEach(button => {
      button.addEventListener("click", async () => {
        const candidate = ruralAlternatives[Number(button.dataset.ruralOption)];
        if (!candidate) return;
        const optionsPanel = button.closest(".tm-route-options");
        button.disabled = true;
        button.innerHTML = `<span class="spinner-border spinner-border-sm" aria-hidden="true"></span> Cargando ruta`;
        await planAndShowBusStopsForPlace(
          userLoc,
          destPlace,
          {
            ...ctx,
            selectedLineCode: candidate.linea.codigo,
            selectedSentido: candidate.sentidoLower,
            keepOptionsVisible: true,
            dryRun: false,
            preserveLayers: false
          },
          ui
        );
        if (optionsPanel && ui?.infoEl) {
          optionsPanel.querySelectorAll(".tm-route-option").forEach(card => card.classList.remove("is-selected"));
          optionsPanel.querySelectorAll("[data-rural-option]").forEach(optionButton => {
            optionButton.disabled = false;
            optionButton.innerHTML = `<i class="bi bi-map" aria-hidden="true"></i> Ver ruta`;
          });
          button.closest(".tm-route-option")?.classList.add("is-selected");
          optionsPanel.classList.add("has-selection");
          ui.infoEl.prepend(optionsPanel);
          translateNode(optionsPanel);
        }
      });
    });
    const first = ruralAlternatives[0];
    return {
      tipo: "rural",
      linea: first.linea,
      sentido: titleCase(normStr(first.sentido)),
      useAuto: first.useAuto,
      metrics: { walk1: first.boardDist, walk2: first.walkToDest, stopsCount: Math.max(0, first.toIdx - first.fromIdx) },
      score: first.score,
      alternatives: ruralAlternatives.map(candidate => candidate.linea),
      selectionPending: true
    };
  }

  best = refinedCandidates[0];

  setCurrentLinea(best.linea);
  setCurrentParadas(best.paradas);
  setCurrentStopOffsets(computeStopOffsets(best.paradas, best.linea));

  const idxMap = buildIndexByLatLng(best.coords);

  const stopMarkers = [];
  for (const p of best.paradas) {
    const ll = getParadaLatLng(p);
    if (!ll) continue;

    const idx = idxMap.get(llKey(ll));
    if (idx == null) continue;
    if (idx < best.fromIdx || idx > best.toIdx) continue;

    const spec = getMarkerSpec(p, best.linea);
    if (!spec?.draw) continue;

    const marker = L.circleMarker(ll, spec.style).addTo(layerStops);

    if (spec.popup) {
      marker.bindPopup(buildStopPopupHTML(p, best.linea), { autoPan: true });
      marker.on("popupopen", () => {
        marker.setPopupContent(buildStopPopupHTML(p, best.linea));
        startPopupLiveUpdate(marker, p);
      });
      marker.on("popupclose", () => stopPopupLiveUpdate());
    }

    stopMarkers.push({ marker, parada: p });
  }
  setCurrentStopMarkers(stopMarkers);

  L.circleMarker(best.boardLL, {
    radius: 10, color: "#2e7d32", fillColor: "#2e7d32", fillOpacity: 1, weight: 3
  }).addTo(layerStops).bindPopup(`<b>✅ Subir aquí</b><br>${best.boardLabel}`);

  const alightMarker = L.circleMarker(best.alightLL, {
    radius: 10, color: "#c62828", fillColor: "#c62828", fillOpacity: 1, weight: 3
  }).addTo(layerStops).bindPopup(`<b>⛔ Bajar aquí</b><br>${best.alightLabel}`);

  await drawDashedAccessRoute(userLoc, best.boardLL, "#666");

  L.polyline(best.tramoCoords, {
    color: best.routeUsedFallback ? "#ff9800" : (best.linea?.color || "#000"),
    weight: 4,
    opacity: best.routeUsedFallback ? 0.8 : 0.9,
    dashArray: best.routeUsedFallback ? "8,10" : null
  }).addTo(routesGroup);

  if (best.useAuto) {
    await drawDriveOSRMIntoLayer(routesGroup, best.alightLL, destLoc, "#0d6efd");
  } else {
    await drawDashedAccessRoute(best.alightLL, destLoc, "#666");
  }
  alightMarker.openPopup();

  const op = isLineOperatingNow(best.linea, now);
  const nearestDeparture = getNearestDeparture(best.linea, best.sentidoLower, now);
  const exagerated = (best.boardDist > EXAGGERATED_WALK_WARN_M || best.walkToDest > EXAGGERATED_WALK_WARN_M);

  if (ui?.infoEl) {
    ui.infoEl.innerHTML = `
      <div class="tm-route-card tm-route-card--active">
        <div class="tm-route-card__header">
          <span class="tm-route-card__icon"><i class="bi bi-bus-front-fill" aria-hidden="true"></i></span>
          <div>
            <div class="tm-route-card__eyebrow">Ruta en bus rural${best.useAuto ? " + auto" : ""}</div>
            <div class="tm-route-card__title"><b>${best.linea.codigo}</b> - ${best.linea.nombre || ""}</div>
          </div>
        </div>
        <div class="tm-route-card__status ${op ? "is-ok" : "is-off"}">
          ${op ? "Operativa ahora" : "Fuera de servicio ahora"}
        </div>
        <div class="tm-route-card__grid">
          <div class="tm-route-metric">
            <span>Sentido</span>
            <b>${titleCase(normStr(best.sentido))}</b>
          </div>
          <div class="tm-route-metric">
            <span>Camina a subir</span>
            <b>${Math.round(best.boardDist)} m</b>
            <small>${best.boardLabel}</small>
          </div>
          <div class="tm-route-metric">
            <span>Bajar en</span>
            <b>${best.alightLabel}</b>
          </div>
          <div class="tm-route-metric">
            <span>${best.useAuto ? "Tramo final" : "Camina al destino"}</span>
            <b>${best.useAuto ? "Auto" : `${Math.round(best.walkToDest)} m`}</b>
          </div>
          <div class="tm-route-metric">
            <span>Próxima salida</span>
            <b>${nearestDeparture?.time || "Sin más salidas hoy"}</b>
            ${nearestDeparture
              ? `<small>${nearestDeparture.minutesAway === 0 ? "Sale ahora" : `En ${nearestDeparture.minutesAway} min`}</small>`
              : ""}
          </div>
        </div>
      </div>
      ${selectedLineCode && !ctx?.keepOptionsVisible
        ? `<button type="button" class="btn btn-outline-primary w-100 mt-2" data-back-to-rural-options>
             <i class="bi bi-arrow-left" aria-hidden="true"></i> Ver otras opciones
           </button>`
        : ""}
      ${(!best.useAuto && exagerated)
        ? `<div class="alert alert-warning py-2 mt-2 mb-0">⚠️ Se encontró ruta pero requiere caminata grande.</div>`
        : ""}
    `;
  }

  if (ui?.infoEl) {
    translateNode(ui.infoEl);
    window.dispatchEvent(new CustomEvent("moronabus:bus-route-selected", {
      detail: { place: destPlace, tipo: "rural", linea: best.linea }
    }));
    const backButton = ui.infoEl.querySelector("[data-back-to-rural-options]");
    backButton?.addEventListener("click", async () => {
      const {
        selectedLineCode: _selectedLineCode,
        selectedSentido: _selectedSentido,
        ...optionsCtx
      } = ctx;
      await planAndShowBusStopsForPlace(
        userLoc,
        destPlace,
        { ...optionsCtx, dryRun: false, preserveLayers: false },
        ui
      );
    });
  }

  map.fitBounds(L.latLngBounds([userLoc, destLoc, best.boardLL, best.alightLL]).pad(0.2));
  return { tipo: "rural", linea: best.linea, sentido: titleCase(normStr(best.sentido)), useAuto: best.useAuto, score: best.score };
}

/**
 * Dibuja o resalta highlight nearest stop on line sobre el mapa o la interfaz.
 */
function highlightNearestStopOnLine(stopMarkers, userLoc) {
  if (!userLoc || !Array.isArray(stopMarkers) || !stopMarkers.length) return;

  let best = null;
  let bestD = Infinity;

  for (const it of stopMarkers) {
    const m = it?.marker;
    const p = it?.parada;

    const denom = String(p?.denominacion || "").toLowerCase().trim();
    if (denom === "referencial") continue;

    if (!m) continue;
    const ll = m.getLatLng?.();
    if (!ll) continue;

    const d = map.distance(userLoc, ll);
    if (d < bestD) {
      bestD = d;
      best = m;
    }
  }

  if (!best) return;

  try {
    best.setStyle({
      color: "#2e7d32",
      fillColor: "#2e7d32",
      fillOpacity: 1,
      weight: 4
    });

    if (best.setRadius) best.setRadius(9);
    best.bindTooltip("🟢 Parada más cercana", { direction: "top", sticky: true });
  } catch {}
}
