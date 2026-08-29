# Instagram feed setup

The homepage's "On Instagram" section pulls your latest posts from the real
Instagram API. There's no backend server for this static site, so a
scheduled GitHub Action (`.github/workflows/instagram-feed.yml`) does the
job instead: it fetches your latest posts once a day and commits the result
to `data/instagram-feed.json`, which `js/instagram-feed.js` renders on the
homepage. Until you complete the steps below, the section stays hidden.

## 1. Switch to a Business or Creator Instagram account

The Instagram API only works with a Business or Creator account (Settings →
Account type in the Instagram app). A personal account won't work.

## 2. Create a Meta app and connect Instagram

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) and create a new app (type: "Other" → "Business" is fine — you don't need a Facebook Page for this).
2. In the app dashboard, add the **Instagram** product ("Instagram API with Instagram Login").
3. Under Instagram → API setup with Instagram Login, add your Instagram account as a tester and accept the invite from within the Instagram app (Settings → Apps and websites → Tester invites). This lets the app read your own account's posts without needing Meta's App Review.
4. Note your app's **Instagram App ID** and **Instagram App Secret** from the product's settings page — you'll need them for the next step.

## 3. Generate a long-lived access token

1. Still on the "API setup with Instagram Login" page, use the **Generate token** button next to your connected tester account. This opens an OAuth flow and gives you a short-lived access token.
2. Exchange it for a long-lived token (valid 60 days, refreshable indefinitely) with:
   ```
   curl -i -X GET "https://graph.instagram.com/access_token \
     ?grant_type=ig_exchange_token \
     &client_secret=<YOUR_INSTAGRAM_APP_SECRET> \
     &access_token=<SHORT_LIVED_TOKEN>"
   ```
   The response's `access_token` is your long-lived token.
3. Get your Instagram account's numeric user ID:
   ```
   curl -i -X GET "https://graph.instagram.com/me?fields=id,username&access_token=<LONG_LIVED_TOKEN>"
   ```

## 4. Add repository secrets

In the repo's **Settings → Secrets and variables → Actions**, add:

| Secret | Value |
|---|---|
| `INSTAGRAM_ACCESS_TOKEN` | the long-lived token from step 3.2 |
| `INSTAGRAM_USER_ID` | the numeric `id` from step 3.3 |

## 5. (Recommended) Let the workflow keep the token alive on its own

Instagram long-lived tokens expire after 60 days unless refreshed. The
workflow refreshes the token on every run and, if you add one more secret,
also rewrites `INSTAGRAM_ACCESS_TOKEN` in place so this never needs manual
attention again:

1. Create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) scoped to only this repository, with **Secrets: Read and write** permission.
2. Add it as a repository secret named `GH_PAT`.

Without `GH_PAT`, the feed still works, but you'll need to repeat step 3
roughly every 60 days before the stored token expires.

## 6. Run it

The workflow runs daily at 06:00 UTC, or trigger it manually from the
**Actions** tab ("Update Instagram feed" → **Run workflow**). Once it
completes successfully, `data/instagram-feed.json` is populated and the
homepage section appears automatically — no further deploy needed.

Note: GitHub only runs *scheduled* workflow triggers from the repository's
default branch, so the daily schedule won't fire until this branch is
merged. `workflow_dispatch` (the manual "Run workflow" button) works on any
branch in the meantime.
