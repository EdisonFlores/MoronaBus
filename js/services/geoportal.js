const TERRITORIAL_FILES = {
  barrios: "/data/geoportal/barrios.geojson",
  parroquias: "/data/geoportal/parroquias.geojson"
};

const PARISH_ROUTE_POINTS = {
  "GENERAL PROAÑO": { latitude: -2.266385, longitude: -78.130040 },
  "SAN ISIDRO": { latitude: -2.213347, longitude: -78.164358 },
  "SINAÍ": { latitude: -2.094033, longitude: -78.051732 },
  "SINAI": { latitude: -2.094033, longitude: -78.051732 },
  "CUCHAENTZA": { latitude: -2.122301, longitude: -77.863991 },
  "ALSHI": { latitude: -2.220873, longitude: -78.248813 },
  "ZUÑA": { latitude: -2.187907, longitude: -78.359063 },
  "ZUNA": { latitude: -2.187907, longitude: -78.359063 },
  "RÍO BLANCO": { latitude: -2.347156, longitude: -78.155118 },
  "RIO BLANCO": { latitude: -2.347156, longitude: -78.155118 },
  "MACAS": { latitude: -2.304614, longitude: -78.117565 }
};

function normTerritorialName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function firstCoordinateFromGeometry(geometry) {
  let current = geometry?.coordinates;
  while (Array.isArray(current) && Array.isArray(current[0])) {
    current = current[0];
  }
  return Array.isArray(current) && current.length >= 2 ? current : null;
}

function collectCoordinates(input, output = []) {
  if (!Array.isArray(input)) return output;
  if (typeof input[0] === "number" && typeof input[1] === "number") {
    output.push(input);
    return output;
  }
  input.forEach(item => collectCoordinates(item, output));
  return output;
}

function centroidFromGeometry(geometry) {
  const coords = collectCoordinates(geometry?.coordinates);
  if (!coords.length) {
    const first = firstCoordinateFromGeometry(geometry);
    return first ? { latitude: first[1], longitude: first[0] } : null;
  }

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  coords.forEach(([lng, lat]) => {
    if (typeof lat !== "number" || typeof lng !== "number") return;
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });

  if (![minLng, maxLng, minLat, maxLat].every(Number.isFinite)) return null;

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2
  };
}

function featureName(feature, type) {
  const props = feature?.properties || {};
  if (type === "barrios") {
    return String(props.des_barrio || props.nombre || "Barrio").trim();
  }
  return String(props.dpa_despar || props.nombre || "Parroquia").trim();
}

function featureCode(feature, type) {
  const props = feature?.properties || {};
  return type === "barrios"
    ? String(props.cod_barrio || "").trim()
    : String(props.dpa_parroq || "").trim();
}

export function territorialFeatureToPlace(feature, type) {
  const nombre = featureName(feature, type);
  const routePoint = type === "parroquias"
    ? PARISH_ROUTE_POINTS[nombre] || PARISH_ROUTE_POINTS[normTerritorialName(nombre)]
    : null;
  const ubicacion = routePoint || centroidFromGeometry(feature?.geometry);
  if (!ubicacion) return null;

  const codigo = featureCode(feature, type);
  const isMacas = normTerritorialName(nombre) === "MACAS";
  const entorno = type === "barrios" ? "rural" : (isMacas ? "urbano" : "rural");
  const busTipoForzado = type === "barrios" ? "rural" : (isMacas ? "urbano" : "rural");

  return {
    nombre,
    subcategoria: type,
    tipo_territorial: type,
    codigo_territorial: codigo,
    provincia: "Morona Santiago",
    ciudad: "Morona",
    canton: "Morona",
    parroquia: type === "parroquias" ? nombre : "",
    entorno,
    bus_tipo_forzado: busTipoForzado,
    usar_poligono_bus: type === "barrios",
    telefono: "No aplica",
    horario: "No aplica",
    ubicacion,
    geometry: feature.geometry,
    properties: feature.properties || {},
    popupHTML: `<b>${nombre}</b>`
  };
}

export async function getTerritorialLayer(type) {
  const fileUrl = TERRITORIAL_FILES[type];
  if (!fileUrl) throw new Error("Capa territorial no soportada");

  const response = await fetch(fileUrl, {
    method: "GET",
    headers: { "Accept": "application/geo+json, application/json" }
  });

  if (!response.ok) {
    throw new Error(`No se pudo cargar ${fileUrl}`);
  }

  const geojson = await response.json();
  const features = Array.isArray(geojson?.features) ? geojson.features : [];
  const places = features
    .map(feature => territorialFeatureToPlace(feature, type))
    .filter(Boolean)
    .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || "")));

  return {
    geojson: {
      type: "FeatureCollection",
      features
    },
    places
  };
}
