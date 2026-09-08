/* Alliance Travel — Privacy notice banner
 *
 * Scope: this site sets NO tracking cookies (see /politique-cookies/).
 * It does however load Google Fonts, MapLibre and cobe from third-party
 * CDNs, which receive the visitor's IP for the purpose of serving the
 * files. That is a personal-data disclosure under loi 18-07 and warrants
 * an informational notice (not a blocking consent gate).
 *
 * Behavior: a small non-blocking banner appears at the bottom of the
 * viewport on first visit, links to the cookie policy, and disappears
 * after "Compris". Dismissal persists in localStorage.
 */
(function () {
  'use strict';

  const KEY = 'at-privacy-notice-v1';

  // Already dismissed? Skip.
  try {
    if (localStorage.getItem(KEY) === '1') return;
  } catch (e) { /* private mode — show anyway, won't persist */ }

  // Don't show on the legal pages themselves — user is already reading them.
  const path = location.pathname;
  if (/\/(politique-cookies|politique-confidentialite|mentions-legales|conditions-generales)\//.test(path)) {
    return;
  }

  // Resolve the link to the cookies policy from the current directory depth.
  // Simplest: absolute path.
  const cookiesHref = '/politique-cookies/';

  const banner = document.createElement('aside');
  banner.className = 'at-privacy-notice';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Notification confidentialité');
  banner.innerHTML = `
    <div class="at-privacy-notice__inner">
      <div class="at-privacy-notice__body">
        <strong>Confidentialité.</strong>
        Ce site ne pose <strong>aucun cookie de suivi</strong>. Il charge
        cependant des polices d'écriture et des cartes depuis des serveurs
        tiers (Google Fonts, MapLibre, OpenStreetMap) qui reçoivent votre
        adresse IP. Détails dans notre
        <a href="${cookiesHref}" class="at-privacy-notice__link">politique des cookies</a>.
      </div>
      <button type="button" class="at-privacy-notice__ok" aria-label="Fermer et mémoriser">
        Compris
      </button>
    </div>
  `;
  document.body.appendChild(banner);

  banner.querySelector('.at-privacy-notice__ok').addEventListener('click', () => {
    try { localStorage.setItem(KEY, '1'); } catch (e) { /* ignore */ }
    banner.classList.add('at-privacy-notice--out');
    setTimeout(() => banner.remove(), 320);
  });
})();
