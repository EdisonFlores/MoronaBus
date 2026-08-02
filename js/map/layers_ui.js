// js/map/layers_ui.js
export function initLayersUI({
  map,
  baseLayers = {},
  overlays = {},
  onMyLocation = null,
  legendHTML = ""
} = {}) {
  if (!map) return null;

  let currentOverlays = { ...overlays };

  function isPlacesLayerName(name) {
    const clean = String(name || "")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .trim()
      .toLowerCase();
    return clean === "lugares" || clean === "places";
  }

  function splitContentLayers(entries = currentOverlays) {
    const territorial = {};
    const independent = {};
    Object.entries(entries).forEach(([name, layer]) => {
      if (isPlacesLayerName(name)) independent[name] = layer;
      else territorial[name] = layer;
    });
    return { territorial, independent };
  }

  const initialContent = splitContentLayers();

  // Leaflet usa radios nativos para las capas base y casillas para overlays.
  // Se crean dos controles nativos independientes para conservar dos grupos:
  // mapa base (OSM/TopoMap) y contenido (Lugares/Barrios/Parroquias).
  const baseControl = L.control.layers(baseLayers, {}, {
    collapsed: true,
    position: "topright"
  }).addTo(map);

  const contentControl = L.control.layers(initialContent.territorial, initialContent.independent, {
    collapsed: true,
    position: "topright"
  }).addTo(map);

  function addControlTitle(control, title, ariaLabel) {
    const container = control?.getContainer?.();
    const form = control?._form;
    if (!container || !form) return;

    container.setAttribute("aria-label", ariaLabel || title);
    if (form.querySelector(".tm-layers-control-title")) return;

    const heading = document.createElement("div");
    heading.className = "tm-layers-control-title";
    heading.textContent = title;
    form.insertBefore(heading, form.firstChild);
  }

  addControlTitle(baseControl, "Mapas", "Seleccionar mapa base");
  addControlTitle(contentControl, "Capas de información", "Seleccionar información visible en el mapa");

  function territorialLayers() {
    return Object.entries(currentOverlays)
      .filter(([name]) => !isPlacesLayerName(name))
      .map(([, layer]) => layer);
  }

  function enforceTerritorialExclusivity(selectedLayer) {
    territorialLayers().forEach(layer => {
      if (layer !== selectedLayer && map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });
  }

  // También protege las capas añadidas desde otros flujos de la aplicación,
  // no solamente desde el control visual.
  map.on("layeradd", event => {
    if (!territorialLayers().includes(event?.layer)) return;
    enforceTerritorialExclusivity(event.layer);
    setTimeout(syncOverlayStates, 0);
  });

  const MyLoc = L.Control.extend({
    options: { position: "topleft" },
    onAdd() {
      const btn = L.DomUtil.create("button", "tm-map-btn");
      btn.type = "button";
      btn.innerHTML = "&#128205;";
      btn.title = "Mostrar mi ubicacion";
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.on(btn, "click", event => {
        L.DomEvent.stop(event);
        if (typeof onMyLocation === "function") onMyLocation();
      });
      return btn;
    }
  });

  new MyLoc().addTo(map);

  function updateOverlays(newOverlays = {}) {
    Object.values(currentOverlays).forEach(layer => {
      try { contentControl.removeLayer(layer); } catch {}
    });

    currentOverlays = { ...newOverlays };

    Object.entries(currentOverlays).forEach(([name, layer]) => {
      try {
        if (isPlacesLayerName(name)) contentControl.addOverlay(layer, name);
        else contentControl.addBaseLayer(layer, name);
      } catch {}
    });

    syncOverlayStates();
  }

  function syncControlInputs(control) {
    const inputs = control?._form?.querySelectorAll?.("input.leaflet-control-layers-selector") || [];
    inputs.forEach(input => {
      const entry = (control?._layers || [])
        .find(item => String(item?.layer?._leaflet_id) === String(input.layerId));
      if (entry?.layer) input.checked = map.hasLayer(entry.layer);
    });
  }

  function syncOverlayStates() {
    syncControlInputs(baseControl);
    syncControlInputs(contentControl);
  }

  map.on("baselayerchange overlayadd overlayremove layerremove", () => {
    setTimeout(syncOverlayStates, 0);
  });

  return {
    layersControl: baseControl,
    contentLayersControl: contentControl,
    updateOverlays,
    syncOverlayStates
  };
}
