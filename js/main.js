// "Past the fold" — one signal, two consumers.
//
// A 60vh sentinel pinned to the top of the document does the measuring, and
// its result lands as .has-scrolled on <html>. CSS decides what that means:
// on mobile the bottom bar slides up, on desktop the header returns fixed.
// An IntersectionObserver rather than a scroll handler, so nothing runs per
// frame, and the height in vh re-evaluates on rotation without a resize
// listener.
const root = document.documentElement;
const barToggle = document.querySelector('.mobile-bar-menu');
const barPanel = document.querySelector('.mobile-bar-panel');

const setPanelOpen = (open) => {
  if (!barToggle || !barPanel) return;
  barPanel.hidden = !open;
  barToggle.setAttribute('aria-expanded', String(open));
};

const setScrolled = (scrolled) => {
  root.classList.toggle('has-scrolled', scrolled);
  // don't leave the mobile panel hanging open as its bar slides away
  if (!scrolled) setPanelOpen(false);
};

if ('IntersectionObserver' in window) {
  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  Object.assign(sentinel.style, {
    position: 'absolute', top: '0', left: '0',
    width: '1px', height: '60vh',
    pointerEvents: 'none', visibility: 'hidden',
  });
  document.body.appendChild(sentinel);
  new IntersectionObserver(
    ([entry]) => setScrolled(!entry.isIntersecting)
  ).observe(sentinel);

  // A page too short to scroll past the sentinel would never reveal the
  // mobile bar at all, leaving navigation unreachable there. Every page
  // clears it today, but that shouldn't be a thing a future short page
  // breaks.
  const revealIfPageTooShort = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable <= window.innerHeight * 0.6) setScrolled(true);
  };
  revealIfPageTooShort();
  window.addEventListener('load', revealIfPageTooShort);
} else {
  setScrolled(true); // no observer support: better present than never
}

// Mobile bottom nav — the Menu button opens a panel above the bar
if (barToggle && barPanel) {
  barToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    setPanelOpen(barPanel.hidden);
  });

  // Close when a link is followed, so in-page anchors don't leave it hanging open
  barPanel.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setPanelOpen(false)));

  // ...and on a tap outside or Escape, which is what people expect of a
  // panel floating over the page
  document.addEventListener('click', (event) => {
    if (!barPanel.hidden && !barPanel.contains(event.target)) setPanelOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !barPanel.hidden) {
      setPanelOpen(false);
      barToggle.focus();
    }
  });
}

// FAQ accordion
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const answer = item.querySelector('.faq-answer');
    const isOpen = item.classList.contains('open');
    item.closest('.faq-list').querySelectorAll('.faq-item').forEach(i => {
      i.classList.remove('open');
      i.querySelector('.faq-answer').style.maxHeight = '0';
      i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
    });
    if (!isOpen) {
      item.classList.add('open');
      answer.style.maxHeight = answer.scrollHeight + 'px';
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

// Scroll reveal
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduceMotion && 'IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
} else {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
}

// Animated stat counters
const statEls = document.querySelectorAll('[data-count-to]');
if (statEls.length) {
  const animateCount = (el) => {
    const target = parseFloat(el.dataset.countTo);
    const decimals = el.dataset.countTo.includes('.') ? el.dataset.countTo.split('.')[1].length : 0;
    if (reduceMotion) {
      el.textContent = target.toFixed(decimals);
      return;
    }
    const duration = 1400;
    const start = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 3);
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const value = target * ease(progress);
      el.textContent = value.toFixed(decimals);
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target.toFixed(decimals);
    }
    requestAnimationFrame(tick);
  };
  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        statObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  statEls.forEach(el => statObserver.observe(el));
}
