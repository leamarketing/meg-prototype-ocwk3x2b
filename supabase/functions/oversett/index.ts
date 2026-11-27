// oversett: taleoversetter norsk <-> engelsk for Min dag (test.voteapp.eu/oversetter/).
// - Oversetter med Gemini (naturlig muntlig språk, ikke ord for ord).
// - Leser opp med Lyses egen stemme i ElevenLabs (eleven_flash_v2_5, språkkode no/en).
// - Bare innloggede Min dag-brukere. Nøklene ligger som hemmeligheter i Supabase, aldri i nettleseren.
// - Grenser: maks 500 tegn per tekst, maks 300 kall per bruker per døgn i denne instansen.
// - Ingen lagring og ingen logging av teksten.

const ALLOWED = new Set(["https://test.voteapp.eu", "https://me.voteapp.eu"]);
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/;
const VOICE = "8nJ10CPkJR5Xmiws0Ihe"; // Lyses egen stemme
const MODELS = ["gemini-flash-latest", "gemini-2.5-flash"];
const MAX_CHARS = 500;
const MAX_PER_DAY = 300;

const bruk = new Map<string, { dag: string; n: number }>();

function cors(origin: string | null): Record<string, string> {
  const h: Record<string, string> = { "Vary": "Origin" };
  if (origin && (ALLOWED.has(origin) || LOCAL.test(origin))) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "authorization, content-type, apikey, x-client-info";
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

async function hentBruker(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const r = await fetch(Deno.env.get("SUPABASE_URL") + "/auth/v1/user", {
    headers: { Authorization: auth, apikey: Deno.env.get("SUPABASE_ANON_KEY") || "" },
  });
  if (!r.ok) { await r.body?.cancel(); return null; }
  const u = await r.json();
  return u && u.id ? String(u.id) : null;
}

function tell(id: string): boolean {
  const dag = new Date().toISOString().slice(0, 10);
  const b = bruk.get(id);
  if (!b || b.dag !== dag) { bruk.set(id, { dag, n: 1 }); return true; }
  if (b.n >= MAX_PER_DAY) return false;
  b.n++;
  return true;
}

const NAVN: Record<string, string> = { no: "Norwegian (Bokmål)", en: "English" };

function prompt(text: string, fra: string): string {
  const til = fra === "no" ? "en" : "no";
  return [
    "You are a live interpreter helping a Norwegian traveller talk with people abroad.",
    `Translate the text below from ${NAVN[fra]} into ${NAVN[til]}.`,
    "Rules:",
    "- Translate the meaning the way a native speaker would naturally SAY it out loud in everyday conversation. Never word for word.",
    "- The text comes from speech recognition, so it may lack punctuation or contain small mishearings. Fix obvious mishearings from context.",
    til === "no"
      ? "- Write natural, plain Norwegian Bokmål as spoken in Norway. Use 'du', not formal language."
      : "- Write natural, plain, friendly English.",
    "- Keep names, numbers, prices, times and addresses exactly.",
    `- If the text is already in ${NAVN[til]}, translate it into ${NAVN[fra]} instead.`,
    "- Reply with ONLY the translation. No quotes, no notes, no explanations, no alternatives.",
    "",
    "Text:",
    text,
  ].join("\n");
}

async function oversett(text: string, fra: string): Promise<string> {
  const key = Deno.env.get("GEMINI_API_KEY") || "";
  let sist = "";
  for (const m of MODELS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt(text, fra) }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
      }),
    });
    if (!r.ok) { sist = m + " " + r.status; await r.body?.cancel(); continue; }
    const d = await r.json();
    const ut = (d?.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("").trim();
    if (ut) return ut.replace(/^["“”«»]+|["“”«»]+$/g, "").trim();
    sist = m + " tomt svar";
  }
  throw new Error("oversettelse feilet: " + sist);
}

async function stemme(text: string, lang: string): Promise<Uint8Array> {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_64`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "xi-api-key": Deno.env.get("ELEVENLABS_API_KEY") || "", Accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: "eleven_flash_v2_5", language_code: lang === "no" ? "no" : "en" }),
  });
  if (!r.ok) { const t = await r.text(); throw new Error("stemme " + r.status + " " + t.slice(0, 120)); }
  return new Uint8Array(await r.arrayBuffer());
}

function b64(u: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return json(405, { error: "Bare POST." }, origin);

  const id = await hentBruker(req);
  if (!id) return json(401, { error: "Logg inn i Min dag først." }, origin);
  if (!tell(id)) return json(429, { error: "Dagens grense er nådd. Prøv igjen i morgen." }, origin);

  let body: { op?: string; text?: string; from?: string; lang?: string };
  try { body = await req.json(); } catch { return json(400, { error: "Ugyldig forespørsel." }, origin); }
  const text = String(body.text || "").trim();
  if (!text) return json(400, { error: "Tom tekst." }, origin);
  if (text.length > MAX_CHARS) return json(400, { error: `Maks ${MAX_CHARS} tegn om gangen.` }, origin);

  try {
    if (body.op === "say") {
      const lang = body.lang === "no" ? "no" : "en";
      const lyd = await stemme(text, lang);
      return new Response(lyd, { status: 200, headers: { ...cors(origin), "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
    }
    const fra = body.from === "en" ? "en" : "no";
    const til = fra === "no" ? "en" : "no";
    const ut = await oversett(text, fra);
    let lyd: string | null = null;
    let stemmeFeil: string | null = null;
    try { lyd = b64(await stemme(ut, til)); } catch (e) { stemmeFeil = String((e as Error).message || e).slice(0, 160); }
    return json(200, { translation: ut, to: til, audio: lyd, voiceError: stemmeFeil }, origin);
  } catch (e) {
    return json(502, { error: "Oversettelsen svarte ikke. Prøv igjen.", detail: String((e as Error).message || e).slice(0, 160) }, origin);
  }
});
