// js/app/actions.js
import { setActivePlace, getUserLocation, setMode, setUserLocation } from "./state.js";
import { drawRoute, clearMarkers, renderMarkers, clearRoute } from "../map/map.js";
import { clearTransportLayers, planAndShowBusStops } from "../transport/transport_controller.js";

const MODE_META = {
  walking: { icon: "bi-person-walking", label: "Caminar" },
  bicycle: { icon: "bi-bicycle", label: "Bicicleta" },
  motorcycle: { icon: "bi-scooter", label: "Moto" },
  driving: { icon: "bi-car-front-fill", label: "Auto" },
  bus: { icon: "bi-bus-front-fill", label: "Bus" }
};

function routeLoadingHTML(title = "Calculando ruta", text = "Consultando el mejor trayecto disponible.") {
  return `
    <div class="tm-loading" role="status" aria-live="polite">
      <span class="tm-loading__spinner" aria-hidden="true"></span>
      <span>
        <span class="tm-loading__title">${title}</span>
        <span class="tm-loading__text">${text}</span>
      </span>
    </div>
  `;
}

function decoratePopupModeButton(button) {
  const meta = MODE_META[button?.dataset?.mode] || { icon: "bi-signpost-2-fill", label: "Ruta" };
  button.type = "button";
  button.classList.add("tm-mode-btn");
  button.setAttribute("aria-label", meta.label);
  button.setAttribute("title", meta.label);
  button.setAttribute("aria-pressed", "false");
  button.innerHTML = `
    <i class="bi ${meta.icon}" aria-hidden="true"></i>
    <span class="tm-mode-label">${meta.label}</span>
  `;
}

function syncPopupModeButtons(activeButton) {
  activeButton?.closest("[role='group']")?.querySelectorAll("[data-mode]").forEach(button => {
    const isActive = button === activeButton;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

/**
 * Actualiza update user location y sincroniza la interfaz con el estado actual.
 */
export function updateUserLocation(loc) {
  setUserLocation(loc);
}

/**
 * Actualiza set travel mode y sincroniza la interfaz con el estado actual.
 */
export function setTravelMode(mode) {
  setMode(mode);
}

/**
 * Actualiza set active place action y sincroniza la interfaz con el estado actual.
 */
export function setActivePlaceAction(place) {
  setActivePlace(place);
}

/**
 * Gestiona select place dentro del flujo principal del modulo.
 */
export function selectPlace(place, infoBox, ctxGeo = {}) {
  if (!place) return;

  setActivePlace(place);

  clearMarkers();
  renderMarkers([place], () => {});

  const busEnabled = (ctxGeo?.busEnabled !== false);

  const busBtnHTML = busEnabled
    ? `<button type="button" class="btn btn-outline-secondary" data-mode="bus" aria-label="Bus" title="Bus" aria-pressed="false">🚌</button>`
    : "";

  infoBox.innerHTML = `
    <h6>${place.nombre}</h6>
    📞 ${place.telefono || "No disponible"}<br>
    ⏰ ${place.horario || "No especificado"}<br><br>

    <div class="btn-group w-100 mb-2 tm-mode-group" id="transport-modes" role="group" aria-label="Modos de transporte">
      <button type="button" class="btn btn-outline-primary" data-mode="walking" aria-label="Caminar" title="Caminar" aria-pressed="false">🚶</button>
      <button type="button" class="btn btn-outline-success" data-mode="bicycle" aria-label="Bicicleta" title="Bicicleta" aria-pressed="false">🚴</button>
      <button type="button" class="btn btn-outline-warning" data-mode="motorcycle" aria-label="Moto" title="Moto" aria-pressed="false">🏍️</button>
      <button type="button" class="btn btn-outline-danger" data-mode="driving" aria-label="Auto" title="Auto" aria-pressed="false">🚗</button>
      ${busBtnHTML}
    </div>

    <div id="route-info" class="small mt-1"></div>
  `;

  infoBox.querySelectorAll("button[data-mode]").forEach(btn => {
    decoratePopupModeButton(btn);
    btn.onclick = async () => {
      const mode = btn.dataset.mode;
      syncPopupModeButtons(btn);

      if (mode === "bus" && !busEnabled) {
        const infoEl = document.getElementById("route-info");
        if (infoEl) {
          infoEl.innerHTML = `
            <div class="alert alert-info py-2 mb-0">
              En esta zona no hay datos registrados para transporte en bus.
            </div>
          `;
        }
        setMode("walking");
        return;
      }

      setMode(mode);

      const infoEl = document.getElementById("route-info");
      if (infoEl) {
        infoEl.innerHTML = mode === "bus"
          ? routeLoadingHTML("Buscando ruta en bus", "Revisando rutas urbanas, rurales, paradas y caminatas.")
          : routeLoadingHTML();
      }

      clearRoute();
      clearTransportLayers();

      const userLoc = getUserLocation();
      if (!userLoc) return;

      if (mode === "bus") {
        const ctx = {
          tipo: "auto",
          provincia: ctxGeo.provincia || "",
          canton: ctxGeo.canton || "",
          parroquia: ctxGeo.parroquia || "",
          specialSevilla: ctxGeo.specialSevilla === true,
          entornoUser: ctxGeo.entornoUser || ctxGeo.entorno || "",
          now: new Date(),
          sentido: "auto"
        };

        await planAndShowBusStops(userLoc, place, ctx, { infoEl });
        return;
      }

      drawRoute(userLoc, place, mode, infoEl);
    };
  });
}

/**
 * Busca find nearest dentro de las colecciones disponibles.
 */
export function findNearest(list) {
  const userLoc = getUserLocation();
  if (!userLoc || !Array.isArray(list) || !list.length) return null;

  let nearest = null;
  let minDistance = Infinity;

  list.forEach(p => {
    const u = p?.ubicacion || p?.["ubicación"];
    const lat = u?.latitude ?? u?.lat;
    const lng = u?.longitude ?? u?.lng;

    if (typeof lat !== "number" || typeof lng !== "number") return;

    const d = L.latLng(userLoc).distanceTo([lat, lng]);
    if (d < minDistance) {
      minDistance = d;
      nearest = p;
    }
  });

  return nearest;
}
