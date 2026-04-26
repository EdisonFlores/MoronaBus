// js/transport/core/transport_osrm.js
import { map } from "../../map/map.js";
import { setAccessLayer, getAccessLayer } from "./transport_state.js";
import { fetchOsrmRoute } from "../../services/api.js";

/* =====================================================
   DASHED usuario -> punto/parada (OSRM vía backend)
   FIX: permitir 2+ dashed sin borrar el anterior
===================================================== */
export async function drawDashedAccessRoute(userLoc, stopLatLng, color = "#444") {
  let layer = getAccessLayer();

  if (!layer) {
    layer = L.layerGroup().addTo(map);
    setAccessLayer(layer);
  }

  if (layer && typeof layer.addLayer !== "function") {
    try { map.removeLayer(layer); } catch {}
    layer = L.layerGroup().addTo(map);
    setAccessLayer(layer);
  }

  const profile = "foot";
  const coordinates = `${userLoc[1]},${userLoc[0]};${stopLatLng[1]},${stopLatLng[0]}`;

  try {
    const data = await fetchOsrmRoute({
      profile,
      coordinates,
      overview: "full",
      geometries: "geojson",
      timeoutMs: 8000
    });

    if (!data.routes?.length) {
      throw new Error("OSRM no devolvió ruta de acceso");
    }

    const route = data.routes[0];

    const poly = L.polyline(route.geometry.coordinates.map(c => [c[1], c[0]]), {
      color,
      weight: 4,
      dashArray: "8,10",
      opacity: 0.9,
    });

    layer.addLayer(poly);
    return poly;

  } catch (e) {
    console.error("Error OSRM acceso, usando fallback:", e);

    const poly = L.polyline([userLoc, stopLatLng], {
      color: "#ff9800",
      weight: 4,
      dashArray: "8,10",
      opacity: 0.8,
    });

    poly.bindPopup(`
      <b>Acceso aproximado</b><br>
      OSRM falló o tardó demasiado.<br>
      Se muestra una línea recta referencial.
    `);

    layer.addLayer(poly);
    return poly;
  }
}

/* =====================================================
   RUTA de línea siguiendo calles (OSRM vía backend) por chunks
===================================================== */
function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchOSRMRouteChunk(latlngs, profile = "car") {
  const coordinates = latlngs.map(p => `${p[1]},${p[0]}`).join(";");

  try {
    const data = await fetchOsrmRoute({
      profile,
      coordinates,
      overview: "full",
      geometries: "geojson",
      continueStraight: true,
      timeoutMs: 8000
    });

    if (!data.routes?.length) return null;

    const r = data.routes[0];
    return {
      fallback: false,
      coords: r.geometry.coordinates.map(c => [c[1], c[0]]),
      distance: Number(r.distance) || 0
    };
  } catch (err) {
    console.warn("OSRM chunk falló, usando puntos originales:", err);

    return {
      fallback: true,
      coords: latlngs,
      distance: 0
    };
  }
}

function stripNearDuplicates(latlngs, epsMeters = 6) {
  if (!Array.isArray(latlngs) || latlngs.length < 2) return latlngs || [];
  const out = [latlngs[0]];
  for (let i = 1; i < latlngs.length; i++) {
    const prev = out[out.length - 1];
    const cur = latlngs[i];
    const d = map.distance(prev, cur);
    if (d >= epsMeters) out.push(cur);
  }
  return out;
}

export async function drawLineRouteFollowingStreets(latlngs, color = "#000") {
  if (!latlngs || latlngs.length < 2) return null;

  const clean = stripNearDuplicates(latlngs, 6);
  if (clean.length < 2) return null;

  const profile = "car";
  const MAX_POINTS = 90;

  const chunks = chunkArray(clean, MAX_POINTS);
  const full = [];
  let usedFallback = false;

  for (let i = 0; i < chunks.length; i++) {
    let points = chunks[i];

    if (i > 0) {
      const prevLast = chunks[i - 1][chunks[i - 1].length - 1];
      points = [prevLast, ...points];
    }

    const r = await fetchOSRMRouteChunk(points, profile);

    if (!r?.coords?.length) {
      usedFallback = true;
      if (full.length) points.shift();
      full.push(...points);
      continue;
    }

    if (r.fallback) {
      usedFallback = true;
    }

    let straight = 0;
    for (let k = 1; k < points.length; k++) {
      straight += map.distance(points[k - 1], points[k]);
    }

    const osrmDist = r.distance || 0;
    const isWeird =
      !r.fallback &&
      straight > 0 &&
      straight <= 500 &&
      osrmDist > straight * 2.2;

    const geom = isWeird ? points : r.coords;

    if (isWeird) {
      usedFallback = true;
    }

    if (full.length && geom.length) geom.shift();
    full.push(...geom);
  }

  const line = L.polyline(full.length ? full : clean, {
    color: usedFallback ? "#ff9800" : color,
    weight: 4,
    opacity: usedFallback ? 0.8 : 0.9,
    dashArray: usedFallback ? "8,10" : null
  }).addTo(map);

  if (usedFallback) {
    line.bindPopup(`
      <b>Ruta aproximada</b><br>
      OSRM falló, tardó demasiado o devolvió un trazado extraño.<br>
      Se conectaron las paradas con líneas rectas referenciales.
    `);
  }

  return line;
}