// site/admin/app.js — Supabase magic-link auth, admin gate via /api/me, tab shell.
import { t, fmt, getLang, setLang, applyI18n } from "./i18n.js";
import { icon } from "./icons.js";
import { areaHead } from "./ui.js";

const CFG = window.AT_LEADS || {};
const $ = (id) => document.getElementById(id);
const show = (el, on) => { el.hidden = !on; };

// ── The Supabase library: pinned AND integrity-verified ───────────────
// This module holds the session that authorises repo writes through
// /api/save-trip, so the library it is built on must be exactly the bytes we
// audited. It used to arrive as
//   import { createClient } from ".../@supabase/supabase-js/+esm";
// which was unpinned *and* unverifiable: a static ESM import carries no
// integrity attribute, so every new jsDelivr release — or any tampering with
// one — became CMS code on the owner's next page load.
//
// So it is loaded the way the other three CDN dependencies in this repo are
// (site/assets/js/anim.js, globe.js, map-base.js): a <script> tag with a real
// SRI hash + crossorigin, which the browser refuses to execute if a single
// byte differs. The UMD build is the vendor's own browser bundle and sets the
// global `window.supabase`.
//
// Hash computed from the byte-identical npm file:
//   @supabase/supabase-js@2.112.2/dist/umd/supabase.js  (211412 bytes)
// Re-verify (substitute the new version after any bump):
//   curl -sL https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.2/dist/umd/supabase.js \
//     | openssl dgst -sha384 -binary | openssl base64 -A
const SB_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.2/dist/umd/supabase.js";
const SB_SRI = "sha384-OUpie84zd1LdwNlK9uJJQRwab0BLqo3eKYKFh7hSVL58FSk7wPp2l0kfUMIIoaQd";

function loadSupabaseLib() {
  if (window.supabase && window.supabase.createClient) return Promise.resolve(window.supabase);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SB_CDN;
    s.integrity = SB_SRI;         // a mismatch fires onerror; nothing executes
    s.crossOrigin = "anonymous";  // required for SRI on a cross-origin script
    s.async = true;
    s.onload = () => (window.supabase && window.supabase.createClient
      ? resolve(window.supabase)
      : reject(new Error("supabase global missing")));
    s.onerror = () => reject(new Error("supabase-js failed to load"));
    document.head.appendChild(s);
  });
}

let supabase = null; // assigned in boot(), once the library has loaded and verified

// AT_ADMIN is published immediately (identity, not value): the other three admin
// modules capture window.AT_ADMIN and read .supabase / .callApi later, from event
// handlers that cannot run before boot() has filled them in.
const AT_ADMIN = { supabase: null, session: null, token: null, showArea, status: null };
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

// Supabase auth errors arrive as raw English strings. Translate the ones the
// owner can actually encounter, with what-to-do-next; pass the rest through.
function frAuthError(message) {
  const m = String(message || "");
  if (/invalid login credentials/i.test(m)) return "Email ou mot de passe incorrect.";
  if (/rate limit/i.test(m))
    return "Limite d'emails atteinte (elle se réinitialise sous ~1 heure). " +
           "La connexion par mot de passe reste disponible — elle n'envoie aucun email.";
  if (/email not confirmed/i.test(m)) return "Email non confirmé — utilisez le lien reçu par email une première fois.";
  if (/password should be at least/i.test(m)) return "Mot de passe trop court.";
  if (/same password/i.test(m)) return "Le nouveau mot de passe doit être différent de l'ancien.";
  return m;
}

function showView(name) {
  show($("boot-msg"), false);
  show($("view-login"), name === "login");
  show($("view-app"), name === "app");
  show($("view-setpw"), name === "setpw");
}

const AREAS = ["accueil", "demandes", "pages", "reglages"];
function showArea(name) {
  document.querySelectorAll(".navbtn").forEach((b) => b.classList.toggle("is-active", b.dataset.area === name));
  for (const a of AREAS) show($("area-" + a), a === name);
  document.dispatchEvent(new CustomEvent("admin:area", { detail: name }));
}

let entered = false;      // the app view is currently shown
let enteredUser = null;   // user id that owns the current app view
let pendingToken = null;  // access_token whose /api/me is still in flight
let recovering = false;   // holding a recovery-link session: set a password, don't enter

async function enterApp(session) {
  const uid = session.user && session.user.id;
  // Already inside for THIS account: an hourly TOKEN_REFRESHED or a repeat
  // SIGNED_IN must not re-enter, or the owner is thrown back to Accueil
  // mid-task.
  if (entered && enteredUser === uid) return;

  const tok = session.access_token;
  // boot() enters from getSession() AND onAuthStateChange fires SIGNED_IN for
  // that same stored session, so every load verified the same token twice. The
  // guard below already stopped the double entry; this stops the second
  // /api/me from being sent at all.
  if (pendingToken === tok) return;
  pendingToken = tok;
  AT_ADMIN.session = session;
  AT_ADMIN.token = tok;
  const me = await callApi("/api/me");

  // A newer sign-in started while this /api/me was in flight, so this verdict
  // is stale: it must not touch the UI and must not sign anyone out.
  //
  // This is the bug that stranded people on "Se connecter". A boolean guard
  // (`if (entered) return`) let an expired session claim entry, drop the fresh
  // login that arrived while it waited, and then — on its own 403 — sign the
  // NEW session out. Changing the owner's email made every browser holding the
  // old session reproduce it on the first try.
  if (pendingToken !== tok) return;
  pendingToken = null;

  if (!me.ok) {
    entered = false; enteredUser = null;
    // Hide the boot spinner here too: on the rejection path neither the success
    // branch nor boot()'s no-session tail runs, so "Chargement…" stayed on
    // screen under the refusal message.
    showView("login");
    const msg = $("login-msg");
    msg.className = "msg err";
    // Only a real verdict from the API is grounds to destroy the session.
    // A missing or broken API is NOT: on the local static preview /api/* is a
    // 404, and this branch used to answer a *successful* login with
    // "Ce compte n'est pas autorisé." + signOut — burning a session the owner
    // had just paid an email for.
    if (me.status === 401 || me.status === 403) {
      msg.textContent = "Ce compte n'est pas autorisé.";
      await supabase.auth.signOut();
    } else if (me.status === 404) {
      msg.textContent = "Connexion réussie, mais l'API admin n'existe pas sur cet hôte " +
        "(aperçu local ?). Ouvrez le site déployé — la session est conservée.";
    } else {
      msg.textContent = `Erreur serveur (${me.status}) — la session est conservée, rechargez pour réessayer.`;
    }
    return;
  }
  entered = true; enteredUser = uid;
  $("who").textContent = me.data.email;
  try { localStorage.setItem(LAST_EMAIL, me.data.email); } catch { /* private mode */ }
  showView("app");
  show($("change-pw"), true); show($("logout"), true);
  showArea("accueil");
  document.dispatchEvent(new CustomEvent("admin:ready"));
  // `admin:status` MUST be dispatched on every outcome. Without the .catch, a
  // network error rejected this promise unhandled and the event never fired —
  // so the no-GitHub banner logic in edit-pages.js and accueil.js's re-render
  // never ran, and the owner could be shown an enabled Publier that cannot
  // publish. Both listeners already treat a null status as "unknown".
  callApi("/api/status")
    .then((r) => { if (r.ok) AT_ADMIN.status = r.data; })
    .catch(() => { /* status stays null — "unknown", not "broken" */ })
    .finally(() => { document.dispatchEvent(new CustomEvent("admin:status")); });
}

// The admin used to have no failure path at all: if the library import failed
// (offline, blocked CDN, SRI mismatch) app.js never evaluated, window.AT_ADMIN
// was never created, and the owner sat on a permanent, untranslated
// "Chargement…" with no error and nothing to click. Now the boot message
// becomes the error, with a retry.
function bootFailed() {
  const box = $("boot-msg");
  if (!box) return;
  // Drop the binding first, or the next setLang()/applyI18n() would quietly
  // restore "Chargement…" over the top of the failure.
  box.removeAttribute("data-i18n");
  box.className = "msg err";
  box.textContent = t("boot.libfail");
  const b = document.createElement("button");
  b.className = "btn btn--ghost btn--sm";
  b.textContent = t("common.retry");
  b.addEventListener("click", () => location.reload());
  box.after(b);
}

async function boot() {
  setLang(getLang()); // stamps lang+dir and fills every [data-i18n]

  try {
    const lib = await loadSupabaseLib();
    supabase = lib.createClient(CFG.url, CFG.anonKey);
    AT_ADMIN.supabase = supabase;
  } catch {
    bootFailed();
    return; // nothing below can work without an auth client
  }

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
      if (event === "SIGNED_OUT") {
        AT_ADMIN.session = null; AT_ADMIN.token = null;
        entered = false; enteredUser = null; pendingToken = null;
      }
      return;
    }
    // TOKEN_REFRESHED arrives here roughly hourly; keep the bearer current.
    AT_ADMIN.session = session;
    AT_ADMIN.token = session.access_token;
    if (!recovering) enterApp(session); // no-ops once entered
  });

  document.querySelectorAll(".navbtn").forEach((b) => b.addEventListener("click", () => showArea(b.dataset.area)));
  $("lang-toggle").addEventListener("click", () => {
    const next = getLang() === "fr" ? "ar" : "fr";
    setLang(next);
    $("lang-toggle").textContent = next === "fr" ? "عربي" : "FR";
  });
  $("lang-toggle").textContent = getLang() === "fr" ? "عربي" : "FR";
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
    msg.textContent = frAuthError(error.message);
  });

  // Fallback for an owner who has not set a password yet.
  $("login-magic").addEventListener("click", async () => {
    const email = $("login-email").value.trim();
    const msg = $("login-msg");
    if (!email) { msg.className = "msg err"; msg.textContent = "Entrez d'abord votre email."; return; }
    msg.className = "msg"; msg.textContent = "Envoi…";
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: adminUrl() } });
    msg.className = error ? "msg err" : "msg ok";
    msg.textContent = error ? frAuthError(error.message) : "Lien envoyé — vérifiez votre boîte mail.";
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
    if (error) { msg.className = "msg err"; msg.textContent = frAuthError(error.message); return; }
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

let reglagesInit = false;
document.addEventListener("admin:area", async (e) => {
  if (e.detail !== "reglages" || reglagesInit) return;
  reglagesInit = true;
  const c = $("area-reglages");
  c.innerHTML = `
    <div class="card">
      <h2 data-i18n="settings.title"></h2>
      <div class="field"><label data-i18n="settings.lang"></label>
        <div class="chiprow">
          <button class="chip" id="lang-fr">Français</button>
          <button class="chip" id="lang-ar">العربية</button>
        </div></div>
      <button id="rg-pw" class="btn btn--ghost btn--block" data-i18n="settings.password"></button>
      <button id="rg-logout" class="btn btn--ghost btn--block" data-i18n="settings.logout"></button>
    </div>
    <div class="card"><h2 data-i18n="settings.config"></h2><div class="cfg" id="cfg"></div></div>`;
  c.prepend(areaHead("settings", "nav.settings", "reglages.intro"));
  applyI18n(c);
  c.querySelector("#rg-pw").prepend(icon("key", { size: 17 }));
  c.querySelector("#rg-logout").prepend(icon("logout", { size: 17 }));
  const mark = () => {
    for (const [id, lang] of [["#lang-fr", "fr"], ["#lang-ar", "ar"]]) {
      const b = c.querySelector(id);
      const on = getLang() === lang;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
    }
  };
  mark();
  c.querySelector("#lang-fr").addEventListener("click", () => { setLang("fr"); $("lang-toggle").textContent = "عربي"; mark(); });
  c.querySelector("#lang-ar").addEventListener("click", () => { setLang("ar"); $("lang-toggle").textContent = "FR"; mark(); });
  c.querySelector("#rg-pw").addEventListener("click", () => { $("setpw-msg").textContent = ""; showView("setpw"); });
  c.querySelector("#rg-logout").addEventListener("click", async () => { await supabase.auth.signOut(); location.reload(); });

  const cfg = c.querySelector("#cfg");
  const line = (labelKey, ok, extra, iconName) => {
    const d = document.createElement("div");
    const l = document.createElement("span");
    l.style.display = "inline-flex"; l.style.alignItems = "center"; l.style.gap = "8px";
    if (iconName) l.append(icon(iconName, { size: 17 }));
    const lt = document.createElement("span"); lt.textContent = t(labelKey); l.append(lt);
    const v = document.createElement("span");
    v.className = ok ? "ok" : "ko";
    // A tick/cross carries the state for anyone who cannot resolve red vs green.
    if (extra == null) v.append(icon(ok ? "check" : "alert", { size: 16 }));
    const vt = document.createElement("span");
    vt.textContent = extra ?? (ok ? t("settings.ok") : t("settings.ko"));
    if (extra != null) vt.className = "ltr";
    v.append(vt);
    d.append(l, v); cfg.appendChild(d);
  };
  line("settings.supabase", true, null, "database"); // being here required a working /api/me
  // This await used to be naked. A network throw aborted the render here —
  // after reglagesInit was already set true at the top — so Réglages stayed
  // half-drawn for the rest of the session and re-entering the tab did nothing.
  let st = AT_ADMIN.status;
  if (!st) {
    try {
      st = (await window.AT_ADMIN.callApi("/api/status")).data || {};
    } catch {
      st = null; // could not reach the API at all — handled below
    }
  }
  if (st) {
    AT_ADMIN.status = st;
    line("settings.github", !!st.github, null, "send");
    if (st.branch) line("settings.branch", true, st.branch, "branch");
  } else {
    // Say "we could not check", never "non configuré": that is a verdict we
    // have not earned. Releasing reglagesInit is what makes the retry work.
    reglagesInit = false;
    const p = document.createElement("p"); p.className = "msg err"; p.textContent = t("common.error");
    const b = document.createElement("button"); b.className = "btn btn--ghost btn--sm";
    b.textContent = t("common.retry");
    b.addEventListener("click", () => showArea("reglages"));
    cfg.append(p, b);
  }
});

// Réglages writes its labels with t() into textContent and carries no
// data-i18n attributes, so applyI18n() cannot reach them: after a language
// switch the area head and every Configuration row stayed in the language it
// was first drawn in. Releasing the init latch re-renders it — from the cached
// AT_ADMIN.status, so this costs no extra API call.
document.addEventListener("admin:lang", () => {
  if (!reglagesInit) return;
  reglagesInit = false;
  const c = $("area-reglages");
  if (c) c.innerHTML = "";
  if (!$("area-reglages").hidden) showArea("reglages");
});

// ── First-run orientation ────────────────────────────────────────────
// Four areas is not self-evident to someone who has never used a dashboard.
// Shown once on Accueil, dismissible, remembered. Not a modal: a modal on a
// phone is a wall, and this is guidance, not a decision.
const SEEN = "at_admin_onboarded";
function onboardCard() {
  const card = document.createElement("section");
  card.className = "card onboard";
  const h = document.createElement("h2");
  h.append(icon("sparkles", { size: 20 }));
  const hs = document.createElement("span"); hs.textContent = t("onboard.title"); h.append(hs);
  const grid = document.createElement("div"); grid.className = "onboard__grid";
  for (const [ic, titleKey, bodyKey] of [
    ["home", "nav.home", "onboard.home"],
    ["inbox", "nav.leads", "onboard.leads"],
    ["file", "nav.pages", "onboard.pages"],
    ["settings", "nav.settings", "onboard.reglages"],
  ]) {
    const item = document.createElement("div"); item.className = "onboard__item";
    item.append(icon(ic, { size: 22 }));
    const txt = document.createElement("div");
    const b = document.createElement("b"); b.textContent = t(titleKey);
    const s = document.createElement("span"); s.textContent = t(bodyKey);
    txt.append(b, s); item.append(txt); grid.appendChild(item);
  }
  const ok = document.createElement("button");
  ok.className = "btn btn--block";
  ok.append(icon("check", { size: 17 }));
  const oks = document.createElement("span"); oks.textContent = t("common.gotit"); ok.append(oks);
  ok.addEventListener("click", () => {
    try { localStorage.setItem(SEEN, "1"); } catch { /* private mode */ }
    card.remove();
  });
  card.append(h, grid, ok);
  return card;
}
document.addEventListener("admin:onboard-slot", (e) => {
  let seen = false;
  try { seen = localStorage.getItem(SEEN) === "1"; } catch { /* private mode */ }
  if (!seen) e.detail.appendChild(onboardCard());
});

boot();
