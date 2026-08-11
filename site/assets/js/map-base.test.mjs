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
  const fire = (target, type) => (listeners[target][type] || []).slice().forEach((fn) => fn());
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
