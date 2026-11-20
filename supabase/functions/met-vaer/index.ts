// met-vaer: liten mellomtjeneste foran MET Norway Locationforecast 2.0 (compact).
// MET sine vilkår: identifiserende User-Agent, respekter Expires/If-Modified-Since,
// maks 4 desimaler i koordinater, ikke kall direkte fra mange klienter.
// Data er offentlige (CC BY 4.0, krediteres MET Norway i portalen), så ingen innlogging kreves.
// Kun GET, kun gyldige koordinater, CORS bare for Min dag-adressene.

const MET = "https://api.met.no/weatherapi/locationforecast/2.0/compact";
const UA = "me.voteapp.eu Min dag (kontakt: https://test.voteapp.eu)";
const ALLOWED = new Set(["https://test.voteapp.eu", "https://me.voteapp.eu"]);
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/;

// Enkel minnebuffer i denne instansen, nøkkel = avrundet punkt. Holdes til MET sin Expires.
type Hit = { body: string; expires: number; lastModified: string | null; expiresHdr: string | null };
const mem = new Map<string, Hit>();
const MAX_MEM = 500;

function cors(origin: string | null): Record<string, string> {
  const h: Record<string, string> = { "Vary": "Origin" };
  if (origin && (ALLOWED.has(origin) || LOCAL.test(origin))) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "GET, OPTIONS";
    h["Access-Control-Expose-Headers"] = "Expires, Last-Modified";
    h["Access-Control-Max-Age"] = "86400";
  }
  return h;
}

function json(status: number, obj: unknown, origin: string | null): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// 3 desimaler (ca. 100 m) gir bedre treff i bufferen og er godt innenfor MET sitt krav (maks 4).
function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}

function cacheHeaders(expiresHdr: string | null, lastModified: string | null): Record<string, string> {
  const h: Record<string, string> = {};
  const exp = expiresHdr ? Date.parse(expiresHdr) : NaN;
  const secs = isFinite(exp) ? Math.max(0, Math.floor((exp - Date.now()) / 1000)) : 600;
  h["Cache-Control"] = "public, max-age=" + Math.min(secs, 3600);
  if (expiresHdr) h["Expires"] = expiresHdr;
  if (lastModified) h["Last-Modified"] = lastModified;
  return h;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "GET") return json(405, { error: "Bare GET er tillatt." }, origin);

  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  if (!url.searchParams.has("lat") || !url.searchParams.has("lon") || !isFinite(lat) || !isFinite(lon) ||
      lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return json(400, { error: "Ugyldige koordinater. Bruk ?lat=69.77&lon=21.03" }, origin);
  }
  const la = round3(lat), lo = round3(lon), key = la + "," + lo;
  const ims = req.headers.get("If-Modified-Since");

  let hit = mem.get(key);
  if (!hit || hit.expires <= Date.now()) {
    const headers: Record<string, string> = { "User-Agent": UA, "Accept": "application/json" };
    if (hit && hit.lastModified) headers["If-Modified-Since"] = hit.lastModified;
    let r: Response;
    try {
      r = await fetch(MET + "?lat=" + la + "&lon=" + lo, { headers });
    } catch (_e) {
      if (hit) return new Response(hit.body, { status: 200, headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
      return json(502, { error: "Fikk ikke kontakt med MET." }, origin);
    }
    const expiresHdr = r.headers.get("Expires");
    const expMs = expiresHdr ? Date.parse(expiresHdr) : NaN;
    const until = isFinite(expMs) ? expMs : Date.now() + 10 * 60000;
    if (r.status === 304 && hit) {
      hit = { ...hit, expires: until, expiresHdr: expiresHdr || hit.expiresHdr, lastModified: r.headers.get("Last-Modified") || hit.lastModified };
    } else if (r.ok) {
      hit = { body: await r.text(), expires: until, expiresHdr, lastModified: r.headers.get("Last-Modified") };
    } else {
      await r.body?.cancel();
      if (hit) return new Response(hit.body, { status: 200, headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
      return json(r.status === 429 ? 429 : 502, { error: "MET svarte " + r.status }, origin);
    }
    if (mem.size >= MAX_MEM) mem.delete(mem.keys().next().value as string);
    mem.set(key, hit);
  }

  const ch = cacheHeaders(hit.expiresHdr, hit.lastModified);
  if (ims && hit.lastModified && Date.parse(ims) >= Date.parse(hit.lastModified)) {
    return new Response(null, { status: 304, headers: { ...cors(origin), ...ch } });
  }
  return new Response(hit.body, {
    status: 200,
    headers: { ...cors(origin), ...ch, "Content-Type": "application/json; charset=utf-8" },
  });
});
