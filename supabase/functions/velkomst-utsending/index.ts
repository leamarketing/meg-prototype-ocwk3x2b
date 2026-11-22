// Velkomstserien for Min dag (me.voteapp): fem e-poster i prøveuka, sendt via Resend fra me.voteapp.eu.
// Kalles av timeren hver time med en hemmelig nøkkel (?key=..., sha256 i public.app_secrets).
// Moduser (POST-body {"mode": ...}):
//   "dry"  : viser hva som ville blitt sendt nå, sender ingenting.
//   "test" : sender alle fem til mail_settings.test_email (Geir), med eksempelnavn.
//   "run"  : sender det som står for tur, men bare når mail_settings.enabled er true.
// Dag 0, 1 og 3 krever e-postsamtykke (email_opt_in_at). Dag 5 og 7 er beskjeder om prøvetiden (status trial).
// Bare medlemmer med prøvetid som startet etter mail_settings.start_after får serien.
import { createClient } from "jsr:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const resendApiToken = Deno.env.get("RESEND_API_KEY") || "";
const FROM = "Geir i Min dag <geir@me.voteapp.eu>";
const REPLY_TO = "bizplanpilot@gmail.com";
const SITE = "https://test.voteapp.eu";
const DAY = 86400000;

type Mail = { key: string; from: number; to: number; marketing: boolean; subject: (n: string) => string; pre: string; body: string[]; button: [string, string]; after?: string[] };

const P = (s: string) => `<p style="margin:0 0 14px">${s}</p>`;
const MAILS: Mail[] = [
  { key: "dag0", from: 0, to: 1, marketing: true,
    subject: (n) => n ? `Velkommen til Min dag, ${n}` : "Velkommen til Min dag",
    pre: "Slik finner du dagen din igjen i morgen",
    body: [
      "Takk for at du ble med. Det setter jeg pris på.",
      "Min dag er i grunnen en liten side som samler det du trenger om dagen din på ett sted: været der du bor, hva navnet ditt kommer av, og hva tradisjonene sier om dagen.",
      "Det enkleste er å lagre navnet og fødselsdataene dine på kontoen. Da kommer dagsguiden din rett opp hver gang du logger inn, og du slipper å skrive alt på nytt.",
    ],
    button: ["Åpne Min dag", "/portal/"],
    after: ["Du har sju dager gratis. Du trenger ikke kort, og du forplikter deg ikke til noe."] },
  { key: "dag1", from: 1, to: 3, marketing: true,
    subject: () => "Været ditt, rett fra Meteorologisk institutt",
    pre: "Velg stedet ditt én gang, så husker siden det",
    body: [
      "Her oppe i Nordreisa ser vi på været før vi gjør nesten noe som helst. Derfor var det det første jeg ville ha med i Min dag.",
      "Under «Været» kan du søke opp hvilket sted som helst i Norge, også små bygder. Stedsnavnene kommer fra Kartverket. Du får varselet for de neste sju dagene fra Meteorologisk institutt, og et kart du kan klikke i.",
      "Når du har valgt et sted, åpner siden der neste gang du kommer innom.",
    ],
    button: ["Se været ditt", "/portal/#vaer"] },
  { key: "dag3", from: 3, to: 5, marketing: true,
    subject: (n) => n ? `Hva sier navnet ditt, ${n}?` : "Hva sier navnet ditt?",
    pre: "Gamle tradisjoner, lagt fram åpent",
    body: [
      "Folk har lagt mening i navn og datoer i tusenvis av år. Det synes jeg er interessant å kjenne til, så lenge vi er åpne om hva det er.",
      "I Min dag kan du se hva navnet ditt kommer av, når vi har en kilde for det. Du kan også se navnetallet og livstallet ditt i den pytagoreiske tradisjonen, stjernetegnet ditt og hva tradisjonen sier om dagen i dag. Under «Norges dag i tradisjonen» finner du det samme for landet vårt, regnet ut fra 17. mai 1814.",
      "Alt dette er merket som tradisjon og inspirasjon. Det er ment som noe å tenke over, og du bestemmer selv hva du tar med deg.",
    ],
    button: ["Se navnet og dagen din", "/portal/"] },
  { key: "dag5", from: 5, to: 7, marketing: false,
    subject: () => "To dager igjen av prøvetiden din",
    pre: "Hva som skjer etterpå, i klartekst",
    body: [
      "Prøvetiden din i Min dag varer i to dager til. Jeg vil gjerne at du vet hva som skjer etterpå, så du ikke får noen overraskelser.",
      "<ul style=\"margin:0 0 14px;padding-left:20px\"><li>Om to dager spør vi deg om du vil fortsette.</li><li>Svarer du ja, koster det 9 dollar i måneden. Du kan slutte når du vil.</li><li>Svarer du nei, trekker vi ingenting. Du har aldri lagt inn kort hos oss.</li><li>Saker og stemmer på voteapp.eu er gratis, og det skal de alltid være. Det du betaler for her, er bare Min dag.</li></ul>",
      "Vil du at vi sletter alt vi har lagret om deg, kan du gjøre det selv under «Min konto».",
    ],
    button: ["Gå til kontoen din", "/portal/#konto"] },
  { key: "dag7", from: 7, to: 10, marketing: false,
    subject: () => "Vil du fortsette med Min dag?",
    pre: "Ett svar, og du velger helt selv",
    body: [
      "Nå har du hatt Min dag i en uke. Takk for at du prøvde.",
      "Vil du fortsette, er prisen 9 dollar i måneden, og du kan slutte når du vil. Vil du ikke, er det helt i orden. Da skjer det ingenting mer.",
      "Du svarer inne på kontoen din:",
    ],
    button: ["Svar på kontoen min", "/portal/#konto"],
    after: [
      "Svarer du ja, kommer du til betalingen. Bruk samme e-postadresse som denne, så kjenner vi deg igjen.",
      "Har du tanker om hva som burde vært annerledes, kan du bare svare på denne e-posten. Jeg leser alt selv.",
    ] },
];

function esc(s: string) { return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]!)); }

function render(m: Mail, name: string, unsubUrl: string) {
  const hi = name ? `Hei ${esc(name)},` : "Hei,";
  const para = (s: string) => s.startsWith("<ul") ? s : P(s);
  const foot = m.marketing
    ? `Du får denne e-posten fordi du krysset av for e-post fra Min dag. <a href="${unsubUrl}" style="color:#56666d">Meld deg av</a>.`
    : "Dette er en beskjed om prøvetiden din i Min dag.";
  const sign = m.key === "dag0" || m.key === "dag7" ? "Varm hilsen" : "Hilsen";
  const html = `<!doctype html><html lang="no"><body style="margin:0;background:#f3f6f6;font-family:'Segoe UI',Arial,sans-serif;color:#14232b">
<span style="display:none;max-height:0;overflow:hidden">${esc(m.pre)}</span>
<div style="max-width:560px;margin:0 auto;padding:24px 16px"><div style="background:#ffffff;border-radius:12px;padding:22px;font-size:16px;line-height:1.6">
${P(hi)}${m.body.map(para).join("")}
<p style="margin:6px 0 18px"><a href="${SITE}${m.button[1]}" style="display:inline-block;background:#1f8a6d;color:#ffffff;text-decoration:none;font-weight:700;border-radius:10px;padding:10px 16px">${esc(m.button[0])}</a></p>
${(m.after ?? []).map(P).join("")}${P(`${sign}<br>Geir`)}
</div><p style="font-size:13px;color:#56666d;margin:12px 4px">${foot}</p></div></body></html>`;
  const strip = (s: string) => s.replace(/<li>/g, "- ").replace(/<\/li>/g, "\n").replace(/<[^>]+>/g, "");
  const text = [hi, ...m.body.map(strip), `${m.button[0]}: ${SITE}${m.button[1]}`, ...(m.after ?? []), `${sign}\nGeir`, "",
    m.marketing ? `Meld deg av: ${unsubUrl}` : "Dette er en beskjed om prøvetiden din i Min dag."].join("\n\n");
  return { html, text };
}

async function send(to: string, m: Mail, name: string, unsubUrl: string) {
  const { html, text } = render(m, name, unsubUrl);
  const headers: Record<string, string> = {};
  if (m.marketing) { headers["List-Unsubscribe"] = `<${unsubUrl}>`; }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject: m.subject(name), html, text, headers }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Resend ${r.status}: ${JSON.stringify(j).slice(0, 300)}`);
  return (j as { id?: string }).id ?? null;
}

async function sha256(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

function osloHour(d: Date) { return Number(new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", hour: "2-digit", hour12: false }).format(d)); }

function firstName(full: string | null) {
  if (!full) return "";
  const f = full.split(" | ")[0].trim().split(/\s+/)[0] ?? "";
  return f ? f.charAt(0).toUpperCase() + f.slice(1).toLowerCase() : "";
}

const json = (o: unknown, s = 200) => new Response(JSON.stringify(o, null, 2), { status: s, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  const key = new URL(req.url).searchParams.get("key") ?? "";
  const { data: sec } = await db.from("app_secrets").select("sha256").eq("name", "velkomst_cron_key").maybeSingle();
  if (!key || !sec || (await sha256(key)) !== sec.sha256) return json({ ok: false, error: "nøkkel" }, 401);
  if (!resendApiToken) return json({ ok: false, error: "RESEND_API_KEY mangler" }, 500);

  let mode = "run";
  try { const b = await req.json(); if (b && typeof b.mode === "string") mode = b.mode; } catch { /* tom body = run */ }
  const { data: cfg } = await db.from("mail_settings").select("*").eq("id", 1).single();

  if (mode === "test") {
    if (!cfg?.test_email) return json({ ok: false, error: "test_email mangler" }, 400);
    const sent = [];
    for (const m of MAILS) sent.push({ mail: m.key, id: await send(cfg.test_email, m, "Geir", `${SITE}/avmelding/?t=00000000-0000-4000-8000-000000000000`) });
    return json({ ok: true, mode, to: cfg.test_email, sent });
  }

  const now = new Date();
  const hour = osloHour(now);
  if (mode === "run" && !cfg?.enabled) return json({ ok: true, mode, skipped: "utsending er av" });
  // Sikring: uten startdato ville gamle testmedlemmer fått serien. Utsendingen krever derfor start_after.
  if (mode === "run" && !cfg?.start_after) return json({ ok: true, mode, skipped: "start_after mangler" });
  if (mode === "run" && (hour < 8 || hour >= 21)) return json({ ok: true, mode, skipped: `utenfor 08-21 (kl. ${hour})` });

  let q = db.from("members").select("id, full_name, consent_at, status, trial_started_at, email_opt_in_at, unsub_token");
  if (cfg?.start_after) q = q.gte("trial_started_at", cfg.start_after);
  const { data: members, error } = await q;
  if (error) return json({ ok: false, error: error.message }, 500);
  const { data: done } = await db.from("email_sends").select("member_id, mail_key");
  const already = new Set((done ?? []).map((d) => `${d.member_id}:${d.mail_key}`));

  const plan: { member: string; mail: string }[] = [];
  const results: { member: string; mail: string; status: string; error?: string }[] = [];
  for (const mem of members ?? []) {
    const days = (now.getTime() - new Date(mem.trial_started_at).getTime()) / DAY;
    const m = MAILS.find((x) => days >= x.from && days < x.to);
    if (!m || already.has(`${mem.id}:${m.key}`)) continue;
    if (m.marketing && !mem.email_opt_in_at) continue;
    if (!m.marketing && mem.status !== "trial") continue;
    const short = String(mem.id).slice(0, 8);
    if (mode === "dry") { plan.push({ member: short, mail: m.key }); continue; }

    const claim = await db.from("email_sends").insert({ member_id: mem.id, mail_key: m.key }).select("id").single();
    if (claim.error) continue; // en annen kjøring tok den
    try {
      const { data: u } = await db.auth.admin.getUserById(mem.id);
      const to = u?.user?.email;
      if (!to) throw new Error("ingen e-post");
      const name = mem.consent_at ? firstName(mem.full_name) : "";
      const id = await send(to, m, name, `${SITE}/avmelding/?t=${mem.unsub_token}`);
      await db.from("email_sends").update({ status: "sent", resend_id: id }).eq("id", claim.data.id);
      results.push({ member: short, mail: m.key, status: "sent" });
    } catch (e) {
      const msg = String((e as Error).message ?? e).slice(0, 300);
      await db.from("email_sends").update({ status: "failed", error: msg }).eq("id", claim.data.id);
      results.push({ member: short, mail: m.key, status: "failed", error: msg });
    }
  }
  return json(mode === "dry" ? { ok: true, mode, oslo_hour: hour, enabled: !!cfg?.enabled, start_after: cfg?.start_after ?? null, would_send: plan } : { ok: true, mode, results });
});
