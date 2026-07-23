// js/app/actions.js
import { setActivePlace, getUserLocation, setMode, setUserLocation } from "./state.js";

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
