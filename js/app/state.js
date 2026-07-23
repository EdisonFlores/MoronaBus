//js/app/state.js
// ================= ESTADO GLOBAL =================

// lista de lugares filtrados
export const dataList = [];

// ubicación del usuario
let userLocation = null;

// lugar actualmente seleccionado
let activePlace = null;

// modo de transporte actual
let currentMode = "walking";

// ================= UBICACIÓN =================
export const setUserLocation = loc => {
  userLocation = loc;
};

/**
 * Obtiene get user location desde el estado local, la API o los datos cacheados.
 */
export const getUserLocation = () => userLocation;

// ================= LUGAR ACTIVO =================
export const setActivePlace = place => {
  activePlace = place;
};

/**
 * Obtiene get active place desde el estado local, la API o los datos cacheados.
 */
export const getActivePlace = () => activePlace;

// ================= MODO DE TRANSPORTE =================
export const setMode = mode => {
  currentMode = mode;
};

/**
 * Obtiene get mode desde el estado local, la API o los datos cacheados.
 */
export const getMode = () => currentMode;
