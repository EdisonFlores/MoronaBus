// js/services/api.js

const API_BASE = "";

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

function resolveEndpoint(name) {
  const key = String(name || "").trim();
  return COLLECTION_TO_ENDPOINT[key] || key;
}

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

export async function apiGet(path, params = {}, { timeoutMs = 12000 } = {}) {
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
      throw new Error(normalizeErrorMessage(json, res.status));
    }

    if (json?.ok === false) {
      throw new Error(normalizeErrorMessage(json, res.status));
    }

    return json?.data ?? json;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchCollection(name, params = {}, options = {}) {
  const endpoint = resolveEndpoint(name);
  return apiGet(endpoint, params, options);
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

  return apiGet("osrm-route", params, { timeoutMs });
}