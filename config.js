// Public browser settings. Never put passwords, private API keys or mail credentials here.
// Both forms post to the aads-intake Supabase Edge Function (supabase/functions/aads-intake),
// which validates, filters spam and logs each submission in the form_submissions table.
// mode: "disabled" | "netlify" | "endpoint"
// netlify: enable Netlify Forms detection, configure notifications, redeploy, then test.
// endpoint: use an HTTPS endpoint that accepts multipart/form-data and returns
// JSON { "success": true, "reference": "SERVER-GENERATED-REFERENCE" } after durable acceptance.
window.AADS_CONFIG = {
  contact: {
    mode: "endpoint",
    endpoint: "https://jokcunewarkhcianspqk.supabase.co/functions/v1/aads-intake"
  },
  order: {
    mode: "endpoint",
    endpoint: "https://jokcunewarkhcianspqk.supabase.co/functions/v1/aads-intake"
  },
  // Spam protection. The Turnstile SITE key is public by design and belongs here.
  // The matching SECRET key goes only in Supabase (Edge Function secret TURNSTILE_SECRET_KEY).
  // Leave empty to run without Turnstile (honeypot, timing and rate limits still apply).
  turnstile: {
    siteKey: ""
  },
  clientPortal: {
    enabled: false,
    url: "",
    // Enable only features verified in the real portal.
    features: [] // status, documents, history, approvals, invoices
  },
  media: {
    // Enable after the selected measurement/consent setup is verified.
    enabled: false,
    youtubeTrackingEnabled: false
  }
};

// order.mode: disabled | endpoint. The order receiver accepts multipart/form-data
// and must return {success:true,reference:"SERVER-GENERATED-REFERENCE"} after durable acceptance.
// Leave disabled until storage, attachments, acknowledgments and notifications pass tests.
