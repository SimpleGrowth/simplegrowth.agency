// Google Analytics 4, gated behind an opt-in. UK PECR wants consent before
// a non-essential cookie is set, so this boots Google Consent Mode with
// storage denied: gtag.js loads and reports cookielessly, and only the
// visitor accepting the banner flips analytics_storage on. The answer
// persists in localStorage, so the banner asks once per browser.
//
// ── Switching it on ──
// Paste the GA4 Measurement ID below (looks like 'G-ABC1234XYZ'). While
// it's empty nothing loads at all — no gtag request, no banner — so this
// file is safe to ship before the Google property exists.
const GA_MEASUREMENT_ID = '';

const CONSENT_KEY = 'sg-analytics-consent';
const storedConsent = readConsent();

if (GA_MEASUREMENT_ID) {
  startAnalytics();
  if (!storedConsent) showConsentBanner();
}

// 'granted' / 'denied' / null for undecided. A browser that refuses
// localStorage (Safari private mode and friends) reads as undecided, which
// keeps the banner showing rather than assuming an answer nobody gave.
function readConsent() {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

function startAnalytics() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };

  // Must be queued before gtag.js loads, or the tag briefly runs unconsented.
  // ad_* stay denied permanently — the site carries no advertising tags, so
  // asking for that consent would be broader than what it actually does.
  // Adding remarketing later means granting them in grantConsent() too, and
  // saying so on the banner.
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  });
  if (storedConsent === 'granted') grantConsent();

  const tag = document.createElement('script');
  tag.async = true;
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(tag);

  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);
}

function grantConsent() {
  gtag('consent', 'update', { analytics_storage: 'granted' });
}

// Built here rather than sitting in all seven pages' markup — there's no
// build step to share a partial, and it's only ever needed by visitors who
// haven't answered yet. Deliberately non-modal: it doesn't trap focus or
// block the page, since declining is a valid way to just carry on reading.
function showConsentBanner() {
  const banner = document.createElement('div');
  banner.className = 'consent-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Cookie consent');
  banner.innerHTML = `
    <p class="consent-banner-text">
      We use analytics cookies to understand how the site gets used, so we can
      make it better. Nothing is stored unless you accept.
    </p>
    <div class="consent-banner-actions">
      <button type="button" class="consent-btn consent-btn--decline">Decline</button>
      <button type="button" class="consent-btn consent-btn--accept">Accept</button>
    </div>
  `;

  const answer = (choice) => {
    try {
      localStorage.setItem(CONSENT_KEY, choice);
    } catch {
      // Nothing to persist to — honour the choice for this page view at least.
    }
    if (choice === 'granted') grantConsent();
    banner.remove();
  };

  banner.querySelector('.consent-btn--accept').addEventListener('click', () => answer('granted'));
  banner.querySelector('.consent-btn--decline').addEventListener('click', () => answer('denied'));
  document.body.appendChild(banner);
}
