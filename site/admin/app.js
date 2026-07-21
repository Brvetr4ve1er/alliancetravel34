// site/admin/app.js — Supabase magic-link auth, admin gate via /api/me, tab shell.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const CFG = window.AT_LEADS || {};
const supabase = createClient(CFG.url, CFG.anonKey);
const $ = (id) => document.getElementById(id);
const show = (el, on) => { el.hidden = !on; };

const AT_ADMIN = { supabase, session: null, token: null, showTab };
window.AT_ADMIN = AT_ADMIN;

async function callApi(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { ...(opts.headers || {}), Authorization: `Bearer ${AT_ADMIN.token}` },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
AT_ADMIN.callApi = callApi;

function showTab(name) {
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === name));
  show($("tab-pages"), name === "pages");
  show($("tab-leads"), name === "leads");
  document.dispatchEvent(new CustomEvent("admin:tab", { detail: name }));
}

let entered = false; // guards against getSession() and onAuthStateChange racing

async function enterApp(session) {
  if (entered) return;
  entered = true;
  AT_ADMIN.session = session;
  AT_ADMIN.token = session.access_token;
  const me = await callApi("/api/me");
  if (!me.ok) {
    entered = false;
    // Hide the boot spinner here too: on the rejection path neither the success
    // branch nor boot()'s no-session tail runs, so "Chargement…" stayed on
    // screen under the refusal message.
    show($("boot-msg"), false);
    show($("view-login"), true); show($("view-app"), false);
    $("login-msg").textContent = "Ce compte n'est pas autorisé.";
    $("login-msg").className = "msg err";
    await supabase.auth.signOut();
    return;
  }
  $("who").textContent = me.data.email;
  show($("boot-msg"), false); show($("view-login"), false); show($("view-app"), true);
  showTab("pages");
  document.dispatchEvent(new CustomEvent("admin:ready"));
}

async function boot() {
  // Everything below the old `return enterApp(...)` never ran for a visitor who
  // already had a stored session — which is every return visit. That left the
  // auth listener unregistered (so the access token was captured once and went
  // stale after ~1 h: every API call then failed with a bare "Erreur 401" and no
  // prompt to sign in again) and the tab + logout handlers unbound (so those
  // buttons did nothing). Register all of it first, unconditionally.
  supabase.auth.onAuthStateChange((event, session) => {
    if (!session) {
      if (event === "SIGNED_OUT") { AT_ADMIN.session = null; AT_ADMIN.token = null; entered = false; }
      return;
    }
    // TOKEN_REFRESHED arrives here roughly hourly; keep the bearer current.
    AT_ADMIN.session = session;
    AT_ADMIN.token = session.access_token;
    enterApp(session); // no-ops once entered
  });

  document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
  $("logout").addEventListener("click", async () => { await supabase.auth.signOut(); location.reload(); });

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("login-email").value.trim();
    const msg = $("login-msg");
    msg.className = "msg"; msg.textContent = "Envoi…";
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: window.location.href.split("#")[0] },
    });
    msg.textContent = error ? error.message : "Lien envoyé — vérifiez votre boîte mail.";
    msg.className = error ? "msg err" : "msg ok";
  });

  // Handle the magic-link redirect (token in the URL hash) + existing sessions.
  const { data } = await supabase.auth.getSession();
  if (data.session) { await enterApp(data.session); return; }
  show($("boot-msg"), false); show($("view-login"), true);
}
boot();
