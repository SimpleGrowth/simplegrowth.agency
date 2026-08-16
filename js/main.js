// Mobile bottom nav — the Menu button opens a panel above the bar
const mobileBar = document.querySelector('.mobile-bar');
const barToggle = document.querySelector('.mobile-bar-menu');
const barPanel = document.querySelector('.mobile-bar-panel');
if (barToggle && barPanel) {
  const setOpen = (open) => {
    barPanel.hidden = !open;
    barToggle.setAttribute('aria-expanded', String(open));
  };

  // The bar stays out of the way until the visitor has scrolled past the
  // fold. Its Contact / Request call buttons duplicate the ones in the
  // hero, so showing it immediately would put the same two actions on
  // screen twice.
  //
  // A 60vh sentinel pinned to the top of the document does the measuring:
  // once it scrolls out of view the bar comes in. That is an
  // IntersectionObserver rather than a scroll handler — no listener firing
  // on every frame, and the height is expressed in vh so it re-evaluates
  // on rotation without a resize handler.
  const setBarVisible = (show) => {
    mobileBar.classList.toggle('is-visible', show);
    // don't leave the panel hanging open as the bar slides away
    if (!show && !barPanel.hidden) setOpen(false);
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
      ([entry]) => setBarVisible(!entry.isIntersecting)
    ).observe(sentinel);

    // A page too short to scroll past the sentinel would never reveal the
    // bar at all, leaving mobile navigation unreachable. Every page clears
    // it today, but that shouldn't be a thing a future short page breaks.
    const revealIfPageTooShort = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= window.innerHeight * 0.6) setBarVisible(true);
    };
    revealIfPageTooShort();
    window.addEventListener('load', revealIfPageTooShort);
  } else {
    setBarVisible(true); // no observer support: better present than never
  }

  barToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    setOpen(barPanel.hidden);
  });

  // Close when a link is followed, so in-page anchors don't leave it hanging open
  barPanel.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));

  // ...and on a tap outside or Escape, which is what people expect of a
  // panel floating over the page
  document.addEventListener('click', (event) => {
    if (!barPanel.hidden && !barPanel.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !barPanel.hidden) {
      setOpen(false);
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
