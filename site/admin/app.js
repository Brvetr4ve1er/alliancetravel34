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

// The admin lives at a fixed path, so build the redirect from the origin rather
// than from location.href — a stray query string would not match Supabase's
// Redirect URLs allowlist, and a non-matching redirect is silently replaced with
// the project's Site URL (which defaults to http://localhost:3000, i.e. nowhere).
const adminUrl = () => new URL("/admin/", location.origin).href;

const LAST_EMAIL = "at_admin_email";

function showView(name) {
  show($("boot-msg"), false);
  show($("view-login"), name === "login");
  show($("view-app"), name === "app");
  show($("view-setpw"), name === "setpw");
}

function showTab(name) {
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === name));
  show($("tab-pages"), name === "pages");
  show($("tab-leads"), name === "leads");
  document.dispatchEvent(new CustomEvent("admin:tab", { detail: name }));
}

let entered = false;    // guards against getSession() and onAuthStateChange racing
let recovering = false; // holding a recovery-link session: set a password, don't enter

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
    showView("login");
    $("login-msg").textContent = "Ce compte n'est pas autorisé.";
    $("login-msg").className = "msg err";
    await supabase.auth.signOut();
    return;
  }
  $("who").textContent = me.data.email;
  try { localStorage.setItem(LAST_EMAIL, me.data.email); } catch { /* private mode */ }
  showView("app");
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
    if (event === "PASSWORD_RECOVERY") {
      // The session from a recovery link is only meant for setting a password —
      // do not fall through into the app with it.
      recovering = true;
      showView("setpw");
      return;
    }
    if (!session) {
      if (event === "SIGNED_OUT") { AT_ADMIN.session = null; AT_ADMIN.token = null; entered = false; }
      return;
    }
    // TOKEN_REFRESHED arrives here roughly hourly; keep the bearer current.
    AT_ADMIN.session = session;
    AT_ADMIN.token = session.access_token;
    if (!recovering) enterApp(session); // no-ops once entered
  });

  document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
  $("logout").addEventListener("click", async () => { await supabase.auth.signOut(); location.reload(); });
  $("change-pw").addEventListener("click", () => { $("setpw-msg").textContent = ""; showView("setpw"); });
  $("setpw-cancel").addEventListener("click", () => showView(entered ? "app" : "login"));

  // Primary path: no email round-trip, and — unlike every link-based flow — no
  // dependency on Supabase's Redirect URLs allowlist.
  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("login-msg");
    const btn = e.target.querySelector("button[type=submit]");
    msg.className = "msg"; msg.textContent = "Connexion…";
    btn.disabled = true;
    const { error } = await supabase.auth.signInWithPassword({
      email: $("login-email").value.trim(),
      password: $("login-password").value,
    });
    btn.disabled = false;
    if (!error) { $("login-password").value = ""; return; } // onAuthStateChange takes over
    msg.className = "msg err";
    msg.textContent = /invalid login credentials/i.test(error.message)
      ? "Email ou mot de passe incorrect."
      : error.message;
  });

  // Fallback for an owner who has not set a password yet.
  $("login-magic").addEventListener("click", async () => {
    const email = $("login-email").value.trim();
    const msg = $("login-msg");
    if (!email) { msg.className = "msg err"; msg.textContent = "Entrez d'abord votre email."; return; }
    msg.className = "msg"; msg.textContent = "Envoi…";
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: adminUrl() } });
    msg.className = error ? "msg err" : "msg ok";
    msg.textContent = error ? error.message : "Lien envoyé — vérifiez votre boîte mail.";
  });

  $("setpw-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("setpw-msg");
    const pw = $("setpw-new").value;
    if (pw !== $("setpw-confirm").value) {
      msg.className = "msg err"; msg.textContent = "Les deux mots de passe ne correspondent pas.";
      return;
    }
    msg.className = "msg"; msg.textContent = "Enregistrement…";
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) { msg.className = "msg err"; msg.textContent = error.message; return; }
    $("setpw-new").value = $("setpw-confirm").value = "";
    msg.className = "msg ok";
    msg.textContent = "Mot de passe enregistré. Vous pouvez maintenant vous connecter directement.";
    if (recovering) { recovering = false; await supabase.auth.signOut(); showView("login"); }
  });

  // Pre-fill the email so a returning owner only types a password.
  try { $("login-email").value = localStorage.getItem(LAST_EMAIL) || ""; } catch { /* private mode */ }

  // Handle the magic-link redirect (token in the URL hash) + existing sessions.
  const { data } = await supabase.auth.getSession();
  if (data.session && !recovering) { await enterApp(data.session); return; }
  if (!recovering) showView("login");
}
boot();
