// E-postlisten for Min dag (me.voteapp.eu), med dobbel bekreftelse.
//
// Tre handlinger, alle som POST med JSON:
//   { handling: "meld_pa", navn, epost, nyheter, testpilot, fra, side, tekst, hp }
//       Lagrer ønsket og sender en bekreftelseslenke. Personen er IKKE på listen før lenken er brukt.
//   { handling: "bekreft", t }   Bekrefter. Først her lagres samtykket i consent_events.
//   { handling: "avmeld", t }    Avmelder med ett klikk, uten innlogging. Lagres som trukket samtykke.
// I tillegg: POST ?avmeld=<token> (RFC 8058, «List-Unsubscribe-Post») for e-postprogrammenes egen avmeldingsknapp.
//
// Personvern: ingen sporing av åpnede e-poster, ingen IP-adresser lagres, ingen data deles med voteapp.eu
// eller stemmeapp.no. Tabellene har radsikkerhet uten policyer, så bare denne funksjonen når dem.
import { createClient } from "jsr:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const TILLATTE = ["https://test.voteapp.eu", "https://me.voteapp.eu", "http://localhost:8080", "http://127.0.0.1:8080"];
const STANDARD_SIDE = "https://test.voteapp.eu";
// Svar på e-postene går til Lyse sin innboks, som Geir og Lyse leser (bytt når Min dag får egen innboks).
const SVARADRESSE = "bizplanpilot@gmail.com";
const RYDD_ETTER_DAGER = 30; // ubekreftede påmeldinger slettes etter så mange dager

// Teksten folk faktisk krysset av for. Endres teksten i skjemaet, skal det komme en ny versjon her.
const TEKSTER: Record<string, { nyheter: string; testpilot: string }> = {
  "2026-11-21": {
    nyheter: "Send meg nytt fra Min dag på e-post (høyst to ganger i måneden).",
    testpilot: "Jeg vil være testpilot og få én måned gratis tilgang når betalingen er på plass.",
  },
};
const GJELDENDE_TEKST = "2026-11-21";

const MAKS_PER_ADRESSE_DOGN = 3; // bekreftelser til samme adresse per døgn
const MAKS_PER_TIME = 60; // alle bekreftelser samlet per time (verner mot misbruk)

function cors(origin: string | null) {
  const o = origin && TILLATTE.includes(origin) ? origin : STANDARD_SIDE;
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Headers": "content-type, apikey, authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const erUuid = (s: unknown) => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const erEpost = (s: string) => /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(s) && s.length <= 160;

async function nokkel(): Promise<string | undefined> {
  const env = Deno.env.get("RESEND_ME_VOTEAPP_KEY");
  if (env && env.trim()) return env.trim();
  const { data } = await db.from("mail_secret").select("resend_key").eq("id", 1).maybeSingle();
  return data?.resend_key || undefined;
}

async function sendBekreftelse(til: string, navn: string | null, lenke: string, avmeld: string, nyheter: boolean, testpilot: boolean) {
  const key = await nokkel();
  if (!key) return { ok: false, grunn: "mangler_nokkel" };
  const hei = navn ? `Hei ${esc(navn)}!` : "Hei!";
  const valg = [nyheter ? "nytt fra Min dag på e-post, høyst to ganger i måneden" : "", testpilot ? "å være testpilot, med én måned gratis når betalingen er på plass" : ""]
    .filter(Boolean);
  const valgHtml = valg.map((v) => `<li style="margin:4px 0">${v}</li>`).join("");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#1d2430;line-height:1.55">
  <p style="font-size:13px;letter-spacing:1px;color:#5a6372;margin:0 0 8px">MIN DAG · ME.VOTEAPP.EU</p>
  <h1 style="font-size:22px;margin:0 0 14px">Bekreft påmeldingen din</h1>
  <p>${hei}</p>
  <p>Noen, forhåpentlig du, skrev inn denne e-postadressen på Min dag og ba om:</p>
  <ul style="padding-left:20px">${valgHtml}</ul>
  <p>Du er ikke på listen før du har bekreftet. Trykk på knappen, så er det gjort:</p>
  <p style="margin:22px 0"><a href="${lenke}" style="background:#1f5f8b;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;display:inline-block">Ja, meld meg på</a></p>
  <p style="font-size:14px;color:#5a6372">Var det ikke deg? Da trenger du ikke gjøre noe. Uten bekreftelse sender vi deg ingenting mer.</p>
  <p style="font-size:14px;color:#5a6372">Vi sporer ikke om du åpner e-postene våre, og vi deler ikke adressen din med noen. Du kan melde deg av når som helst med ett klikk nederst i hver e-post.</p>
  <p>Vennlig hilsen<br>Geir</p>
  <hr style="border:none;border-top:1px solid #e3e1da;margin:22px 0 10px">
  <p style="font-size:12px;color:#5a6372">Min dag er en del av VoteApp, laget i Nordreisa. Vil du ikke få flere e-poster herfra? <a href="${avmeld}" style="color:#5a6372">Meld meg av</a>.</p>
</div>`;
  const tekst = `${navn ? "Hei " + navn + "!" : "Hei!"}

Noen, forhåpentlig du, skrev inn denne e-postadressen på Min dag og ba om:
${valg.map((v) => "- " + v).join("\n")}

Du er ikke på listen før du har bekreftet. Åpne denne lenken:
${lenke}

Var det ikke deg? Da trenger du ikke gjøre noe. Uten bekreftelse sender vi deg ingenting mer.

Vennlig hilsen
Geir

Meld meg av: ${avmeld}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Min dag <hei@me.voteapp.eu>",
      to: [til],
      reply_to: SVARADRESSE,
      subject: "Bekreft påmeldingen din til Min dag",
      html,
      text: tekst,
      headers: { "List-Unsubscribe": `<${avmeld}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    }),
  });
  if (!res.ok) {
    let melding = "";
    try { melding = String((await res.json()).message ?? "").slice(0, 160); } catch { /* ingen detaljer */ }
    return { ok: false, grunn: "resend_" + res.status, melding };
  }
  return { ok: true };
}

async function avmeld(token: string) {
  const { data: r } = await db.from("list_signups").select("id,wants_news,wants_testpilot,confirmed_at,unsubscribed_at,source")
    .eq("unsub_token", token).maybeSingle();
  if (!r) return { ok: false, grunn: "ukjent" };
  if (r.unsubscribed_at) return { ok: true, alt: true };
  const naa = new Date().toISOString();
  await db.from("list_signups").update({ unsubscribed_at: naa, updated_at: naa }).eq("id", r.id);
  if (r.confirmed_at) {
    const rader = [];
    if (r.wants_news) rader.push({ signup_id: r.id, kind: "email", given: false, page: "avmelding", text_version: "avmeldt med ett klikk", source: r.source });
    if (r.wants_testpilot) rader.push({ signup_id: r.id, kind: "testpilot", given: false, page: "avmelding", text_version: "avmeldt med ett klikk", source: r.source });
    if (rader.length) await db.from("consent_events").insert(rader);
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  const h = cors(req.headers.get("origin"));
  const svar = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...h, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return svar(405, { ok: false });

  // Avmeldingsknappen i e-postprogrammet (RFC 8058): POST ?avmeld=<token>
  const url = new URL(req.url);
  const qAvmeld = url.searchParams.get("avmeld");
  if (qAvmeld) {
    if (!erUuid(qAvmeld)) return svar(400, { ok: false });
    return svar(200, await avmeld(qAvmeld));
  }

  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return svar(400, { ok: false, grunn: "ugyldig" }); }
  const handling = String(b.handling ?? "");

  if (handling === "meld_pa") {
    if (b.hp) return svar(200, { ok: true }); // felle for roboter: svar som vanlig, gjør ingenting
    const epost = String(b.epost ?? "").trim().toLowerCase();
    const navn = String(b.navn ?? "").trim().slice(0, 120) || null;
    const nyheter = b.nyheter === true;
    const testpilot = b.testpilot === true;
    const fraRaw = String(b.fra ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
    const fra = fraRaw || null;
    const side = String(b.side ?? "").trim().slice(0, 80) || null;
    const tekst = TEKSTER[String(b.tekst ?? "")] ? String(b.tekst) : GJELDENDE_TEKST;
    if (!erEpost(epost)) return svar(200, { ok: false, grunn: "epost" });
    if (!nyheter && !testpilot) return svar(200, { ok: false, grunn: "ingen_valg" });

    // Rydding: ubekreftede påmeldinger eldre enn RYDD_ETTER_DAGER slettes (lovet i personvernteksten).
    await db.from("list_signups").delete().is("confirmed_at", null)
      .lt("created_at", new Date(Date.now() - RYDD_ETTER_DAGER * 86400_000).toISOString());

    const timeSiden = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await db.from("list_signups").select("id", { count: "exact", head: true }).gte("confirm_sent_at", timeSiden);
    if ((count ?? 0) >= MAKS_PER_TIME) return svar(200, { ok: false, grunn: "travelt" });

    const { data: fins } = await db.from("list_signups").select("*").eq("email", epost).maybeSingle();
    const naa = new Date();
    // Allerede bekreftet og aktiv: samme svar som alle andre, ingen ny e-post (ingen avsløring, ingen masseutsending).
    if (fins && fins.confirmed_at && !fins.unsubscribed_at) return svar(200, { ok: true });

    let rad = fins;
    if (fins) {
      const sist = fins.confirm_sent_at ? new Date(fins.confirm_sent_at).getTime() : 0;
      const nyttDogn = naa.getTime() - sist > 86400_000;
      const antall = nyttDogn ? 0 : fins.confirm_send_count;
      if (antall >= MAKS_PER_ADRESSE_DOGN) return svar(200, { ok: true });
      const { data } = await db.from("list_signups").update({
        full_name: navn, wants_news: nyheter, wants_testpilot: testpilot, source: fra, page: side, text_version: tekst,
        confirm_token: crypto.randomUUID(), confirmed_at: null, unsubscribed_at: null,
        confirm_send_count: antall, updated_at: naa.toISOString(),
      }).eq("id", fins.id).select("*").single();
      rad = data;
    } else {
      const { data, error } = await db.from("list_signups").insert({
        email: epost, full_name: navn, wants_news: nyheter, wants_testpilot: testpilot, source: fra, page: side, text_version: tekst,
      }).select("*").single();
      if (error) return svar(200, { ok: false, grunn: "lagring" });
      rad = data;
    }

    const base = TILLATTE.includes(req.headers.get("origin") ?? "") ? req.headers.get("origin")! : STANDARD_SIDE;
    const lenke = `${base}/liste/bekreft.html?t=${rad.confirm_token}`;
    const avmeldLenke = `${base}/liste/avmeld.html?t=${rad.unsub_token}`;
    const s = await sendBekreftelse(epost, navn, lenke, avmeldLenke, nyheter, testpilot);
    if (!s.ok) return svar(200, { ok: false, grunn: "epost_feilet" });
    await db.from("list_signups").update({ confirm_sent_at: naa.toISOString(), confirm_send_count: (rad.confirm_send_count ?? 0) + 1 }).eq("id", rad.id);
    return svar(200, { ok: true });
  }

  if (handling === "bekreft") {
    if (!erUuid(b.t)) return svar(200, { ok: false, grunn: "ukjent" });
    const { data: r } = await db.from("list_signups").select("*").eq("confirm_token", b.t).maybeSingle();
    if (!r) return svar(200, { ok: false, grunn: "ukjent" });
    if (r.confirmed_at && !r.unsubscribed_at) return svar(200, { ok: true, alt: true, nyheter: r.wants_news, testpilot: r.wants_testpilot, navn: r.full_name, avmeld: r.unsub_token });
    if (r.confirm_sent_at && Date.now() - new Date(r.confirm_sent_at).getTime() > 14 * 86400_000) return svar(200, { ok: false, grunn: "utlopt" });
    const naa = new Date().toISOString();
    await db.from("list_signups").update({ confirmed_at: naa, unsubscribed_at: null, updated_at: naa }).eq("id", r.id);
    const t = TEKSTER[r.text_version] ?? TEKSTER[GJELDENDE_TEKST];
    const versjon = r.text_version ?? GJELDENDE_TEKST;
    const rader = [];
    if (r.wants_news) rader.push({ signup_id: r.id, kind: "email", given: true, page: r.page, source: r.source, text_version: `${versjon}: ${t.nyheter}` });
    if (r.wants_testpilot) rader.push({ signup_id: r.id, kind: "testpilot", given: true, page: r.page, source: r.source, text_version: `${versjon}: ${t.testpilot}` });
    if (rader.length) await db.from("consent_events").insert(rader);
    return svar(200, { ok: true, nyheter: r.wants_news, testpilot: r.wants_testpilot, navn: r.full_name, avmeld: r.unsub_token });
  }

  if (handling === "avmeld") {
    if (!erUuid(b.t)) return svar(200, { ok: false, grunn: "ukjent" });
    return svar(200, await avmeld(String(b.t)));
  }

  return svar(400, { ok: false });
});
