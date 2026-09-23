// site/admin/save-errors.js — turn a refusal into a sentence the owner can act on.
//
// WHY THIS EXISTS. Every gate in api/save-trip.mjs answers in the vocabulary of
// the JSON file, because that is what it validates: `hero.lede: contenu trop
// court`, `tripData.hotels[2].prices.double = null`, `clé i18n "azFaqQ1": texte
// français vide`. Those are correct, and they are unreadable to the person the
// dashboard exists for — a travel agent who typed in a box labelled
// "Hero — texte d'introduction" and got back a path they have never seen.
// The same is true of the transport layer: the client's actual experience of
// the broken admin, in the logs, is three 401s rendered as `Erreur 401: invalid
// session`.
//
// So this module does one narrow job: it maps a server string back onto the
// control the owner touched. It does NOT rewrite the ~30 validator call sites —
// those messages are also read by the build, by tests and by whoever is
// debugging, and they are good at that job. The translation belongs at the only
// layer that knows what the form looks like.
//
// PURE by construction. Nothing here touches the DOM or imports the dictionary:
// callers pass `labelFor` (which owns FIELDS and LIST_SPECS) and `t`. That is
// what lets the whole thing be tested in Node against the real refusal strings
// the real gates emit — see save-errors.test.mjs, which runs actual broken trip
// content through validateTrip/renderTrip/checkRenderedPage and asserts every
// string that comes out lands on a label.

// Paths the validator can name that are NOT inputs in the form: derived values
// owned by tools/value-graph.mjs, and structural blocks the editors own as a
// whole. Without these the owner gets "prix incohérent" attached to nothing.
export const EXTRA_LABELS = {
  "hero.priceFrom": "Prix « à partir de » (calculé)",
  "tripData.hotels": "Grille tarifaire du calculateur",
  "tripData.dates": "Dates de départ",
  "calcUi.optionsHtml": "Grille tarifaire du calculateur",
  "calcUi.steppersHtml": "Calculateur — compteurs de voyageurs",
  "calcUi.whyHtml": "Calculateur — bloc « Pourquoi ce prix ? »",
  "calcUi.dateChips": "Dates de départ",
  "seo.faqJsonLd": "Données Google — questions fréquentes",
  "seo.offerPrice": "Prix pour Google (calculé)",
  "finalCta.actionsHtml": "Appel final — boutons",
  "inclus.includedCount": "Compteur « inclus » (calculé)",
  "inclus.excludedCount": "Compteur « non inclus » (calculé)",
};

// A JSON path as the validators write them: dotted, with optional [n] indices.
// Anchored to a letter so it cannot match a stray word, and required to contain
// a dot or a bracket so a plain French sentence starting with a word does not
// look like a path ("prix incohérent" must not resolve to a field called
// "prix").
const PATH = "[a-zA-Z][A-Za-z0-9_]*(?:(?:\\.[A-Za-z0-9_]+)|(?:\\[\\d+\\]))+";
const LEADING_PATH_RE = new RegExp(`^(${PATH})(?=[:\\s])`);
const QUOTED_PATH_RE = new RegExp(`"(${PATH})"`);
const I18N_KEY_RE = /clé i18n "([^"]+)"/;
const reEsc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const RENDER_FAIL_RE = /^rendu impossible\s*:\s*([\s\S]*)$/;

/** The JSON path a refusal is about, or null when it names none. */
export function extractPath(raw) {
  const s = String(raw || "");
  const lead = LEADING_PATH_RE.exec(s);
  if (lead) return lead[1];
  const quoted = QUOTED_PATH_RE.exec(s);
  // `slug "istanbul" ≠ nom du fichier "istanbul"` quotes a VALUE, not a path;
  // the path shape above (a dot or a bracket is mandatory) already excludes it.
  return quoted ? quoted[1] : null;
}

/** The i18n key a checkRenderedPage refusal is about, or null. */
export function extractI18nKey(raw) {
  const m = I18N_KEY_RE.exec(String(raw || ""));
  return m ? m[1] : null;
}

/**
 * Does this stored value carry `key`?
 *
 * NOT a plain equality check, and that distinction is the whole function: the
 * k* properties in a trip file do not hold a bare key, they hold the WHOLE
 * attribute fragment the template splices into the markup —
 * `faq[0].kQ` is ` data-i18n="istFaqQ1"`, not `istFaqQ1`. An `=== key` test
 * looks correct, reads correctly, and matches nothing at all.
 */
function holdsKey(value, key) {
  const s = String(value);
  if (s === key) return true;
  return new RegExp(`data-i18n(?:-html)?="${reEsc(key)}"`).test(s);
}

/**
 * Where `key` is stored in the trip content, as a JSON path — e.g. "faq[3].kQ".
 *
 * The i18n gates speak in translation keys ("azFaqQ1"), which appear on no label
 * anywhere in the dashboard. The content the owner is about to publish is the
 * only thing that knows which row owns that key, and we have it in hand, so the
 * lookup is exact rather than a guess at a naming convention. (Key SHAPES are
 * per-trip — see edit-lists.js `inferShape` — so guessing would be wrong.)
 *
 * Bounded: the walk visits at most `maxNodes` values, because this runs on a
 * refusal path where a pathological document must not freeze the editor.
 */
export function findKeyPath(content, key, maxNodes = 20000) {
  if (!key || !content || typeof content !== "object") return null;
  let seen = 0;
  const stack = [{ node: content, path: "" }];
  while (stack.length) {
    const { node, path } = stack.pop();
    if (++seen > maxNodes) return null;
    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i--) stack.push({ node: node[i], path: `${path}[${i}]` });
      continue;
    }
    if (node && typeof node === "object") {
      for (const k of Object.keys(node)) {
        const child = node[k];
        const childPath = path ? `${path}.${k}` : k;
        // A binding property: `k`, or `k` + an initial capital (kQ, kBtn, kA…).
        if (typeof child === "string" && (k === "k" || /^k[A-Z]/.test(k)) && holdsKey(child, key)) {
          return childPath;
        }
        if (child && typeof child === "object") stack.push({ node: child, path: childPath });
      }
    }
  }
  return null;
}

const getPath = (o, p) =>
  String(p).replace(/\[(\d+)\]/g, ".$1").split(".")
    .reduce((x, k) => (x == null ? x : x[k]), o);

/**
 * The single flat field the owner has left empty, or null.
 *
 * The fallback for "clé i18n … texte français vide" when the key is not stored
 * in the content. For a LIST row the key lives on the row (faq[0].kQ) and
 * findKeyPath resolves it exactly; for a flat field the template DERIVES the
 * key from the trip's keyPrefix, so it appears nowhere we can search — the
 * trip's own `k.heroLede` is an empty string while the rendered page carries
 * `data-i18n="istHeroLede"`.
 *
 * But the refusal says a bound French text is empty, and the only way an owner
 * reaches that state is by clearing a box. So look for the cleared box. Exactly
 * one, or nothing: with two empties there is no way to tell which key belongs to
 * which, and naming the wrong field is worse than naming none.
 */
export function soleEmptyField(content, fields = []) {
  const empty = fields
    .map(([, path]) => path)
    .filter((path) => {
      const v = getPath(content, path);
      return typeof v === "string" && !v.trim();
    });
  return empty.length === 1 ? empty[0] : null;
}

/**
 * Progressively broader lookups for a path, most specific first.
 * "tripData.hotels[2].prices.double" →
 *   the path itself, then .prices, then [2], then tripData.hotels, then tripData.
 */
export function pathCandidates(path) {
  const out = [];
  let p = String(path || "");
  while (p) {
    out.push(p);
    const cut = Math.max(p.lastIndexOf("."), p.lastIndexOf("["));
    if (cut <= 0) break;
    p = p.slice(0, cut);
  }
  return out;
}

/** Matches "<specPath>[<n>]" at the start of a path — the row a list item is. */
export function rowRe(specPath) {
  return new RegExp("^" + reEsc(specPath) + "\\[(\\d+)\\]");
}

/**
 * makeLabelFor({ fields, lists, t }) -> (path) => { label, row } | null
 *
 * Lives here rather than in edit-pages.js so the mapping can be tested against
 * the refusals the REAL gates emit, without a DOM. `fields` is site/admin/
 * fields.js, `lists` is edit-lists.js's LIST_SPECS, `t` the dictionary lookup.
 *
 * List specs are consulted FIRST, because only they can say WHICH row: for
 * "calcUi.dateChips[2]" both the spec and EXTRA_LABELS know the block, but only
 * the spec turns it into "Dates de départ, ligne 3". The broadening candidates
 * afterwards cover the flat fields and the derived paths that have no input at
 * all — "tripData.hotels[2].prices.double" has to climb to "tripData.hotels"
 * before it finds a name the owner recognises.
 */
export function makeLabelFor({ fields = [], lists = [], t = (k) => k } = {}) {
  const flat = new Map(fields.map(([label, path]) => [path, label]));
  return function labelFor(path) {
    const p = String(path || "");
    for (const spec of lists) {
      const m = rowRe(spec.path).exec(p);
      if (m) return { label: t("pages.list." + spec.id), row: Number(m[1]) + 1 };
      if (p === spec.path) return { label: t("pages.list." + spec.id), row: null };
    }
    for (const cand of pathCandidates(p)) {
      if (flat.has(cand)) return { label: flat.get(cand), row: null };
      if (EXTRA_LABELS[cand]) return { label: EXTRA_LABELS[cand], row: null };
    }
    return null;
  };
}

/**
 * explainLine(raw, ctx) -> { path, label, row, text, detail }
 *
 * `text` is always safe to show; `detail` carries the raw server string when it
 * is developer-facing and is meant to live behind a disclosure, never inline.
 * An unrecognised message falls through with its original text rather than
 * being swallowed — an unhelpful sentence beats a missing one.
 */
export function explainLine(raw, ctx = {}) {
  const s = String(raw || "").trim();
  const labelFor = typeof ctx.labelFor === "function" ? ctx.labelFor : () => null;
  const content = ctx.content;

  // renderTrip threw: the message is a JavaScript error, not owner-facing.
  const render = RENDER_FAIL_RE.exec(s);
  if (render) {
    return {
      path: null, label: null, row: null,
      text: "La page n'a pas pu être fabriquée avec ce contenu — un champ obligatoire est probablement vide.",
      detail: render[1].trim(),
    };
  }

  // An i18n gate: resolve the key to the row that carries it.
  const key = extractI18nKey(s);
  if (key) {
    const empty = /texte français vide/.test(s);
    // Exact first (list rows carry their own key), then the cleared-box
    // fallback, which is the only handle a flat field leaves behind.
    let keyPath = findKeyPath(content, key);
    if (!keyPath && empty) keyPath = soleEmptyField(content, ctx.fields);
    const hit = keyPath ? labelFor(keyPath) : null;
    const text = empty
      ? "Ce champ ne peut pas rester vide : il porte une traduction, et le site refuse de se reconstruire sans son texte français."
      : "Deux champs portent la même traduction avec des textes différents — l'un des deux serait écrasé.";
    return {
      path: keyPath,
      label: hit ? hit.label : null,
      row: hit ? hit.row : null,
      text,
      // Without a resolved row the key is the only handle the owner has; keep it.
      detail: hit ? null : s,
    };
  }

  const path = extractPath(s);
  const hit = path ? labelFor(path) : null;
  // Drop the leading path from the sentence once a label replaces it, so the
  // owner reads "Hero — texte d'introduction : contenu trop court", not the
  // path twice.
  let text = s;
  if (hit && path) {
    // `=` is in the set because the price-grid refusal is written as
    // `tripData.hotels[2].prices.double = null (attendu: …)`; without it the
    // line renders as "Grille tarifaire — = null", which reads like a typo.
    text = s.replace(LEADING_PATH_RE, "").replace(/^\s*[:=—-]\s*/, "").trim() || s;
  }
  return {
    path,
    label: hit ? hit.label : null,
    row: hit ? hit.row : null,
    text,
    detail: null,
  };
}

/**
 * explainStatus(status, data) -> { key, params, detail, action }
 *
 * `key` is an i18n key; the caller translates. `action` names a recovery the UI
 * can offer ("reconnect") rather than describing one in prose the owner cannot
 * act on. The two 502s are deliberately distinguished: "GitHub ne répond pas"
 * and "le service de connexion ne répond pas" send the owner to different
 * places, and api/_lib already emits them as distinct strings.
 */
export function explainStatus(status, data = {}) {
  const err = String((data && data.error) || "");
  switch (Number(status)) {
    case 401:
      return { key: "pages.err.401", params: {}, detail: null, action: "reconnect" };
    case 403:
      return { key: "pages.err.403", params: {}, detail: null, action: null };
    case 413:
      return { key: "pages.err.413", params: {}, detail: null, action: null };
    case 429:
      return { key: "pages.err.429", params: {}, detail: null, action: null };
    case 502:
      if (/auth server/i.test(err)) return { key: "pages.err.502auth", params: {}, detail: null, action: null };
      if (/github/i.test(err)) return { key: "pages.err.502github", params: {}, detail: null, action: null };
      return { key: "pages.err.502", params: {}, detail: err || null, action: null };
    case 404:
      return { key: "pages.err.404", params: {}, detail: null, action: null };
    default:
      return {
        key: "pages.err.unknown",
        params: { status: String(status) },
        // A status we have no sentence for is exactly when the raw text is worth
        // keeping — behind a disclosure, so it informs without shouting.
        detail: err || null,
        action: null,
      };
  }
}
