// site/admin/app.js — Supabase magic-link auth, admin gate via /api/me, tab shell.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { t, fmt, getLang, setLang, applyI18n } from "./i18n.js";

const CFG = window.AT_LEADS || {};
const supabase = createClient(CFG.url, CFG.anonKey);
const $ = (id) => document.getElementById(id);
const show = (el, on) => { el.hidden = !on; };

const AT_ADMIN = { supabase, session: null, token: null, showArea, status: null };
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
  // Legacy bridge until edit-pages.js migrates (Task 10):
  if (name === "pages") document.dispatchEvent(new CustomEvent("admin:tab", { detail: "pages" }));
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
  $("who").textContent = me.data.email;
  try { localStorage.setItem(LAST_EMAIL, me.data.email); } catch { /* private mode */ }
  showView("app");
  show($("change-pw"), true); show($("logout"), true);
  showArea("accueil");
  document.dispatchEvent(new CustomEvent("admin:ready"));
  callApi("/api/status").then((r) => {
    if (r.ok) AT_ADMIN.status = r.data;
    document.dispatchEvent(new CustomEvent("admin:status"));
  });
}

async function boot() {
  setLang(getLang()); // stamps lang+dir and fills every [data-i18n]

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
  applyI18n(c);
  const mark = () => {
    c.querySelector("#lang-fr").classList.toggle("is-on", getLang() === "fr");
    c.querySelector("#lang-ar").classList.toggle("is-on", getLang() === "ar");
  };
  mark();
  c.querySelector("#lang-fr").addEventListener("click", () => { setLang("fr"); $("lang-toggle").textContent = "عربي"; mark(); });
  c.querySelector("#lang-ar").addEventListener("click", () => { setLang("ar"); $("lang-toggle").textContent = "FR"; mark(); });
  c.querySelector("#rg-pw").addEventListener("click", () => { $("setpw-msg").textContent = ""; showView("setpw"); });
  c.querySelector("#rg-logout").addEventListener("click", async () => { await supabase.auth.signOut(); location.reload(); });

  const cfg = c.querySelector("#cfg");
  const line = (labelKey, ok, extra) => {
    const d = document.createElement("div");
    const l = document.createElement("span"); l.textContent = t(labelKey);
    const v = document.createElement("span");
    v.textContent = extra ?? (ok ? t("settings.ok") : t("settings.ko"));
    v.className = ok ? "ok" : "ko";
    if (extra != null) v.classList.add("ltr");
    d.append(l, v); cfg.appendChild(d);
  };
  line("settings.supabase", true); // being here required a working /api/me
  const st = AT_ADMIN.status || (await window.AT_ADMIN.callApi("/api/status")).data || {};
  AT_ADMIN.status = st;
  line("settings.github", !!st.github);
  if (st.branch) line("settings.branch", true, st.branch);
});

boot();
