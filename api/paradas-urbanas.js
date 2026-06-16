// api/paradas-urbanas.js
import { db } from "./_lib/firebaseAdmin.js";
import { ok, fail, cacheUntilEcuadorMidnight } from "./_lib/response.js";
import { mapSnapshot } from "./_lib/normalize.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return fail(res, 405, "Método no permitido");
    }

    const snapshot = await db.collection("paradas_transporte").get();
    const data = mapSnapshot(snapshot);

    cacheUntilEcuadorMidnight(res);
    return ok(res, data, {
      collection: "paradas_transporte",
      total: data.length
    });
  } catch (error) {
    console.error("Error real /api/paradas-urbanas:", error);
    return fail(res, 500, "No se pudo obtener paradas urbanas");
  }
}