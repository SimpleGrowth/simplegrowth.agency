// Renders the homepage Instagram grid from data/instagram-feed.json, which
// .github/workflows/instagram-feed.yml refreshes daily via the Instagram API.
// Falls back to hiding the section entirely if there's no feed data yet
// (e.g. before the workflow's first run) or the fetch fails.
(async () => {
  const section = document.querySelector('[data-instagram-feed]');
  const grid = document.getElementById('instagram-grid');
  if (!section || !grid) return;

  try {
    const res = await fetch('data/instagram-feed.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { posts, username } = await res.json();

    if (!Array.isArray(posts) || posts.length === 0) return;

    section.hidden = false;
    grid.innerHTML = posts.map(post => `
      <a class="instagram-tile" href="${post.permalink}" target="_blank" rel="noopener" aria-label="View post on Instagram">
        <img src="${post.image}" alt="" loading="lazy">
        <span class="instagram-tile-overlay" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" stroke="white" stroke-width="1.5"/><circle cx="12" cy="12" r="4" stroke="white" stroke-width="1.5"/><circle cx="17.5" cy="6.5" r="1" fill="white"/></svg>
        </span>
      </a>
    `).join('');

    const followLink = section.querySelector('[data-instagram-follow]');
    if (followLink && username) {
      followLink.href = `https://instagram.com/${username}`;
      followLink.textContent = `Follow @${username}`;
    }
  } catch (err) {
    section.hidden = true;
  }
})();
