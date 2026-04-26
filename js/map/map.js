// js/map/map.js
import { formatDurationFromSeconds } from "../app/helpers.js";
import { fetchOsrmRoute } from "../services/api.js";

export const map = L.map("map").setView([-2.309948, -78.124482], 13);

// ===== Base layers =====
export const baseLayers = {
  "OSM (Standard)": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }),
  "OpenTopoMap": L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenTopoMap (CC-BY-SA) / © OpenStreetMap"
  })
};

baseLayers["OSM (Standard)"].addTo(map);

// ===== Overlays principales =====
export const markersLayer = L.layerGroup().addTo(map);
export const routeOverlay = L.layerGroup().addTo(map);
export const transportOverlay = L.layerGroup().addTo(map);
export const interprovOverlay = L.layerGroup().addTo(map);

export function clearInterprov() {
  try { interprovOverlay.clearLayers(); } catch {}
}

let routeLine = null;
let routeLines = [];
let markerSelected = null;

let transportLines = [];

/* ================= POPUP HELPERS ================= */
function buildPopupHTML(p) {
  if (!p) return `<b>Lugar</b>`;
  if (p.popupHTML && String(p.popupHTML).trim()) return String(p.popupHTML);

  const nombre = p.nombre || "Lugar";
  const tel = p.telefono || "N/D";
  const horario = p.horario || "N/D";

  return `
    <b>${nombre}</b><br>
    📞 ${tel}<br>
    🕒 ${horario}
  `;
}
function drawFallbackPolyline(points, {
  color = "#ff9800",
  weight = 4,
  dashed = true,
  target = routeOverlay,
  popupText = `
    <b>Ruta aproximada</b><br>
    OSRM no respondió correctamente o tardó demasiado.<br>
    Se muestra una línea recta referencial.
  `
} = {}) {
  const line = L.polyline(points, {
    color,
    weight,
    opacity: 0.85,
    dashArray: dashed ? "8,10" : null
  }).addTo(target);

  if (popupText) {
    line.bindPopup(popupText);
  }

  return line;
}
/* ================= LIMPIEZA ================= */
export function clearMarkers() {
  markersLayer.clearLayers();
}

export function clearRoute() {
  if (routeLine) {
    try { routeOverlay.removeLayer(routeLine); } catch {}
    routeLine = null;
  }
  if (routeLines.length) {
    routeLines.forEach(l => {
      try { routeOverlay.removeLayer(l); } catch {}
    });
    routeLines = [];
  }
  if (markerSelected) {
    try { routeOverlay.removeLayer(markerSelected); } catch {}
    markerSelected = null;
  }
}

export function clearTransportRoute() {
  if (transportLines.length) {
    transportLines.forEach(l => {
      try { transportOverlay.removeLayer(l); } catch {}
    });
    transportLines = [];
  }
  try { transportOverlay.clearLayers(); } catch {}
}

/* ================= MARKERS ================= */
export function renderMarkers(list, onSelect) {
  clearMarkers();

  list.forEach(p => {
    const u = p?.ubicacion || p?.["ubicación"];
    const lat = u?.latitude ?? u?.lat;
    const lng = u?.longitude ?? u?.lng;

    if (typeof lat !== "number" || typeof lng !== "number") return;

    L.marker([lat, lng])
      .addTo(markersLayer)
      .bindPopup(buildPopupHTML(p))
      .on("click", () => onSelect(p));
  });
}

/* ================= RUTAS (1 tramo - normal) ================= */
export async function drawRoute(userLoc, place, mode, infoBox) {
  if (!userLoc || !place?.ubicacion) return;

  clearRoute();

  const { latitude, longitude } = place.ubicacion;
  const dest = [latitude, longitude];

  markerSelected = L.marker(dest)
    .addTo(routeOverlay)
    .bindPopup(buildPopupHTML(place))
    .openPopup();

  const profile = {
    walking: "foot",
    driving: "car",
    cycling: "bike",
    bicycle: "bike",
    motorcycle: "car",
    bus: "car"
  }[mode] || "foot";

  const coordinates = `${userLoc[1]},${userLoc[0]};${longitude},${latitude}`;

  try {
    const data = await fetchOsrmRoute({
      profile,
      coordinates,
      overview: "full",
      geometries: "geojson",
      timeoutMs: 8000
    });

    if (!data.routes?.length) {
      throw new Error("OSRM no devolvió rutas");
    }

    const route = data.routes[0];

    routeLine = L.polyline(
      route.geometry.coordinates.map(c => [c[1], c[0]]),
      { color: "#1e88e5", weight: 5 }
    ).addTo(routeOverlay);

    map.fitBounds(routeLine.getBounds());

    const distanciaKm = route.distance / 1000;

    const velocidadPorModo = {
      walking: 5,
      cycling: 15,
      bicycle: 15,
      motorcycle: 35,
      driving: 30
    };

    const usaTiempoOsrm = mode === "bus" || !velocidadPorModo[mode];

    const tiempoSeg = usaTiempoOsrm
      ? Math.round(route.duration)
      : Math.round((distanciaKm / velocidadPorModo[mode]) * 3600);

    if (infoBox) {
      infoBox.innerHTML = `
        <b>Ruta (${mode})</b><br>
        ⏱ ${formatDurationFromSeconds(tiempoSeg)}<br>
        📏 ${distanciaKm.toFixed(2)} km
      `;
    }

    return {
      fallback: false,
      route,
      line: routeLine
    };

  } catch (err) {
    console.error("OSRM falló en drawRoute, usando fallback:", err);

    routeLine = drawFallbackPolyline([userLoc, dest], {
      target: routeOverlay
    });

    map.fitBounds(routeLine.getBounds());

    const distanciaKm = map.distance(userLoc, dest) / 1000;

    if (infoBox) {
      infoBox.innerHTML = `
        <b>Ruta (${mode})</b><br>
        ⚠️ Ruta aproximada por fallo de OSRM<br>
        📏 ${distanciaKm.toFixed(2)} km referenciales
      `;
    }

    return {
      fallback: true,
      distance: distanciaKm * 1000,
      line: routeLine
    };
  }
}

/* ================= ruta hacia un punto ================= */
export async function drawRouteToPoint({
  from,
  to,
  mode = "walking",
  infoBox = null,
  title = "Ruta",
  layerTarget = "normal",
  layerGroup = null,
  clearFirst = true
}) {
  if (!from || !to) return null;

  if (layerGroup) {
    if (clearFirst) {
      try { layerGroup.clearLayers(); } catch {}
    }
  } else {
    if (clearFirst) clearRoute();
  }

  const profile = {
    walking: "foot",
    driving: "car",
    cycling: "bike",
    bicycle: "bike",
    motorcycle: "car",
    bus: "car"
  }[mode] || "foot";

  const coordinates = `${from[1]},${from[0]};${to[1]},${to[0]}`;

  const target =
    layerGroup
      ? layerGroup
      : (layerTarget === "transport" ? transportOverlay : routeOverlay);

  try {
    const data = await fetchOsrmRoute({
      profile,
      coordinates,
      overview: "full",
      geometries: "geojson",
      timeoutMs: 8000
    });

    if (!data.routes?.length) {
      throw new Error("OSRM no devolvió rutas");
    }

    const r = data.routes[0];

    const line = L.polyline(
      r.geometry.coordinates.map(c => [c[1], c[0]]),
      { color: "#1e88e5", weight: 5 }
    ).addTo(target);

    if (!layerGroup && layerTarget !== "transport") {
      routeLine = line;
    }

    map.fitBounds(line.getBounds());

    const distanciaKm = (Number(r.distance) || 0) / 1000;

    const velocidadPorModo = {
      walking: 5,
      cycling: 15,
      bicycle: 15,
      motorcycle: 35,
      driving: 30
    };

    const usaTiempoOsrm = mode === "bus" || !velocidadPorModo[mode];

    const tiempoSeg = usaTiempoOsrm
      ? Math.round(Number(r.duration) || 0)
      : Math.round((distanciaKm / velocidadPorModo[mode]) * 3600);

    if (infoBox) {
      infoBox.innerHTML = `
        <b>${title} (${mode})</b><br>
        ⏱ ${formatDurationFromSeconds(tiempoSeg)}<br>
        📏 ${distanciaKm.toFixed(2)} km
      `;
    }

    return r;

  } catch (err) {
    console.error("OSRM falló en drawRouteToPoint, usando fallback:", err);

    const line = drawFallbackPolyline([from, to], {
      target
    });

    if (!layerGroup && layerTarget !== "transport") {
      routeLine = line;
    }

    map.fitBounds(line.getBounds());

    const distanciaKm = map.distance(from, to) / 1000;

    if (infoBox) {
      infoBox.innerHTML = `
        <b>${title} (${mode})</b><br>
        ⚠️ Ruta aproximada por fallo de OSRM<br>
        📏 ${distanciaKm.toFixed(2)} km referenciales
      `;
    }

    return {
      fallback: true,
      distance: distanciaKm * 1000,
      duration: null,
      line
    };
  }
}
/* ================= utilidades OSRM ================= */
function modeToProfile(mode) {
  return ({
    walking: "foot",
    bicycle: "bike",
    driving: "car"
  }[mode] || "car");
}

async function fetchOSRMRoute(from, to, profile) {
  const coordinates = `${from[1]},${from[0]};${to[1]},${to[0]}`;

  try {
    const data = await fetchOsrmRoute({
      profile,
      coordinates,
      overview: "full",
      geometries: "geojson",
      timeoutMs: 8000
    });

    if (!data.routes?.length) return null;
    return data.routes[0];

  } catch (err) {
    console.warn("OSRM falló en fetchOSRMRoute:", err);
    return null;
  }
}
export async function drawRouteBetweenPoints({
  from,
  to,
  mode = "driving",
  color = "#0d6efd",
  dashed = false,
  weight = 5,
  layerTarget = "normal",
  layerGroup = null
}) {
  if (!from || !to) return null;

  const target =
    layerGroup
      ? layerGroup
      : (layerTarget === "transport" ? transportOverlay : routeOverlay);

  const r = await fetchOSRMRoute(from, to, modeToProfile(mode));

  let line;

  if (r) {
    const coords = r.geometry.coordinates.map(c => [c[1], c[0]]);
    line = L.polyline(coords, {
      color,
      weight,
      dashArray: dashed ? "8 10" : null
    }).addTo(target);
  } else {
    line = drawFallbackPolyline([from, to], {
      target,
      color: "#ff9800",
      weight,
      dashed: true
    });
  }

  if (!layerGroup && layerTarget === "transport") transportLines.push(line);
  if (!layerGroup && layerTarget !== "transport") routeLines.push(line);

  return {
    fallback: !r,
    route: r,
    line
  };
}
export async function drawTwoLegOSRM({
  userLoc,
  terminalLoc,
  targetLoc,
  mode = "driving",
  color1 = "#6c757d",
  color2 = "#0d6efd",
  infoBox = null,
  title = "Ruta vía Terminal",
  layerTarget = "normal",
  layerGroup = null,
  clearFirst = true
}) {
  if (!userLoc || !terminalLoc || !targetLoc) return null;

  if (layerGroup) {
    if (clearFirst) {
      try { layerGroup.clearLayers(); } catch {}
    }
  } else {
    if (clearFirst) {
      if (layerTarget === "transport") clearTransportRoute();
      else clearRoute();
    }
  }

  const target =
    layerGroup
      ? layerGroup
      : (layerTarget === "transport" ? transportOverlay : routeOverlay);

  const r1 = await fetchOSRMRoute(userLoc, terminalLoc, modeToProfile(mode));
  const r2 = await fetchOSRMRoute(terminalLoc, targetLoc, modeToProfile(mode));

  let line1;
  let line2;

  if (r1) {
    line1 = L.polyline(
      r1.geometry.coordinates.map(c => [c[1], c[0]]),
      { color: color1, weight: 5, dashArray: "8 10" }
    ).addTo(target);
  } else {
    line1 = drawFallbackPolyline([userLoc, terminalLoc], {
      target,
      color: "#ff9800",
      dashed: true,
      popupText: `
        <b>Tramo aproximado</b><br>
        OSRM falló en el tramo hacia el terminal.
      `
    });
  }

  if (r2) {
    line2 = L.polyline(
      r2.geometry.coordinates.map(c => [c[1], c[0]]),
      { color: color2, weight: 5 }
    ).addTo(target);
  } else {
    line2 = drawFallbackPolyline([terminalLoc, targetLoc], {
      target,
      color: "#ff9800",
      dashed: true,
      popupText: `
        <b>Tramo aproximado</b><br>
        OSRM falló en el tramo desde el terminal hacia el destino.
      `
    });
  }

  if (!layerGroup && layerTarget === "transport") transportLines = [line1, line2];
  if (!layerGroup && layerTarget !== "transport") routeLines = [line1, line2];

  const dist1 = r1 ? Number(r1.distance) || 0 : map.distance(userLoc, terminalLoc);
  const dist2 = r2 ? Number(r2.distance) || 0 : map.distance(terminalLoc, targetLoc);

  const dur1 = r1 ? Number(r1.duration) || 0 : 0;
  const dur2 = r2 ? Number(r2.duration) || 0 : 0;

  const usedFallback = !r1 || !r2;

  if (infoBox) {
    infoBox.innerHTML = `
      <b>${title}</b><br>
      ${usedFallback ? "⚠️ Ruta parcialmente aproximada por fallo de OSRM<br>" : ""}
      ${!usedFallback ? `⏱ ${formatDurationFromSeconds(Math.round(dur1 + dur2))}<br>` : ""}
      📏 ${((dist1 + dist2) / 1000).toFixed(2)} km ${usedFallback ? "referenciales" : ""}
    `;
  }

  map.fitBounds(L.latLngBounds([userLoc, terminalLoc, targetLoc]).pad(0.2));

  return {
    fallback: usedFallback,
    r1,
    r2,
    line1,
    line2
  };
}