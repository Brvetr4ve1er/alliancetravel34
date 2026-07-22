// site/assets/js/beacon.js — cookieless funnel counter (view / wa_click).
// No PII, no cookies, no fingerprinting, no IP handling: one row per event
// with page id + optional data-track-event name. Fire-and-forget like
// lead-capture.js; a failed send is swallowed and never blocks the page.
// Config duplicated from lead-config.js so this file loads standalone on
// pages that don't carry the booking form.
const CFG = {
  url: "https://vxblgxiamtphabfswnxb.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4YmxneGlhbXRwaGFiZnN3bnhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMDkyODMsImV4cCI6MjA5ODY4NTI4M30.76mBGuCTKGoaVCexkpzsc8pMBRyAfRMNDRPuX2nrVks",
};

export function buildEvent(kind, page, eventName) {
  if (kind !== "view" && kind !== "wa_click") return null;
  if (!page || typeof page !== "string") return null;
  return {
    kind,
    page: page.slice(0, 64),
    event: eventName == null ? null : String(eventName).slice(0, 64),
  };
}

function send(payload) {
  if (!payload) return;
  try {
    fetch(CFG.url + "/rest/v1/events", {
      method: "POST",
      headers: {
        apikey: CFG.anonKey,
        Authorization: "Bearer " + CFG.anonKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
      keepalive: true, // survives the navigation a WhatsApp click triggers
    }).catch(() => {});
  } catch { /* never surface */ }
}

if (typeof document !== "undefined") {
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    && !location.search.includes("beacon=force");
  const dnt = typeof navigator !== "undefined" && navigator.doNotTrack === "1";
  if (!local && !dnt) {
    const page = (document.body && document.body.dataset.page) || location.pathname;
    send(buildEvent("view", page, null));
    let lastClick = "";
    let lastAt = 0;
    document.addEventListener("click", (e) => {
      const el = e.target.closest && e.target.closest("[data-track-event]");
      if (!el) return;
      const name = el.getAttribute("data-track-event");
      const now = Date.now();
      if (name === lastClick && now - lastAt < 2000) return; // double-tap noise
      lastClick = name; lastAt = now;
      send(buildEvent("wa_click", page, name));
    }, { capture: true, passive: true });
  }
}
