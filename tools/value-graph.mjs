// tools/value-graph.mjs
// One price, many copies. This module declares WHICH copy derives from WHICH
// source, so the admin can update them together and the build can prove they
// still agree.
//
// The problem it exists to solve: the cheapest double appears up to 7 times in
// a single trip file, in two formats ("129.000 DA" and "129000"). Editing one
// copy leaves the page contradicting itself — and one such contradiction
// (vietnam) was live on the site and in Google's rich result.
//
// TWO THINGS THIS DELIBERATELY DOES NOT DO
//
// 1. It never infers the headline price when a trip sells more than one
//    package. Vietnam's page carries a 439.000 circuit AND a 420.000 KL+Phu
//    Quoc package; "cheapest wins" would silently re-advertise the trip at a
//    lower price than the agency chose. `tripData.headlineHotelId` records the
//    intent explicitly; only when it is absent do we fall back to cheapest.
//
// 2. It never derives a hotel card's priceFrom unless that is provably safe.
//    Zero of 51 cards across the 7 trips carry an id, so cards and price rows
//    can only be matched positionally — and on bali and kuala-lumpur the cards
//    are an ITINERARY ("3 nuits · Kuta"), not prices at all. Writing a price
//    there would destroy the itinerary. Both guards must pass: equal counts,
//    and every existing value already parses as currency.

/** The site's money format: dotted thousands, " DA" suffix. */
export function fmtDA(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " DA";
}

/** Digits out of "439.000 DA" / "439000" → 439000, or null. */
export function parseDA(v) {
  if (v == null) return null;
  const digits = String(v).replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

const isCurrency = (v) => /^[\d.\s]+DA$/.test(String(v ?? "").trim());

/**
 * The price the hero and the Google rich result advertise.
 * Explicit `tripData.headlineHotelId` wins; otherwise the cheapest double.
 * Returns { value, source, rowId }.
 */
export function headlineDouble(trip) {
  const rows = (trip && trip.tripData && trip.tripData.hotels) || [];
  const priced = rows
    .map((r) => ({ id: r && r.id, double: r && r.prices && r.prices.double }))
    .filter((r) => Number.isFinite(r.double));
  if (!priced.length) return { value: null, source: "none", rowId: null };

  const wantId = trip.tripData.headlineHotelId;
  if (wantId) {
    const hit = priced.find((r) => r.id === wantId);
    // A headlineHotelId naming a row that does not exist is a data error, not a
    // reason to silently fall back — say so and let the gate report it.
    if (!hit) return { value: null, source: "bad-headline-id", rowId: wantId };
    return { value: hit.double, source: "headline", rowId: hit.id };
  }
  const cheapest = priced.reduce((a, b) => (b.double < a.double ? b : a));
  return { value: cheapest.double, source: "cheapest", rowId: cheapest.id };
}

/**
 * deriveValues(trip) -> { derived: [{path, current, expected, ok, reason}], safe }
 * `safe` is false when the trip's own data prevents a reliable derivation.
 */
export function deriveValues(trip) {
  const derived = [];
  const head = headlineDouble(trip);

  if (head.value == null) {
    return {
      derived: [{
        path: "tripData.headlineHotelId",
        current: trip?.tripData?.headlineHotelId ?? null,
        expected: null,
        ok: false,
        reason: head.source === "bad-headline-id"
          ? `headlineHotelId "${head.rowId}" matches no row in tripData.hotels`
          : "no priced double room found in tripData.hotels",
      }],
      safe: false,
    };
  }

  derived.push({
    path: "hero.priceFrom",
    current: trip?.hero?.priceFrom ?? null,
    expected: fmtDA(head.value),
    ok: parseDA(trip?.hero?.priceFrom) === head.value,
    reason: `from tripData.hotels[${head.rowId}] (${head.source})`,
  });

  derived.push({
    path: "seo.offerPrice",
    current: trip?.seo?.offerPrice ?? null,
    expected: String(head.value),
    ok: parseDA(trip?.seo?.offerPrice) === head.value,
    reason: `from tripData.hotels[${head.rowId}] (${head.source})`,
  });

  // Hotel cards: positional, and only when provably safe (see header note).
  const cards = (trip && trip.hotels) || [];
  const rows = (trip && trip.tripData && trip.tripData.hotels) || [];
  const countsMatch = cards.length > 0 && cards.length === rows.length;
  const allCurrency = cards.every((c) => isCurrency(c && c.priceFrom));

  if (countsMatch && allCurrency) {
    cards.forEach((card, i) => {
      const price = rows[i]?.prices?.double;
      if (!Number.isFinite(price)) return;
      derived.push({
        path: `hotels.${i}.priceFrom`,
        current: card.priceFrom ?? null,
        expected: fmtDA(price),
        ok: parseDA(card.priceFrom) === price,
        reason: `positional match with tripData.hotels[${i}]`,
      });
    });
  } else if (cards.length) {
    derived.push({
      path: "hotels[].priceFrom",
      current: null,
      expected: null,
      ok: true, // not a failure — simply outside what can be derived
      reason: !countsMatch
        ? `not derivable: ${cards.length} cards vs ${rows.length} price rows`
        : "not derivable: card priceFrom holds itinerary text, not currency",
    });
  }

  return { derived, safe: true };
}

/** Convenience for the gate: only the entries that disagree. */
export function driftOf(trip) {
  return deriveValues(trip).derived.filter((d) => !d.ok);
}

function getAt(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setAt(obj, path, val) {
  const keys = path.split(".");
  const last = keys.pop();
  const parent = keys.reduce((o, k) => (o == null ? o : o[k]), obj);
  if (parent != null) parent[last] = val;
}

/**
 * syncDerivedPrices(trip) -> { trip, changes }
 * Clones the trip and rewrites every derived price copy from tripData.hotels
 * prices (the source). Reuses deriveValues' guards for hero.priceFrom,
 * seo.offerPrice and hotels[i].priceFrom; anything not provably safe is left
 * exactly as-is. Pure and idempotent. (priceMeta + optionsHtml added in Task 2.)
 */
export function syncDerivedPrices(trip) {
  const out = JSON.parse(JSON.stringify(trip)); // trips are plain JSON
  const changes = [];

  const { derived, safe } = deriveValues(out);
  if (safe) {
    for (const d of derived) {
      if (d.ok || d.expected == null) continue; // already agrees, or not derivable
      const from = getAt(out, d.path);
      if (from === d.expected) continue;
      setAt(out, d.path, d.expected);
      changes.push({ path: d.path, from, to: d.expected });
    }
  }

  return { trip: out, changes };
}
