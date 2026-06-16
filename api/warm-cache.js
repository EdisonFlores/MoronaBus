// api/warm-cache.js

const ENDPOINTS = [
  "/api/lugares",
  "/api/eventos",
  "/api/provincias",
  "/api/cantones",
  "/api/parroquias",
  "/api/lineas-urbanas",
  "/api/lineas-rurales",
  "/api/paradas-urbanas",
  "/api/paradas-rurales"
];

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        ok: false,
        error: "Método no permitido"
      });
    }

    const host = req.headers.host;
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const baseUrl = `${protocol}://${host}`;

    const results = [];

    for (const path of ENDPOINTS) {
      const response = await fetch(`${baseUrl}${path}`);

      results.push({
        path,
        status: response.status,
        ok: response.ok,
        cache: response.headers.get("x-vercel-cache") || null
      });
    }

    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({
      ok: true,
      warmedAt: new Date().toISOString(),
      total: results.length,
      results
    });
  } catch (error) {
    console.error("Error calentando caché:", error);

    res.setHeader("Cache-Control", "no-store");

    return res.status(500).json({
      ok: false,
      error: "No se pudo calentar la caché"
    });
  }
}