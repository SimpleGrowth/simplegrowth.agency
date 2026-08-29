// Pulls the latest posts from the Instagram API (Instagram Login, graph.instagram.com)
// and writes them to data/instagram-feed.json for the homepage feed to render.
//
// Required env vars:
//   INSTAGRAM_ACCESS_TOKEN — a long-lived Instagram user access token
//   INSTAGRAM_USER_ID      — the Instagram professional account's numeric ID
//
// Run via `.github/workflows/instagram-feed.yml`. See docs/instagram-feed-setup.md
// for how to obtain the token and ID, and how the token gets refreshed.

import { writeFile } from 'node:fs/promises';

const POST_LIMIT = 8;
const OUTPUT_PATH = new URL('../data/instagram-feed.json', import.meta.url);

const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
const userId = process.env.INSTAGRAM_USER_ID;

if (!accessToken || !userId) {
  console.error('Missing INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_USER_ID env vars.');
  process.exit(1);
}

async function refreshToken(token) {
  const url = new URL('https://graph.instagram.com/refresh_access_token');
  url.searchParams.set('grant_type', 'ig_refresh_token');
  url.searchParams.set('access_token', token);

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    console.warn(`Token refresh skipped (HTTP ${res.status}): ${body}`);
    return null;
  }
  const data = await res.json();
  return data.access_token ?? null;
}

async function fetchMedia(token) {
  const url = new URL(`https://graph.instagram.com/${userId}/media`);
  url.searchParams.set('fields', 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp');
  url.searchParams.set('limit', String(POST_LIMIT));
  url.searchParams.set('access_token', token);

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Instagram media fetch failed (HTTP ${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.data ?? [];
}

async function fetchUsername(token) {
  const url = new URL(`https://graph.instagram.com/${userId}`);
  url.searchParams.set('fields', 'username');
  url.searchParams.set('access_token', token);

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.username ?? null;
}

function toFeedPost(media) {
  // Video posts/reels don't have a usable static media_url — fall back to
  // their thumbnail so the grid stays all-image tiles.
  const image = media.media_type === 'VIDEO' ? media.thumbnail_url : media.media_url;
  if (!image) return null;

  return {
    id: media.id,
    permalink: media.permalink,
    image,
    caption: media.caption ?? '',
    mediaType: media.media_type,
    timestamp: media.timestamp,
  };
}

async function main() {
  // Refreshing is best-effort: a token less than 24h old can't be refreshed
  // yet, so a failure here shouldn't stop the media fetch that follows.
  let token = accessToken;
  const refreshed = await refreshToken(accessToken);
  if (refreshed && refreshed !== accessToken) {
    token = refreshed;
    console.log('Access token refreshed.');
    const githubOutput = process.env.GITHUB_OUTPUT;
    if (githubOutput) {
      await writeFile(githubOutput, `new_token=${refreshed}\n`, { flag: 'a' });
    }
  }

  const [media, username] = await Promise.all([fetchMedia(token), fetchUsername(token)]);
  const posts = media.map(toFeedPost).filter(Boolean).slice(0, POST_LIMIT);

  const payload = {
    fetchedAt: new Date().toISOString(),
    username,
    posts,
  };

  await writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2) + '\n');
  console.log(`Wrote ${posts.length} posts to data/instagram-feed.json`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
