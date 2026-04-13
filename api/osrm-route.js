export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const {
      profile = "car",
      coordinates,
      steps = "false",
      overview = "full",
      geometries = "geojson",
      alternatives = "false",
      continue_straight,
      annotations
    } = req.query;

    if (!coordinates || typeof coordinates !== "string") {
      return res.status(400).json({
        error: "Missing required query param: coordinates"
      });
    }

    const allowedProfiles = new Set(["car", "foot", "bike"]);
    const safeProfile = allowedProfiles.has(String(profile)) ? String(profile) : "car";

    const pairs = coordinates.split(";");
    const valid = pairs.every(pair => {
      const [lng, lat] = String(pair).split(",").map(Number);
      return Number.isFinite(lng) && Number.isFinite(lat);
    });

    if (!valid) {
      return res.status(400).json({
        error: "Invalid coordinates format. Use lng,lat;lng,lat;..."
      });
    }

    const params = new URLSearchParams({
      steps: String(steps),
      overview: String(overview),
      geometries: String(geometries),
      alternatives: String(alternatives)
    });

    if (continue_straight !== undefined) {
      params.set("continue_straight", String(continue_straight));
    }

    if (annotations !== undefined) {
      params.set("annotations", String(annotations));
    }

    const osrmUrl =
      `https://router.project-osrm.org/route/v1/${safeProfile}/${coordinates}?${params.toString()}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(osrmUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        },
        signal: controller.signal
      });

      const text = await response.text();

      if (!response.ok) {
        return res.status(response.status).json({
          error: "OSRM upstream error",
          status: response.status,
          detail: text
        });
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        return res.status(502).json({
          error: "Invalid JSON response from OSRM"
        });
      }

      return res.status(200).json(data);
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    if (error?.name === "AbortError") {
      return res.status(504).json({
        error: "OSRM timeout"
      });
    }

    return res.status(500).json({
      error: "Internal server error",
      detail: error?.message || String(error)
    });
  }
}