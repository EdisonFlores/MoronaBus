// js/services/api.js

import { hideServiceNotice, showServiceNotice } from "../app/service_status.js";

const API_BASE = "";
const STATIC_DATA_BASE = "/data/firestore";
const STATIC_MANIFEST_URL = `${STATIC_DATA_BASE}/manifest.json`;
let manifestPromise = null;

const COLLECTION_TO_ENDPOINT = {
  lugar: "lugares",
  lugares: "lugares",

  provincias: "provincias",
  cantones: "cantones",
  parroquias: "parroquias",

  eventos: "eventos",
  eventosms: "eventos",

  lineas_transporte: "lineas-urbanas",
  "lineas-urbanas": "lineas-urbanas",

  lineas_rurales: "lineas-rurales",
  "lineas-rurales": "lineas-rurales",

  paradas_transporte: "paradas-urbanas",
  "paradas-urbanas": "paradas-urbanas",

  paradas_rurales: "paradas-rurales",
  "paradas-rurales": "paradas-rurales"
};

/**
 * Gestiona resolve endpoint dentro del flujo principal del modulo.
 */
export function resolveEndpoint(name) {
  const key = String(name || "").trim();
  return COLLECTION_TO_ENDPOINT[key] || key;
}

async function fetchJson(url, { timeoutMs = 12000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: ctrl.signal
    });

    if (!response.ok) {
      const error = new Error(`Error HTTP ${response.status} en ${url}`);
      error.status = response.status;
      throw error;
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function getStaticManifest(options = {}) {
  if (!manifestPromise) {
    manifestPromise = fetchJson(STATIC_MANIFEST_URL, options).catch(error => {
      manifestPromise = null;
      throw error;
    });
  }
  return manifestPromise;
}

function filterByParams(data, params = {}) {
  const filters = Object.entries(params).filter(([, value]) => (
    value !== undefined && value !== null && String(value).trim() !== ""
  ));
  if (!filters.length) return data;

  return data.filter(item => filters.every(([field, expected]) => (
    String(item?.[field] ?? "").trim() === String(expected).trim()
  )));
}

async function fetchStaticCollection(endpoint, params = {}, options = {}) {
  const manifest = await getStaticManifest(options);
  const dataset = manifest?.datasets?.[endpoint];
  if (!dataset?.file) throw new Error(`No existe dataset estatico para ${endpoint}`);

  const data = await fetchJson(`${STATIC_DATA_BASE}/${dataset.file}`, options);
  if (!Array.isArray(data)) throw new Error(`Dataset estatico invalido para ${endpoint}`);
  return filterByParams(data, params);
}

/**
 * Construye build query para mostrar contenido o preparar datos de la interfaz.
 */
export function buildQuery(params = {}) {
  const sp = new URLSearchParams();

  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const value = String(v).trim();
    if (!value) return;
    sp.set(k, value);
  });

  const q = sp.toString();
  return q ? `?${q}` : "";
}

/**
 * Normaliza o formatea normalize error message para usarlo de forma consistente.
 */
function normalizeErrorMessage(json, status) {
  if (!json) return `Error HTTP ${status}`;
  if (typeof json === "string") return json;
  if (typeof json?.error === "string") return json.error;
  if (typeof json?.message === "string") return json.message;
  try {
    return JSON.stringify(json);
  } catch {
    return `Error HTTP ${status}`;
  }
}

/**
 * Gestiona api get dentro del flujo principal del modulo.
 */
export async function apiGet(path, params = {}, { timeoutMs = 12000, suppressServiceNotice = false } = {}) {
  const endpoint = String(path || "").trim().replace(/^\/+/, "").replace(/^api\//, "");
  const url = `${API_BASE}/api/${endpoint}${buildQuery(params)}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      },
      signal: ctrl.signal
    });

    let json = null;
    try {
      json = await res.json();
    } catch {
      throw new Error(`Respuesta inválida en ${url}`);
    }

    if (!res.ok) {
      const error = new Error(normalizeErrorMessage(json, res.status));
      error.status = res.status;
      throw error;
    }

    if (json?.ok === false) {
      throw new Error(normalizeErrorMessage(json, res.status));
    }

    hideServiceNotice();
    return json?.data ?? json;
  } catch (error) {
    if (!navigator.onLine) throw error;
    if (!suppressServiceNotice) {
      showServiceNotice({
        autoHideMs: error?.name === "AbortError" ? 14000 : 12000
      });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Obtiene fetch collection desde el estado local, la API o los datos cacheados.
 */
export async function fetchCollection(name, params = {}, options = {}) {
  const endpoint = resolveEndpoint(name);
  try {
    const data = await fetchStaticCollection(endpoint, params, options);
    hideServiceNotice();
    return data;
  } catch (staticError) {
    console.warn(`Copia estatica no disponible para ${endpoint}; usando API.`, staticError);
    return apiGet(endpoint, params, options);
  }
}

/* =========================
   OSRM vía backend
========================= */
export async function fetchOsrmRoute({
  profile = "car",
  coordinates,
  steps = false,
  overview = "full",
  geometries = "geojson",
  alternatives = false,
  continueStraight,
  annotations,
  timeoutMs = 8000
} = {}) {
  if (!coordinates || typeof coordinates !== "string") {
    throw new Error("coordinates es requerido para consultar OSRM");
  }

  const params = {
    profile,
    coordinates,
    steps: String(steps),
    overview,
    geometries,
    alternatives: String(alternatives)
  };

  if (continueStraight !== undefined) {
    params.continue_straight = String(continueStraight);
  }

  if (annotations !== undefined) {
    params.annotations = String(annotations);
  }

  return apiGet("osrm-route", params, { timeoutMs, suppressServiceNotice: true });
}
