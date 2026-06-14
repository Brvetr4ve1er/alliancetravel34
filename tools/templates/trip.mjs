// tools/templates/trip.mjs
// Zero-dependency ESM template that renders a trip-page <data>.json into the
// byte-equivalent HTML of site/<slug>/index.html.
//
// METHOD: derived from site/cairo-sharm/index.html (the authoritative markup).
// Shared / static markup is kept literal; only per-page data fields are
// parameterized. Output uses "\n" newlines internally — the CLI converts the
// whole document to CRLF + a single trailing newline to match the reference.

/* ------------------------------------------------------------------ helpers */

// Escape a *bare* ampersand (one that is not already the start of an entity)
// to &amp;. Used for visible prose body fields, mirroring the reference where
// <p>/<h3>/<h4> body text shows "&amp;" but stored JSON holds a raw "&".
// Entities already present in the data (e.g. "&lt;") are left untouched.
function amp(str) {
  return String(str).replace(/&(?!(?:amp|lt|gt|quot|#\d+|#x[0-9a-fA-F]+);)/g, "&amp;");
}

// Inline SVG icon registry (key -> markup), keyed by the schema enums.
const HL_ICONS = {
  star:     '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  clock:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>',
  plane:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19.5 2.5 18 1 16 1 14.5 2.5L11 6 2.8 4.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 6.2 7.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>',
  building: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
};

// Info-block icons keyed by enum.
const INFO_ICONS = {
  card:       '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
  "no-entry": '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
  passport:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M7 21v-1a5 5 0 0 1 10 0v1"/></svg>',
  shield:     '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
};

const STAR_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
const CROSS_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

const WA_BASE = "https://wa.me/213561616266?text=Bonjour%20Alliance%20Travel%2C%20j%27aimerais%20en%20savoir%20plus.";

// WhatsApp glyph (used in nav + final CTA + footer).
const WA_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>';
const WA_ICON_18 = WA_ICON.replace('width="14" height="14"', 'width="18" height="18"');
const WA_ICON_13 = WA_ICON.replace('width="14" height="14"', 'width="13" height="13"');

const NAV_LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 426 148.499996" height="40" aria-label="Alliance Travel" preserveAspectRatio="xMidYMid meet" version="1.0"><defs><clipPath id="6f5dac3367"><path d="M 23.808594 0 L 65.683594 0 L 65.683594 35.996094 L 23.808594 35.996094 Z M 23.808594 0 " clip-rule="nonzero"/></clipPath><clipPath id="22fe911202"><path d="M 46.292969 35.855469 C 45.75 29.660156 45.214844 23.53125 44.671875 17.34375 C 44.460938 17.421875 44.316406 17.464844 44.179688 17.53125 C 40.558594 19.191406 36.9375 20.863281 33.308594 22.511719 C 32.941406 22.675781 32.796875 22.894531 32.742188 23.28125 C 32.519531 24.832031 32.269531 26.378906 32.011719 27.921875 C 31.984375 28.085938 31.878906 28.292969 31.742188 28.375 C 31.140625 28.757812 30.519531 29.097656 29.839844 29.492188 C 29.777344 29.273438 29.722656 29.136719 29.695312 28.992188 C 29.351562 27.25 29.023438 25.507812 28.652344 23.769531 C 28.589844 23.472656 28.414062 23.152344 28.195312 22.945312 C 26.898438 21.707031 25.574219 20.5 24.261719 19.277344 C 24.175781 19.195312 24.09375 19.105469 23.949219 18.953125 C 24.660156 18.558594 25.332031 18.171875 26.023438 17.820312 C 26.128906 17.765625 26.324219 17.847656 26.460938 17.902344 C 27.890625 18.5 29.324219 19.089844 30.738281 19.714844 C 31.125 19.886719 31.394531 19.84375 31.738281 19.613281 C 35.03125 17.402344 38.339844 15.207031 41.640625 13.007812 C 41.769531 12.921875 41.890625 12.828125 42.078125 12.6875 C 37.097656 8.972656 32.160156 5.289062 27.171875 1.570312 C 28.128906 1.03125 29.015625 0.519531 29.917969 0.0390625 C 30.042969 -0.0273438 30.261719 0 30.402344 0.0625 C 36.523438 2.738281 42.644531 5.414062 48.753906 8.113281 C 49.226562 8.324219 49.566406 8.28125 50.003906 8.039062 C 53.269531 6.210938 56.574219 4.453125 60.085938 3.121094 C 60.847656 2.832031 61.636719 2.601562 62.421875 2.378906 C 62.820312 2.265625 63.238281 2.191406 63.652344 2.164062 C 64.3125 2.117188 65.054688 2.019531 65.429688 2.71875 C 65.804688 3.414062 65.339844 3.996094 64.941406 4.519531 C 64.628906 4.933594 64.28125 5.34375 63.878906 5.667969 C 62.664062 6.652344 61.472656 7.683594 60.164062 8.53125 C 57.726562 10.113281 55.21875 11.582031 52.722656 13.070312 C 52.34375 13.296875 52.144531 13.523438 52.082031 13.976562 C 51.164062 20.613281 50.222656 27.246094 49.277344 33.875 C 49.253906 34.042969 49.152344 34.261719 49.019531 34.339844 C 48.152344 34.847656 47.261719 35.320312 46.292969 35.855469 Z M 46.292969 35.855469 " clip-rule="nonzero"/></clipPath><clipPath id="bc60a13e81"><path d="M 0.917969 0 L 42.683594 0 L 42.683594 35.878906 L 0.917969 35.878906 Z M 0.917969 0 " clip-rule="nonzero"/></clipPath><clipPath id="1a1fe097b1"><path d="M 23.292969 35.855469 C 22.75 29.660156 22.214844 23.53125 21.671875 17.34375 C 21.460938 17.421875 21.316406 17.464844 21.179688 17.53125 C 17.558594 19.191406 13.9375 20.863281 10.308594 22.511719 C 9.941406 22.675781 9.796875 22.894531 9.742188 23.28125 C 9.519531 24.832031 9.269531 26.378906 9.011719 27.921875 C 8.984375 28.085938 8.878906 28.292969 8.742188 28.375 C 8.140625 28.757812 7.519531 29.097656 6.839844 29.492188 C 6.777344 29.273438 6.722656 29.136719 6.695312 28.992188 C 6.351562 27.25 6.023438 25.507812 5.652344 23.769531 C 5.589844 23.472656 5.414062 23.152344 5.195312 22.945312 C 3.898438 21.707031 2.574219 20.5 1.261719 19.277344 C 1.175781 19.195312 1.09375 19.105469 0.949219 18.953125 C 1.660156 18.558594 2.332031 18.171875 3.023438 17.820312 C 3.128906 17.765625 3.324219 17.847656 3.460938 17.902344 C 4.890625 18.5 6.324219 19.089844 7.738281 19.714844 C 8.125 19.886719 8.394531 19.84375 8.738281 19.613281 C 12.03125 17.402344 15.339844 15.207031 18.640625 13.007812 C 18.769531 12.921875 18.890625 12.828125 19.078125 12.6875 C 14.097656 8.972656 9.160156 5.289062 4.171875 1.570312 C 5.128906 1.03125 6.015625 0.519531 6.917969 0.0390625 C 7.042969 -0.0273438 7.261719 0 7.402344 0.0625 C 13.523438 2.738281 19.644531 5.414062 25.753906 8.113281 C 26.226562 8.324219 26.566406 8.28125 27.003906 8.039062 C 30.269531 6.210938 33.574219 4.453125 37.085938 3.121094 C 37.847656 2.832031 38.636719 2.601562 39.421875 2.378906 C 39.820312 2.265625 40.238281 2.191406 40.652344 2.164062 C 41.3125 2.117188 42.054688 2.019531 42.429688 2.71875 C 42.804688 3.414062 42.339844 3.996094 41.941406 4.519531 C 41.628906 4.933594 41.28125 5.34375 40.878906 5.667969 C 39.664062 6.652344 38.472656 7.683594 37.164062 8.53125 C 34.726562 10.113281 32.21875 11.582031 29.722656 13.070312 C 29.34375 13.296875 29.144531 13.523438 29.082031 13.976562 C 28.164062 20.613281 27.222656 27.246094 26.277344 33.875 C 26.253906 34.042969 26.152344 34.261719 26.019531 34.339844 C 25.152344 34.847656 24.261719 35.320312 23.292969 35.855469 Z M 23.292969 35.855469 " clip-rule="nonzero"/></clipPath><clipPath id="dc38495a75"><rect x="0" width="43" y="0" height="36"/></clipPath><clipPath id="ad75c4b4fc"><path d="M 285.808594 130.515625 L 299.566406 130.515625 L 299.566406 131.847656 L 285.808594 131.847656 Z M 292.027344 131.847656 L 293.347656 131.847656 L 293.347656 147.378906 L 292.027344 147.378906 Z M 292.027344 131.847656 " clip-rule="nonzero"/></clipPath><clipPath id="0e3106f3ca"><path d="M 0.808594 0.515625 L 14.566406 0.515625 L 14.566406 1.847656 L 0.808594 1.847656 Z M 7.027344 1.847656 L 8.347656 1.847656 L 8.347656 17.378906 L 7.027344 17.378906 Z M 7.027344 1.847656 " clip-rule="nonzero"/></clipPath><clipPath id="bfc8f113ba"><rect x="0" width="15" y="0" height="18"/></clipPath><clipPath id="c4f571a3d5"><path d="M 312.644531 130.515625 L 323.855469 130.515625 L 323.855469 147.710938 L 312.644531 147.710938 Z M 312.644531 130.515625 " clip-rule="nonzero"/></clipPath><clipPath id="c6b329dff5"><path d="M 336.964844 130.515625 L 352.664062 130.515625 L 352.664062 147.710938 L 336.964844 147.710938 Z M 336.964844 130.515625 " clip-rule="nonzero"/></clipPath><clipPath id="e0b06f2b52"><path d="M 362.347656 130.515625 L 377.789062 130.515625 L 377.789062 147.402344 L 362.347656 147.402344 Z M 362.347656 130.515625 " clip-rule="nonzero"/></clipPath><clipPath id="0cabbca291"><path d="M 370.804688 147.378906 L 369.378906 147.378906 L 362.40625 130.515625 L 363.828125 130.515625 L 370.097656 145.652344 L 376.351562 130.515625 L 377.789062 130.515625 Z M 370.804688 147.378906 " clip-rule="nonzero"/></clipPath><clipPath id="dd3a24775a"><path d="M 0.378906 0.515625 L 15.789062 0.515625 L 15.789062 17.402344 L 0.378906 17.402344 Z M 0.378906 0.515625 " clip-rule="nonzero"/></clipPath><clipPath id="53f36033ce"><path d="M 8.804688 17.378906 L 7.378906 17.378906 L 0.40625 0.515625 L 1.828125 0.515625 L 8.097656 15.652344 L 14.351562 0.515625 L 15.789062 0.515625 Z M 8.804688 17.378906 " clip-rule="nonzero"/></clipPath><clipPath id="a239c7dbf9"><rect x="0" width="16" y="0" height="18"/></clipPath><clipPath id="4aa9e00c49"><path d="M 390.847656 130.515625 L 400.714844 130.515625 L 400.714844 131.84375 L 390.847656 131.84375 Z M 390.847656 131.84375 L 392.175781 131.84375 L 392.175781 137.976562 L 390.847656 137.976562 Z M 390.847656 137.976562 L 399.390625 137.976562 L 399.390625 139.246094 L 390.847656 139.246094 Z M 390.847656 139.246094 L 392.175781 139.246094 L 392.175781 146.046875 L 390.847656 146.046875 Z M 390.847656 146.046875 L 400.714844 146.046875 L 400.714844 147.363281 L 390.847656 147.363281 Z M 390.847656 146.046875 " clip-rule="nonzero"/></clipPath><clipPath id="4700ad0c56"><path d="M 0.847656 0.515625 L 10.714844 0.515625 L 10.714844 1.84375 L 0.847656 1.84375 Z M 0.847656 1.84375 L 2.175781 1.84375 L 2.175781 7.976562 L 0.847656 7.976562 Z M 0.847656 7.976562 L 9.390625 7.976562 L 9.390625 9.246094 L 0.847656 9.246094 Z M 0.847656 9.246094 L 2.175781 9.246094 L 2.175781 16.046875 L 0.847656 16.046875 Z M 0.847656 16.046875 L 10.714844 16.046875 L 10.714844 17.363281 L 0.847656 17.363281 Z M 0.847656 16.046875 " clip-rule="nonzero"/></clipPath><clipPath id="41f3651b0b"><rect x="0" width="11" y="0" height="18"/></clipPath><clipPath id="6e60c38031"><path d="M 413.800781 130.515625 L 415.128906 130.515625 L 415.128906 146.0625 L 413.800781 146.0625 Z M 413.800781 146.0625 L 424.84375 146.0625 L 424.84375 147.378906 L 413.800781 147.378906 Z M 413.800781 146.0625 " clip-rule="nonzero"/></clipPath><clipPath id="de1ffa27ec"><path d="M 0.800781 0.515625 L 2.128906 0.515625 L 2.128906 16.0625 L 0.800781 16.0625 Z M 0.800781 16.0625 L 11.84375 16.0625 L 11.84375 17.378906 L 0.800781 17.378906 Z M 0.800781 16.0625 " clip-rule="nonzero"/></clipPath><clipPath id="31cf2a680e"><rect x="0" width="12" y="0" height="18"/></clipPath><clipPath id="155b22a741"><path d="M 99.792969 40.042969 L 114.074219 40.042969 L 114.074219 115.207031 L 99.792969 115.207031 Z M 99.792969 40.042969 " clip-rule="nonzero"/></clipPath><clipPath id="4c70b551bb"><path d="M 0.792969 0.0429688 L 15.074219 0.0429688 L 15.074219 75.207031 L 0.792969 75.207031 Z M 0.792969 0.0429688 " clip-rule="nonzero"/></clipPath><clipPath id="edfb46498a"><rect x="0" width="16" y="0" height="76"/></clipPath><clipPath id="6b2d92cfe6"><path d="M 127.757812 40.042969 L 142.039062 40.042969 L 142.039062 115.207031 L 127.757812 115.207031 Z M 127.757812 40.042969 " clip-rule="nonzero"/></clipPath><clipPath id="bbf96f04a3"><path d="M 0.757812 0.0429688 L 15.039062 0.0429688 L 15.039062 75.207031 L 0.757812 75.207031 Z M 0.757812 0.0429688 " clip-rule="nonzero"/></clipPath><clipPath id="3b14f3e239"><rect x="0" width="16" y="0" height="76"/></clipPath><clipPath id="a17f906130"><path d="M 154.214844 38.96875 L 172.15625 38.96875 L 172.15625 115.210938 L 154.214844 115.210938 Z M 154.214844 38.96875 " clip-rule="nonzero"/></clipPath><clipPath id="2b1d768afb"><path d="M 180.480469 60.945312 L 238 60.945312 L 238 116.257812 L 180.480469 116.257812 Z M 180.480469 60.945312 " clip-rule="nonzero"/></clipPath><clipPath id="90d071fd48"><path d="M 251.335938 61.039062 L 304.542969 61.039062 L 304.542969 115.320312 L 251.335938 115.320312 Z M 251.335938 61.039062 " clip-rule="nonzero"/></clipPath><clipPath id="52c8be3069"><path d="M 251.515625 62.109375 L 263.859375 62.109375 L 264.824219 68.230469 C 266.898438 65.9375 269.441406 64.167969 272.445312 62.914062 C 275.453125 61.664062 278.707031 61.039062 282.214844 61.039062 C 289.011719 61.039062 294.414062 63.238281 298.425781 67.636719 C 302.429688 72.039062 304.4375 77.996094 304.4375 85.511719 L 304.4375 115.140625 L 290.160156 115.140625 L 290.160156 86.371094 C 290.160156 82.292969 289.140625 79.125 287.097656 76.871094 C 285.058594 74.617188 282.25 73.488281 278.671875 73.488281 C 274.808594 73.488281 271.695312 74.777344 269.332031 77.351562 C 266.972656 79.929688 265.792969 83.257812 265.792969 87.335938 L 265.792969 115.140625 L 251.515625 115.140625 Z M 251.515625 62.109375 " clip-rule="nonzero"/></clipPath><clipPath id="0b92d48cc6"><path d="M 0.390625 0.0390625 L 53.492188 0.0390625 L 53.492188 54.292969 L 0.390625 54.292969 Z M 0.390625 0.0390625 " clip-rule="nonzero"/></clipPath><clipPath id="6ff1ed3015"><path d="M 0.515625 1.109375 L 12.859375 1.109375 L 13.824219 7.230469 C 15.898438 4.9375 18.441406 3.167969 21.445312 1.914062 C 24.453125 0.664062 27.707031 0.0390625 31.214844 0.0390625 C 38.011719 0.0390625 43.414062 2.238281 47.425781 6.636719 C 51.429688 11.039062 53.4375 16.996094 53.4375 24.511719 L 53.4375 54.140625 L 39.160156 54.140625 L 39.160156 25.371094 C 39.160156 21.292969 38.140625 18.125 36.097656 15.871094 C 34.058594 13.617188 31.25 12.488281 27.671875 12.488281 C 23.808594 12.488281 20.695312 13.777344 18.332031 16.351562 C 15.972656 18.929688 14.792969 22.257812 14.792969 26.335938 L 14.792969 54.140625 L 0.515625 54.140625 Z M 0.515625 1.109375 " clip-rule="nonzero"/></clipPath><clipPath id="81b7480e77"><rect x="0" width="54" y="0" height="55"/></clipPath><clipPath id="d775c81624"><path d="M 314 60.945312 L 363.921875 60.945312 L 363.921875 116.328125 L 314 116.328125 Z M 314 60.945312 " clip-rule="nonzero"/></clipPath><clipPath id="e4e38b35b2"><path d="M 327.671875 112.945312 C 323.34375 110.691406 320 107.472656 317.636719 103.285156 C 315.277344 99.101562 314.097656 94.21875 314.097656 88.636719 C 314.097656 83.199219 315.292969 78.386719 317.691406 74.199219 C 320.089844 70.015625 323.433594 66.761719 327.726562 64.433594 C 332.019531 62.109375 336.992188 60.945312 342.644531 60.945312 C 350.515625 60.945312 357.3125 63.699219 363.039062 69.210938 L 354.773438 78.117188 C 353.269531 76.617188 351.515625 75.453125 349.515625 74.628906 C 347.511719 73.808594 345.398438 73.394531 343.183594 73.394531 C 338.746094 73.394531 335.148438 74.808594 332.394531 77.636719 C 329.640625 80.460938 328.265625 84.128906 328.265625 88.636719 C 328.265625 93.144531 329.640625 96.8125 332.394531 99.636719 C 335.148438 102.464844 338.746094 103.875 343.183594 103.875 C 348.046875 103.875 352.125 102.160156 355.417969 98.726562 L 363.789062 107.742188 C 357.847656 113.464844 350.871094 116.328125 342.859375 116.328125 C 337.0625 116.328125 332.003906 115.199219 327.671875 112.945312 Z M 327.671875 112.945312 " clip-rule="nonzero"/></clipPath><clipPath id="df2143a0f0"><path d="M 0.0585938 0.945312 L 49.8125 0.945312 L 49.8125 56.328125 L 0.0585938 56.328125 Z M 0.0585938 0.945312 " clip-rule="nonzero"/></clipPath><clipPath id="e7624dd84c"><path d="M 13.671875 52.945312 C 9.34375 50.691406 6 47.472656 3.636719 43.285156 C 1.277344 39.101562 0.0976562 34.21875 0.0976562 28.636719 C 0.0976562 23.199219 1.292969 18.386719 3.691406 14.199219 C 6.089844 10.015625 9.433594 6.761719 13.726562 4.433594 C 18.019531 2.109375 22.992188 0.945312 28.644531 0.945312 C 36.515625 0.945312 43.3125 3.699219 49.039062 9.210938 L 40.773438 18.117188 C 39.269531 16.617188 37.515625 15.453125 35.515625 14.628906 C 33.511719 13.808594 31.398438 13.394531 29.183594 13.394531 C 24.746094 13.394531 21.148438 14.808594 18.394531 17.636719 C 15.640625 20.460938 14.265625 24.128906 14.265625 28.636719 C 14.265625 33.144531 15.640625 36.8125 18.394531 39.636719 C 21.148438 42.464844 24.746094 43.875 29.183594 43.875 C 34.046875 43.875 38.125 42.160156 41.417969 38.726562 L 49.789062 47.742188 C 43.847656 53.464844 36.871094 56.328125 28.859375 56.328125 C 23.0625 56.328125 18.003906 55.199219 13.671875 52.945312 Z M 13.671875 52.945312 " clip-rule="nonzero"/></clipPath><clipPath id="4c7c7a3221"><rect x="0" width="50" y="0" height="57"/></clipPath><clipPath id="2ebf84af89"><path d="M 368.140625 61.105469 L 423.453125 61.105469 L 423.453125 116.417969 L 368.140625 116.417969 Z M 368.140625 61.105469 " clip-rule="nonzero"/></clipPath><clipPath id="b6e5db2c0d"><path d="M 0.714844 28.292969 L 92.65625 28.292969 L 92.65625 116.496094 L 0.714844 116.496094 Z M 0.714844 28.292969 " clip-rule="nonzero"/></clipPath></defs><g clip-path="url(#6f5dac3367)"><g clip-path="url(#22fe911202)"><g transform="matrix(1, 0, 0, 1, 23, 0)"><g clip-path="url(#dc38495a75)"><g clip-path="url(#bc60a13e81)"><g clip-path="url(#1a1fe097b1)"><path fill="#9ce8b2" d="M 0.949219 0 L 42.546875 0 L 42.546875 35.855469 L 0.949219 35.855469 Z M 0.949219 0 " fill-opacity="1" fill-rule="nonzero"/></g></g></g></g></g></g><g clip-path="url(#ad75c4b4fc)"><g transform="matrix(1, 0, 0, 1, 285, 130)"><g clip-path="url(#bfc8f113ba)"><g clip-path="url(#0e3106f3ca)"><path fill="#efe8df" d="M 0.808594 0.515625 L 14.566406 0.515625 L 14.566406 17.394531 L 0.808594 17.394531 Z M 0.808594 0.515625 " fill-opacity="1" fill-rule="nonzero"/></g></g></g></g><g clip-path="url(#c4f571a3d5)"><path fill="#efe8df" d="M 313.941406 131.730469 L 313.941406 138.707031 L 318.746094 138.707031 C 318.949219 138.707031 319.148438 138.6875 319.351562 138.648438 C 320.167969 138.496094 320.851562 138.105469 321.398438 137.46875 C 321.941406 136.816406 322.214844 136.074219 322.222656 135.230469 C 322.214844 134.382812 321.945312 133.632812 321.410156 132.980469 C 320.863281 132.347656 320.179688 131.949219 319.363281 131.792969 C 319.160156 131.761719 318.960938 131.742188 318.757812 131.730469 Z M 322.1875 147.585938 L 317.101562 139.910156 L 313.941406 139.910156 L 313.941406 147.585938 L 312.644531 147.585938 L 312.644531 130.519531 L 313.941406 130.519531 L 313.941406 130.53125 L 318.769531 130.53125 C 319.03125 130.539062 319.296875 130.566406 319.558594 130.613281 C 320.648438 130.820312 321.558594 131.347656 322.292969 132.195312 C 322.648438 132.617188 322.921875 133.089844 323.113281 133.613281 C 323.300781 134.136719 323.390625 134.675781 323.390625 135.230469 C 323.375 136.382812 323.007812 137.390625 322.28125 138.253906 C 321.546875 139.101562 320.636719 139.628906 319.546875 139.835938 C 319.285156 139.882812 319.023438 139.910156 318.757812 139.910156 L 318.726562 139.910156 L 323.808594 147.585938 Z M 322.1875 147.585938 " fill-opacity="1" fill-rule="nonzero"/></g><g clip-path="url(#c6b329dff5)"><path fill="#efe8df" d="M 341.195312 140.859375 L 348.273438 140.859375 L 344.734375 132.269531 Z M 351.054688 147.585938 L 348.832031 142.191406 L 340.636719 142.191406 L 338.414062 147.585938 L 336.964844 147.585938 L 344.011719 130.519531 L 345.460938 130.519531 L 352.503906 147.585938 Z M 351.054688 147.585938 " fill-opacity="1" fill-rule="nonzero"/></g><g clip-path="url(#e0b06f2b52)"><g clip-path="url(#0cabbca291)"><g transform="matrix(1, 0, 0, 1, 362, 130)"><g clip-path="url(#a239c7dbf9)"><g clip-path="url(#dd3a24775a)"><g clip-path="url(#53f36033ce)"><path fill="#efe8df" d="M 0.40625 0.515625 L 15.789062 0.515625 L 15.789062 17.402344 L 0.40625 17.402344 Z M 0.40625 0.515625 " fill-opacity="1" fill-rule="nonzero"/></g></g></g></g></g></g><g clip-path="url(#4aa9e00c49)"><g transform="matrix(1, 0, 0, 1, 390, 130)"><g clip-path="url(#41f3651b0b)"><g clip-path="url(#4700ad0c56)"><path fill="#efe8df" d="M 0.847656 0.515625 L 10.714844 0.515625 L 10.714844 17.359375 L 0.847656 17.359375 Z M 0.847656 0.515625 " fill-opacity="1" fill-rule="nonzero"/></g></g></g></g><g clip-path="url(#6e60c38031)"><g transform="matrix(1, 0, 0, 1, 413, 130)"><g clip-path="url(#31cf2a680e)"><g clip-path="url(#de1ffa27ec)"><path fill="#efe8df" d="M 0.800781 0.515625 L 11.84375 0.515625 L 11.84375 17.382812 L 0.800781 17.382812 Z M 0.800781 0.515625 " fill-opacity="1" fill-rule="nonzero"/></g></g></g></g><g clip-path="url(#155b22a741)"><g transform="matrix(1, 0, 0, 1, 99, 40)"><g clip-path="url(#edfb46498a)"><g clip-path="url(#4c70b551bb)"><path fill="#efe8df" d="M 0.792969 0.0429688 L 15.074219 0.0429688 L 15.074219 75.1875 L 0.792969 75.1875 Z M 0.792969 0.0429688 " fill-opacity="1" fill-rule="nonzero"/></g></g></g></g><g clip-path="url(#6b2d92cfe6)"><g transform="matrix(1, 0, 0, 1, 127, 40)"><g clip-path="url(#3b14f3e239)"><g clip-path="url(#bbf96f04a3)"><path fill="#efe8df" d="M 0.757812 0.0429688 L 15.039062 0.0429688 L 15.039062 75.1875 L 0.757812 75.1875 Z M 0.757812 0.0429688 " fill-opacity="1" fill-rule="nonzero"/></g></g></g></g><g clip-path="url(#a17f906130)"><path fill="#efe8df" d="M 155.746094 62.113281 L 170.289062 62.113281 L 170.289062 115.035156 L 155.746094 115.035156 Z M 156.730469 41.332031 C 158.40625 39.761719 160.519531 38.976562 163.070312 38.976562 C 165.621094 38.976562 167.753906 39.761719 169.46875 41.332031 C 171.179688 42.902344 172.035156 44.902344 172.035156 47.332031 C 172.035156 49.6875 171.179688 51.636719 169.46875 53.167969 C 167.753906 54.707031 165.621094 55.472656 163.070312 55.472656 C 160.519531 55.472656 158.40625 54.707031 156.730469 53.167969 C 155.050781 51.636719 154.214844 49.6875 154.214844 47.332031 C 154.214844 44.902344 155.050781 42.902344 156.730469 41.332031 " fill-opacity="1" fill-rule="nonzero"/></g><g clip-path="url(#2b1d768afb)"><path fill="#efe8df" d="M 198.746094 99.433594 C 201.464844 102.285156 204.9375 103.710938 209.164062 103.710938 C 213.460938 103.710938 216.96875 102.285156 219.691406 99.433594 C 222.414062 96.585938 223.777344 92.949219 223.777344 88.53125 C 223.777344 84.109375 222.414062 80.476562 219.691406 77.625 C 216.96875 74.773438 213.460938 73.347656 209.164062 73.347656 C 204.9375 73.347656 201.464844 74.773438 198.746094 77.625 C 196.023438 80.476562 194.664062 84.109375 194.664062 88.53125 C 194.664062 92.949219 196.023438 96.585938 198.746094 99.433594 M 192.890625 112.640625 C 188.984375 110.324219 185.941406 107.0625 183.757812 102.855469 C 181.574219 98.652344 180.484375 93.875 180.484375 88.53125 C 180.484375 83.183594 181.574219 78.410156 183.757812 74.203125 C 185.941406 69.996094 188.984375 66.738281 192.890625 64.417969 C 196.792969 62.105469 201.25 60.945312 206.265625 60.945312 C 209.988281 60.945312 213.445312 61.585938 216.632812 62.867188 C 219.816406 64.152344 222.484375 66.007812 224.632812 68.429688 L 225.601562 62.121094 L 237.957031 62.121094 L 237.957031 114.9375 L 225.601562 114.9375 L 224.632812 108.523438 C 222.414062 111.019531 219.726562 112.90625 216.578125 114.191406 C 213.425781 115.472656 209.988281 116.113281 206.265625 116.113281 C 201.25 116.113281 196.792969 114.957031 192.890625 112.640625 " fill-opacity="1" fill-rule="nonzero"/></g><g clip-path="url(#90d071fd48)"><g clip-path="url(#52c8be3069)"><g transform="matrix(1, 0, 0, 1, 251, 61)"><g clip-path="url(#81b7480e77)"><g clip-path="url(#0b92d48cc6)"><g clip-path="url(#6ff1ed3015)"><path fill="#efe8df" d="M 0.515625 0.0390625 L 53.363281 0.0390625 L 53.363281 54.140625 L 0.515625 54.140625 Z M 0.515625 0.0390625 " fill-opacity="1" fill-rule="nonzero"/></g></g></g></g></g></g><g clip-path="url(#d775c81624)"><g clip-path="url(#e4e38b35b2)"><g transform="matrix(1, 0, 0, 1, 314, 60)"><g clip-path="url(#4c7c7a3221)"><g clip-path="url(#df2143a0f0)"><g clip-path="url(#e7624dd84c)"><path fill="#efe8df" d="M 0.0976562 0.945312 L 49.742188 0.945312 L 49.742188 56.328125 L 0.0976562 56.328125 Z M 0.0976562 0.945312 " fill-opacity="1" fill-rule="nonzero"/></g></g></g></g></g></g><g clip-path="url(#2ebf84af89)"><path fill="#efe8df" d="M 409.808594 83.878906 C 409.523438 80.457031 408.175781 77.75 405.761719 75.753906 C 403.34375 73.757812 400.179688 72.761719 396.273438 72.761719 C 392.507812 72.761719 389.4375 73.742188 387.058594 75.699219 C 384.675781 77.660156 383.238281 80.386719 382.742188 83.878906 Z M 381.832031 112.957031 C 377.464844 110.679688 374.089844 107.453125 371.710938 103.28125 C 369.328125 99.113281 368.140625 94.25 368.140625 88.691406 C 368.140625 83.273438 369.292969 78.480469 371.601562 74.308594 C 373.910156 70.140625 377.160156 66.898438 381.355469 64.582031 C 385.546875 62.265625 390.378906 61.105469 395.847656 61.105469 C 404.445312 61.105469 411.195312 63.511719 416.097656 68.324219 C 421 73.136719 423.449219 79.710938 423.449219 88.046875 C 423.449219 89.6875 423.34375 91.433594 423.132812 93.285156 L 382.527344 93.285156 C 383.023438 96.636719 384.640625 99.3125 387.375 101.304688 C 390.109375 103.300781 393.574219 104.300781 397.765625 104.300781 C 400.609375 104.300781 403.34375 103.855469 405.972656 102.960938 C 408.601562 102.070312 410.769531 100.84375 412.472656 99.273438 L 420.359375 107.398438 C 417.589844 110.25 414.179688 112.460938 410.128906 114.027344 C 406.078125 115.59375 401.78125 116.378906 397.234375 116.378906 C 391.335938 116.378906 386.203125 115.238281 381.832031 112.957031 " fill-opacity="1" fill-rule="nonzero"/></g><g clip-path="url(#b6e5db2c0d)"><path fill="#efe8df" d="M 65.113281 98.660156 C 59.664062 96.8125 54.28125 94.8125 49.019531 92.625 C 44.707031 90.832031 40.476562 88.914062 36.375 86.84375 L 49.988281 55.023438 L 64.214844 88.28125 L 69.015625 99.949219 C 67.710938 99.527344 66.410156 99.101562 65.113281 98.660156 M 58.304688 40.082031 L 41.777344 40.082031 L 23.929688 79.714844 C 22.488281 78.761719 21.082031 77.777344 19.714844 76.753906 C 15.433594 73.539062 11.597656 69.914062 8.871094 65.804688 C 7.515625 63.75 6.460938 61.574219 5.847656 59.304688 C 5.230469 57.035156 5.0625 54.679688 5.398438 52.328125 C 5.726562 49.976562 6.554688 47.644531 7.753906 45.417969 C 8.957031 43.195312 10.488281 41.0625 12.261719 39.054688 C 15.84375 35.054688 20.226562 31.511719 24.910156 28.296875 C 19.835938 31.054688 14.976562 34.179688 10.730469 37.957031 C 8.625 39.859375 6.710938 41.945312 5.09375 44.234375 C 3.480469 46.523438 2.195312 49.039062 1.457031 51.722656 C 0.707031 54.402344 0.527344 57.226562 0.90625 60 C 1.28125 62.773438 2.195312 65.476562 3.460938 68.023438 C 4.722656 70.570312 6.332031 72.960938 8.128906 75.210938 C 9.929688 77.464844 11.933594 79.574219 14.054688 81.566406 C 16.136719 83.515625 18.324219 85.367188 20.589844 87.136719 L 7.40625 116.421875 L 23.824219 116.421875 L 30.171875 101.589844 L 32.726562 95.503906 C 36.125 97.609375 39.597656 99.609375 43.132812 101.515625 C 48.363281 104.339844 53.726562 106.96875 59.1875 109.445312 C 61.914062 110.683594 64.671875 111.878906 67.460938 113.039062 C 68.855469 113.621094 70.253906 114.191406 71.667969 114.75 L 73.808594 115.585938 L 74.894531 115.996094 L 76.039062 116.417969 L 76.039062 116.421875 L 92.566406 116.421875 Z M 58.304688 40.082031 " fill-opacity="1" fill-rule="nonzero"/></g></svg>';

/* --------------------------------------------------------------- accent/derived */

function derive(data) {
  const slug = data.slug;
  const canonical = data.meta.canonical || `https://alliance-travel.dz/${slug}/`;
  const ogImage = data.meta.og.image || `https://alliance-travel.dz/assets/images/og/og-${slug}.jpg`;
  return { slug, canonical, ogImage };
}

/* ------------------------------------------------------------------- <head> */

function renderHead(data) {
  const { slug, canonical, ogImage } = derive(data);
  const m = data.meta;
  const a = data.accent;
  const og = m.og;

  // FAQPage mainEntity derived from faq[]: text = answerHtml with tags stripped.
  const faqEntities = data.faq.map((f) => {
    const text = stripTags(f.answerHtml);
    return [
      `    {`,
      `      "@type": "Question",`,
      `      "name": ${jsonStr(f.question)},`,
      `      "acceptedAnswer": {`,
      `        "@type": "Answer",`,
      `        "text": ${jsonStr(text)}`,
      `      }`,
      `    }`,
    ].join("\n");
  }).join(",\n");

  return `<!DOCTYPE html>
<html lang="${data.lang}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${m.title}</title>
  <meta name="description" content="${m.description}"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Sans:ital,opsz,wght@1,9..40,400&display=swap" rel="stylesheet"/>
  <!-- v22: html.js flag for [data-aos] reveal CSS -->
  <script>document.documentElement.classList.add("js");</script>
  <link rel="stylesheet" href="../assets/css/styles.css"/>
  <style>
    :root {
      --accent: ${a.color};
      --accent-dim:   ${a.dim};
      --accent-glow:  ${a.glow};
      --hero-gradient: ${a.heroGradient};
    }
  </style>
<!-- Open Graph / Social -->
<meta property="og:type" content="${og.type}"/>
<meta property="og:title" content="${og.title}"/>
<meta property="og:description" content="${og.description}"/>
<meta property="og:url" content="${canonical}"/>
<meta property="og:site_name" content="${og.siteName}"/>
<meta property="og:locale" content="${og.locale}"/>
<meta name="twitter:title" content="${m.twitter.title}"/>
<meta name="twitter:description" content="${m.twitter.description}"/>
<meta name="theme-color" content="${m.themeColor}"/>
<link rel="canonical" href="${canonical}"/>
<!-- v22 i18n-SEO strategy (c): see docs/I18N-SEO.md -->
<link rel="alternate" hreflang="x-default" href="${canonical}"/>
<!-- v21 prod-prep: preload the LCP hero bg image -->
<link rel="preload" as="image" type="image/webp"
      href="../assets/images/heroes-v2/hero__${slug}--bg.webp"
      imagesrcset="../assets/images/heroes-v2/hero__${slug}--bg--mobile.webp 768w, ../assets/images/heroes-v2/hero__${slug}--bg.webp 1920w"
      imagesizes="100vw"
      fetchpriority="high"/>
<!-- v21 phase I.2: BreadcrumbList for SERP nav hierarchy -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Accueil",  "item": "https://alliance-travel.dz/" },
    { "@type": "ListItem", "position": 2, "name": "Voyages",  "item": "https://alliance-travel.dz/voyages/" },
    { "@type": "ListItem", "position": 3, "name": ${jsonStr(data.jsonLd.breadcrumbName)}, "item": "${canonical}" }
  ]
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TouristTrip",
  "name": ${jsonStr(data.jsonLd.touristTrip.name)},
  "description": ${jsonStr(data.jsonLd.touristTrip.description)},
  "subjectOf": {
    "@type": "WebPage",
    "url": "${canonical}"
  },
  "offers": {
    "@type": "Offer",
    "price": "${data.jsonLd.touristTrip.offerPrice}",
    "priceCurrency": "${data.jsonLd.touristTrip.priceCurrency}",
    "availability": "https://schema.org/InStock",
    "url": "${canonical}"
  },
  "provider": {
    "@type": "TravelAgency",
    "name": "Alliance Travel",
    "telephone": "+213561616266",
    "url": "https://alliance-travel.dz/",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Boulevard Houari Boumediene, La Graf",
      "addressLocality": "Bordj Bou Arreridj",
      "addressCountry": "DZ"
    }
  }
}
</script>
<!-- AT:faqpage-jsonld START -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
${faqEntities}
  ]
}
</script>
<!-- AT:faqpage-jsonld END -->
<!-- /enrich:meta -->
  <!-- AT:favicons-og START -->
<link rel="icon" type="image/png" sizes="32x32" href="../assets/images/favicon/favicon-32x32.png"/>
<link rel="icon" type="image/png" sizes="16x16" href="../assets/images/favicon/favicon-16x16.png"/>
<link rel="apple-touch-icon" sizes="180x180" href="../assets/images/favicon/apple-touch-icon.png"/>
<link rel="icon" type="image/x-icon" href="../assets/images/favicon/favicon.ico"/>
<link rel="manifest" href="../site.webmanifest"/>
<meta property="og:image" content="${ogImage}"/>
<meta property="og:image:width" content="${og.imageWidth}"/>
<meta property="og:image:height" content="${og.imageHeight}"/>
<meta name="twitter:image" content="${m.twitter.image}"/>
<meta name="twitter:card" content="${m.twitter.card}"/>
<!-- AT:favicons-og END -->
</head>`;
}

// Strip HTML tags to plain text for the FAQ JSON-LD. The reference shows extra
// spaces where stripped tags abutted punctuation (e.g. "14h00 ,"), so collapse
// tag boundaries to a single space then squeeze runs, but preserve the literal
// look of the reference by inserting a space in place of each removed tag.
function stripTags(html) {
  // Replace each tag with a space, then collapse multiple spaces, but keep the
  // reference's "word <space> punctuation" artifacts by NOT trimming around
  // punctuation. The reference output: tags become nothing but leave the text;
  // observed artifacts ("14h00 ," / "115.000 DA .") show a space remained where
  // a </strong> sat before punctuation. Emulate: remove tags, but where a tag
  // boundary produced an adjacent space+punct keep it.
  let out = html.replace(/<[^>]+>/g, " ");
  // Collapse the markers: a marker between text and a space -> nothing; a marker
  // directly before punctuation -> a single space (matches reference artifacts).
  out = out
    .replace(/ +/g, " ")          // squeeze consecutive markers
    .replace(/ ([.,;:!?])/g, " $1")    // marker before punctuation -> space
    .replace(/ /g, "");                 // drop remaining markers
  return out;
}

// JSON string serialize matching the reference's escaping (e.g. \" for quotes).
function jsonStr(s) {
  return JSON.stringify(String(s));
}

/* ---------------------------------------------------------------------- NAV */

function renderNav() {
  return `<body data-region="${"$REGION$"}" data-page="${"$PAGE$"}">
<a href="#main" class="skip-link">Aller au contenu principal</a>

<!-- ── NAV ─────────────────────────────────────────────────── -->
<nav class="site-nav" role="navigation" aria-label="Navigation principale">
  <a href="../index.html" class="nav-logo" aria-label="Alliance Travel">${NAV_LOGO_SVG}</a>
  <ul class="nav-links" role="list">
    <li><a href="#itinerary" data-i18n="nav.trip_program">Programme</a></li>
    <li><a href="#hotels" data-i18n="nav.trip_hotels">Hôtels</a></li>
    <li><a href="#faq" data-i18n="nav.trip_faq">FAQ</a></li>
    <li><a href="#booking" data-i18n="nav.trip_booking">Réserver</a></li>
    <li><a href="../rendez-vous-visa/" data-i18n="nav.visa_rdv">Visa</a></li>
  </ul>
  <button class="theme-toggle" type="button" data-i18n-aria-label="nav.theme_label" data-i18n-title="nav.theme_label" aria-label="Changer de thème" title="Changer de thème">
    <svg class="theme-toggle__sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
    <svg class="theme-toggle__moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
  </button>
  <a href="${WA_BASE}" class="nav-cta" target="_blank" rel="noopener" data-i18n-aria-label="nav.whatsapp_label">
    ${WA_ICON}
    Réserver
  </a>
</nav>`;
}

/* --------------------------------------------------------------------- HERO */

function renderHero(data) {
  const h = data.hero;
  // Title attribute fork: single vs pre/post.
  let titleAttrs;
  if (h.titleSingle != null) {
    titleAttrs = `         data-title="${h.titleSingle}"`;
  } else {
    titleAttrs = `         data-title-pre="${h.titlePre}"\n         data-title-post="${h.titlePost}"`;
  }
  return `<main id="main">
<!-- ── HERO (v13 scroll-expand) ─────────────────────────────────────── -->
<section class="scroll-hero" data-region="${data.region}"
         data-bg="${h.bg}"
         data-fg="${h.fg}"
${titleAttrs}
         data-eyebrow="${h.eyebrow}"
         data-date="${h.date}"
         data-prompt="${h.prompt}"
         data-skip="${h.skip}">
  <div class="scroll-hero__continuation">
    <h1>${h.h1Pre} <em>${h.h1Em}</em></h1>
    <p>${amp(h.lede)}</p>
    <div class="hero__price">
      <strong>${h.priceFrom}</strong><span>${h.priceUnit}</span>
    </div>
    <p class="hero-fineprint">${h.fineprint}</p>
    <div class="hero__ctas">
      <a href="#calculator" class="btn btn--primary" data-track-event="hero_cta_calculate">Calculer mon prix</a>
      <a href="${WA_BASE}" class="btn btn--ghost" data-track-event="hero_cta_whatsapp" target="_blank" rel="noopener">WhatsApp</a>
    </div>
    <!-- v21 phase E.2: .calc-cta-hint removed from hero — calculator UI is self-explanatory. --></div>
</section>`;
}

/* --------------------------------------------------------------- HIGHLIGHTS */

function renderHighlights(data) {
  const cards = data.highlights.map((c, i) => {
    const delay = i * 100;
    return `      <div class="hl-card" data-aos="fade-up" data-aos-delay="${delay}" data-aos-duration="600">
        <div class="hl-card__icon" aria-hidden="true">
          ${HL_ICONS[c.icon]}
        </div>
        <span class="hl-card__label">${c.label}</span>
        <h3 class="hl-card__title">${amp(c.title)}</h3>
        <p class="hl-card__body">${amp(c.body)}</p>
      </div>`;
  }).join("\n");
  return `<section class="highlights section-sm" aria-label="Points forts du voyage">
  <div class="container">
    <div class="highlights__grid">
${cards}
    </div>
  </div>
</section>`;
}

/* ---------------------------------------------------------------- ITINERARY */

function renderItinerary(data) {
  const it = data.itinerary;
  let aosCounter = { n: 0 };

  function renderDay(d, isFirstOverall) {
    const tags = (d.tags && d.tags.length)
      ? `\n              <div class="tl-tags">\n${d.tags.map((t) => `                <span class="tl-tag">${amp(t)}</span>`).join("\n")}\n              </div>`
      : "";
    let openDiv;
    if (d.active) {
      openDiv = `          <div class="tl-day active">`;
    } else {
      const delay = aosCounter.n * 80;
      aosCounter.n += 1;
      openDiv = `          <div class="tl-day" data-aos="fade-up" data-aos-delay="${delay}" data-aos-duration="550">`;
    }
    return `${openDiv}
            <div class="tl-node" aria-hidden="true">${d.node}</div>
            <div class="tl-content">
              <p class="tl-day-label">${d.dayLabel}</p>
              <h4 class="tl-title">${amp(d.title)}</h4>
              <p class="tl-activities">${amp(d.activities)}</p>${tags}
            </div>
          </div>`;
  }

  // The active day occupies the timeline ahead of the aos-counted days; but the
  // counter only advances on non-active days. We must advance the counter for
  // the active day's "slot"? No: reference shows active day has NO aos and the
  // first counted day (col0 day2) starts at delay 0. So counter starts at 0.
  if (it.layout === "split") {
    const colHtml = it.columns.map((col) => {
      const days = col.days.map((d) => renderDay(d)).join("\n");
      return `      <div>
        <h3 class="fs-h5 u-font-display u-text-accent u-mb-sp5">${amp(col.heading)}</h3>
        <div class="timeline">
${days}
        </div>
      </div>`;
    }).join("\n");
    return `<section class="itinerary-bg section" id="itinerary" aria-label="Programme du voyage">
  <div class="container">
    <div class="section-head">
      <span class="phase-marker"><span class="phase-marker__num">1</span><span class="phase-marker__label">Découvrir</span></span><p class="section-head__eyebrow" data-aos="fade-up" data-aos-duration="400">${it.eyebrow}</p>
      <h2 class="section-head__title" data-aos="fade-up" data-aos-duration="500">Votre <em>programme</em></h2>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--s10)" class="itinerary-split">
${colHtml}
    </div>
  </div>
</section>`;
  }

  // single layout
  const col = it.columns[0];
  const days = col.days.map((d) => renderDay(d)).join("\n");
  return `<section class="itinerary-bg section" id="itinerary" aria-label="Programme du voyage">
  <div class="container">
    <div class="section-head">
      <span class="phase-marker"><span class="phase-marker__num">1</span><span class="phase-marker__label">Découvrir</span></span><p class="section-head__eyebrow" data-aos="fade-up" data-aos-duration="400">${it.eyebrow}</p>
      <h2 class="section-head__title" data-aos="fade-up" data-aos-duration="500">Votre <em>programme</em></h2>
    </div>
    <div class="timeline">
${days}
    </div>
  </div>
</section>`;
}

/* ----------------------------------------------------------------- TRIP MAP */

function renderTripMap(data) {
  const tm = data.tripMap;
  return `
<!-- ── ITINERARY MAP ─────────────────────────────────── -->
<section class="trip-map-section section" id="trip-map-section" aria-label="Carte de l'itinéraire">
  <div class="container">
    <div class="section-head u-text-center u-measure-lg u-mx-auto">
      <p class="section-head__eyebrow" data-aos="fade-up" data-aos-duration="400">Votre voyage en un coup d'œil</p>
      <h2 class="section-head__title" data-aos="fade-up" data-aos-duration="500">L'itinéraire <em>sur la carte</em></h2>
      <p class="section-head__sub">${tm.subHead}</p>
    </div>
    <div id="trip-map" role="img" aria-label="${tm.ariaLabel}">
      <div class="tmap-fallback">
        <p class="tmap-fallback__title">Chargement de la carte…</p>
        <p class="tmap-fallback__sub">${tm.subFallback}</p>
      </div>
    </div>
    <div class="trip-map-legend" role="list" aria-label="Légende de la carte">
      <span class="trip-map-legend__item" role="listitem">
        <span class="trip-map-legend__chip trip-map-legend__chip--hotel" aria-hidden="true"></span>
        Hôtels au choix
      </span>
      <span class="trip-map-legend__item" role="listitem">
        <span class="trip-map-legend__chip trip-map-legend__chip--site" aria-hidden="true"></span>
        Sites visités
      </span>
      <span class="trip-map-legend__item" role="listitem">
        <span class="trip-map-legend__chip trip-map-legend__chip--tour" aria-hidden="true"></span>
        Excursions guidées
      </span>
    </div>
  </div>
</section>
${renderTripMapScript(tm.data)}
<script src="../assets/js/map-base.js" defer></script>
<script src="../assets/js/trip-map.js" defer></script>`;
}

// Render the window.TRIP_MAP_DATA literal to match the reference formatting.
function renderTripMapScript(d) {
  const num = (n) => String(n);
  const loc = (l) => `[${num(l[0])}, ${num(l[1])}]`;

  const hotelRows = d.hotels.map((h) => {
    return `      { id: ${js(h.id)}, name: ${js(h.name)}, loc: ${loc(h.loc)}, stars: ${h.stars}, area: ${js(h.area)} }`;
  }).join(",\n");

  const siteRows = d.sites.map((s) => {
    let row = `{ name: ${js(s.name)}, loc: ${loc(s.loc)}, day: ${dayVal(s.day)}`;
    if (s.featured) row += `, featured: true`;
    row += ` }`;
    return `      ${row}`;
  });
  // Inject the section comments present in the reference.
  const sitesWithComments = injectSiteComments(siteRows);

  const tourRows = d.tours.map((t) => {
    return `      { name: ${js(t.name)}, loc: ${loc(t.loc)}, day: ${dayVal(t.day)}, note: ${js(t.note)} }`;
  }).join(",\n");

  const hubRows = d.hubs.map((h) => {
    return `      { name: ${js(h.name)}, loc: ${loc(h.loc)}, days: ${js(h.days)} }`;
  }).join(",\n");

  const routeRows = d.routes.map((r) => {
    let row = `{ from: ${loc(r.from)}, to: ${loc(r.to)}, label: ${js(r.label)}, type: ${js(r.type)}`;
    if (r.lift != null) row += `, lift: ${r.lift}`;
    row += ` }`;
    return `      ${row}`;
  }).join(",\n");

  return `<script>
  /* Trip-map data — read by assets/js/trip-map.js below.
     Coordinates are [longitude, latitude] (note: opposite of Google Maps convention).
     All locations are real-world points; hotel positions are approximate to the
     resort's bay/area cluster (most Sharm hotels are in Nabq Bay or Sharks Bay). */
  window.TRIP_MAP_DATA = {
    name: ${js(d.name)},
    hotels: [
${hotelRows}
    ],
    sites: [
${sitesWithComments}
    ],
    tours: [
      // Cairo — day 8: guided dinner cruise on the Nile
${tourRows}
    ],
    hubs: [
${hubRows}
    ],
    routes: [
      // Day 6 transfer: Sharm Airport → Cairo Airport
${routeRows}
    ]
  };
</script>`;
}

// Site list in the reference has two comment lines splitting Sharm (2-5) from
// Cairo (day 7). Insert them before the first '2-5' day and before the first
// numeric-day-7 entry.
function injectSiteComments(rows) {
  const out = [];
  let addedSharm = false;
  let addedCairo = false;
  for (const r of rows) {
    if (!addedSharm && /day: '2-5'/.test(r)) {
      out.push(`      // Sharm El Sheikh — visited days 2-5`);
      addedSharm = true;
    }
    if (!addedCairo && /day: 7/.test(r)) {
      out.push(`      // Cairo — day 7 (featured = pulsing halo)`);
      addedCairo = true;
    }
    out.push(r);
  }
  // join with commas
  return out.map((line, i) => {
    // comment lines must not get a trailing comma; data lines get comma unless
    // they are the last data line.
    return line;
  }).reduce((acc, line, idx, arr) => {
    const isComment = /^\s*\/\//.test(line);
    if (isComment) { acc.push(line); return acc; }
    // find if there's a later data line
    const laterData = arr.slice(idx + 1).some((l) => !/^\s*\/\//.test(l));
    acc.push(line + (laterData ? "," : ""));
    return acc;
  }, []).join("\n");
}

function js(v) {
  // Single-quoted JS string literal matching the reference (which uses ' and
  // switches to " only when the value contains a single quote).
  const s = String(v);
  if (s.includes("'")) {
    return `"${s.replace(/"/g, '\\"')}"`;
  }
  return `'${s}'`;
}

function dayVal(day) {
  return typeof day === "number" ? String(day) : `'${day}'`;
}

/* -------------------------------------------------------------------- TRUST */

function renderTrust(data) {
  const t = data.trust;
  const stats = t.stats.map((s) =>
    `      <div class="stat-card"><div class="stat-card__num">${s.num}</div><p class="stat-card__label">${s.label}</p></div>`
  ).join("\n");
  const testis = t.testimonials.map((tt) => {
    const stars = "★".repeat(tt.stars);
    return `      <div class="testi-card">
        <div class="testi-stars" aria-label="${tt.stars} étoiles">${stars}</div>
        <p class="testi-text">"${amp(tt.text)}"</p>
        <div class="testi-author">
          <div class="testi-avatar" aria-hidden="true">${tt.initials}</div>
          <div><p class="testi-name">${tt.name}</p><p class="testi-trip">${tt.trip}</p></div>
        </div>
      </div>`;
  }).join("\n");
  return `<section class="trust-bg section" id="confiance" aria-label="Témoignages et confiance">
  <div class="container">
    <div class="section-head">
      <p class="section-head__eyebrow" data-aos="fade-up" data-aos-duration="400">${t.eyebrow}</p>
      <h2 class="section-head__title" data-aos="fade-up" data-aos-duration="500">Ils nous ont <em>fait confiance</em></h2>
    </div>
    <div class="stats-grid" style="margin-bottom:var(--s10)">
${stats}
    </div>
    <div class="testimonials-grid">
${testis}
    </div>
  </div>
</section>`;
}

/* ------------------------------------------------------------------- INCLUS */

function renderInclus(data) {
  const inc = data.inclus;
  const yes = inc.included.map((item) =>
    `        <div class="inclus-item inclus-item--yes">
          ${CHECK_SVG}
          <span>${item}</span>
        </div>`
  ).join("\n");
  const no = inc.excluded.map((item) =>
    `        <div class="inclus-item inclus-item--no">
          ${CROSS_SVG}
          <span>${item}</span>
        </div>`
  ).join("\n");
  return `<section class="inclus-section section" aria-label="Ce qui est inclus et non inclus">
  <div class="container">
    <div class="section-head">
      <p class="section-head__eyebrow" data-aos="fade-up" data-aos-duration="400">Tout est dit, rien n'est caché</p>
      <h2 class="section-head__title" data-aos="fade-up" data-aos-duration="500">Ce qui est <em>inclus</em>, ce qui ne l'est pas</h2>
      <p class="section-head__sub">${inc.sub}</p>
    </div>
    <div class="inclus-grid">

      <div class="inclus-col reveal">
        <div class="inclus-col__head">
          <div class="inclus-col__icon inclus-col__icon--yes">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <h3 class="inclus-col__title">Inclus dans le <em>forfait</em></h3>
            <p class="inclus-col__count">${inc.includedCount}</p>
          </div>
        </div>
        <div class="inclus-list">
${yes}
        </div>
      </div>

      <div class="inclus-col reveal">
        <div class="inclus-col__head">
          <div class="inclus-col__icon inclus-col__icon--no">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </div>
          <div>
            <h3 class="inclus-col__title">À <em>prévoir</em> en plus</h3>
            <p class="inclus-col__count">${inc.excludedCount}</p>
          </div>
        </div>
        <div class="inclus-list">
${no}
        </div>
      </div>

    </div>
  </div>
</section>`;
}

/* ---------------------------------------------------------------------- FAQ */

function renderFaq(data) {
  const items = data.faq.map((f, i) => {
    const chevron = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;
    if (f.open) {
      return `      <div class="faq-item open">
        <button class="faq-q" aria-expanded="true">
          ${f.question}
          ${chevron}
        </button>
        <div class="faq-a">${f.answerHtml}</div>
      </div>`;
    }
    const delay = (i - 1) * 50;
    return `      <div class="faq-item" data-aos="fade-up" data-aos-delay="${delay}" data-aos-duration="500">
        <button class="faq-q" aria-expanded="false">
          ${f.question}
          ${chevron}
        </button>
        <div class="faq-a">${f.answerHtml}</div>
      </div>`;
  }).join("\n");
  return `<section class="faq-bg section" id="faq" aria-label="Questions fréquentes">
  <div class="container">
    <div class="section-head u-text-center u-measure-md u-mx-auto">
      <p class="section-head__eyebrow" data-aos="fade-up" data-aos-duration="400">FAQ</p>
      <h2 class="section-head__title" data-aos="fade-up" data-aos-duration="500">Questions <em>fréquentes</em></h2>
    </div>
    <div class="faq-list">
${items}
    </div>
  </div>
</section>`;
}

/* ------------------------------------------------------------------- HOTELS */

function renderHotels(data) {
  const hs = data.hotelsSection;

  // tier tabs (nullable)
  let tabsHtml = "";
  if (hs.tierTabs) {
    const tabs = hs.tierTabs.map((t) =>
      `      <button class="tier-tab" role="tab" aria-pressed="${t.active ? "true" : "false"}" data-tier="${t.tier}" data-track-event="tier_filter" data-track-label="${t.tier}">${t.label}</button>`
    ).join("\n");
    tabsHtml = `
    <div class="tier-tabs" role="tablist" aria-label="Filtrer par catégorie">
${tabs}
    </div>
`;
  }

  // hotel grid modifier (KL single-hotel)
  const gridClass = hs.gridModifier ? `hotel-grid ${hs.gridModifier}` : "hotel-grid";
  const ctaText = hs.cardCta || "Sélectionner";

  const cards = data.hotels.map((h, i) => {
    const delay = i * 60;
    const cardClass = h.cardSelected ? "hotel-card selected" : "hotel-card";
    // stars markup variant: inline SVG (cairo-sharm) vs '★' string
    let starsBlock;
    if (data.starStyle === "svg") {
      const svgs = Array.from({ length: h.stars }, () => `            ${STAR_SVG}`).join("\n");
      starsBlock = `          <div class="hotel-card__stars" aria-label="${h.stars} étoiles">
${svgs}
          </div>`;
    } else {
      starsBlock = `          <div class="hotel-card__stars" aria-label="${h.stars} étoiles">${"★".repeat(h.stars)}</div>`;
    }
    const amenities = h.amenities.map((a) => `            <span class="amenity-pill">${a}</span>`).join("\n");
    const nameHtml = h.nameSuffix
      ? `${h.name} <span class="fs-caption u-text-3">${h.nameSuffix}</span>`
      : h.name;

    // price block (override support for azerbaidjan Yengice)
    let priceBlock;
    if (h.priceDisplayOverride) {
      const o = h.priceDisplayOverride;
      priceBlock = `          <div class="hotel-card__price">
            <span class="hotel-card__price-label">${o.label}</span>
            <strong>${o.strong}</strong>
            <span class="hotel-card__price-meta">${o.meta}</span>
          </div>`;
    } else {
      priceBlock = `          <div class="hotel-card__price">
            <span class="hotel-card__price-label">À partir de</span>
            <strong>${h.priceFrom}</strong>
            <span class="hotel-card__price-meta">${h.priceMeta}</span>
          </div>`;
    }

    const ariaLabel = h.cardAria || `Hôtel ${h.name} ${h.stars} étoiles`;

    return `      <article class="${cardClass}" data-aos="fade-up" data-aos-delay="${delay}" data-aos-duration="550" role="listitem" data-hotel-id="${h.id}" data-tier="${h.tier}" tabindex="0" aria-label="${ariaLabel}">
        <div class="hotel-card__img">
          <img class="hotel-card__photo" src="${h.image}" alt="${h.alt}" loading="lazy" width="800" height="600" decoding="async"/>
          <span class="hotel-card__ribbon ${h.tier}">${h.ribbon}</span>
        </div>
        <div class="hotel-card__body">
${starsBlock}
          <h3 class="hotel-card__name">${nameHtml}</h3>
          <div class="hotel-card__amenities">
${amenities}
          </div>
${priceBlock}
          <button class="hotel-card__cta" data-track-event="hotel_select">${ctaText}</button>
        </div>
      </article>`;
  });

  // The reference interleaves an HTML comment before each card and a blank line
  // between cards. Build with the comment headers.
  const cardsHtml = data.hotels.map((h, i) => {
    const comment = h.cardComment ? `      <!-- ${h.cardComment} -->\n` : "";
    return comment + cards[i];
  }).join("\n\n");

  const afterGrid = hs.afterGridNote ? `\n${hs.afterGridNote}` : "";

  return `<section class="hotels section" id="hotels" aria-label="Choisissez votre hôtel">
  <div class="container">
    <div class="section-head">
      <span class="phase-marker"><span class="phase-marker__num">2</span><span class="phase-marker__label">${hs.phaseLabel}</span></span><p class="section-head__eyebrow" data-aos="fade-up" data-aos-duration="400">${hs.eyebrow}</p>
      <h2 class="section-head__title" data-aos="fade-up" data-aos-duration="500">${hs.title}</h2>
      <p class="section-head__sub">${hs.sub}</p>
    </div>
${tabsHtml}
    <div class="${gridClass}" role="list">

${cardsHtml}

    </div>${afterGrid}
  </div>
</section>`;
}

/* --------------------------------------------------------------- CALCULATOR */

function renderCalculator(data) {
  const c = data.calculator;

  // date chips
  const chips = c.dates.map((d, i) => {
    const active = i === 0;
    return active
      ? `            <button class="date-chip active" type="button" role="radio" tabindex="0" aria-checked="true" data-date="${d}">${d}</button>`
      : `            <button class="date-chip" type="button" role="radio" tabindex="-1" aria-checked="false" data-date="${d}">${d}</button>`;
  }).join("\n");

  // hotel select options
  const options = data.hotels.map((h) =>
    `            <option value="${h.id}">${h.selectOption}</option>`
  ).join("\n");

  // room type segmented control
  const roomLabels = { double: "Double", triple: "Triple", single: "Individuelle" };
  const segs = c.roomTypes.map((rt, i) => {
    const label = (c.roomLabels && c.roomLabels[rt]) || roomLabels[rt];
    return i === 0
      ? `            <button class="seg-opt active" data-room="${rt}">${label}</button>`
      : `            <button class="seg-opt" data-room="${rt}">${label}</button>`;
  }).join("\n");

  // group steppers
  const gc = c.groupConfig;
  const adultsRow = `            <div class="stepper-item">
              <div class="stepper-item__info">
                <h4>${gc.adults.label}</h4>
                <p>${gc.adults.hint}</p>
              </div>
              <div class="stepper" role="group" aria-label="Nombre d'adultes">
                <button class="stepper__btn" id="adults-minus" aria-label="Réduire adultes">−</button>
                <span class="stepper__val" id="adults-val" aria-live="polite">${gc.adults.default}</span>
                <button class="stepper__btn" id="adults-plus" aria-label="Augmenter adultes">+</button>
              </div>
            </div>`;

  // kid/baby rows: iterate over groupConfig entries that have a kidType, in
  // declaration order (after adults).
  const kidRows = Object.keys(gc)
    .filter((k) => k !== "adults")
    .map((k) => {
      const row = gc[k];
      const ariaNoun = row.ariaNoun || row.label.toLowerCase();
      return `            <div class="stepper-item">
              <div class="stepper-item__info">
                <h4>${row.label}</h4>
                <p>${row.hint}</p>
              </div>
              <div class="stepper kid-stepper" data-kid-type="${row.kidType}" role="group" aria-label="Nombre de ${ariaNoun}">
                <button class="stepper__btn kid-minus" aria-label="Réduire ${ariaNoun}">−</button>
                <span class="stepper__val kid-val" aria-live="polite">0</span>
                <button class="stepper__btn kid-plus" aria-label="Augmenter ${ariaNoun}">+</button>
              </div>
            </div>`;
    }).join("\n");

  // extras (visible UI toggles)
  let extrasHtml = "";
  const uiExtras = c.extras.filter((e) => e.uiLabel);
  if (uiExtras.length) {
    const toggles = uiExtras.map((e) =>
      `            <div class="extra-toggle" role="checkbox" aria-checked="false" tabindex="0">
              <div class="extra-toggle__check" aria-hidden="true"></div>
              <div class="extra-toggle__info">
                <p class="extra-toggle__label">${e.uiLabel}</p>
                <p class="extra-toggle__detail">${e.uiDetail}</p>
              </div>
              <span class="extra-toggle__price">${e.uiPrice}</span>
            </div>`
    ).join("\n");
    extrasHtml = `

        <div class="calc-form-group">
          <label class="calc-form-label">Suppléments</label>
          <div class="extras-list">
${toggles}
          </div>
        </div>`;
  }

  // optional form note (istanbul)
  const formNote = c.formNote ? `\n${c.formNote}` : "";
  // hotel select single-hotel data attr
  const singleHotelAttr = c.singleHotel ? ` data-single-hotel="true"` : "";

  return `<section class="calc-section section" id="calculator" aria-label="Calculateur de prix">
  <div class="container">
    <div class="section-head">
      <span class="phase-marker"><span class="phase-marker__num">3</span><span class="phase-marker__label">Calculer mon prix</span></span><p class="section-head__eyebrow" data-aos="fade-up" data-aos-duration="400">Étape 1 · Configurez votre voyage</p>
      <h2 class="section-head__title" data-aos="fade-up" data-aos-duration="500">Choisissez <em>votre formule</em></h2>
      <p class="section-head__sub">Chaque dinar est expliqué. Choisissez votre configuration et obtenez le total exact, sans surprise.</p>
    </div>

    <div class="calc-grid">
      <!-- Form -->
      <div class="calc-form" role="form" aria-label="Formulaire de calcul">

        <div class="calc-form-group">
          <label class="calc-form-label">Date de départ</label>
          <div class="date-chips" role="group" aria-label="Dates disponibles">
${chips}
          </div>
        </div>

        <div class="calc-form-group">
          <label class="calc-form-label" for="hotel-select">Hôtel sélectionné</label>
          <select id="hotel-select"${singleHotelAttr} class="fs-body-sm u-text-1" style="background:var(--bg); border:1px solid var(--border); border-radius:var(--r2); padding:var(--space-3) var(--space-4); width:100%; cursor:pointer; appearance:none" aria-label="Choisissez un hôtel">
${options}
          </select>
        </div>

        <div class="calc-form-group">
          <label class="calc-form-label">Type de chambre</label>
          <div class="segmented" role="group" aria-label="Type de chambre">
${segs}
          </div>
        </div>

        <div class="calc-form-group">
          <label class="calc-form-label">Composition du groupe</label>
          <div class="stepper-row">
${adultsRow}
${kidRows}
          </div>
        </div>${formNote}${extrasHtml}
      </div>

      <!-- Breakdown -->
      <div>
        <div class="breakdown" id="breakdown" aria-label="Récapitulatif du prix">
          <div class="breakdown__header">Récapitulatif</div>
          <div class="breakdown__lines" id="breakdown-lines" aria-live="polite">
            <p class="breakdown__empty">Sélectionnez un hôtel ci-dessus pour voir le détail.</p>
          </div>
          <div class="u-divider"></div>
          <div class="breakdown__total">
            <span class="breakdown__total-label">Total estimé</span>
            <span class="breakdown__total-amount" id="breakdown-total" aria-live="polite" aria-atomic="true">—</span>
          </div>
          <div class="breakdown__usd u-hidden" id="breakdown-usd"></div>
          <div class="breakdown__why" id="breakdown-why">
            <details>
              <summary>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                Pourquoi ce prix ?
              </summary>
              <p id="breakdown-why-details" class="u-mt-sp3" style="line-height:1.65">
                ${c.whyDefault}
              </p>
            </details>
          </div>
          <div class="breakdown__ctas">
            <a href="#booking" class="btn btn--primary btn--full" data-track-event="calc_continue_to_booking">
              Continuer vers la réservation
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
            </a>
          </div>
        </div>
        <p class="fs-caption u-text-3 u-mt-sp3 u-text-center">Étape suivante : remplissez votre dossier ci-dessous</p>
      </div>
    </div>
  </div>
</section>`;
}

/* ------------------------------------------------------------------ BOOKING */
// The reference booking shell is idiosyncratic: a broken <section> containing a
// stray " en ligne</h3>..." fragment (a truncated dup of the noscript), then a
// separate full <noscript> block. Reproduced byte-for-byte as shared markup.

function renderBooking() {
  return `<section class="booking-section section" id="booking" aria-label="Formulaire de réservation">
 en ligne</h3><p class="u-noscript-msg">Le formulaire de réservation interactif requiert JavaScript. En attendant, vous pouvez nous contacter directement&nbsp;:</p><p class="fs-body-lg u-m-0"><a href="${WA_BASE}" class="u-text-mint u-fw-600 u-no-decoration">WhatsApp&nbsp;: 0561 616 266</a><br><br><a href="tel:+213561616266" class="u-text-mint u-no-decoration">Téléphone&nbsp;: 0561 616 266</a></p></div></noscript>

</section>
<noscript><div class="u-measure-lg u-text-center u-noscript-card"><h3 class="fs-h5 u-noscript-title">Activez JavaScript pour réserver en ligne</h3><p class="u-noscript-msg">Le formulaire de réservation interactif requiert JavaScript. En attendant, vous pouvez nous contacter directement&nbsp;:</p><p class="fs-body-lg u-m-0"><a href="${WA_BASE}" class="u-text-mint u-fw-600 u-no-decoration">WhatsApp&nbsp;: 0561 616 266</a><br><br><a href="tel:+213561616266" class="u-text-mint u-no-decoration">Téléphone&nbsp;: 0561 616 266</a></p></div></noscript>`;
}

/* --------------------------------------------------------------- INFOBLOCKS */

function renderInfoBlocks(data) {
  const blocks = data.infoBlocks.map((b) => {
    const openAttr = b.open ? " open" : "";
    const chevron = `<svg class="info-card__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;
    const lede = b.lede ? `\n            <p class="info-card__lede">${b.lede}</p>` : "";
    const listClass = b.listTiered ? "info-list info-list--tiered" : "info-list";
    const lis = b.list.map((li) => `              <li>${li}</li>`).join("\n");
    const note = b.note ? `\n            <p class="info-card__note">\n              ${b.note}\n            </p>` : "";
    // info-card__body: lede then list then note. The reference has no blank line
    // before <ul>; lede (if any) precedes it directly.
    return `        <details class="info-card"${openAttr}>
          <summary class="info-card__head">
            <span class="info-card__icon" aria-hidden="true">
              ${INFO_ICONS[b.icon]}
            </span>
            <span class="info-card__title">${b.title}</span>
            ${chevron}
          </summary>
          <div class="info-card__body">${lede}
            <ul class="${listClass}">
${lis}
            </ul>${note}
          </div>
        </details>`;
  }).join("\n\n\n");

  return `<section class="info-block-section section" id="conditions" aria-label="Informations pratiques pour votre réservation">
  <div class="container">
    <div class="section-head">
      <p class="section-head__eyebrow" data-aos="fade-up" data-aos-duration="400">Avant de partir</p>
      <h2 class="section-head__title" data-aos="fade-up" data-aos-duration="500">Tout ce qu'il <em>faut savoir</em></h2>
      <p class="section-head__sub">Paiement, annulation, formalités visa, assurance — la transparence en quatre blocs.</p>
    </div>
    <div class="info-block-grid">

${blocks}

    </div>
  </div>
</section>`;
}

/* ------------------------------------------------------------------ RELATED */

// Decorative per-slug SVG art for related cards, keyed by target slug.
const RELATED_ART = {
  "sharm-constantine": `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="u-size-full">
<rect width="100" height="100" fill="#020c12"/>
<radialGradient id="ssh-sharm-constantine-g" cx="50%" cy="60%" r="60%"><stop offset="0" stop-color="#28B4D4" stop-opacity=".3"/><stop offset="1" stop-color="transparent"/></radialGradient>
<rect width="100" height="100" fill="url(#ssh-sharm-constantine-g)"/>
<rect x="0" y="58" width="100" height="42" fill="#04121e"/>
<polygon points="0,60 22,30 44,55 0,55" fill="#0a1e2a" fill-opacity=".8"/>
<polygon points="50,60 75,32 95,55 70,60" fill="#0a1e2a" fill-opacity=".8"/>
<ellipse cx="50" cy="62" rx="46" ry="2" fill="#E88A3A" fill-opacity=".15"/>
<ellipse cx="80" cy="18" r="7" fill="#FFF8F0" fill-opacity=".1"/>
</svg>`,
  "azerbaidjan": `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="u-size-full">
<rect width="100" height="100" fill="#060a16"/>
<radialGradient id="az-azerbaidjan-g" cx="50%" cy="100%" r="80%"><stop offset="0" stop-color="#3AAFAF" stop-opacity=".35"/><stop offset="1" stop-color="transparent"/></radialGradient>
<rect width="100" height="100" fill="url(#az-azerbaidjan-g)"/>
<path d="M30 88 Q33 30 38 22 Q42 15 46 22 Q51 30 54 88 Z" fill="#1a2d5a" fill-opacity=".85"/>
<path d="M48 88 Q51 38 56 30 Q60 24 63 30 Q68 38 71 88 Z" fill="#3AAFAF" fill-opacity=".55"/>
<path d="M65 88 Q68 45 72 38 Q75 33 77 38 Q81 45 84 88 Z" fill="#1a2d5a" fill-opacity=".75"/>
</svg>`,
};

function relatedSlugFromHref(href) {
  // "../sharm-constantine/" -> "sharm-constantine"
  return href.replace(/^\.\.\//, "").replace(/\/$/, "");
}

function renderRelated(data) {
  const cards = data.related.map((r) => {
    const slug = relatedSlugFromHref(r.href);
    const art = RELATED_ART[slug] || "";
    return `      <a href="${r.href}" class="related-card reveal">
        <div class="related-card__art u-radius-clip">
          ${art}
        </div>
        <div class="related-card__body">
          <span class="related-card__flag" style="color:${r.color}">${r.flag}</span>
          <h3 class="related-card__title">${r.title}</h3>
          <p class="related-card__price">À partir de <strong>${r.priceFrom}</strong></p>
          <span class="related-card__cta" style="color:${r.color}">
            Voir ce voyage
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </span>
        </div>
      </a>`;
  }).join("\n");
  return `<section class="related-section section" aria-label="Vous aimerez aussi">
  <div class="container">
    <div class="section-head">
      <p class="section-head__eyebrow" data-aos="fade-up" data-aos-duration="400">Vous aimerez aussi</p>
      <h2 class="section-head__title" data-aos="fade-up" data-aos-duration="500">Continuez votre <em>découverte</em></h2>
    </div>
    <div class="related-grid">

${cards}
    </div>
  </div>
</section>`;
}

/* ----------------------------------------------------------------- FINAL CTA */

function renderFinalCta(data) {
  const f = data.finalCta;
  const reserveText = encodeWaText(f.waReserveText);
  return `<section class="final-cta" aria-label="Réservation finale">
  <div class="container">
    <div class="final-cta__scarcity" role="alert">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      ${f.scarcity}
    </div>
    <h2 class="final-cta__title">${f.title}</h2>
    <p class="final-cta__sub">${f.sub}</p>
    <div class="final-cta__actions">
      <a href="https://wa.me/213561616266?text=${reserveText}" class="btn btn--wa" data-track-event="final_cta_whatsapp" target="_blank" rel="noopener">
        ${WA_ICON_18}
        Réserver via WhatsApp
      </a>
      <a href="${WA_BASE}" class="btn btn--ghost" data-track-event="final_cta_phone" target="_blank" rel="noopener">0561 616 266</a>
      <a href="https://wa.me/213561616268?text=Bonjour%20Alliance%20Travel%2C%20j%27aimerais%20en%20savoir%20plus." class="btn btn--ghost" target="_blank" rel="noopener">0561 616 268</a>
    </div>
    <div class="contact-row">
      <div class="contact-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/></svg>
        ${f.addressLine}
      </div>
      <div class="contact-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.15h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.73a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        <a href="https://wa.me/213560869905?text=Bonjour%20Alliance%20Travel%2C%20j%27aimerais%20en%20savoir%20plus." target="_blank" rel="noopener" class="contact-phone-link">0560 869 905</a> · <a href="https://wa.me/213560860617?text=Bonjour%20Alliance%20Travel%2C%20j%27aimerais%20en%20savoir%20plus." target="_blank" rel="noopener" class="contact-phone-link">0560 860 617</a> · <a href="https://wa.me/213561616269?text=Bonjour%20Alliance%20Travel%2C%20j%27aimerais%20en%20savoir%20plus." target="_blank" rel="noopener" class="contact-phone-link">0561 616 269</a>
      </div>
    </div>
  </div>
</section>`;
}

// Encode the reserve WhatsApp text the way the reference does: spaces -> %20,
// %2C for commas, %26 for &, but accented letters stay literal (UTF-8 in URL).
function encodeWaText(text) {
  return text
    .replace(/%/g, "%25")
    .replace(/ /g, "%20")
    .replace(/,/g, "%2C")
    .replace(/&/g, "%26")
    .replace(/'/g, "%27");
}

/* ------------------------------------------------------------------- FOOTER */

function renderFooter() {
  return `<footer class="site-footer" role="contentinfo">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <span class="footer-logo">Alliance<span>Travel</span></span>
        <p class="footer-tagline" data-i18n="footer.tagline">Voyages guidés depuis Bordj Bou Arreridj. Plus de 1.200 voyageurs satisfaits depuis 2019.</p>
        <div class="footer-social">
          <a href="https://www.instagram.com/alliance_travel34/" target="_blank" rel="noopener" aria-label="Instagram Alliance Travel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          </a>
          <a href="https://web.facebook.com/Alliance.Mebarkia" target="_blank" rel="noopener" aria-label="Facebook Alliance Travel"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.5 9.95v-7.04H8v-2.91h2.5V9.84c0-2.47 1.49-3.84 3.77-3.84 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.91H13.6v7.04A10 10 0 0 0 22 12z"/></svg></a>
          <a href="https://web.facebook.com/visa.bba.9" target="_blank" rel="noopener" aria-label="Facebook Alliance Travel — Visa BBA"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.5 9.95v-7.04H8v-2.91h2.5V9.84c0-2.47 1.49-3.84 3.77-3.84 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.91H13.6v7.04A10 10 0 0 0 22 12z"/></svg></a>
          <a href="https://www.tiktok.com/@visa.bba34" target="_blank" rel="noopener" aria-label="TikTok Alliance Travel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.05z"/></svg>
          </a>
        </div>
      </div>
      <div class="footer-col">
        <h4>Nos Voyages</h4>
        <a href="../cairo-sharm/">Le Caire &amp; Sharm</a>
        <a href="../azerbaidjan/">Azerbaïdjan</a>
        <a href="../istanbul/">Istanbul</a>
        <a href="../kuala-lumpur/">Kuala Lumpur</a>
        <a href="../sharm-constantine/">Sharm El Sheikh · Constantine</a>
      </div>
      <div class="footer-col">
        <h4 data-i18n="footer.col_contact">Contact</h4>

        <div class="phone-group">
          <p class="phone-group__head">${WA_ICON_13}<span data-i18n="footer.wa_viber">WhatsApp / Viber</span></p>
          <a href="https://wa.me/213560860617?text=Bonjour%20Alliance%20Travel%2C%20j%27aimerais%20en%20savoir%20plus." target="_blank" rel="noopener">0560 860 617</a>
          <a href="https://wa.me/213561616266?text=Bonjour%20Alliance%20Travel%2C%20j%27aimerais%20en%20savoir%20plus." target="_blank" rel="noopener">0561 616 266</a>
        </div>
        <div class="phone-group">
          <p class="phone-group__head"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span data-i18n="footer.phone">Téléphone</span></p>
          <a href="https://wa.me/213561616267?text=Bonjour%20Alliance%20Travel%2C%20j%27aimerais%20en%20savoir%20plus." target="_blank" rel="noopener">0561 616 267</a>
          <a href="https://wa.me/213561616268?text=Bonjour%20Alliance%20Travel%2C%20j%27aimerais%20en%20savoir%20plus." target="_blank" rel="noopener">0561 616 268</a>
          <a href="https://wa.me/213561616269?text=Bonjour%20Alliance%20Travel%2C%20j%27aimerais%20en%20savoir%20plus." target="_blank" rel="noopener">0561 616 269</a>
          <a href="https://wa.me/213560869905?text=Bonjour%20Alliance%20Travel%2C%20j%27aimerais%20en%20savoir%20plus." target="_blank" rel="noopener">0560 869 905</a>
        </div>
        <div class="phone-group">
          <p class="phone-group__head"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span data-i18n="footer.address_label">Adresse</span></p>
          <p class="fs-body-sm u-text-2 u-m-0">Cité 5 Juillet, Bd. de l'ALN<br>Bordj Bou Arreridj, Algérie</p>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <p data-i18n="footer.copyright">© 2026 Alliance Travel · Bordj Bou Arreridj, Algérie</p>
      <p data-i18n="footer.notice">Prix en Dinar Algérien (DA) · Indicatifs · Confirmation à la réservation</p>
    </div>
  </div>
</footer>`;
}

/* ------------------------------------------------------------- TRIP_DATA / scripts */

function renderTripDataScript(data) {
  const c = data.calculator;
  const hotelRows = data.hotels.map((h) => {
    const p = h.prices;
    const prices = `{ double: ${p.double}, triple: ${p.triple}, single: ${p.single}, child1: ${p.child1}, child2: ${p.child2}, baby: ${p.baby} }`;
    return `    { id: ${js(h.id)}, name: ${js(h.calcName)}, prices: ${prices}, why: ${js(h.why)} },`;
  }).join("\n");

  const extraRows = c.extras.map((e) => {
    return `    { label: ${js(e.label)}, amount: ${e.amount}, currency: ${js(e.currency)} },`;
  }).join("\n");

  return `<!-- ── TRIP DATA ──────────────────────────────────────── -->
<script>
window.TRIP_DATA = {
  name: ${js(c.name)},
  dates: [${c.dates.map((d) => js(d)).join(", ")}],
  hotels: [
${hotelRows}
  ],
  extras: [
${extraRows}
  ],
};
</script>`;
}

function renderScripts(data) {
  // The itinerary-split responsive style is appended only for split layouts.
  const splitStyle = data.itinerary.layout === "split"
    ? `
<!-- Itinerary split responsive fix -->
<style>
  @media (max-width: 768px) {
    .itinerary-split { grid-template-columns: 1fr !important; }
  }
</style>`
    : "";

  return `<!-- ── MOBILE STICKY BAR ────────────────────────────────── -->
<div class="sticky-total" id="sticky-total-bar" aria-label="Total estimé">
  <div>
    <p class="sticky-total__label">Total estimé</p>
    <p class="sticky-total__amount" id="sticky-total-amount">—</p>
  </div>
  <button class="btn btn--primary btn--sm" id="sticky-cta-btn" data-track-event="sticky_cta_book">Réserver</button>
</div>

${renderTripDataScript(data)}
<script src="../assets/js/scroll-hero.js" defer></script>
<script src="../assets/js/calculator.js" defer></script>
${splitStyle}
<script src="../assets/js/booking-form.js" defer></script>
<script src="../assets/js/i18n.js" defer></script>
  <script src="../assets/js/enhance.js" defer></script>
  </body>
</html>`;
}

/* ------------------------------------------------------------------ assemble */

export function renderTrip(data) {
  const head = renderHead(data);
  let nav = renderNav()
    .replace("$REGION$", data.region)
    .replace("$PAGE$", data.dataPage);

  const parts = [
    head,
    nav,
    renderHero(data),
    renderHighlights(data),
    renderItinerary(data),
    renderTripMap(data),
    renderTrust(data),
    renderInclus(data),
    renderFaq(data),
    renderHotels(data),
    renderCalculator(data),
    renderBooking(data),
    renderInfoBlocks(data),
    renderRelated(data),
    renderFinalCta(data),
    "</main>\n",
    renderFooter(data),
    "",
    renderScripts(data),
  ];

  // Join. Section boundaries in the reference are mostly single newlines; the
  // exact joins are tuned during the diff loop.
  return parts.join("\n");
}
