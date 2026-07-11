// js/map/layers_ui.js
export function initLayersUI({
  map,
  baseLayers = {},
  overlays = {},
  onMyLocation = null,
  legendHTML = ""
} = {}) {
  if (!map) return null;

  const TERRITORIAL_NAMES = ["Barrios", "Parroquias"];
  const territorialNameSet = new Set(TERRITORIAL_NAMES);
  let currentOverlays = { ...overlays };

  const lc = L.control.layers(baseLayers, currentOverlays, { collapsed: true }).addTo(map);

  function normalizeLabelText(value) {
    return String(value || "")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .trim()
      .toLowerCase();
  }

  function territorialNameFromLabel(label) {
    const clean = normalizeLabelText(label?.textContent);
    if (clean === "barrios" || clean === "neighborhoods") return "Barrios";
    if (clean === "parroquias" || clean === "parishes") return "Parroquias";
    return "";
  }

  function getLayerByName(name) {
    return currentOverlays[name] || null;
  }

  function enforceTerritorialExclusivity(selectedName) {
    TERRITORIAL_NAMES.forEach(name => {
      if (name === selectedName) return;
      const layer = getLayerByName(name);
      if (layer && map.hasLayer(layer)) map.removeLayer(layer);
    });
  }

  function decorateTerritorialSelectors() {
    const form = lc?._form;
    if (!form) return;

    const labels = form.querySelectorAll("label");
    labels.forEach(label => {
      const territorialName = territorialNameFromLabel(label);
      if (!territorialName) return;

      const input = label.querySelector("input.leaflet-control-layers-selector");
      if (!input) return;

      label.classList.add("tm-territorial-layer-option");
      input.type = "radio";
      input.name = "tm-territorial-overlay";
      input.classList.add("tm-territorial-layer-radio");
      input.classList.add("tm-territorial-layer-source");
      input.checked = !!getLayerByName(territorialName) && map.hasLayer(getLayerByName(territorialName));

      if (!input.nextElementSibling?.classList?.contains("tm-territorial-layer-visual")) {
        const visual = document.createElement("span");
        visual.className = "tm-territorial-layer-visual";
        visual.setAttribute("aria-hidden", "true");
        input.insertAdjacentElement("afterend", visual);
      }

      if (input.dataset.tmTerritorialBound === "1") return;
      input.dataset.tmTerritorialBound = "1";
      input.addEventListener("change", () => {
        if (!input.checked) return;
        enforceTerritorialExclusivity(territorialName);
        setTimeout(syncOverlayStates, 0);
      });
    });
  }

  setTimeout(decorateTerritorialSelectors, 0);

  const MyLoc = L.Control.extend({
    options: { position: "topleft" },
    onAdd() {
      const btn = L.DomUtil.create("button", "tm-map-btn");
      btn.type = "button";
      btn.innerHTML = "&#128205;";
      btn.title = "Mostrar mi ubicacion";
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.on(btn, "click", (e) => {
        L.DomEvent.stop(e);
        if (typeof onMyLocation === "function") onMyLocation();
      });
      return btn;
    }
  });

  const myLocCtrl = new MyLoc();
  myLocCtrl.addTo(map);

  function updateOverlays(newOverlays = {}) {
    Object.keys(currentOverlays).forEach(name => {
      try { lc.removeLayer(currentOverlays[name]); } catch {}
    });

    currentOverlays = { ...newOverlays };

    Object.keys(currentOverlays).forEach(name => {
      try { lc.addOverlay(currentOverlays[name], name); } catch {}
    });

    setTimeout(() => {
      decorateTerritorialSelectors();
      syncOverlayStates();
    }, 0);
  }

  function syncOverlayStates() {
    const inputs = lc?._form?.querySelectorAll?.("input.leaflet-control-layers-selector") || [];
    inputs.forEach(input => {
      const entry = (lc?._layers || []).find(item => String(item?.layer?._leaflet_id) === String(input.layerId));
      if (!entry?.overlay) return;

      const label = input.closest("label");
      const territorialName = territorialNameFromLabel(label);
      if (territorialName) {
        label?.classList.add("tm-territorial-layer-option");
        input.type = "radio";
        input.name = "tm-territorial-overlay";
        input.classList.add("tm-territorial-layer-radio", "tm-territorial-layer-source");
        if (!input.nextElementSibling?.classList?.contains("tm-territorial-layer-visual")) {
          const visual = document.createElement("span");
          visual.className = "tm-territorial-layer-visual";
          visual.setAttribute("aria-hidden", "true");
          input.insertAdjacentElement("afterend", visual);
        }
      }

      input.checked = map.hasLayer(entry.layer);
    });

    decorateTerritorialSelectors();
  }

  map.on("overlayadd", event => {
    const name = String(event?.name || "");
    if (territorialNameSet.has(name)) enforceTerritorialExclusivity(name);
    setTimeout(syncOverlayStates, 0);
  });

  map.on("overlayremove", () => {
    setTimeout(syncOverlayStates, 0);
  });

  const container = lc.getContainer?.();
  if (container) {
    L.DomEvent.on(container, "mouseover click", () => {
      setTimeout(decorateTerritorialSelectors, 0);
    });
  }

  return { layersControl: lc, updateOverlays, syncOverlayStates };
}
