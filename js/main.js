// "Past the fold" — drives the desktop header's return-as-fixed. A 60vh
// sentinel pinned to the top of the document does the measuring, and its
// result lands as .has-scrolled on <html>; CSS pins the header once it's
// set. Mobile doesn't consume this — its header is sticky outright. An
// IntersectionObserver rather than a scroll handler, so nothing runs per
// frame, and the height in vh re-evaluates on rotation without a resize
// listener.
const root = document.documentElement;
const setScrolled = (scrolled) => root.classList.toggle('has-scrolled', scrolled);

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

  // A page too short to scroll past the sentinel would never trigger the
  // fixed header at all — reveal it up front instead.
  const revealIfPageTooShort = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable <= window.innerHeight * 0.6) setScrolled(true);
  };
  revealIfPageTooShort();
  window.addEventListener('load', revealIfPageTooShort);
} else {
  setScrolled(true); // no observer support: better present than never
}

// Mobile header menu — the site's only mobile nav now. Click the toggle to
// flip it, a tap outside or Escape to close it (returning focus to the
// toggle), and closing on any link inside it so an in-page anchor doesn't
// leave the panel hanging open.
const menuToggle = document.querySelector('.mobile-menu-toggle');
const menuPanel = document.querySelector('.mobile-menu-panel');
if (menuToggle && menuPanel) {
  const setMenuOpen = (open) => {
    menuPanel.hidden = !open;
    menuToggle.setAttribute('aria-expanded', String(open));
  };
  menuToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    setMenuOpen(menuPanel.hidden);
  });
  menuPanel.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenuOpen(false)));
  document.addEventListener('click', (event) => {
    if (!menuPanel.hidden && !menuPanel.contains(event.target)) setMenuOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menuPanel.hidden) {
      setMenuOpen(false);
      menuToggle.focus();
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
