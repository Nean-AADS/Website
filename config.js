// Public browser settings. Never put passwords, private API keys or mail credentials here.
// Leave disabled until a receiving service has been configured and tested.
// mode: "disabled" | "netlify" | "endpoint"
// netlify: enable Netlify Forms detection, configure notifications, redeploy, then test.
// endpoint: use an HTTPS endpoint that accepts multipart/form-data and returns
// JSON { "success": true, "reference": "SERVER-GENERATED-REFERENCE" } after durable acceptance.
window.AADS_CONFIG = {
  contact: {
    mode: "disabled",
    endpoint: ""
  },
  order: {
    mode: "disabled",
    endpoint: ""
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
