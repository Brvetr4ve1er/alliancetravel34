// tools/image-variants.mjs
// Every image file a rendered trip page actually requests.
//
// The trip JSON stores ONE path per image slot. The templates never store the
// other formats — they DERIVE them by string .replace() at render time, so a
// stored value is really a promise that five or six sibling files exist. This
// module is that promise written down once, so the build gate, the save-time
// gate and the admin's picker all mean the same thing by "this image is usable".
//
// Mirrors exactly (keep in step if a template changes):
//   sections/hero.tpl:5-10    hero.bg   "--bg.jpg" -> --bg--mobile.{avif,webp,jpg}
//                                                   + --bg.{avif,webp}
//   sections/head.tpl:37-38   hero.bg   the LCP preload — same webp pair
//   sections/head.tpl:94,97   meta.ogImage — a BARE filename, resolved under
//                             assets/images/og/ (og:image + twitter:image)
//   sections/hotels.tpl:16    hotels[].image  ".jpg" -> .avif / .webp
//
// Why a missing sibling is fatal rather than ugly: <picture> commits to the
// first <source> whose type the browser supports and does NOT fall back when
// that file 404s. One absent .avif is a broken image on every modern browser,
// not a silent downgrade to jpeg.
//
// AVIF is listed as OPTIONAL because a photo uploaded from the dashboard cannot
// have one: canvas.toBlob("image/avif") is unsupported in every browser engine
// and — measured, not assumed — returns a PNG blob without raising. Pages emit
// the avif <source> only when the file is really there (see hasAvif below).

/** Strip the "../" hops a trip page uses to reach site/assets. */
export function relToSite(value) {
  const m = String(value ?? "").match(/^(?:\.\.\/)+(assets\/.+)$/);
  return m ? m[1] : null;
}

/** hero.bg — the stored value plus the five variants the templates derive. */
export function heroVariants(bg) {
  const v = String(bg ?? "");
  if (!v.endsWith("--bg.jpg")) return null; // not the shape the templates replace on
  const at = (suffix) => v.replace("--bg.jpg", suffix);
  return [
    { value: v, optional: false },
    { value: at("--bg.webp"), optional: false },
    { value: at("--bg.avif"), optional: true },
    { value: at("--bg--mobile.jpg"), optional: false },
    { value: at("--bg--mobile.webp"), optional: false },
    { value: at("--bg--mobile.avif"), optional: true },
  ];
}

/** hotels[].image — the stored .jpg plus its .webp/.avif siblings. */
export function hotelVariants(image) {
  const v = String(image ?? "");
  if (!/\.jpg$/i.test(v)) return null;
  return [
    { value: v, optional: false },
    { value: v.replace(/\.jpg$/i, ".webp"), optional: false },
    { value: v.replace(/\.jpg$/i, ".avif"), optional: true },
  ];
}

/** meta.ogImage — a bare filename, not a path. One file, no variants. */
export function ogVariants(name) {
  const v = String(name ?? "");
  if (!v || v.includes("/") || v.includes("\\")) return null;
  return [{ value: `../assets/images/og/${v}`, optional: false }];
}

// Which slot each editable field feeds. The admin's picker offers only images
// from the matching directory: the templates hardcode width/height per slot and
// the CSS crops with object-fit, so a hotel photo in a hero frame is a framing
// mistake the owner cannot see from a thumbnail.
export const SLOTS = {
  hero: { dir: "assets/images/heroes-v2", variants: heroVariants, suffix: "--bg.jpg", w: 1920, h: 1280 },
  hotel: { dir: "assets/images/hotels", variants: hotelVariants, suffix: ".jpg", w: 800, h: 600 },
  og: { dir: "assets/images/og", variants: ogVariants, suffix: ".jpg", w: 1200, h: 630 },
};

/** The slot a given JSON path belongs to, or null if the path is not an image. */
export function slotOf(path) {
  if (path === "hero.bg") return "hero";
  if (path === "meta.ogImage") return "og";
  if (/^hotels\[\d+\]\.image$/.test(path) || path === "hotels.image") return "hotel";
  return null;
}

/**
 * Every image file `data` requires, as paths relative to site/.
 * Returns [{ rel, field, value, optional, stored }].
 *   optional — may be absent without breaking the page (the render omits it)
 *   stored   — this is the value the JSON actually holds, not a derived sibling.
 *              Callers report a missing stored file differently: if the photo
 *              itself is gone, saying its five siblings are also gone is noise.
 * Each variants() list puts the stored value first, by construction.
 */
export function requiredImages(data) {
  const out = [];
  const push = (field, list) => {
    (list || []).forEach(({ value, optional }, i) => {
      const rel = relToSite(value);
      if (rel) out.push({ rel, field, value, optional, stored: i === 0 });
    });
  };
  push("hero.bg", heroVariants(data?.hero?.bg));
  push("meta.ogImage", ogVariants(data?.meta?.ogImage));
  const hotels = Array.isArray(data?.hotels) ? data.hotels : [];
  hotels.forEach((h, i) => push(`hotels[${i}].image`, hotelVariants(h?.image)));
  return out;
}

/**
 * Does this stored value have the shape its template replaces on?
 * A hero that does not end in "--bg.jpg" produces derived paths like
 * "photo.jpg--bg.webp" — nonsense that exists nowhere, so the page breaks even
 * though the stored file is perfectly real.
 */
export function shapeError(path, value) {
  const slot = slotOf(path);
  if (!slot) return null;
  if (SLOTS[slot].variants(value)) return null;
  if (slot === "og") return `doit être un simple nom de fichier (ex: og-istanbul.jpg), sans dossier`;
  return `doit se terminer par "${SLOTS[slot].suffix}"`;
}
