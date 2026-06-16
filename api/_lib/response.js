// api/_lib/response.js

export function sendJson(res, status, data) {
  res.status(status).json(data);
}

export function cacheUntilEcuadorMidnight(res) {
  const now = new Date();

  // Ecuador continental usa UTC-5 y no maneja horario de verano.
  const ecuadorOffsetMs = -5 * 60 * 60 * 1000;
  const ecuadorNow = new Date(now.getTime() + ecuadorOffsetMs);

  const nextMidnightEcuadorAsUtc = Date.UTC(
    ecuadorNow.getUTCFullYear(),
    ecuadorNow.getUTCMonth(),
    ecuadorNow.getUTCDate() + 1,
    0,
    0,
    0
  );

  const nextMidnightRealUtc = nextMidnightEcuadorAsUtc - ecuadorOffsetMs;

  const seconds = Math.max(
    60,
    Math.floor((nextMidnightRealUtc - now.getTime()) / 1000)
  );

  res.setHeader(
    "Cache-Control",
    `public, s-maxage=${seconds}, stale-while-revalidate=3600`
  );
}

export function ok(res, data, meta = {}) {
  return sendJson(res, 200, {
    ok: true,
    data,
    meta
  });
}

export function fail(res, status = 500, message = "Error interno", extra = {}) {
  return sendJson(res, status, {
    ok: false,
    error: message,
    ...extra
  });
}