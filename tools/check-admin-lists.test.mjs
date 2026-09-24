// tools/check-admin-lists.test.mjs
//
// checkAdminLists() reads the REAL site/admin/edit-lists.js and REAL
// data/trips/*.json — so build.mjs's own run is already an end-to-end proof
// against production content (see the comment at its call site). What these
// tests cover instead is the gate's OWN decision logic in isolation: given a
// synthetic module and synthetic trip data, does it flag exactly the right
// thing? A synthetic fixture is used deliberately — asserting against live
// content here would make these tests hostage to future trip edits the way
// edit-lists.test.mjs's own history already warns against (see
// withoutItemBindings's comment there).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkAdminLists } from "./check-admin-lists.mjs";

// A minimal, DOM-free stand-in for edit-lists.js: just enough of its public
// shape (LIST_SPECS, inferShape) for the gate to run against. `shapeFor` lets
// each test control exactly what inferShape returns, so the "declared but
// uninferrable" branch can be exercised without depending on the real
// module's regex.
function fakeEditListsSrc({ specs, shapeFor }) {
  return `
export const LIST_SPECS = ${JSON.stringify(specs)};
const SHAPES = ${JSON.stringify(shapeFor || {})};
export function inferShape(content, spec, prop) {
  const k = spec.id + ":" + prop;
  return Object.prototype.hasOwnProperty.call(SHAPES, k) ? SHAPES[k] : { head: "x", tail: "", attr: "data-i18n", n: 0 };
}
`;
}

/** A throwaway repo layout: site/admin/edit-lists.js + data/trips/*.json. */
function makeRepo({ specs, shapeFor, trips }) {
  const root = mkdtempSync(join(tmpdir(), "check-admin-lists-"));
  mkdirSync(join(root, "site", "admin"), { recursive: true });
  mkdirSync(join(root, "data", "trips"), { recursive: true });
  writeFileSync(join(root, "site", "admin", "edit-lists.js"), fakeEditListsSrc({ specs, shapeFor }));
  for (const [slug, content] of Object.entries(trips)) {
    writeFileSync(join(root, "data", "trips", `${slug}.json`), JSON.stringify(content));
  }
  return root;
}

const BOUND = (key) => ` data-i18n="${key}"`;

test("a real binding whose property is missing from keys is flagged", async () => {
  const root = makeRepo({
    specs: [{ id: "faq", path: "faq", addable: true, keys: ["kA"] }],
    trips: { demo: { faq: [{ kQ: BOUND("demoFaqQ1"), kA: BOUND("demoFaqA1") }] } },
  });
  try {
    const errors = await checkAdminLists(root);
    assert.equal(errors.length, 1);
    assert.match(errors[0].msg, /"faq"\].keys omet "kQ"/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("a property with no real binding anywhere is not flagged for being absent from keys", async () => {
  // Matches istanbul's kBtn today: present as a key, always empty. Nothing
  // should be minted where nothing was ever bound, so its absence from
  // `keys` is correct, not a gap.
  const root = makeRepo({
    specs: [{ id: "faq", path: "faq", addable: true, keys: ["kQ"] }],
    trips: { demo: { faq: [{ kQ: BOUND("demoFaqQ1"), kBtn: "" }] } },
  });
  try {
    assert.deepEqual(await checkAdminLists(root), []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("declared in keys but inferShape gives up is flagged as a distinct problem", async () => {
  const root = makeRepo({
    specs: [{ id: "highlights", path: "highlights", addable: true, keys: ["kLabel"] }],
    shapeFor: { "highlights:kLabel": null }, // simulates a semantic, non-numeric key family
    trips: { demo: { highlights: [{ kLabel: BOUND("demoHlAccomLabel") }] } },
  });
  try {
    const errors = await checkAdminLists(root);
    assert.equal(errors.length, 1);
    assert.match(errors[0].msg, /inclut "kLabel" mais inferShape\(\) n'en tire rien/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("addable: false lists are exempt — a shared key wrongly flagged would be bad advice", async () => {
  // hotels' kRibbon/kPriceLabel/kCta are the real case: shared across every
  // card of a trip, not per-item. Listing them in `keys` would tell the mint
  // path to treat them as per-item — and the same array feeds the DELETE
  // cleanup path, which would then delete a SHARED translation out from under
  // every sibling card still using it. Since addable:false means neither path
  // is reachable (edit-lists.js never renders an add/delete button for such a
  // list), the gate must not demand a `keys` entry here at all.
  const root = makeRepo({
    specs: [{ id: "hotels", path: "hotels", addable: false, keys: [] }],
    trips: { demo: { hotels: [{ kRibbon: BOUND("demoTierEco") }] } },
  });
  try {
    assert.deepEqual(await checkAdminLists(root), []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("a fully correct spec produces no errors", async () => {
  const root = makeRepo({
    specs: [
      { id: "dates", path: "calcUi.dateChips", addable: true, keys: ["k"] },
      { id: "faq", path: "faq", addable: true, keys: ["kBtn", "kQ", "kA"] },
    ],
    trips: {
      demo: {
        calcUi: { dateChips: [{ k: BOUND("demoChip1") }] },
        faq: [{ kQ: BOUND("demoFaqQ1"), kA: BOUND("demoFaqA1"), kBtn: "" }],
      },
    },
  });
  try {
    assert.deepEqual(await checkAdminLists(root), []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("a spec whose list path is absent on a trip (e.g. bali has no calcUi.dateChips shape mismatch) is skipped, not crashed on", async () => {
  const root = makeRepo({
    specs: [{ id: "faq", path: "faq", addable: true, keys: [] }],
    trips: { demo: { /* no `faq` key at all on this trip */ } },
  });
  try {
    assert.deepEqual(await checkAdminLists(root), []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("an unreadable module fails loudly rather than checking nothing silently", async () => {
  const root = mkdtempSync(join(tmpdir(), "check-admin-lists-"));
  try {
    const errors = await checkAdminLists(root); // no site/admin/edit-lists.js at all
    assert.equal(errors.length, 1);
    assert.match(errors[0].msg, /contrôle des listes admin impossible/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// ── Against the real module and real content ─────────────────────────────
// One direct check that the live gate is clean right now, so a failure here
// points straight at this file rather than waiting to be noticed inside
// build.mjs's much longer error list.
test("the real site/admin/edit-lists.js and data/trips/*.json pass today", async () => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const errors = await checkAdminLists(root);
  assert.deepEqual(errors, []);
});
