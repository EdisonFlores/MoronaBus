// js/transport/core/transport_state.js
import { map } from "../../map/map.js";

let layerLineas = null;
let layerParadas = null;
let layerAcceso = null;

let currentLinea = null;
let currentParadas = [];
let currentStopMarkers = [];
let currentStopOffsets = new Map();

let nearestStopMarker = null;
let nearestStopMarkerOriginalStyle = null;

/* ================= SETTERS / GETTERS ================= */
export function setRouteLayer(layer) {
  if (layerLineas) map.removeLayer(layerLineas);
  layerLineas = layer || null;
}
/**
 * Obtiene get route layer desde el estado local, la API o los datos cacheados.
 */
export function getRouteLayer() {
  return layerLineas;
}

/**
 * Actualiza set stops layer y sincroniza la interfaz con el estado actual.
 */
export function setStopsLayer(layerGroup) {
  if (layerParadas) map.removeLayer(layerParadas);
  layerParadas = layerGroup || null;
}
/**
 * Obtiene get stops layer desde el estado local, la API o los datos cacheados.
 */
export function getStopsLayer() {
  return layerParadas;
}

/**
 * Actualiza set access layer y sincroniza la interfaz con el estado actual.
 */
export function setAccessLayer(layer) {
  if (layerAcceso) map.removeLayer(layerAcceso);
  layerAcceso = layer || null;
}
/**
 * Obtiene get access layer desde el estado local, la API o los datos cacheados.
 */
export function getAccessLayer() {
  return layerAcceso;
}

/**
 * Actualiza set current linea y sincroniza la interfaz con el estado actual.
 */
export function setCurrentLinea(linea) {
  currentLinea = linea || null;
}
/**
 * Obtiene get current linea desde el estado local, la API o los datos cacheados.
 */
export function getCurrentLinea() {
  return currentLinea;
}

/**
 * Actualiza set current paradas y sincroniza la interfaz con el estado actual.
 */
export function setCurrentParadas(paradas) {
  currentParadas = Array.isArray(paradas) ? paradas : [];
}
/**
 * Obtiene get current paradas desde el estado local, la API o los datos cacheados.
 */
export function getCurrentParadas() {
  return currentParadas;
}

/**
 * Actualiza set current stop markers y sincroniza la interfaz con el estado actual.
 */
export function setCurrentStopMarkers(markers) {
  currentStopMarkers = Array.isArray(markers) ? markers : [];
}
/**
 * Obtiene get current stop markers desde el estado local, la API o los datos cacheados.
 */
export function getCurrentStopMarkers() {
  return currentStopMarkers;
}

/**
 * Actualiza set current stop offsets y sincroniza la interfaz con el estado actual.
 */
export function setCurrentStopOffsets(offsets) {
  currentStopOffsets = offsets instanceof Map ? offsets : new Map();
}
/**
 * Obtiene get current stop offsets desde el estado local, la API o los datos cacheados.
 */
export function getCurrentStopOffsets() {
  return currentStopOffsets;
}

/* ================= RESALTADO ================= */
export function resetNearestHighlight() {
  if (nearestStopMarker && nearestStopMarkerOriginalStyle) {
    nearestStopMarker.setStyle(nearestStopMarkerOriginalStyle);
  }
  nearestStopMarker = null;
  nearestStopMarkerOriginalStyle = null;
}

/**
 * Actualiza set nearest highlight y sincroniza la interfaz con el estado actual.
 */
export function setNearestHighlight(marker) {
  resetNearestHighlight();
  if (!marker) return;

  nearestStopMarker = marker;
  nearestStopMarkerOriginalStyle = {
    radius: marker.options.radius,
    color: marker.options.color,
    fillColor: marker.options.fillColor,
    fillOpacity: marker.options.fillOpacity,
    weight: marker.options.weight,
  };

  marker.setStyle({
    radius: 10,
    color: "#FFD700",
    fillColor: "#FFD700",
    fillOpacity: 1,
    weight: 3,
  });
}

/* ================= LIMPIEZA TOTAL ================= */
export function clearTransportState() {
  if (layerLineas) map.removeLayer(layerLineas);
  if (layerParadas) map.removeLayer(layerParadas);
  if (layerAcceso) map.removeLayer(layerAcceso);

  layerLineas = null;
  layerParadas = null;
  layerAcceso = null;

  resetNearestHighlight();

  currentLinea = null;
  currentParadas = [];
  currentStopMarkers = [];
  currentStopOffsets = new Map();
}