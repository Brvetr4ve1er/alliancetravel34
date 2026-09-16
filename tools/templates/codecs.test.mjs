// tools/templates/codecs.test.mjs
//
// The trip data and the page-local i18n dictionary are both serialized into an
// inline <script> block. Anything a trip field contains is therefore page
// source, and the admin dashboard writes those fields.
//
// The escape that matters is "</". A JS string literal does not end at
// "</script>", but the HTML parser never gets that far into the JavaScript: it
// sees the closing tag, ends the block, and treats the remainder of the field
// as markup. validate-trip.mjs rejects "<script" in content, but it cannot
// reject "</em>" — which is legitimate, pervasive, and lands in the same sink.
import { test } from "node:test";
import assert from "node:assert/strict";
import { serializeJs, evalObjectLiteral, plainText } from "./codecs.mjs";

const BS = String.fromCharCode(92);

test("a closing script tag cannot survive serialization", () => {
  const payload = "Fin </script><img src=x onerror=alert(1)>";
  const out = serializeJs(payload);
  assert.ok(!/<\/script/i.test(out), "raw </script reached the page source");
  assert.ok(out.includes("<" + BS + "/"), "expected the escaped form");
});

test("escaping changes the source, never the value", () => {
  for (const v of [
    "Your <em>itinerary</em>",
    "<strong>Inclus</strong> et non inclus",
    "Fin </script>",
    "no markup at all",
    "a backslash " + BS + " and a quote '",
  ]) {
    assert.equal(evalObjectLiteral(serializeJs(v)), v, `round-trip changed: ${v}`);
  }
});

test("nested structures round-trip too", () => {
  const obj = { a: ["</div>", { b: "</script>" }], c: "plain" };
  assert.deepEqual(evalObjectLiteral(serializeJs(obj)), obj);
});

test("plainText decodes for the JSON-LD sink, which is not markup", () => {
  // <script type="application/ld+json"> is never entity-decoded by a parser,
  // so "&amp;" would reach Google verbatim.
  assert.equal(plainText("Bali &amp; Kuala Lumpur"), "Bali & Kuala Lumpur");
  assert.equal(plainText("<strong>Le Caire</strong> et Hurghada"), "Le Caire et Hurghada");
  // &amp; decodes last, so an escaped entity stays text instead of becoming a tag
  assert.equal(plainText("&amp;lt;script&amp;gt;"), "&lt;script&gt;");
});
