// Scale.gg (ScalePay) webhook for me.voteapp.
// Scale.gg sends a POST to this address when someone buys. The address carries a secret key (?key=...),
// whose sha256 is stored in public.app_secrets. Every message is saved untouched in public.payment_events,
// so we can see exactly what Scale.gg sends. A purchase marks the member as paying for 31 more days;
// a refund, cancellation or chargeback marks the membership as ended.
import { createClient } from "jsr:@supabase/supabase-js@2";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

async function sha256(s: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Scale.gg's payload format is not published, so look for the buyer's email anywhere in the message.
// Keys that name the buyer win over any other email field (for example the vendor's or an affiliate's).
function findEmail(obj: unknown): string | null {
  const found: { email: string; score: number }[] = [];
  const walk = (v: unknown, path: string, depth: number) => {
    if (depth > 6 || v === null || v === undefined) return;
    if (typeof v === "string") {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) && /mail/i.test(path)) {
        let score = 1;
        if (/(buyer|customer|purchaser|client|billing|member|user)/i.test(path)) score = 3;
        if (/(vendor|seller|affiliate|jv|partner|support)/i.test(path)) score = 0;
        found.push({ email: v.trim().toLowerCase(), score });
      }
      return;
    }
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${path}[${i}]`, depth + 1)); return; }
    if (typeof v === "object") {
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) walk(x, path ? `${path}.${k}` : k, depth + 1);
    }
  };
  walk(obj, "", 0);
  found.sort((a, b) => b.score - a.score);
  return found.length && found[0].score > 0 ? found[0].email : null;
}

function pick(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v) return v;
    if (typeof v === "number") return String(v);
  }
  return null;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { ok: false, error: "POST only" });

  const key = new URL(req.url).searchParams.get("key") ?? "";
  const { data: secret } = await db.from("app_secrets").select("sha256").eq("name", "scale_webhook_key").maybeSingle();
  if (!secret || !key || !timingSafeEqual(await sha256(key), secret.sha256)) {
    return json(401, { ok: false, error: "unauthorized" });
  }

  const raw = await req.text();
  if (raw.length > 200_000) return json(413, { ok: false, error: "too large" });
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    // Some services post form data instead of JSON.
    payload = Object.fromEntries(new URLSearchParams(raw));
  }

  const eventType = pick(payload, ["event", "event_type", "eventType", "type", "action", "status", "topic"]);
  const ref = pick(payload, ["subscription_id", "subscriptionId", "order_id", "orderId", "transaction_id", "transactionId", "id"]);
  const email = findEmail(payload);
  const isTest = /test|ping/i.test(eventType ?? "");
  const isEnd = /refund|cancel|chargeback|dispute|expire|fail|ended/i.test(`${eventType ?? ""} ${pick(payload, ["status"]) ?? ""}`);

  let handled = "logged";
  let memberId: string | null = null;
  if (isTest) {
    handled = "test";
  } else if (!email) {
    handled = "no_email";
  } else {
    const fn = isEnd ? "mark_member_ended" : "mark_member_paid";
    const args = isEnd ? { p_email: email } : { p_email: email, p_ref: ref };
    const { data, error } = await db.rpc(fn, args);
    if (error) handled = `error:${error.message.slice(0, 200)}`;
    else if (!data) handled = "no_member";
    else { memberId = data as string; handled = isEnd ? "ended" : "paid"; }
  }

  await db.from("payment_events").insert({
    event_type: eventType, buyer_email: email, member_id: memberId, handled, payload,
  });

  // Always 200 after a valid key, so Scale.gg does not retry forever; problems are in payment_events.
  return json(200, { ok: true, handled });
});
