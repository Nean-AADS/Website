// AADS website intake: receives the Contact form and the Place an Order form.
//
// Every secret lives in Supabase Edge Function secrets, never in the website:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (provided automatically by Supabase)
//   ALLOWED_ORIGINS        optional, comma-separated; defaults to "https://aads.com,https://www.aads.com"
//   IP_HASH_SALT           any long random string (used to hash IPs; raw IPs are never stored)
//   TURNSTILE_SECRET_KEY   Cloudflare Turnstile secret (optional until Turnstile is set up;
//                          once set, a valid Turnstile token is REQUIRED)
//   RESEND_API_KEY, NOTIFY_EMAIL_TO, NOTIFY_EMAIL_FROM   (optional staff alert email;
//                          the alert contains only the reference, form type and service)
//
// Deploy with JWT verification OFF (public form); this function does its own checks.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CONSENT_VERSION = "2026-11-draft-1";
const MAX_BODY = 27 * 1024 * 1024;
const MAX_FILES = 5;
const MAX_FILE = 10 * 1024 * 1024;
const MAX_TOTAL_FILES = 25 * 1024 * 1024;
const MAX_FIELD = 5000;
const MAX_TEXT_TOTAL = 100_000;
const MIN_FILL_MS = 3000;
const RATE_WINDOW_MIN = 10;
const RATE_MAX = 5;

const SERVICES = new Set([
  "ucc-lien-research", "ucc-filing-continuations", "ucc-lien-monitoring", "due-diligence-package",
  "real-estate-package", "title-municipal-research", "corporate-documents-filings",
  "registered-agent-services", "court-litigation-bankruptcy", "ofac-sanctions-searches",
  "apostille-legalization", "other",
]);
const SOURCES = new Set(["", "Search engine", "Referral", "LinkedIn", "Email", "Other"]);

// Order form fields accepted by the server. Anything else is dropped.
const ORDER_FIELDS = new Set(`account additional-lien-details additional-names address billing-contact
billing-email borrower certificate-form city company copy-limit corporate-components corporate-copies country
courier-account court-case-numbers court-criminal-individuals court-names court-period court-records
court-sources courts date-needed delivery delivery-instructions destination-country document-type email
entity-number filing-action filing-follow-up filing-instructions filing-office filing-original-date
filing-original-number first-name formation-state instructions international-instructions issuing-authority
jurisdictions last-name legal-description local-components matter-reference ofac-identifiers ofac-names
ofac-scope other-request owner parcel phone postal-code property-address property-city property-components
property-county property-state property-type publication-details recipient-requirements recording-instructions
request-type research-components research-copies rush search-period service state target-name
source_page source_content_id`.split(/\s+/));
const CRIMINAL_FIELD = /^criminal-subject-([1-9]|1[0-9]|20)-(name|dob|aliases)$/;
const INQUIRY_FIELDS = new Set(["name", "company", "email", "phone", "service", "message", "source",
  "source_page", "source_content_id"]);

// File type allowlist: extension -> [mime, magic-byte check]
const startsWith = (b: Uint8Array, sig: number[]) => sig.every((v, i) => b[i] === v);
const ZIP = [0x50, 0x4b, 0x03, 0x04], OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const FILE_TYPES: Record<string, [string, (b: Uint8Array) => boolean]> = {
  pdf: ["application/pdf", (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46])],
  doc: ["application/msword", (b) => startsWith(b, OLE)],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", (b) => startsWith(b, ZIP)],
  xls: ["application/vnd.ms-excel", (b) => startsWith(b, OLE)],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", (b) => startsWith(b, ZIP)],
  csv: ["text/csv", (b) => !b.slice(0, 1024).includes(0)],
  jpg: ["image/jpeg", (b) => startsWith(b, [0xff, 0xd8, 0xff])],
  jpeg: ["image/jpeg", (b) => startsWith(b, [0xff, 0xd8, 0xff])],
  png: ["image/png", (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47])],
  tif: ["image/tiff", (b) => startsWith(b, [0x49, 0x49, 0x2a, 0]) || startsWith(b, [0x4d, 0x4d, 0, 0x2a])],
  tiff: ["image/tiff", (b) => startsWith(b, [0x49, 0x49, 0x2a, 0]) || startsWith(b, [0x4d, 0x4d, 0, 0x2a])],
};

const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const PHONE = /^[0-9+()\-.\s xext]{0,40}$/i;
const PAGE = /^\/[a-z0-9-]*(\.html)?$/;

const env = (k: string) => Deno.env.get(k) ?? "";
// Websites allowed to post here. Override with the ALLOWED_ORIGINS secret (e.g. to add a preview domain).
const allowedOrigins = (env("ALLOWED_ORIGINS") || "https://aads.com,https://www.aads.com")
  .split(",").map((s) => s.trim()).filter(Boolean);

function cors(origin: string | null): Record<string, string> {
  const ok = origin && allowedOrigins.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin! : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}
function json(status: number, body: unknown, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json", "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff" },
  });
}
class Invalid extends Error { constructor(public field: string, msg: string) { super(msg); } }

// Strip control characters (keep newlines/tabs) and trim.
const clean = (v: string) => v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();

async function sha256(text: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function makeReference(kind: string) {
  const d = new Date();
  const ymd = `${d.getUTCFullYear() % 100}`.padStart(2, "0") + `${d.getUTCMonth() + 1}`.padStart(2, "0") +
    `${d.getUTCDate()}`.padStart(2, "0");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rnd = crypto.getRandomValues(new Uint8Array(6));
  return `AADS-${kind === "order" ? "O" : "C"}${ymd}-${[...rnd].map((b) => alphabet[b % 32]).join("")}`;
}
async function verifyTurnstile(token: string, ip: string) {
  const secret = env("TURNSTILE_SECRET_KEY");
  if (!secret) return null; // not configured yet
  if (!token || token.length > 2048) return false;
  const body = new FormData();
  body.set("secret", secret); body.set("response", token); if (ip) body.set("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const j = await r.json();
    return j.success === true;
  } catch { return false; }
}

function validate(kind: string, form: FormData) {
  const data: Record<string, string | string[]> = {};
  let total = 0;
  const allowed = (k: string) => kind === "inquiry" ? INQUIRY_FIELDS.has(k) : ORDER_FIELDS.has(k) || CRIMINAL_FIELD.test(k);
  for (const [k, v] of form.entries()) {
    if (typeof v !== "string" || !allowed(k)) continue;
    const s = clean(v);
    if (s.length > MAX_FIELD) throw new Invalid(k, "This field is too long.");
    total += s.length;
    if (total > MAX_TEXT_TOTAL) throw new Invalid("form", "The request is too long.");
    if (!s) continue;
    const prev = data[k];
    data[k] = prev === undefined ? s : Array.isArray(prev) ? [...prev, s] : [prev, s];
  }
  const one = (k: string) => { const v = data[k]; return Array.isArray(v) ? v[0] : (v ?? ""); };
  const need = (k: string, label: string, max = 200) => {
    const v = one(k);
    if (!v) throw new Invalid(k, `${label} is required.`);
    if (v.length > max) throw new Invalid(k, `${label} is too long.`);
    return v;
  };
  const email = need("email", "Email", 254);
  if (!EMAIL.test(email)) throw new Invalid("email", "Enter a valid email address.");
  const phone = one("phone");
  if (phone && !PHONE.test(phone)) throw new Invalid("phone", "Enter a valid phone number.");
  const service = one("service");
  if (service && !SERVICES.has(service)) throw new Invalid("service", "Choose a service from the list.");
  if (data.source_page && !PAGE.test(one("source_page"))) delete data.source_page;
  if (data["billing-email"] && !EMAIL.test(one("billing-email"))) throw new Invalid("billing-email", "Enter a valid billing email address.");

  let name: string;
  if (kind === "inquiry") {
    name = need("name", "Full name", 120);
    need("message", "Message", MAX_FIELD);
    if (!SOURCES.has(one("source"))) throw new Invalid("source", "Choose an option from the list.");
  } else {
    if (!service) throw new Invalid("service", "Choose a service or package.");
    name = `${need("first-name", "First name", 80)} ${need("last-name", "Last name", 80)}`;
    for (const [k, v] of Object.entries(data)) {
      if (/-dob$/.test(k)) {
        const s = Array.isArray(v) ? v[0] : v;
        const t = Date.parse(s);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || isNaN(t) || t > Date.now() || t < Date.parse("1900-01-01"))
          throw new Invalid(k, "Enter a valid date of birth.");
      }
    }
  }
  return { data, name, email, phone, service, company: one("company").slice(0, 200) };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed." }, origin);
  if (!origin || !allowedOrigins.includes(origin)) return json(403, { success: false, error: "Origin not allowed." }, origin);
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > MAX_BODY) return json(413, { success: false, error: "The request is too large." }, origin);
  if (!(req.headers.get("content-type") ?? "").startsWith("multipart/form-data"))
    return json(415, { success: false, error: "Unsupported request." }, origin);

  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const ip = (req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const ipHash = ip ? await sha256(env("IP_HASH_SALT") + ip) : null;
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 300);

  let form: FormData;
  try { form = await req.formData(); } catch { return json(400, { success: false, error: "Unreadable request." }, origin); }
  const str = (k: string) => { const v = form.get(k); return typeof v === "string" ? v : ""; };

  const kind = str("request_kind");
  if (kind !== "inquiry" && kind !== "order") return json(400, { success: false, error: "Unknown form." }, origin);
  const clientId = str("client_request_id").trim();
  if (!/^[A-Za-z0-9-]{8,64}$/.test(clientId)) return json(400, { success: false, error: "Missing request id." }, origin);

  // Duplicate submit (double click / retry): return the original reference.
  const { data: existing } = await db.from("form_submissions").select("reference").eq("client_request_id", clientId).maybeSingle();
  if (existing) return json(200, { success: true, reference: existing.reference }, origin);

  // --- Spam checks -------------------------------------------------------
  const startedAt = Number(str("form_started_at"));
  const elapsed = Date.now() - startedAt;
  let spamReason: string | null = null;
  if (str("bot-field")) spamReason = "honeypot";
  else if (!startedAt || elapsed < MIN_FILL_MS) spamReason = "too_fast";
  else if (elapsed > 1000 * 60 * 60 * 24) spamReason = "stale_form";

  if (ipHash) {
    const since = new Date(Date.now() - RATE_WINDOW_MIN * 60_000).toISOString();
    const { count } = await db.from("form_submissions").select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash).gte("created_at", since);
    if ((count ?? 0) >= RATE_MAX)
      return json(429, { success: false, error: "Too many requests. Please wait a few minutes and try again." }, origin);
  }

  const turnstile = await verifyTurnstile(str("cf-turnstile-response"), ip);
  if (turnstile === false && !spamReason)
    return json(400, { success: false, field: "turnstile", error: "Please complete the verification check and try again." }, origin);

  const reference = makeReference(kind);

  if (spamReason) {
    // Log the attempt without its contents, and answer like a success so bots learn nothing.
    await db.from("form_submissions").insert({ reference, client_request_id: clientId, kind, status: "spam",
      spam_reason: spamReason, ip_hash: ipHash, user_agent: ua, turnstile_passed: turnstile });
    return json(200, { success: true, reference }, origin);
  }

  if (str("privacy-consent") !== "yes")
    return json(400, { success: false, field: "privacy-consent", error: "Please confirm you have read the Privacy Notice." }, origin);

  let v: ReturnType<typeof validate>;
  try { v = validate(kind, form); } catch (e) {
    if (e instanceof Invalid) return json(400, { success: false, field: e.field, error: e.message }, origin);
    throw e;
  }

  // --- Attachments (order form only) ------------------------------------
  const files = kind === "order" ? form.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0) : [];
  if (files.length > MAX_FILES) return json(400, { success: false, field: "attachments", error: "Attach up to 5 files." }, origin);
  if (files.reduce((s, f) => s + f.size, 0) > MAX_TOTAL_FILES)
    return json(400, { success: false, field: "attachments", error: "Attachments may total 25 MB at most." }, origin);
  const stored: { path: string; name: string; size: number; type: string }[] = [];
  for (const f of files) {
    const ext = (f.name.split(".").pop() ?? "").toLowerCase();
    const rule = FILE_TYPES[ext];
    if (!rule || f.size > MAX_FILE)
      return json(400, { success: false, field: "attachments", error: `${f.name.slice(0, 80)} is not a supported file or is over 10 MB.` }, origin);
    const bytes = new Uint8Array(await f.arrayBuffer());
    if (!rule[1](bytes))
      return json(400, { success: false, field: "attachments", error: `${f.name.slice(0, 80)} does not look like a valid .${ext} file.` }, origin);
    const safe = f.name.normalize("NFKD").replace(/[^A-Za-z0-9._-]+/g, "_").slice(-100);
    const path = `${reference}/${crypto.randomUUID()}-${safe}`;
    const up = await db.storage.from("intake-attachments").upload(path, bytes, { contentType: rule[0], upsert: false });
    if (up.error) {
      if (stored.length) await db.storage.from("intake-attachments").remove(stored.map((s) => s.path));
      return json(500, { success: false, error: "Attachments could not be stored. Please try again." }, origin);
    }
    stored.push({ path, name: f.name.slice(0, 200), size: f.size, type: rule[0] });
  }

  const { error } = await db.from("form_submissions").insert({
    reference, client_request_id: clientId, kind, status: "new",
    name: v.name, email: v.email, company: v.company || null, phone: v.phone || null, service: v.service || null,
    payload: v.data, attachments: stored,
    consent_given: true, consent_version: CONSENT_VERSION, consent_at: new Date().toISOString(),
    source_page: typeof v.data.source_page === "string" ? v.data.source_page : null,
    ip_hash: ipHash, user_agent: ua, turnstile_passed: turnstile,
  });
  if (error) {
    if (stored.length) await db.storage.from("intake-attachments").remove(stored.map((s) => s.path));
    if (error.code === "23505") {
      const { data: again } = await db.from("form_submissions").select("reference").eq("client_request_id", clientId).maybeSingle();
      if (again) return json(200, { success: true, reference: again.reference }, origin);
    }
    console.error("insert failed", error.code);
    return json(500, { success: false, error: "Your request could not be saved. Please try again." }, origin);
  }

  // Optional staff alert. Contains no personal data from the form.
  if (env("RESEND_API_KEY") && env("NOTIFY_EMAIL_TO") && env("NOTIFY_EMAIL_FROM")) {
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env("NOTIFY_EMAIL_FROM"), to: env("NOTIFY_EMAIL_TO").split(","),
        subject: `New website ${kind === "order" ? "order" : "inquiry"}: ${reference}`,
        text: `A new ${kind} was received.\nReference: ${reference}\nService: ${v.service || "not selected"}\nAttachments: ${stored.length}\n\nOpen the form_submissions table in Supabase to review it.`,
      }),
    }).catch(() => {});
  }

  return json(200, { success: true, reference }, origin);
});
