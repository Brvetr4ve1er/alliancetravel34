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

async function enterApp(session) {
  AT_ADMIN.session = session;
  AT_ADMIN.token = session.access_token;
  const me = await callApi("/api/me");
  if (!me.ok) {
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
  // Handle the magic-link redirect (token in URL hash) + existing sessions.
  const { data } = await supabase.auth.getSession();
  if (data.session) return enterApp(data.session);
  show($("boot-msg"), false); show($("view-login"), true);

  supabase.auth.onAuthStateChange((_e, session) => { if (session) enterApp(session); });

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

  document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
  $("logout").addEventListener("click", async () => { await supabase.auth.signOut(); location.reload(); });
}
boot();
