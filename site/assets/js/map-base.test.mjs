// site/assets/js/map-base.test.mjs
//
// map-base.js is an IIFE that publishes window.MapBase, so — like
// booking-form.test.mjs — we load it into a node:vm context with a fake
// browser and drive the one piece with a lifetime: attachDashAnimation().
//
// Before 2026-08-11 that helper started `setInterval(…, 70)` — a paint-property
// write ~14×/second — and NOTHING in the repo ever cleared it. It kept running
// with the map scrolled far off-screen and with the tab in the background, for
// the life of the page. Every sibling animation here (globe.js) is gated on
// in-view + document.hidden + pagehide; these tests lock that gate onto the
// dash cycle while leaving the cycle itself (same sequence, same 70ms) alone.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function load({ reducedMotion = false, withIO = true } = {}) {
  const code = readFileSync(new URL("./map-base.js", import.meta.url), "utf8");

  const intervals = [];     // { id, fn, ms, cleared }
  let nextId = 1;
  const listeners = { window: {}, document: {} };
  const observers = [];

  const win = {
    matchMedia: () => ({ matches: reducedMotion }),
    addEventListener: (t, fn) => { (listeners.window[t] ||= []).push(fn); },
    removeEventListener: (t, fn) => {
      listeners.window[t] = (listeners.window[t] || []).filter((f) => f !== fn);
    },
  };
  const doc = {
    hidden: false,
    documentElement: { dataset: {} },
    addEventListener: (t, fn) => { (listeners.document[t] ||= []).push(fn); },
    removeEventListener: (t, fn) => {
      listeners.document[t] = (listeners.document[t] || []).filter((f) => f !== fn);
    },
  };

  const ctx = {
    window: win,
    document: doc,
    setInterval: (fn, ms) => { const id = nextId++; intervals.push({ id, fn, ms, cleared: false }); return id; },
    clearInterval: (id) => { const t = intervals.find((i) => i.id === id); if (t) t.cleared = true; },
    setTimeout: () => 0,
    Promise, console,
  };
  if (withIO) {
    ctx.IntersectionObserver = class {
      constructor(cb) { this.cb = cb; this.disconnected = false; observers.push(this); }
      observe() {}
      disconnect() { this.disconnected = true; }
    };
    win.IntersectionObserver = ctx.IntersectionObserver; // `'IntersectionObserver' in window`
  }
  vm.createContext(ctx);
  vm.runInContext(code, ctx);

  const live = () => intervals.filter((i) => !i.cleared);
  // `ev` is optional: the visibility/dispose handlers ignore their argument, but
  // the pagehide/pageshow pair reads `event.persisted` to tell a bfcache freeze
  // from a real unload.
  const fire = (target, type, ev) => (listeners[target][type] || []).slice().forEach((fn) => fn(ev));
  return { MapBase: win.MapBase, win, doc, intervals, live, fire, observers, listeners };
}

/* A MapLibre map stand-in: only the four methods the helper touches. */
function fakeMap() {
  const painted = [];
  return {
    painted,
    container: { id: "map" },
    getContainer() { return this.container; },
    getLayer: () => ({}),
    setPaintProperty: (layer, prop, value) => painted.push([layer, prop, value]),
  };
}

/* ── the animation itself is unchanged ─────────────────────────────────── */

test("attachDashAnimation still runs the same 70ms dash cycle when visible", () => {
  const env = load();
  const map = fakeMap();
  env.MapBase.attachDashAnimation(map, "amap-routes-line", "__t1");

  assert.equal(env.live().length, 1, "one timer while the map is visible and in view");
  assert.equal(env.live()[0].ms, 70, "the 70ms cadence must not change");

  env.live()[0].fn();
  env.live()[0].fn();
  assert.deepEqual(map.painted.map((p) => p[1]), ["line-dasharray", "line-dasharray"]);
  // Array.from: the dash arrays are built inside the vm realm, so a strict
  // deep-equal against a host Array would fail on the prototype alone.
  assert.deepEqual(Array.from(map.painted[0][2]), [1, 4, 2], "the dash sequence must not change");
  assert.deepEqual(Array.from(map.painted[1][2]), [2, 4, 1]);
});

test("attachDashAnimation still does nothing under prefers-reduced-motion", () => {
  const env = load({ reducedMotion: true });
  env.MapBase.attachDashAnimation(fakeMap(), "l", "__t2");
  assert.equal(env.intervals.length, 0);
});

test("attachDashAnimation stores the timer handle under the caller's key", () => {
  const env = load();
  env.MapBase.attachDashAnimation(fakeMap(), "l", "__amapDashTimer");
  assert.ok(env.win.__amapDashTimer, "the live interval id stays where callers expect it");
});

/* ── the gate ──────────────────────────────────────────────────────────── */

test("the timer stops when the tab is hidden and resumes when it returns", () => {
  const env = load();
  env.MapBase.attachDashAnimation(fakeMap(), "l", "__t3");
  assert.equal(env.live().length, 1);

  env.doc.hidden = true;
  env.fire("document", "visibilitychange");
  assert.equal(env.live().length, 0, "a background tab must not paint 14×/second");
  assert.equal(env.win.__t3, null, "the handle is cleared, not just abandoned");

  env.doc.hidden = false;
  env.fire("document", "visibilitychange");
  assert.equal(env.live().length, 1, "…and it comes back when the tab does");
});

test("the timer stops when the map scrolls off-screen and resumes in view", () => {
  const env = load();
  env.MapBase.attachDashAnimation(fakeMap(), "l", "__t4");
  const io = env.observers[0];
  assert.ok(io, "the map container must be observed");

  io.cb([{ isIntersecting: false }]);
  assert.equal(env.live().length, 0, "off-screen means no work at all");

  io.cb([{ isIntersecting: true }]);
  assert.equal(env.live().length, 1);
});

test("a hidden tab keeps the timer stopped even while the map is in view", () => {
  const env = load();
  env.MapBase.attachDashAnimation(fakeMap(), "l", "__t5");
  env.doc.hidden = true;
  env.fire("document", "visibilitychange");
  env.observers[0].cb([{ isIntersecting: true }]);
  assert.equal(env.live().length, 0, "both gates must hold, not just the last one to fire");
});

test("pagehide disposes: timer cleared, observer disconnected, listener removed", () => {
  const env = load();
  env.MapBase.attachDashAnimation(fakeMap(), "l", "__t6");
  env.fire("window", "pagehide");
  assert.equal(env.live().length, 0);
  assert.equal(env.observers[0].disconnected, true);
  assert.equal((env.listeners.document.visibilitychange || []).length, 0);
});

/* ── the Back button (bfcache) ──────────────────────────────────────────

   The gate above made pagehide a HARD stop: it cleared the interval,
   disconnected the observer and removed the visibilitychange listener, while
   window[timerKey + 'Ctl'] stayed truthy so attachDashAnimation() could never
   re-attach — and nothing in the repo listened for pageshow. Navigate away,
   press Back, and the route "ants" were dead for the rest of that page's life
   (before the gate they merely froze and resumed). These tests lock the
   round-trip: freeze on the way out, run again on the way back. */

test("a bfcache restore (Back) brings the dash cycle back to life", () => {
  const env = load();
  const map = fakeMap();
  env.MapBase.attachDashAnimation(map, "l", "__b1");
  assert.equal(env.live().length, 1);

  // Leaving the page: persisted === true means it is frozen, not destroyed.
  env.fire("window", "pagehide", { persisted: true });
  assert.equal(env.live().length, 0, "a frozen page must not hold a live timer");

  // …and Back restores it.
  env.fire("window", "pageshow", { persisted: true });
  assert.equal(env.live().length, 1, "the ants must march again after Back");
  env.live()[0].fn();
  assert.equal(map.painted.length, 1, "and the restored timer actually paints");
});

test("after a bfcache restore the pause gates still work", () => {
  const env = load();
  env.MapBase.attachDashAnimation(fakeMap(), "l", "__b2");
  env.fire("window", "pagehide", { persisted: true });
  env.fire("window", "pageshow", { persisted: true });
  assert.equal(env.live().length, 1);

  env.doc.hidden = true;
  env.fire("document", "visibilitychange");
  assert.equal(env.live().length, 0, "the tab-hidden gate must survive the round-trip");
  env.doc.hidden = false;
  env.fire("document", "visibilitychange");
  assert.equal(env.live().length, 1);

  env.observers[env.observers.length - 1].cb([{ isIntersecting: false }]);
  assert.equal(env.live().length, 0, "the off-screen gate must survive it too");
});

test("a bfcache freeze while paused stays paused on restore", () => {
  const env = load();
  env.MapBase.attachDashAnimation(fakeMap(), "l", "__b3");
  env.doc.hidden = true;                       // tab hidden…
  env.fire("document", "visibilitychange");
  env.fire("window", "pagehide", { persisted: true });
  env.fire("window", "pageshow", { persisted: true });
  // Restored into a still-hidden tab: pageshow must re-evaluate the gates, not
  // blindly restart.
  assert.equal(env.live().length, 0, "a hidden tab must stay hidden after a restore");
});

test("pageshow on a normal (non-persisted) load starts no extra timer", () => {
  const env = load();
  env.MapBase.attachDashAnimation(fakeMap(), "l", "__b4");
  env.fire("window", "pageshow", { persisted: false });
  env.fire("window", "pageshow", undefined); // some browsers hand us nothing
  assert.equal(env.intervals.length, 1, "the initial timer, and only it");
  assert.equal(env.live().length, 1);
});

test("a browser that reports a non-persisted hide and restores anyway recovers", () => {
  // pagehide.persisted has been unreliable historically; a restore is proof the
  // page survived, so pageshow must be able to rebuild what dispose() tore down.
  const env = load();
  env.MapBase.attachDashAnimation(fakeMap(), "l", "__b5");
  env.fire("window", "pagehide", { persisted: false });
  assert.equal(env.live().length, 0);
  assert.equal(env.observers[0].disconnected, true);

  env.fire("window", "pageshow", { persisted: true });
  assert.equal(env.live().length, 1, "the animation is rebuilt, not abandoned");
  assert.equal(env.observers.length, 2, "with a fresh in-view observer");
  assert.equal((env.listeners.document.visibilitychange || []).length, 1,
    "and exactly one visibilitychange listener, never two");
});

test("re-attaching the same key never starts a second timer — even while paused", () => {
  const env = load();
  const map = fakeMap();
  env.MapBase.attachDashAnimation(map, "l", "__t7");
  env.MapBase.attachDashAnimation(map, "l", "__t7");
  assert.equal(env.intervals.length, 1, "the guard held while running (it always did)");

  // A theme swap re-styles the map and calls attach again — this used to be
  // the hole: while paused the handle is null, so a truthiness guard on it
  // would have started a second, ungated interval.
  env.doc.hidden = true;
  env.fire("document", "visibilitychange");
  env.MapBase.attachDashAnimation(map, "l", "__t7");
  assert.equal(env.intervals.length, 1, "no second timer may be created while paused");
  assert.equal(env.live().length, 0);
});

test("the returned handle can be stopped by the caller", () => {
  const env = load();
  const ctl = env.MapBase.attachDashAnimation(fakeMap(), "l", "__t8");
  assert.equal(typeof ctl.stop, "function");
  ctl.stop();
  assert.equal(env.live().length, 0);
});

test("no IntersectionObserver: the visibility gate alone still applies", () => {
  const env = load({ withIO: false });
  env.MapBase.attachDashAnimation(fakeMap(), "l", "__t9");
  assert.equal(env.live().length, 1, "an old browser keeps the animation");
  env.doc.hidden = true;
  env.fire("document", "visibilitychange");
  assert.equal(env.live().length, 0);
});
