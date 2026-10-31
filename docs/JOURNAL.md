# Viralradar: session journal

Dated log of what shipped each work session. Stable ops and architecture live in [LIVE.md](LIVE.md).

Newest entries at the top. Older: [archive/JOURNAL_2.md](archive/JOURNAL_2.md) (2026-10-25), [archive/JOURNAL_1.md](archive/JOURNAL_1.md).

---

## 2026-10-31: Brand v2, review gate, landing

- **Shipped:** **`brand-infer-v2`** (service, products, audience, `notThis`) with versioned **`brandInferences`** rows (`pageReadMs` / `inferMs` / `understandMs`; survives purge). Scan pauses at **`review_brand`**: **Read again** (`rerunBrandRead`) or **Find competitors** (`continueAfterBrand` → `findCompetitors`). Public [`latestByJob`](../convex/brandInferences.ts) returns gate fields only; insert must succeed before the pause. Competitor discovery uses richer brand context. Removed **Demo only** landing footer. Home URL field: **Enter** submits scan. [`docs/PRODUCT.md`](PRODUCT.md), owner-verifies Cursor rule, [`lib/formatTimings.ts`](../lib/formatTimings.ts).
- **Key files:** `convex/actions/scanBrand.ts`, `convex/scanJobs.ts`, `convex/brandInferences.ts`, `convex/schema.ts`, `convex/discovery/brandFromUrl.ts`, `convex/discovery/competitorsFromBrand.ts`, `lib/brandContext.ts`, `convex/lib/activeScanJob.ts`, `app/home-client.tsx`, `lib/stageLabel.ts`, `components/scan-status.tsx`, `app/how-it-works/page.tsx`, `docs/LIVE.md`, `README.md`
- **Gaps:** No Convex eval UI for full inference rows. TikTok confirm still name/niche only. **Fast scan** skips the brand gate. Owner: **cluely.com** on the gate (Read again loop), Enter to scan, then commit/push after `npm run build`.
- **Harness:** brand v2 + gate plans → build → REVIEW → FIX → SYNC (this entry).

---

## 2026-10-29: How it works + tagline (recreatability frame)

- **Shipped:** Hero badge and meta description: **Winning organic formats in your niche that AI can recreate.** Home lede: outlier TikTok posts, scored for whether AI can recreate them. `/how-it-works` tightened (score cards, 7-step scan, stack one-liner). Honest limit: list sorted by outlier only; recreatability is on Breakdown, not in rank yet. README opener matches.
- **Key files:** `app/how-it-works/page.tsx`, `app/home-client.tsx`, `app/layout.tsx`, `app/globals.css`, `README.md`
- **Gaps:** Recreatability still not weighted into ranking. Owner verifies landing + How it works in the browser, then push so the live link matches.
- **Harness:** REVIEW → FIX → SYNC.

---

## 2026-10-28: Vercel build (TikTokScrapeBatch empty return)

- **Shipped:** `scrapeProfiles` early exit returns `{ handles: [] }` instead of `[]`, fixing Next.js production `tsc` error `TS2741` after the dual-scrape batch type landed on main. Deploy checklist in [LIVE.md](LIVE.md): run `npm run build` locally before push to `main`.
- **Key files:** `convex/scraper/apifyTikTok.ts`, `docs/LIVE.md`
- **Gaps:** Commit and push so Vercel redeploys green.
- **Harness:** REVIEW → FIX → SYNC.

---

## 2026-10-28: Dual scrape (latest + popular) + post dates

- **Shipped:** Clockworks probe on `@lockedin_ai` confirmed `profileSorting: "popular"` returns pinned/high-view hits (5.2M / 3.4M / 10.8M) that latest-24 missed. Search TikTok now runs **latest ~24** then **top ~20 popular**, dedupes, and scores against the median of the **~24 most recent** posts. No 90-day display cutoff; month/year on each outlier card. Lightbox **Open on TikTok** removed (profile `@handle` links stay). If one profile pass fails, the other still counts and a plain note stays on `scanJobs.detail`. Profile passes **2x 120s**; account search stays **3x 180s**. How it works thesis: all-time outliers vs each account's recent baseline.
- **Key files:** `convex/scraper/apifyTikTok.ts`, `convex/scoring.ts`, `convex/posts.ts`, `convex/actions/scanBrand.ts`, `lib/formatMetrics.ts`, `app/home-client.tsx`, `app/post/[postId]/post-breakdown-client.tsx`, `app/how-it-works/page.tsx`, `docs/LIVE.md`, `README.md`
- **Gaps:** Fast scan / cached jobs still have the old latest-only set until a live re-scan (LockedIn, then Gymshark / Duolingo / Oatly). Dual scrape is slower (two actor runs).
- **Harness:** plan → build → REVIEW → FIX → SYNC.

---

## 2026-10-28: SERP competitor JSON coercion

- **Shipped:** Fixed confirm fallback crash when OpenRouter returned a single `{name, website}` object, a comma-separated string, or a string array instead of a `competitors` JSON array (`t is not iterable` after minification). [`coerceModelLists.ts`](../convex/lib/coerceModelLists.ts) coerces queries and competitors before `for...of`; SERP path logs failures and shows plain confirm copy (no raw exception). Array-shaped examples in discovery prompts.
- **Key files:** `convex/lib/coerceModelLists.ts`, `convex/discovery/competitorsFromBrand.ts`, `convex/discovery/competitorSearchQueries.ts`, `docs/LIVE.md`
- **Gaps:** Comma-splitting can still break names like `Acme, Inc`. Owner re-scan (e.g. Cluely) to confirm **Competitors from Google search.** or calm fallback without dev error text.
- **Harness:** plan → build → REVIEW → FIX → SYNC.

---

## 2026-10-28: Breakdown disclaimer + mobile layout pass

- **Shipped:** Prominent metadata callout at top of [`post-breakdown-client`](../app/post/[postId]/post-breakdown-client.tsx) (no frame-by-frame watch; frame analysis later + How it works link). **`@media (max-width: 720px)`** in [`globals.css`](../app/globals.css): landing form top-aligned, shorter walkthrough embed, full-width scan row, tighter panels, single-column breakdown scores, larger tap targets (try chips, **Play** / **Breakdown** in `.post-links`, lightbox close).
- **Key files:** `app/post/[postId]/post-breakdown-client.tsx`, `app/globals.css`, `docs/LIVE.md`, `README.md`
- **Gaps:** Owner spot-check home, breakdown, and how-it-works at ≤720px width; breakdown disclaimer visible above the post header.
- **Harness:** plan → build → REVIEW → FIX (`.post-links a` tap height) → SYNC.

---

## 2026-10-28: TikTok lightbox layout (close + size)

- **Shipped:** Close **x** moved onto the player (`tiktok-lightbox-stage`, top-right inset) so it is not clipped above the viewport. Player max size reduced (~**320px** / **68vh**, not ~90vh).
- **Key files:** `components/tiktok-lightbox.tsx`, `app/globals.css`
- **Gaps:** None.
- **Harness:** FIX → SYNC.

---

## 2026-10-28: TikTok fullscreen lightbox (player/v1)

- **Shipped:** Fullscreen [`TikTokLightbox`](../components/tiktok-lightbox.tsx) + [`TikTokPlayerFrame`](../components/tiktok-player-frame.tsx) using TikTok **`player/v1/{videoId}`** (autoplay in overlay). Home/breakdown: cover + **Play** / thumbnail click; one iframe at a time. Loading copy + **Open on TikTok** fallback. Removed unused `tiktok-embed.tsx` and deprecated `tiktokEmbedUrl`. Stable `closeLightbox` on Escape. Console `ERR_BLOCKED_BY_CLIENT` from TikTok analytics inside the iframe is normal with ad blockers.
- **Key files:** `components/tiktok-lightbox.tsx`, `components/tiktok-player-frame.tsx`, `components/tiktok-external-link.tsx`, `convex/lib/tiktokUrls.ts`, `app/home-client.tsx`, `app/post/[postId]/post-breakdown-client.tsx`, `app/globals.css`, `docs/LIVE.md`, `README.md`
- **Gaps:** None; owner confirmed lightbox playback works.
- **Harness:** plan → build → REVIEW → FIX → SYNC.

---

## 2026-10-28: In-site TikTok embed (gut /out/tiktok)

- **Shipped:** Removed [`/out/tiktok`](../app/out/tiktok/route.ts) hop and outbound-href helpers; first in-list **Play** embed (superseded by lightbox entry above). [`TikTokExternalLink`](../components/tiktok-external-link.tsx) plain `_blank` for `@handle` profiles.
- **Key files:** `components/tiktok-external-link.tsx`, `convex/lib/tiktokUrls.ts`, `app/home-client.tsx`, `docs/LIVE.md`, `README.md`
- **Gaps:** Superseded by lightbox pass.
- **Harness:** plan → build → REVIEW → FIX → SYNC.

---

## 2026-10-28: Open on TikTok — no popup, no double tab, no 403 hop

- **Shipped:** Removed `window.open` from [`TikTokExternalLink`](../components/tiktok-external-link.tsx). `noopener` made `window.open` return `null`, so the native `_blank` still fired (two tabs when popups were allowed) and Chrome blocked the `window.open` as a popup. Links now go to [`/out/tiktok`](../app/out/tiktok/route.ts); that hop is a user-gesture same-origin tab, then `location.replace` to `www.tiktok.com` with **no referrer** so TikTok's WAF does not 403 on localhost/prod origin. [`tiktokUrls.ts`](../convex/lib/tiktokUrls.ts) host check is suffix-based (`tiktok.com` / `*.tiktok.com`), not a substring.
- **Key files:** `components/tiktok-external-link.tsx`, `app/out/tiktok/route.ts`, `convex/lib/tiktokUrls.ts`, `docs/LIVE.md`, `README.md`
- **Gaps:** Owner clicks **Open on TikTok** and a confirm `@handle` on localhost: one tab, video/profile loads. Residual 403s from VPN/region/extensions/cookies are outside the app.
- **Harness:** REVIEW (no findings) → FIX (no-op) → SYNC.

---

## 2026-10-28: Live scan wipes stale posts (non-Try + fresh Try)

- **Shipped:** [`startFromUrl`](../convex/brands.ts) only reopens a completed job for the **three Try hosts** (Fast scan). Every **live** scan now calls [`purgeBrandScanData`](../convex/lib/purgeBrandScan.ts) first so old jobs/posts/handles cannot reappear on the same brand row (e.g. usefastlane.ai). Shared purge extracted from [`demoCache.ts`](../convex/demoCache.ts).
- **Key files:** `convex/brands.ts`, `convex/lib/purgeBrandScan.ts`, `convex/demoCache.ts`, `README.md`, `docs/LIVE.md`
- **Gaps:** None; owner re-scans a non-Try URL to confirm outlier list stays empty until the new run finishes.
- **Harness:** REVIEW (no findings) → FIX (no-op) → SYNC.

---

## 2026-10-28: Clear non-Try brand data (dev CLI)

- **Shipped:** [`clearNonTryBrandCaches`](../convex/demoCache.ts) wipes jobs/posts/handles/breakdowns for **every brand except** gymshark.com, duolingo.com, oatly.com. [`clearBrandCacheByHost`](../convex/demoCache.ts) for a single non-Try host; **refuses** Try hosts (use `clearTryBrandCacheByHost` instead). Ran `clearNonTryBrandCaches` on dev to drop e.g. usefastlane.ai leftovers. Product rule: only the three Try URLs get **Fast scan** reopen; other URLs always live-scan (each start purges that brand — see live-scan entry above). Bulk CLI clears orphan brand rows without rescanning.
- **Key files:** `convex/demoCache.ts`, `docs/LIVE.md`, `README.md`
- **Gaps:** None for dev cleanup; owner re-seeds Try brands only if those three were cleared on purpose.
- **Harness:** REVIEW (no findings) → FIX (no-op) → SYNC.

---

## 2026-10-28: TikTok wait UI (Clockworks retries)

- **Shipped:** Live scan no longer sits on a static spinner for up to **3x180s** Clockworks waits. [`runActor`](../convex/scraper/apifyTikTok.ts) patches `scanJobs.detail` at attempt start (`tiktok-wait-{n}`), after timeouts (plain retry sentences), then calm timeout copy on give-up. [`ScanStatus`](../components/scan-status.tsx) rotates a six-line joke pool every 12s while detail is a wait token; retry/progress copy preempts jokes; screen readers get stable **Contacting TikTok.** [`lib/tiktok-wait.ts`](../lib/tiktok-wait.ts) shared by Convex + Next. [`readSite`](../convex/actions/scanBrand.ts) and profile scrape pass the same progress hook. Scrape progress note hides wait/retry duplicates.
- **Key files:** `lib/tiktok-wait.ts`, `convex/scraper/apifyTikTok.ts`, `convex/actions/scanBrand.ts`, `components/scan-status.tsx`, `lib/stageLabel.ts`, `app/home-client.tsx`
- **Gaps:** Owner verifies a **live Scan** (non-Try URL) through a slow Clockworks window: retry lines between attempts, jokes during attempts, no raw Apify JSON. Fast scan never hits this path.
- **Harness:** plan → build → REVIEW → FIX (no-op) → SYNC.

---

## 2026-10-28: Open on TikTok 403 hardening

- **Shipped:** TikTok WAF 403 from app-origin `Referer` (localhost or prod domain). [`next.config.ts`](../next.config.ts) sends **`Referrer-Policy: no-referrer`** on `/` and `/:path*`. [`TikTokExternalLink`](../components/tiktok-external-link.tsx) opens via `window.open(..., "noopener,noreferrer")` when allowed, else native `_blank`; sanitizes hrefs with [`sanitizeTikTokWebUrl`](../convex/lib/tiktokUrls.ts) (`www.tiktok.com`, no query junk). Layout `metadata.referrer` unchanged.
- **Key files:** `next.config.ts`, `components/tiktok-external-link.tsx`, `convex/lib/tiktokUrls.ts`, `app/layout.tsx`
- **Gaps:** Owner verifies **Open on TikTok** after a **Vercel deploy** (header is prod-critical). Residual 403s from cookies/VPN/region/extensions are outside the app.
- **Harness:** build → REVIEW → FIX → REVIEW (no findings) → FIX (no-op) → SYNC.

---

## 2026-10-28: How-it-works intro copy

- **Shipped:** `/how-it-works` lead paragraph rewritten (tool-first, baseline vs raw views, organic companion to paid ad research). Removed **Thesis** section heading; intro sits under the page title.
- **Key files:** `app/how-it-works/page.tsx`
- **Gaps:** None.
- **Harness:** SYNC (copy-only).

---

## 2026-10-28: Per-host Try cache clear (dev CLI)

- **Shipped:** Internal [`clearTryBrandCacheByHost`](../convex/demoCache.ts) to wipe one Instant host (gymshark.com, duolingo.com, oatly.com) without touching the other two; shared `clearTryBrandByHostKey` with `clearTryBrandCaches`. Not exposed to the Next.js client. README + LIVE CLI examples.
- **Key files:** `convex/demoCache.ts`, `README.md`, `docs/LIVE.md`
- **Gaps:** Owner re-seeds Duolingo (or any cleared host) with one full scan before demo **Fast scan** is instant again.
- **Harness:** REVIEW → FIX (internalMutation) → REVIEW (no findings) → FIX (no-op) → SYNC.

---

## 2026-10-28: Breakdown score tooltips (UX + copy)

- **Shipped:** [`ScoreTip`](../components/score-tip.tsx) — hover/focus definitions portaled to `document.body` with inline styles (avoids Tailwind Turbopack stripping hide rules from label-row tooltips). Tap toggle on coarse pointer. [`SCORE_TIPS`](../app/post/[postId]/post-breakdown-client.tsx) on breakdown: outlier, recreatability (AI gen ease, 1-5 only in tooltip), confidence. [`next.config.ts`](../next.config.ts) skips `@tailwindcss/turbopack` on `*.module.css`. Docs aligned with tooltip copy.
- **Key files:** `components/score-tip.tsx`, `app/post/[postId]/post-breakdown-client.tsx`, `next.config.ts`, `app/how-it-works/page.tsx`, `README.md`, `docs/LIVE.md`, `app/globals.css`
- **Gaps:** Owner verifies breakdown `?` on desktop hover + phone tap. Frame-by-frame recreatability not built; model prompt still metadata-only ([`breakdownFromPost.ts`](../convex/discovery/breakdownFromPost.ts)).
- **Harness:** REVIEW → FIX → SYNC.

---

## 2026-10-28: Demo scrape limits (batch TikTok, 3 brands, no niche)

- **Shipped:** One batched Clockworks profile scrape for all confirmed handles, then per-handle upsert/score (`Saving results X of Y…`). Removed niche creator video search and LLM filter (deleted `nicheSearchQueries.ts`, `filterTikTokAccounts.ts`). Competitor discovery capped at **3** brands ([`lib/demo-limits.ts`](../lib/demo-limits.ts)). TikTok resolve proposes **exact** handle/display matches only (`isExactAccountMatch`); empty confirm copy when none found (Search hidden). Demo note during `find_competitors`. Legacy `source: "niche"` rows filtered in confirm UI.
- **Key files:** `lib/demo-limits.ts`, `convex/actions/scanBrand.ts`, `convex/scraper/apifyTikTok.ts`, `convex/discovery/competitorsFromBrand.ts`, `convex/scanJobs.ts`, `app/home-client.tsx`, `lib/stageLabel.ts`, `docs/LIVE.md`, `README.md`, `app/how-it-works/page.tsx`
- **Gaps:** Owner verifies live **Scan** (non-Try URL): demo cap note, one Apify profile run in dashboard, none-found confirm. Re-seed Try brands if cached confirm lists look stale after stricter exact match.
- **Harness:** plan → build → REVIEW → FIX → REVIEW (no findings) → FIX (no-op) → SYNC (initial).

---

## 2026-10-28: Clockworks timeout hardening

- **Shipped:** Clockworks `run-sync` **3x retry** on timeout only ([`convex/scraper/apifyTikTok.ts`](../convex/scraper/apifyTikTok.ts)); calm user copy ([`convex/lib/apifyMessages.ts`](../convex/lib/apifyMessages.ts), [`scraperErrors.ts`](../convex/lib/scraperErrors.ts)) — no Apify JSON in UI. **Fail-soft** competitor TikTok search in [`readSite`](../convex/actions/scanBrand.ts): confirm with SERP names + **No TikTok account found** when lookup fails; niche search no longer aborts when brand handles empty. `isJobActive` after long Apify block.
- **Key files:** `convex/scraper/apifyTikTok.ts`, `convex/lib/apifyMessages.ts`, `convex/lib/scraperErrors.ts`, `convex/actions/scanBrand.ts`, `docs/LIVE.md`
- **Gaps:** **Owner:** re-seed Try brands (full scan x3) before demo DM; Fast scan must be instant for Gymshark / Duolingo / Oatly.
- **Harness:** implement → REVIEW → FIX (no-op) → SYNC → REVIEW (no findings) → FIX (no-op) → SYNC.

---

## 2026-10-28: Interview hardening (cache scope, covers, breakdown UX)

- **Shipped:** **Instant results** for Gymshark / Duolingo / Oatly only (`startFromUrl` reopens completed job); all other URLs run a live pipeline. Home defaults to `duolingo.com`; **Fast scan** CTA when input matches a Try host ([`isInstantTryBrandInput`](../lib/demo-brands.ts)). Shared **`TryBrandChips`** on landing and empty outlier state; brand field accepts bare hosts (`type="text"`, `inputMode="url"`). Outlier list hidden while a new scan is **`submitting`**. Cover images in Convex at scrape (`thumbnailStorageId`, backfill on demo reopen); [`PostThumbnail`](../components/post-thumbnail.tsx) remounts per URL for stable load/error state. `/how-it-works` + Data section (Instant results / Fast scan copy). Breakdown: score tooltips, lean brief UI. Landing footer only (no process strip). Job pin (`getById`), `isLanding` when no session, `Loading scan…` while pin pending, `latestByBrand` by `startedAt`. `proposedAccounts` useMemo. ESLint `_` ignore for scrape destructuring. Dev **Try cache reset**: [`convex/demoCache.ts`](../convex/demoCache.ts) `clearTryBrandCaches` (CLI in [LIVE.md](LIVE.md)); stale three-brand dev data cleared once on `mellow-mule-141`.
- **Key files:** `convex/schema.ts`, `convex/posts.ts`, `convex/scanJobs.ts`, `convex/brands.ts`, `convex/demoCache.ts`, `convex/actions/scanBrand.ts`, `convex/actions/thumbnails.ts`, `lib/demo-brands.ts`, `app/how-it-works/page.tsx`, `app/post/[postId]/post-breakdown-client.tsx`, `components/post-thumbnail.tsx`, `components/score-tip.tsx`, `components/landing-below-fold.tsx`, `app/home-client.tsx`, `eslint.config.mjs`, `docs/LIVE.md`, `README.md`
- **Gaps:** Delete stale `breakdowns` for shorter briefs; `TELLA_EMBED_URL` when recorded.
- **Harness:** plan → build → REVIEW → FIX → SYNC (x2) → cache clear → REVIEW → FIX (LIVE reset docs) → SYNC.

---

## 2026-10-28: How it works + breakdown scores

- **Shipped:** Breakdown recreatability + confidence (schema, prompt, UI score row). Methodology card and roadmap on breakdown page. `/how-it-works` (honest stack/scoring). Header link. Confirm disclaimer. Parallel TikTok scrape with incremental upsert, `Scraping competitor X of Y`, live skeleton rows. Landing Tella placeholder (`TELLA_EMBED_URL`). README hero + how-it-works link.
- **Key files:** `convex/schema.ts`, `convex/discovery/breakdownFromPost.ts`, `convex/actions/scanBrand.ts`, `app/post/[postId]/post-breakdown-client.tsx`, `app/how-it-works/page.tsx`, `components/site-header.tsx`, `components/walkthrough-slot.tsx`, `app/home-client.tsx`, `README.md`, `docs/LIVE.md`
- **Gaps:** Delete old `breakdowns` rows to regenerate scores. Seed demo Try brands on Convex. Paste Tella URL when recorded. Owner verifies scrape progress + breakdown in browser.
- **Harness:** plan → build → SYNC.

---

## 2026-10-28: Demo polish pass

- **Shipped:** Breakdown prompt bans visual guesses (format/pacing metadata-only). Demo cache for Gymshark / Duolingo / Oatly when a completed scan + scored posts exist. Outlier list filter >=2x in 90 days + empty copy. Confirm gate: select all/none, Search N accounts, shorter niche line. Per-handle TikTok scrape with partial failure on `job.detail`. Hero multiplier typography on outlier rows. README methodology (scoring + no-video caveat).
- **Key files:** `convex/discovery/breakdownFromPost.ts`, `convex/brands.ts`, `convex/lib/demoBrands.ts`, `convex/posts.ts`, `convex/actions/scanBrand.ts`, `app/home-client.tsx`, `app/globals.css`, `lib/site-constants.ts`, `README.md`, `docs/LIVE.md`
- **Gaps:** Demo cache empty until owner runs the three Try brands once on the demo Convex deployment. Cached breakdown rows need delete in dashboard to pick up new prompt. Owner verifies confirm + results + breakdown in browser.
- **Harness:** plan → build → SYNC.

---

Older 2026-10-25 entries: [archive/JOURNAL_2.md](archive/JOURNAL_2.md).
