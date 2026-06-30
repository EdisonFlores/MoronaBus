// js/app/routing.js
import { map } from "../map/map.js";
import { fetchOsrmRoute } from "../services/api.js";

let routeLayer = null;

/**
 * Limpia clear route layer para dejar la vista o el estado listo para otro flujo.
 */
function clearRouteLayer() {
  if (routeLayer) {
    try { map.removeLayer(routeLayer); } catch {}
    routeLayer = null;
  }
}

/**
 * Dibuja o resalta draw route sobre el mapa o la interfaz.
 */
export async function drawRoute(userLoc, place, mode = "walking", infoEl = null) {
  if (!userLoc || !place?.ubicacion) return;

  clearRouteLayer();

  const dest = [
    place.ubicacion.latitude,
    place.ubicacion.longitude
  ];

  const profileMap = {
    walking: "foot",
    bicycle: "bike",
    motorcycle: "car",
    driving: "car"
  };

  const profile = profileMap[mode] || "foot";
  const coordinates = `${userLoc[1]},${userLoc[0]};${dest[1]},${dest[0]}`;

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
    const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);

    routeLayer = L.polyline(coords, {
      color: "#007bff",
      weight: 5,
      opacity: 0.9
    }).addTo(map);

    map.fitBounds(routeLayer.getBounds(), { padding: [30, 30] });

    if (infoEl) {
      const km = (route.distance / 1000).toFixed(2);
      const min = Math.round(route.duration / 60);

      infoEl.innerHTML = `
        <div class="alert alert-info py-2 mb-0">
          Distancia: <b>${km} km</b><br>
          Tiempo estimado: <b>${min} min</b>
        </div>
      `;
    }

    return {
      fallback: false,
      route,
      line: routeLayer
    };

  } catch (err) {
    console.error("Error OSRM, usando fallback con polilínea:", err);

    const straightDistance = map.distance(userLoc, dest);
    const km = (straightDistance / 1000).toFixed(2);

    routeLayer = L.polyline([userLoc, dest], {
      color: "#ff9800",
      weight: 4,
      opacity: 0.85,
      dashArray: "8,10"
    }).addTo(map);

    routeLayer.bindPopup(`
      <b>Ruta aproximada</b><br>
      OSRM no respondió correctamente o tardó demasiado.<br>
      Se muestra una línea recta referencial.
    `).openPopup();

    map.fitBounds(routeLayer.getBounds(), { padding: [30, 30] });

    if (infoEl) {
      infoEl.innerHTML = `
        <div class="alert alert-warning py-2 mb-0">
          ⚠️ OSRM no respondió correctamente.<br>
          Se muestra una ruta aproximada con línea recta.<br>
          Distancia referencial: <b>${km} km</b>
        </div>
      `;
    }

    return {
      fallback: true,
      distance: straightDistance,
      line: routeLayer
    };
  }
}

/**
 * Limpia clear route para dejar la vista o el estado listo para otro flujo.
 */
export function clearRoute() {
  clearRouteLayer();
}