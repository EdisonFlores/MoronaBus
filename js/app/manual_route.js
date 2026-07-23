// js/app/manual_route.js
import { translateNode } from "./i18n.js";

export function createManualRouting(deps) {
  const {
    map,
    extraEl,
    getUserLoc,
    getActivePlace,
    setActivePlace,
    getMode,
    setMode,
    clearMarkers,
    clearRoute,
    clearTransportLayers,
    drawRoute,
    drawRouteToPoint,
    planAndShowBusStops,
    getCtxGeo,
    refreshLayersOverlays,
    clearRouteInfo,
    detectPointContext,
    onManualDestinationSelected,
    onManualModeSelected
  } = deps;

  let manualDest = null;
  let manualDestMarker = null;

  let manualStart = null;
  let manualStartMarker = null;

  /**
   * Limpia clear manual dest para dejar la vista o el estado listo para otro flujo.
   */
  function clearManualDest() {
    manualDest = null;
    if (manualDestMarker) {
      try { map.removeLayer(manualDestMarker); } catch {}
      manualDestMarker = null;
    }
  }

  /**
   * Limpia clear manual start para dejar la vista o el estado listo para otro flujo.
   */
  function clearManualStart() {
    manualStart = null;
    if (manualStartMarker) {
      try { map.removeLayer(manualStartMarker); } catch {}
      manualStartMarker = null;
    }
  }

  /**
   * Inicializa ensure route controls for manual y deja sus eventos o elementos listos para usarse.
   */
  function ensureRouteControlsForManual(force = false) {
    if (!extraEl) return;

    const has = document.querySelector("[data-mode]") && document.getElementById("route-info");
    if (has && !force) return;

    extraEl.innerHTML = `
      <div class="btn-group w-100 mb-2 tm-mode-group" role="group" aria-label="Modos de transporte">
        <button class="btn btn-outline-primary tm-mode-btn" data-mode="walking" aria-label="Caminar" title="Caminar"><i class="bi bi-person-walking" aria-hidden="true"></i><span class="tm-mode-label">Caminar</span></button>
        <button class="btn btn-outline-primary tm-mode-btn" data-mode="bicycle" aria-label="Bicicleta" title="Bicicleta"><i class="bi bi-bicycle" aria-hidden="true"></i><span class="tm-mode-label">Bici</span></button>
        <button class="btn btn-outline-primary tm-mode-btn" data-mode="motorcycle" aria-label="Moto" title="Moto"><i class="bi bi-scooter" aria-hidden="true"></i><span class="tm-mode-label">Moto</span></button>
        <button class="btn btn-outline-primary tm-mode-btn" data-mode="driving" aria-label="Auto" title="Auto"><i class="bi bi-car-front-fill" aria-hidden="true"></i><span class="tm-mode-label">Auto</span></button>
        <button class="btn btn-outline-primary tm-mode-btn" data-mode="bus" aria-label="Bus" title="Bus"><i class="bi bi-bus-front-fill" aria-hidden="true"></i><span class="tm-mode-label">Bus</span></button>
      </div>
      <div id="route-info" class="small"></div>
      <div id="trip-actions" class="mt-2 mb-2"></div>
    `;
    translateNode(extraEl);

    document.querySelectorAll("[data-mode]").forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll("[data-mode]").forEach(other => {
          const isActive = other === btn;
          other.classList.toggle("active", isActive);
          other.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
        setMode(btn.dataset.mode);
        onManualModeSelected?.(btn.dataset.mode);
        Promise.resolve(buildRoute()).finally(() => {
          onManualModeSelected?.(btn.dataset.mode);
          refreshLayersOverlays?.();
        });
      };
    });
  }

  /**
   * Evalua si is lat lng arr para decidir el flujo de la interfaz.
   */
  function isLatLngArr(x) {
    return Array.isArray(x) && x.length === 2 && Number.isFinite(x[0]) && Number.isFinite(x[1]);
  }

  /**
   * Evalua si is entorno para decidir el flujo de la interfaz.
   */
  function isEntorno(x) {
    return x === "urbano" || x === "rural";
  }

  /**
   * Normaliza o formatea norm str para usarlo de forma consistente.
   */
  function normStr(s) {
    return String(s || "").trim().toLowerCase();
  }

  /**
   * Gestiona same admin dentro del flujo principal del modulo.
   */
  function sameAdmin(a = {}, b = {}) {
    const ap = normStr(a.provincia);
    const ac = normStr(a.canton);
    const aa = normStr(a.parroquia);

    const bp = normStr(b.provincia);
    const bc = normStr(b.canton);
    const ba = normStr(b.parroquia);

    if (!ap || !ac || !bp || !bc) return false;
    if (ap !== bp) return false;
    if (ac !== bc) return false;

    if (!aa || !ba) return true;
    return aa === ba;
  }

  /**
   * Muestra show no coverage al usuario.
   */
  function showNoCoverage(infoEl, msg = "De momento no hay datos registrados en la zona, pronto habrá cobertura.") {
    if (!infoEl) return;
    infoEl.innerHTML = `
      <div class="alert alert-info py-2 mb-0">
        <b>📍 Sin cobertura por ahora</b><br>
        <div class="mt-1">${msg}</div>
      </div>
    `;
  }

  function showRouteLoading(infoEl, title = "Calculando ruta", text = "Consultando el mejor trayecto disponible.") {
    if (!infoEl) return;
    infoEl.innerHTML = `
      <div class="tm-loading" role="status" aria-live="polite">
        <span class="tm-loading__spinner" aria-hidden="true"></span>
        <span>
          <span class="tm-loading__title">${title}</span>
          <span class="tm-loading__text">${text}</span>
        </span>
      </div>
    `;
  }

  /**
   * Gestiona safe detect point context dentro del flujo principal del modulo.
   */
  async function safeDetectPointContext(latlng) {
    if (!detectPointContext || !isLatLngArr(latlng)) return null;
    try {
      return await detectPointContext(latlng);
    } catch {
      return null;
    }
  }

  /**
   * Construye build route para mostrar contenido o preparar datos de la interfaz.
   */
  async function buildRoute() {
    const infoEl = document.getElementById("route-info");
    const activePlace = getActivePlace?.();

    const hasManualDest = isLatLngArr(manualDest);
    const hasBDPlace = !hasManualDest && !!activePlace?.ubicacion;

    if (!hasBDPlace && !hasManualDest) return;

    const gpsUserLoc = getUserLoc?.();
    const startLoc = isLatLngArr(manualStart) ? manualStart : gpsUserLoc;
    if (!isLatLngArr(startLoc)) return;

    const destLoc = hasBDPlace
      ? [activePlace.ubicacion.latitude, activePlace.ubicacion.longitude]
      : manualDest;

    if (!isLatLngArr(destLoc)) return;

    const destPlace = hasBDPlace
      ? activePlace
      : {
          nombre: "Destino seleccionado",
          ubicacion: { latitude: destLoc[0], longitude: destLoc[1] }
        };

    clearRoute?.();
    clearTransportLayers?.();
    clearRouteInfo?.();

    const mode = getMode?.() || "walking";

    if (mode === "bus") {
      window.dispatchEvent(new CustomEvent("moronabus:bus-route-options"));
      showRouteLoading(infoEl, "Buscando ruta en bus", "Revisando rutas urbanas, rurales, paradas y caminatas.");

      const ctxBase = getCtxGeo?.() || {};
      const startCtx = await safeDetectPointContext(startLoc);

      let destCtx = null;

      const hasAdminInBDPlace =
        !!(activePlace?.provincia && activePlace?.ciudad) ||
        !!(activePlace?.provincia && activePlace?.canton);

      if (!hasBDPlace) {
        destCtx = await safeDetectPointContext(destLoc);
      } else {
        if (!hasAdminInBDPlace) {
          destCtx = await safeDetectPointContext(destLoc);
        }
      }

      const startCoverage = (startCtx && typeof startCtx.hasCoverage === "boolean") ? startCtx.hasCoverage : true;
      const destCoverage = (destCtx && typeof destCtx.hasCoverage === "boolean") ? destCtx.hasCoverage : true;

      if (!startCoverage) {
        showNoCoverage(infoEl, "No hay datos cercanos al <b>origen</b> seleccionado para planificar bus.");
        return;
      }
      if (!destCoverage) {
        showNoCoverage(infoEl, "No hay datos cercanos al <b>destino</b> seleccionado para planificar bus.");
        return;
      }

      const entornoUser =
        isEntorno(startCtx?.entornoPoint)
          ? startCtx.entornoPoint
          : (ctxBase.entornoUser || "");

      const bdProv = activePlace?.provincia || "";
      const bdCanton = activePlace?.canton || activePlace?.ciudad || "";
      const bdParr = activePlace?.parroquia || "";

      const ctxDestDetected = destCtx?.ctxGeoPoint || null;

      const ctxDestFromBD = (bdProv && bdCanton)
        ? { provincia: bdProv, canton: bdCanton, parroquia: bdParr, specialSevilla: ctxBase.specialSevilla === true }
        : null;

      const ctxForBus =
        (ctxDestDetected?.provincia && ctxDestDetected?.canton) ? ctxDestDetected :
        (ctxDestFromBD?.provincia && ctxDestFromBD?.canton) ? ctxDestFromBD :
        ctxBase;

      const ctxStartForCompare =
        (startCtx?.ctxGeoPoint?.provincia && startCtx?.ctxGeoPoint?.canton)
          ? startCtx.ctxGeoPoint
          : ctxBase;

      const adminMismatch = !sameAdmin(ctxStartForCompare, ctxForBus);

      if (!hasBDPlace && isEntorno(destCtx?.entornoPoint)) {
        destPlace.entorno = destCtx.entornoPoint;
      }

      try {
        const res = await planAndShowBusStops?.(
          startLoc,
          destPlace,
          {
            tipo: "auto",
            provincia: ctxForBus.provincia || "",
            canton: ctxForBus.canton || "",
            parroquia: ctxForBus.parroquia || "",
            specialSevilla: ctxForBus.specialSevilla === true || ctxBase.specialSevilla === true,
            entornoUser,
            ignoreGeoFilter: adminMismatch === true,
            now: new Date(),
            sentido: "auto"
          },
          { infoEl }
        );

        if (!res && infoEl) {
          infoEl.innerHTML = `
            <div class="alert alert-warning py-2 mb-0">
              ❌ No se encontró una ruta en bus para este destino.
              ${adminMismatch ? `<div class="small mt-1">ℹ️ Nota: el origen y destino están en contextos distintos (provincia/cantón/parroquia).</div>` : ""}
            </div>
          `;
        }
      } catch (e) {
        console.warn("Error planificando bus:", e);
        if (infoEl) {
          infoEl.innerHTML = `
            <div class="alert alert-warning py-2 mb-0">
              ❌ Ocurrió un error al planificar la ruta en bus.
            </div>
          `;
        }
      }

      return;
    }

    if (hasBDPlace) {
      showRouteLoading(infoEl);
      const isManualStart = isLatLngArr(manualStart);
      if (isManualStart) {
        await drawRouteToPoint?.({ from: startLoc, to: destLoc, mode, infoBox: infoEl, title: "Ruta" });
        return;
      }
      drawRoute?.(startLoc, activePlace, mode, infoEl);
      return;
    }

    showRouteLoading(infoEl);
    await drawRouteToPoint?.({ from: startLoc, to: destLoc, mode, infoBox: infoEl, title: "Ruta" });
  }

  /**
   * Actualiza set manual start point y sincroniza la interfaz con el estado actual.
   */
  function setManualStartPoint(latlng) {
    if (!latlng) return;

    manualStart = [latlng.lat, latlng.lng];

    if (manualStartMarker) {
      try { map.removeLayer(manualStartMarker); } catch {}
    }

    manualStartMarker = L.marker(manualStart).addTo(map)
      .bindPopup("📍 Origen seleccionado")
      .openPopup();

    ensureRouteControlsForManual(true);
    buildRoute();
    refreshLayersOverlays?.();
  }

  /**
   * Actualiza set manual destination y sincroniza la interfaz con el estado actual.
   */
  function setManualDestination(latlng) {
    if (!latlng) return;

    manualDest = [latlng.lat, latlng.lng];

    if (manualDestMarker) {
      try { map.removeLayer(manualDestMarker); } catch {}
    }

    manualDestMarker = L.marker(manualDest).addTo(map)
      .bindPopup("🎯 Destino seleccionado")
      .openPopup();

    setActivePlace?.(null);
    clearMarkers?.();

    ensureRouteControlsForManual(true);
    onManualDestinationSelected?.({
      nombre: "Destino seleccionado",
      ubicacion: { latitude: manualDest[0], longitude: manualDest[1] }
    });
    buildRoute();
    refreshLayersOverlays?.();
  }

  return {
    clearManualDest,
    clearManualStart,
    ensureRouteControlsForManual,
    buildRoute,
    setManualStartPoint,
    setManualDestination
  };
}
