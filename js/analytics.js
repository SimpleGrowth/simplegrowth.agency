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
const GA_MEASUREMENT_ID = 'G-4GP5ZRGGYN';

const CONSENT_KEY = 'sg-analytics-consent';
const storedConsent = readConsent();

if (GA_MEASUREMENT_ID) {
  startAnalytics();
  if (!storedConsent) showConsentBanner();
  wireCookieSettings();
} else {
  // Nothing to consent to, so the footer control would be a dead button.
  hideCookieSettings();
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

// Withdrawing has to be as easy as giving, so tell the tag to stop and clear
// what it already set — leaving a live _ga behind would make the privacy
// notice's "you can withdraw" untrue.
function withdrawConsent() {
  gtag('consent', 'update', { analytics_storage: 'denied' });
  document.cookie.split(';').forEach((entry) => {
    const name = entry.split('=')[0].trim();
    if (!name.startsWith('_ga')) return;
    // Cleared at the registrable domain, which is where gtag.js set it.
    const domain = location.hostname.split('.').slice(-2).join('.');
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${domain}`;
  });
}

// The footer's "Cookie settings" control, on every page.
function wireCookieSettings() {
  document.querySelectorAll('[data-cookie-settings]').forEach((control) => {
    control.addEventListener('click', () => {
      if (!document.querySelector('.consent-banner')) showConsentBanner();
    });
  });
}

function hideCookieSettings() {
  document.querySelectorAll('[data-cookie-settings]').forEach((control) => {
    control.hidden = true;
  });
}

// Built here rather than sitting in all eight pages' markup — there's no
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
      make it better. Nothing is stored unless you accept, and you can change
      your mind any time. See our <a href="/privacy">privacy notice</a>.
    </p>
    <div class="consent-banner-actions">
      <button type="button" class="consent-btn consent-btn--decline">Decline</button>
      <button type="button" class="consent-btn consent-btn--accept">Accept</button>
    </div>
  `;

  // Keeps the mobile CTA bar (fixed to the same bottom edge) stacked above
  // the banner instead of sitting underneath it. Re-measured on resize
  // since the banner's own height changes as its text reflows.
  const updateConsentOffset = () => {
    document.documentElement.style.setProperty('--consent-offset', `${banner.offsetHeight + 12}px`);
  };

  const answer = (choice) => {
    try {
      localStorage.setItem(CONSENT_KEY, choice);
    } catch {
      // Nothing to persist to — honour the choice for this page view at least.
    }
    if (choice === 'granted') grantConsent();
    else withdrawConsent();
    banner.remove();
    document.documentElement.style.removeProperty('--consent-offset');
    window.removeEventListener('resize', updateConsentOffset);
  };

  banner.querySelector('.consent-btn--accept').addEventListener('click', () => answer('granted'));
  banner.querySelector('.consent-btn--decline').addEventListener('click', () => answer('denied'));
  document.body.appendChild(banner);
  updateConsentOffset();
  window.addEventListener('resize', updateConsentOffset);
}
