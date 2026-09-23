// site/admin/edit-pages.test.mjs
//
// edit-pages.js is a browser ES module whose interesting functions (loadTrip,
// save) are module-private, so — like booking-form.test.mjs and map-base.test.mjs
// — we load the source into a node:vm context with a fake browser. The three
// `import` lines are stripped and their bindings supplied as globals; top-level
// FUNCTION declarations in a vm script land on the context's global object,
// which is how the test reaches loadTrip() and save().
//
// What this suite locks: /api/get-trip is called from TWO places, and both write
// to `current` — the {slug, content, sha} triple that the next Publier POSTs.
// loadTrip() has carried a request token (loadSeq) for a while; the post-publish
// re-sync in save() did not. Since #ep-back is never disabled, the owner can go
// Back and open another trip while that re-sync is in flight, and the stale
// answer used to overwrite current.sha/current.content and the raw-JSON panel
// with the PREVIOUS trip's data — losing the next edit to a 400 from
// save-trip.mjs's `content.slug must equal slug` guard, on a field the owner
// never touched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { FIELDS } from "./fields.js";
import { LIST_SPECS } from "./edit-lists.js";
import { explainLine, explainStatus, makeLabelFor, rowRe } from "./save-errors.js";
import { watchPublish } from "./publish-watch.js";

/**
 * A scripted /api/health. Every poll takes the current answer, so a test can let
 * the watch spin on the old build and then flip it mid-flight — which is the
 * whole behaviour under test.
 */
function healthScript() {
  let answer = { commit: "sha-of-the-previous-build", deployment: "dpl_old" };
  return {
    next: async () => answer,
    /** From now on, the deployment answering IS this commit. */
    serve(commit) { answer = { commit, deployment: "dpl_new" }; },
    /** A runtime that does not report its build (local preview, env not exposed). */
    blind() { answer = { commit: null, deployment: null }; },
  };
}

const tick = () => new Promise((r) => setImmediate(r));

/** Text of anything appendable: a string, or a fake node. */
const txt = (k) => (typeof k === "string" ? k : (k && k.textContent) || "");

function load() {
  const src = readFileSync(new URL("./edit-pages.js", import.meta.url), "utf8")
    // Only the three module imports start a line with `import` in this file.
    .replace(/^import[^\n]*\n/gm, "");

  // ── fake DOM ────────────────────────────────────────────────────────
  // One element per id, created on demand and shared between
  // document.getElementById() and container.querySelector("#id") — save() and
  // renderEditor() must see the same #ep-json / #ep-msg / #ep-save.
  const nodes = new Map();
  const byId = (id) => {
    if (!nodes.has(id)) nodes.set(id, makeEl(id));
    return nodes.get(id);
  };
  function makeEl(id) {
    return {
      id, className: "", textContent: "", value: "", disabled: false,
      dataset: {}, style: {},
      classList: { add() {}, remove() {}, contains: () => false },
      addEventListener() {}, removeEventListener() {},
      prepend() {}, after() {}, appendChild() {},
      remove() {},
      // append/replaceChildren used to be no-ops, which was fine while the only
      // thing written into #ep-msg was `.textContent`. The publish states and
      // the refusal list are built from NODES now, so a no-op would let a test
      // pass against a message that renders empty in a browser. Text-only
      // fidelity is enough — nothing here inspects the tree.
      append(...kids) { this.textContent += kids.map(txt).join(""); },
      replaceChildren(...kids) { this.textContent = kids.map(txt).join(""); this._html = ""; },
      matches: () => false,
      focus() {}, scrollIntoView() {}, setAttribute() {},
      set innerHTML(html) {
        this._html = html;
        // A stand-in for the parser: the only thing this suite reads back out of
        // the rendered markup is #ep-json's value, and a browser decodes the
        // entities escHtml() wrote when you read textarea.value.
        const m = /<textarea id="ep-json">([\s\S]*?)<\/textarea>/.exec(html);
        if (m) {
          byId("ep-json").value = m[1]
            .replace(/&quot;/g, '"').replace(/&gt;/g, ">")
            .replace(/&lt;/g, "<").replace(/&amp;/g, "&");
        }
      },
      get innerHTML() { return this._html || ""; },
      querySelector: (sel) => (sel.startsWith("#") ? byId(sel.slice(1)) : makeEl("")),
      querySelectorAll: () => [],
    };
  }
  const doc = {
    documentElement: { dataset: {} },
    getElementById: byId,
    createElement: () => makeEl(""),
    createTextNode: (s) => ({ textContent: String(s) }),
    querySelector: () => null,        // nothing to focus in this fake form
    querySelectorAll: () => [],       // no structured [data-path] inputs here
    addEventListener() {},
  };

  const health = healthScript();

  // ── fake /api plumbing: every call is a deferred the test resolves ──
  const calls = [];
  const callApi = (url, opts) => {
    const call = { url, opts, body: opts && opts.body ? JSON.parse(opts.body) : null };
    call.promise = new Promise((res, rej) => { call.resolve = res; call.reject = rej; });
    calls.push(call);
    return call.promise;
  };
  const win = {
    AT_ADMIN: { status: { github: true }, callApi },
    addEventListener() {},
  };

  const wired = [];
  const ctx = {
    window: win, document: doc,
    // stand-ins for ./i18n.js, ./icons.js, ./ui.js
    t: (k) => k,
    fmt: (k, o) => `${k} ${JSON.stringify(o)}`,
    applyI18n() {},
    icon: () => makeEl(""),
    areaHead: () => makeEl(""),
    // …and for ./edit-lists.js. Inert here on purpose: this suite is about the
    // /api/get-trip race on `current`, and the list editors have their own
    // suite (site/admin/edit-lists.test.mjs) that runs them against real trip
    // data. A stub that rendered markup would only test the fake DOM.
    listsHtml: () => "",
    // …and for ./images.js. The picker has its own suite; here it only has to
    // not throw, and imageControl must still emit the data-path hook so
    // collectInto() sees the field.
    imageControl: ({ id, attr }) => `<select id="${id}" ${attr}></select>`,
    FIELD_SLOT: { "hero.bg": "hero", "meta.ogImage": "og" },
    loadCatalogue: async () => null,
    wireImagePickers() {},
    // Records where the handlers were bound. #area-pages is never
    // rebuilt, so binding there leaks a listener per render.
    wireLists(root) { wired.push(root ? root.id : null); },
    collectLists: () => [],
    // …and for ./fields.js, ./edit-lists.js (specs), ./save-errors.js and
    // ./publish-watch.js — the REAL ones. All four are DOM-free by design, so
    // stubbing them would only test the stubs; this way the wiring that turns a
    // server refusal into a labelled sentence is under test end to end.
    FIELDS, LIST_SPECS, explainLine, explainStatus, makeLabelFor, rowRe,
    watchPublish,
    // The poll is driven by the caller's `sleep`, and edit-pages.js builds that
    // from setTimeout — so firing immediately collapses a five-minute schedule
    // into a few ticks without the state machine knowing it is being hurried.
    setTimeout: (fn) => { setImmediate(fn); return 0; },
    fetchHealthFromBrowser: () => health.next(),
    navigator: { serviceWorker: { getRegistration: () => Promise.resolve(null) } },
    JSON, Promise, console, encodeURIComponent,
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);

  return {
    calls, wired, health,
    html: () => byId("area-pages").innerHTML,
    loadTrip: (slug) => ctx.loadTrip(slug),
    save: () => ctx.save(),
    json: () => byId("ep-json").value,          // what the raw-JSON panel shows
    msg: () => byId("ep-msg").textContent,
    async settle(n = 4) { for (let i = 0; i < n; i++) await tick(); },
  };
}

const BALI = { slug: "bali", meta: { title: "Bali" } };
const ISTANBUL = { slug: "istanbul", meta: { title: "Istanbul" } };

// Open a trip the way a click on its card does, and answer the GET.
async function open(env, slug, content, sha) {
  const p = env.loadTrip(slug);
  await env.settle();
  const call = env.calls[env.calls.length - 1];
  assert.equal(call.url, `/api/get-trip?slug=${slug}`);
  call.resolve({ ok: true, data: { content, sha } });
  assert.equal(await p, true);
}

test("the editor loads a trip and shows its JSON", async () => {
  const env = load();
  await open(env, "bali", BALI, "sha-bali");
  assert.equal(JSON.parse(env.json()).slug, "bali");
});

test("the post-publish re-sync refreshes sha and JSON when nothing raced it", async () => {
  const env = load();
  await open(env, "bali", BALI, "sha-bali");

  const saving = env.save();
  await env.settle();
  assert.equal(env.calls[1].url, "/api/save-trip");
  assert.equal(env.calls[1].body.sha, "sha-bali");
  env.calls[1].resolve({ ok: true, data: {} });
  await env.settle();

  // The publish moved the file: the re-sync must adopt the NEW sha and bytes,
  // or the next save re-POSTs a stale document (and its 409 retry re-PUTs it
  // against a fresh sha, reverting whoever published in between).
  const serverCopy = { slug: "bali", meta: { title: "Bali (server)" } };
  env.calls[2].resolve({ ok: true, data: { content: serverCopy, sha: "sha-bali-2" } });
  await saving;
  assert.deepEqual(JSON.parse(env.json()), serverCopy);

  const saving2 = env.save();
  await env.settle();
  assert.equal(env.calls[3].body.sha, "sha-bali-2", "the fresh sha must be armed");
  env.calls[3].resolve({ ok: true, data: {} });
  await env.settle();
  env.calls[4].resolve({ ok: true, data: { content: serverCopy, sha: "sha-bali-3" } });
  await saving2;
});

test("a re-sync that lands after the owner opened another trip is dropped", async () => {
  const env = load();
  await open(env, "bali", BALI, "sha-bali");

  // Publier on bali: the POST succeeds, the re-sync GET is still in flight.
  const saving = env.save();
  await env.settle();
  assert.equal(env.calls[1].url, "/api/save-trip");
  env.calls[1].resolve({ ok: true, data: {} });
  await env.settle();
  assert.equal(env.calls[2].url, "/api/get-trip?slug=bali", "the re-sync is in flight");

  // #ep-back is never disabled, so the owner leaves and opens istanbul.
  await open(env, "istanbul", ISTANBUL, "sha-istanbul");
  assert.equal(JSON.parse(env.json()).slug, "istanbul");

  // Only now does bali's answer arrive.
  env.calls[2].resolve({ ok: true, data: { content: BALI, sha: "sha-bali-2" } });
  await saving;
  await env.settle();

  assert.equal(JSON.parse(env.json()).slug, "istanbul",
    "the raw-JSON panel must not be repainted with the previous trip");

  // The real damage is on the WRITE: whatever the owner publishes next must be
  // istanbul's document against istanbul's sha.
  const saving2 = env.save();
  await env.settle();
  const post = env.calls[env.calls.length - 1];
  assert.equal(post.url, "/api/save-trip");
  assert.equal(post.body.slug, "istanbul");
  assert.equal(post.body.content.slug, "istanbul",
    "a bali body here is rejected 400 by save-trip.mjs and the owner's edit is lost");
  assert.equal(post.body.sha, "sha-istanbul", "…and the sha would be bali's too");
  post.resolve({ ok: true, data: {} });
  await env.settle();
  env.calls[env.calls.length - 1].resolve({ ok: true, data: { content: ISTANBUL, sha: "sha-istanbul-2" } });
  await saving2;
});

test("a failed re-sync keeps the publish confirmation on screen", async () => {
  const env = load();
  await open(env, "bali", BALI, "sha-bali");
  const saving = env.save();
  await env.settle();
  env.calls[1].resolve({ ok: true, data: {} });
  await env.settle();
  env.calls[2].reject(new Error("offline"));
  await saving;
  assert.equal(env.msg(), "pages.published", "the publish succeeded; say so");
});

test("the list handlers are bound inside the markup, not to the screen", async () => {
  // #area-pages is created once; renderEditor only replaces its innerHTML. A
  // listener bound there survives every render, so opening a second trip used
  // to leave two live handlers: one "+ Ajouter" click appended two rows, and
  // the stale handler still minted keys from the previous trip's content.
  const env = load();
  await open(env, "bali", BALI, "sha-bali");
  await open(env, "egypte", { ...BALI, slug: "egypte" }, "sha-eg");
  assert.deepEqual(env.wired, ["ep-lists", "ep-lists"]);
  assert.ok(env.html().includes('<div id="ep-lists">'), "the wrapper must exist in the markup");
});

// ── Phase 2: the dashboard reports what actually reached the site ─────────
//
// Before this, a successful POST printed "la page sera à jour dans ~1 minute"
// and stopped looking. That sentence is a guess, and when the rebuild took
// longer the owner refreshed, saw the old page and concluded the dashboard had
// done nothing — which is, near enough, the complaint that started this work.

test("a publish that reports its commit waits for that build, then says it is live", async () => {
  const env = load();
  await open(env, "bali", BALI, "sha-bali");
  const saving = env.save();
  await env.settle();
  env.calls[1].resolve({
    ok: true,
    data: { commitUrl: "https://github.com/o/r/commit/abc", commitSha: "commit-new" },
  });
  await env.settle();
  env.calls[2].resolve({ ok: true, data: { content: BALI, sha: "sha-bali-2" } });
  await tick();
  assert.match(env.msg(), /pages\.watch\.deploying/,
    "while the build runs, say it is building — not that it is done");

  // The deployment answering /api/health becomes ours.
  env.health.serve("commit-new");
  await saving;
  assert.match(env.msg(), /pages\.watch\.live/,
    "and only then claim it is live, because now we have checked");
  assert.match(env.msg(), /pages\.viewpage/, "with a way to go and look at it");
});

test("a runtime that will not name its build stops instead of spinning for five minutes", async () => {
  // Reachable on a local preview and on a Vercel project that does not expose
  // system env vars. Polling to a "slow" verdict would be five minutes spent
  // reaching a conclusion the FIRST answer already ruled out, and would end on
  // wording that implies something is wrong when nothing is.
  const env = load();
  await open(env, "bali", BALI, "sha-bali");
  env.health.blind();
  const saving = env.save();
  await env.settle();
  env.calls[1].resolve({ ok: true, data: { commitUrl: "u", commitSha: "commit-new" } });
  await env.settle();
  env.calls[2].resolve({ ok: true, data: { content: BALI, sha: "sha-bali-2" } });
  await saving;
  assert.match(env.msg(), /pages\.published/,
    "fall back to the old honest-ish promise rather than inventing a verdict");
});

// ── Phase 3: a refusal names the control, not the JSON path ───────────────

test("a 422 names the field the owner typed in, not the path the validator uses", async () => {
  const env = load();
  await open(env, "bali", BALI, "sha-bali");
  const saving = env.save();
  await env.settle();
  env.calls[1].resolve({
    ok: false,
    status: 422,
    data: { errors: ["hero.lede: contenu trop court (12 caractère(s) utile(s), minimum 40) — introduction"] },
  });
  await saving;
  const out = env.msg();
  assert.match(out, /Hero — texte d'introduction/,
    "the label above the box the owner actually typed in");
  assert.doesNotMatch(out, /hero\.lede/,
    "…and not the path, which appears nowhere in the dashboard");
  assert.match(out, /contenu trop court/, "the reason survives the translation");
});

test("an expired session says so, and never shows the owner 'invalid session'", async () => {
  // This is the exact string the client has been getting: the runtime logs for
  // the week showed three 401s and nothing else, and save() rendered them as
  // `Erreur 401: invalid session`.
  const env = load();
  await open(env, "bali", BALI, "sha-bali");
  const saving = env.save();
  await env.settle();
  env.calls[1].resolve({ ok: false, status: 401, data: { error: "invalid session" } });
  await saving;
  const out = env.msg();
  assert.match(out, /pages\.err\.401/, "a sentence about the session, in French");
  assert.match(out, /pages\.err\.reconnect/, "…with the way out attached");
  assert.doesNotMatch(out, /invalid session/, "raw server English must not reach the owner");
});

test("the two 502s are told apart, because they send the owner to different places", async () => {
  for (const [error, key] of [["github unreachable", "pages.err.502github"],
                              ["auth server unreachable", "pages.err.502auth"]]) {
    const env = load();
    await open(env, "bali", BALI, "sha-bali");
    const saving = env.save();
    await env.settle();
    env.calls[1].resolve({ ok: false, status: 502, data: { error } });
    await saving;
    assert.match(env.msg(), new RegExp(key.replace(/\./g, "\.")), `${error} → ${key}`);
  }
});
