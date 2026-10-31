# Viralradar: live operation

Operational reference for this Next.js + Convex app.  
Local dev: [README.md](../README.md). Session history: [JOURNAL.md](JOURNAL.md).

## Current state

| Item | Value |
|------|--------|
| Path | `c:\flutter_apps\viralradar` |
| Org / repo | [sid-kiwilab/viralradar](https://github.com/sid-kiwilab/viralradar) |
| Product | **Viral Radar**: winning organic formats in a niche that AI can recreate (TikTok first) |
| Domain | unset |
| Stack | Next.js 16, React 19, Tailwind 4, Convex, `playwright-core` (remote CDP), OpenRouter (`openai` SDK) |
| App root | `app/` (no `src/`) |
| Dev server | `npm run dev` or [`start.bat`](../start.bat) → **owner** verifies in browser. Agent never opens or fetches localhost. |
| Routes | `/`, `/how-it-works`, `/post/[postId]` (cached structural brief) |
| Backend | Convex Cloud (`convex/`) |
| LLM | OpenRouter → default `anthropic/claude-sonnet-4.6` ([`convex/lib/openrouter.ts`](../convex/lib/openrouter.ts)); optional `OPENROUTER_MODEL` on Convex |
| Scraper | Brand sites: **Firecrawl** scrape first ([`convex/scraper/firecrawl.ts`](../convex/scraper/firecrawl.ts)), Bright Data Browser API fallback ([`convex/scraper/browser.ts`](../convex/scraper/browser.ts)). Competitors: Bright Data **SERP API** (optional; memory fallback). TikTok: **Apify Clockworks today**; Bright Data TikTok planned for unit economics ([`convex/scraper/apifyTikTok.ts`](../convex/scraper/apifyTikTok.ts), [`convex/scraper/tiktok.ts`](../convex/scraper/tiktok.ts)) |
| Production URL | unset |

### Git (this repo only)

| Setting | Value |
|---------|--------|
| Branch | `main` |
| `origin` | `github.com/sid-kiwilab/viralradar` |
| Local user | `sid-kiwilab` / `sid@kiwilab.ai` |

---

## Architecture

```mermaid
flowchart LR
  Home["Next.js /"] --> ConvexClient[ConvexClientProvider]
  ConvexClient --> ConvexCloud[Convex Cloud]
  ConvexCloud --> Schema[(brands handles posts breakdowns scanJobs)]
  ConvexCloud --> OpenRouter[OpenRouter API]
  ConvexCloud --> Firecrawl[Firecrawl scrape API]
  ConvexCloud --> BrowserAPI[Bright Data Browser API]
  ConvexCloud --> SerpAPI[Bright Data SERP API]
  ConvexCloud --> Apify[Apify Clockworks TikTok]
  Firecrawl --> BrandSite[Brand website read]
  BrowserAPI --> BrandSite
  SerpAPI --> GoogleSearch[Google organic results]
  Apify --> TikTok[TikTok search and profiles]
```

- **Home** ([`app/home-client.tsx`](../app/home-client.tsx)): Idle landing when no `brandId`/`jobId` (hero, **`TryBrandChips`** / Instant results for Gymshark/Duolingo/Oatly, default URL `duolingo.com`, bare-host brand input in a **submit form** — **Enter** starts scan same as the button); header **How it works** link; **Walkthrough** when `TELLA_EMBED_URL` set. Primary CTA: **Fast scan** when input matches a Try host ([`isInstantTryBrandInput`](../lib/demo-brands.ts)), else **Scan**. **`review_brand`**: full understanding + timings from [`brandInferences.latestByJob`](../convex/brandInferences.ts); **Read again** / **Find competitors**. **`startFromUrl`**: Try hosts reopen last **completed** job when scored posts exist (**Fast scan** only); any other URL or a fresh Try scan **purges** that brand’s old jobs/posts/handles then runs live ([`convex/brands.ts`](../convex/brands.ts), [`purgeBrandScan.ts`](../convex/lib/purgeBrandScan.ts)). Reset/home restores default URL. Client pins `jobId` via [`scanJobs.getById`](../convex/scanJobs.ts) (`Loading scan…` while pending); completed outlier list hidden while **`submitting`** a new scan. **`find_competitors`**: demo note (max **3** brands). **`review_competitor_brands`**: competitor checkboxes, per-brand **reason** + site link; source/fallback copy from [`competitorDiscoveries.latestByJob`](../convex/competitorDiscoveries.ts) (not duplicated in `scanJobs.detail`); discover timings in **ScanStatus** and panel; **Find again** (clears **`confirmedCompetitorNames`**) / **Look up N account(s)**. **`review_competitors`**: TikTok confirm; select all/none; **Search N TikTok account(s)** (hidden when no matches). Batched profile scrape + per-handle save skeletons; outliers ≥2× (no date cutoff); [`PostThumbnail`](../components/post-thumbnail.tsx). Header → [`/how-it-works`](../app/how-it-works/page.tsx).
- **Scan job patches** ([`convex/scanJobs.ts`](../convex/scanJobs.ts)): internal **`patch`** and **`markRunning`** no-op when job is already `failed` or `completed` (stale actions after cancel/rescan).
- **Scan pipeline** ([`convex/actions/scanBrand.ts`](../convex/actions/scanBrand.ts)): internal actions `readSite`, `findCompetitors`, `findCompetitorHandles`, `searchTikTok`. Stages: `understand_site` → **`review_brand`** (`waiting`) → `find_competitors` → **`review_competitor_brands`** (`waiting`; checkbox subset) → `find_handles` → **`review_competitors`** (`waiting`; TikTok accounts) → `search_tiktok` → `score` → `done` (or `failed`). Mutations: [`rerunBrandRead`](../convex/scanJobs.ts), [`continueAfterBrand`](../convex/scanJobs.ts), [`rerunCompetitorFind`](../convex/scanJobs.ts), [`continueAfterCompetitorBrands`](../convex/scanJobs.ts), [`searchConfirmedCompetitors`](../convex/scanJobs.ts). **`isJobActive`** after each long await and before TikTok upserts / `completed`; [`patchFromScan`](../convex/brands.ts) no-ops unless the job is active and matches `brandId`.
- **Site read**: one Firecrawl scrape (~25s cap, markdown + links) when `FIRECRAWL_API_KEY` is set; on quota, timeout, unreadable body, or missing key → Bright Data Browser (cookie-banner block, captcha wait, one retry). Page text only (no raw `fetch` of the brand URL). Brand understanding uses prompt **`brand-infer-v2`** ([`discovery/brandFromUrl.ts`](../convex/discovery/brandFromUrl.ts)): service, products, audience, `notThis`, plus name/niche/positioning on [`brands`](../convex/schema.ts). Each run also inserts a row in **`brandInferences`** when the scan job is still active (versioned raw output + page excerpt + **`pageReadMs` / `inferMs` / `understandMs`**; survives [`purgeBrandScan`](../convex/lib/purgeBrandScan.ts); shown on **`review_brand`** via public [`latestByJob`](../convex/brandInferences.ts) — parsed fields + timings only, not raw model JSON). Competitor discovery uses prompt bundle **`competitor-discover-v3`** in [`competitorsFromBrand.ts`](../convex/discovery/competitorsFromBrand.ts) and [`competitorSearchQueries.ts`](../convex/discovery/competitorSearchQueries.ts).
- **Competitors**: Up to **3** brands per scan ([`lib/demo-limits.ts`](../lib/demo-limits.ts) → [`discoverCompetitors`](../convex/discovery/competitorsFromBrand.ts), prompt **`competitor-discover-v3`**). Each discovery run inserts **`competitorDiscoveries`** when the job is still active (reason per brand, timings, raw outputs for eval; survives purge; gate via [`latestByJob`](../convex/competitorDiscoveries.ts)). When **`BRIGHTDATA_API_KEY`** + **`BRIGHTDATA_SERP_ZONE`** are set: 3 Google queries → Bright Data **SERP API** → extract names **only from organic results** ([`brightDataSerp.ts`](../convex/scraper/brightDataSerp.ts)); memory fallback with plain notice (no raw exception text). Owner confirms brand subset at **`review_competitor_brands`** before handle lookup. **`findCompetitorHandles`** requires every selected name to match the latest discovery row (plain error if stale). **`confirmedCompetitorNames`** on [`scanJobs`](../convex/schema.ts) when continuing from the brand gate. With **`APIFY_API_KEY`**, batched Clockworks user search on selected names only (`foundVia: search` on [`proposedAccounts`](../convex/schema.ts)); **3× retry** on timeout with wait/retry UX ([`lib/tiktok-wait.ts`](../lib/tiktok-wait.ts), [`apifyTikTok.ts`](../convex/scraper/apifyTikTok.ts)). [`pickAccountForName`](../convex/scraper/apifyTikTok.ts): **exact** handle or display name only. Without Apify: `tiktok.com/@…` on competitor homepage (`foundVia: site`). No niche creator video search.
- **TikTok**: After confirm, all checked handles run **two** batched `clockworks/tiktok-scraper` profile passes — **latest ~24** then **top ~20 popular** (`excludePinnedPosts: false`), merged and deduped by video id; then upsert + recompute scores per handle (`Saving results X of Y…`). If one pass fails, the other still counts and a plain note stays on `scanJobs.detail`. Profile passes use **2× 120s** retries (account search stays 3× 180s) so both fit in the action window. Same Clockworks wait/retry UX as competitor lookup (`Loading latest/popular @handles…` and save progress override joke lines). `confirmedHandles` / `scrapeHandlesCompleted` on [`scanJobs`](../convex/schema.ts). Job completes if any handle returns posts; partial failures on `job.detail`. **No video download**; **cover images** fetched server-side at scrape into Convex file storage (`posts.thumbnailStorageId`, [`storeThumbnail.ts`](../convex/lib/storeThumbnail.ts)); demo reopen schedules [`backfillForBrand`](../convex/actions/thumbnails.ts) for legacy rows. Firecrawl / Bright Data Browser handle site read (with SERP on Bright Data account key); TikTok uses Apify when keyed.
- **Scoring**: median views of the handle’s **~24 most recent** scraped posts (min 5) → `outlierScore` = views / that recent baseline ([`convex/scoring.ts`](../convex/scoring.ts)). **Display** ([`posts.rankedByBrand`](../convex/posts.ts)): score ≥ 2×, sorted by multiplier, **post month/year on each card** (no 90-day cutoff). Recreatability is on each breakdown; it does not change list order yet.
- **Breakdown**: [`/post/[postId]`](../app/post/[postId]/page.tsx). One OpenRouter call per post (cached in `breakdowns` on revisit). Top-of-page **metadata disclaimer** (caption/stats only; frame-level analysis later). UI: outlier / recreatability / confidence with [`ScoreTip`](../components/score-tip.tsx) tooltips; link to `/how-it-works`. Metadata-only brief ([`discovery/breakdownFromPost.ts`](../convex/discovery/breakdownFromPost.ts)).
- **Watch in app**: [`TikTokLightbox`](../components/tiktok-lightbox.tsx) + [`TikTokPlayerFrame`](../components/tiktok-player-frame.tsx) use TikTok **`player/v1/{videoId}`** (centered overlay on **Play** or thumbnail; ~phone-sized player, close on player top-right; one open at a time on home). **`@handle`** links use [`TikTokExternalLink`](../components/tiktok-external-link.tsx) (plain `target="_blank"`, `rel="noopener noreferrer"`). Site **`Referrer-Policy: no-referrer`** still applies to profile links and cover images.
- **Gitignore**: `.env*`, `node_modules/`, `.next/`, `.vercel/`, `.convex/`, `/tmp/`, Playwright reports.

---

## Environment variables

### Next.js (`.env.local`, gitignored)

Do not put `OPENROUTER_API_KEY`, `APIFY_API_KEY`, `FIRECRAWL_API_KEY`, or `BRIGHTDATA_*` here. Convex actions read deployment env only.

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_CONVEX_URL` | Yes for UI | Convex deployment URL |
| `CONVEX_DEPLOYMENT` | Yes for CLI | Set by `npx convex dev` |

### Convex deployment (`npx convex env set`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENROUTER_API_KEY` | For LLM steps | OpenRouter API key |
| `OPENROUTER_MODEL` | Optional | OpenRouter model id (default `anthropic/claude-sonnet-4.6`) |
| `APIFY_API_KEY` | For TikTok | Apify token; runs `clockworks/tiktok-scraper` |
| `FIRECRAWL_API_KEY` | For site read (fast) | Firecrawl API key; one scrape per URL before fallback |
| `BRIGHTDATA_BROWSER_WSS` | Site read fallback | Full Playwright CDP URL from Browser API “Copy command” |
| `BRIGHTDATA_BROWSER_USERNAME` | Optional split | e.g. `brd-customer-…-zone-scraping_browser1` |
| `BRIGHTDATA_BROWSER_PASSWORD` | Optional split | Zone password from copy command (may ≠ account API key) |
| `BRIGHTDATA_API_KEY` | For live competitors | Account API key from Bright Data (SERP Direct API) |
| `BRIGHTDATA_SERP_ZONE` | For live competitors | SERP API zone name (not the Browser zone) |

Node actions mark `playwright-core` and `chromium-bidi` as external in [`convex.json`](../convex.json).

### Vercel (when deploying)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CONVEX_URL` | Production Convex URL |
| `CONVEX_DEPLOY_KEY` | `npx convex deploy --cmd "next build"` |

Placeholders: [`.env.example`](../.env.example).

---

## Key files

| File | Role |
|------|------|
| [`app/layout.tsx`](../app/layout.tsx) | Root layout; `metadata.referrer: no-referrer` |
| [`app/home-client.tsx`](../app/home-client.tsx) | Landing + scan UI, `TryBrandChips`, Fast scan label, job pin, ranked posts |
| [`components/tiktok-lightbox.tsx`](../components/tiktok-lightbox.tsx) | Overlay lightbox; in-player close; Escape / backdrop |
| [`components/tiktok-player-frame.tsx`](../components/tiktok-player-frame.tsx) | TikTok `player/v1` iframe + loading timeout |
| [`components/tiktok-external-link.tsx`](../components/tiktok-external-link.tsx) | Outbound TikTok profiles: sanitized URL, `_blank`, no referrer |
| [`convex/lib/tiktokUrls.ts`](../convex/lib/tiktokUrls.ts) | Canonical profile/video URLs; `tiktokPlayerEmbedUrl`; sanitize |
| [`components/site-header.tsx`](../components/site-header.tsx) | Wordmark link (post page) or home reset button |
| [`components/site-shell.tsx`](../components/site-shell.tsx) | Hero video, grain, header shell |
| [`components/scan-status.tsx`](../components/scan-status.tsx) | Radar + stage chips; rotating TikTok wait copy while Clockworks attempts run |
| [`lib/tiktok-wait.ts`](../lib/tiktok-wait.ts) | Wait token, retry strings, joke pool; shared Convex + UI |
| [`lib/brandContext.ts`](../lib/brandContext.ts) | Shared type: brand understanding → competitor discovery |
| [`lib/demo-brands.ts`](../lib/demo-brands.ts) | Try hosts, `DEFAULT_TRY_BRAND_INPUT`, `isInstantTryBrandInput` (Fast scan label) |
| [`lib/site-constants.ts`](../lib/site-constants.ts) | Hero video, re-exports Try URLs, `TELLA_EMBED_URL` |
| [`components/post-thumbnail.tsx`](../components/post-thumbnail.tsx) | Stored cover URL; remount on URL change; placeholder on error |
| [`components/score-tip.tsx`](../components/score-tip.tsx) | Breakdown `?` tooltips (portal + inline styles; desktop hover / touch tap) |
| [`next.config.ts`](../next.config.ts) | `Referrer-Policy: no-referrer` on `/` and `/:path*`; Turbopack: Tailwind on `*.css` only, `*.module.css` bypass |
| [`app/how-it-works/page.tsx`](../app/how-it-works/page.tsx) | How it works: tagline, recreatability vs outlier rank, 7-step scan, stack one-liner |
| [`components/walkthrough-slot.tsx`](../components/walkthrough-slot.tsx) | Landing Tella embed placeholder |
| [`components/site-header.tsx`](../components/site-header.tsx) | Wordmark + How it works link |
| [`convex/lib/demoBrands.ts`](../convex/lib/demoBrands.ts) | Demo host match helpers (imports [`lib/demo-brands.ts`](../lib/demo-brands.ts)) |
| [`convex/actions/thumbnails.ts`](../convex/actions/thumbnails.ts) | Backfill stored covers for demo cache reopen |
| [`convex/lib/storeThumbnail.ts`](../convex/lib/storeThumbnail.ts) | Fetch TikTok cover into Convex storage at scrape |
| [`convex/lib/postThumbnail.ts`](../convex/lib/postThumbnail.ts) | Resolve `thumbnailUrl` for queries |
| [`lib/stageLabel.ts`](../lib/stageLabel.ts) | Scan stage status copy (hides internal `tiktok-wait*` tokens) |
| [`app/globals.css`](../app/globals.css) | Landing design tokens (NASC / Mog Check subset) |
| [`convex/brands.ts`](../convex/brands.ts) | `startFromUrl` (Try **Fast scan**: reopen completed job; else live scan + purge), `patchFromScan` |
| [`convex/lib/purgeBrandScan.ts`](../convex/lib/purgeBrandScan.ts) | Wipe jobs/posts/handles/breakdowns for one brand (live scan start + dev cache CLI) |
| [`convex/demoCache.ts`](../convex/demoCache.ts) | Dev CLI: `clearNonTryBrandCaches` (drop all brands except Try three), `clearBrandCacheByHost` (one non-Try host), `clearTryBrandCaches` / `clearTryBrandCacheByHost` (Try only); not callable from the Next.js client |
| [`convex/scanJobs.ts`](../convex/scanJobs.ts) | `getById`, `latestByBrand`, `rerunBrandRead`, `continueAfterBrand`, `rerunCompetitorFind`, `continueAfterCompetitorBrands`, `searchConfirmedCompetitors`, `abandonScan`, guarded internal patches |
| [`convex/lib/proposedAccount.ts`](../convex/lib/proposedAccount.ts) | Validator for proposed TikTok rows on scan jobs |
| [`convex/scraper/tiktokLinks.ts`](../convex/scraper/tiktokLinks.ts) | Parse `tiktok.com/@…` from page links (no-Apify competitor path) |
| [`lib/demo-limits.ts`](../lib/demo-limits.ts) | Demo cap: max competitor brands per scan |
| [`lib/scraperErrorHints.ts`](../lib/scraperErrorHints.ts) | Client hint when error is Bright Data TikTok KYC |
| [`convex/actions/scanBrand.ts`](../convex/actions/scanBrand.ts) | Stepped scan internal actions |
| [`convex/lib/apifyMessages.ts`](../convex/lib/apifyMessages.ts) | User-facing Clockworks timeout / generic Apify copy |
| [`convex/lib/scraperErrors.ts`](../convex/lib/scraperErrors.ts) | User-facing scraper errors (Firecrawl/Bright Data site read, Apify; no vendor JSON) |
| [`convex/lib/coerceModelLists.ts`](../convex/lib/coerceModelLists.ts) | Coerce LLM JSON lists (competitors, queries) before iteration |
| [`convex/discovery/brandFromUrl.ts`](../convex/discovery/brandFromUrl.ts) | Brand inference `brand-infer-v2` from page text |
| [`convex/brandInferences.ts`](../convex/brandInferences.ts) | `insertFromScan` (eval row + timings); public `latestByJob` for gate UI |
| [`convex/competitorDiscoveries.ts`](../convex/competitorDiscoveries.ts) | `insertFromScan` (discover v3 + timings); public `latestByJob` for competitor brand gate |
| [`lib/formatTimings.ts`](../lib/formatTimings.ts) | Site / infer / discover duration strings (home + scan job detail) |
| [`convex/lib/activeScanJob.ts`](../convex/lib/activeScanJob.ts) | Shared guard: writable scan job for brand patch + inference insert |
| [`.cursor/rules/owner-verifies-ui.mdc`](../.cursor/rules/owner-verifies-ui.mdc) | Agent: owner verifies localhost; no browser self-test |
| [`convex/discovery/competitorsFromBrand.ts`](../convex/discovery/competitorsFromBrand.ts) | SERP + fallback competitor discovery |
| [`convex/discovery/competitorSearchQueries.ts`](../convex/discovery/competitorSearchQueries.ts) | Google queries for competitor SERP |
| [`convex/scraper/brightDataSerp.ts`](../convex/scraper/brightDataSerp.ts) | Bright Data SERP organic results |
| [`convex/scraper/pageSnapshot.ts`](../convex/scraper/pageSnapshot.ts) | Shared page-read result types |
| [`convex/scraper/pageReadQuality.ts`](../convex/scraper/pageReadQuality.ts) | Challenge/short-body checks before brand infer |
| [`convex/scraper/firecrawl.ts`](../convex/scraper/firecrawl.ts) | Firecrawl v2 scrape for brand pages |
| [`convex/scraper/browser.ts`](../convex/scraper/browser.ts) | Firecrawl-first page fetch; Bright Data fallback + session helper |
| [`convex/scraper/apifyTikTok.ts`](../convex/scraper/apifyTikTok.ts) | Clockworks: latest + popular profile passes; profile 2× 120s, search 3× 180s; `passNotice` on one-pass fail |
| [`convex/scraper/tiktok.ts`](../convex/scraper/tiktok.ts) | TikTok entry: Apify if keyed, else Bright Data |
| [`convex/posts.ts`](../convex/posts.ts) | Upsert posts, `rankedByBrand` |
| [`convex/scoring.ts`](../convex/scoring.ts) | Median of ~24 most recent posts as baseline |
| [`convex/breakdowns.ts`](../convex/breakdowns.ts) | Breakdown queries + cache insert |
| [`convex/actions/breakdownPost.ts`](../convex/actions/breakdownPost.ts) | OpenRouter structural brief action |
| [`convex/discovery/breakdownFromPost.ts`](../convex/discovery/breakdownFromPost.ts) | Breakdown LLM prompt |
| [`app/post/[postId]/post-breakdown-client.tsx`](../app/post/[postId]/post-breakdown-client.tsx) | Metadata disclaimer + brief UI + retry |
| [`lib/formatMetrics.ts`](../lib/formatMetrics.ts) | Views / multiplier / post month-year |
| [`start.bat`](../start.bat) | Windows dev entry (`npm run dev`) |

---

## Local testing

```bash
cd c:\flutter_apps\viralradar
npx convex dev
npm run dev
npm run build
npm run lint
npm run convex:codegen
```

**Dev cache CLI** (internal mutations; not callable from the Next.js client):

```bash
# Remove all brands except Gymshark / Duolingo / Oatly (e.g. past live Scan URLs)
npx convex run demoCache:clearNonTryBrandCaches
# One non-Try host only (refuses Try hosts)
npx convex run demoCache:clearBrandCacheByHost '{"host":"usefastlane.ai"}'
# Wipe Try instant cache so the next Fast scan runs live
npx convex run demoCache:clearTryBrandCaches
npx convex run demoCache:clearTryBrandCacheByHost '{"host":"duolingo.com"}'
```

After clearing Try hosts, re-run a full scan per Try brand to seed **Fast scan** again. Dev deployment only.

**Before a demo DM:** complete one full scan each for Gymshark, Duolingo, and Oatly, then confirm Fast scan is instant. Clockworks retries on timeout (3×) with visible wait/retry copy on live scans. Live competitor lookup fail-soft still reaches confirm (may show no accounts).

Owner verifies UI in the browser: idle landing (prefilled `duolingo.com`, **Fast scan**) → for a live **Scan**, **review_brand** → **find_competitors** (demo cap ≤3 brands) → **review_competitor_brands** (uncheck one brand, **Look up accounts**) → **find_handles** (if Clockworks is slow, retry/wait copy) → confirm exact-match TikTok accounts or **No competitor TikTok accounts found** → **Search TikTok** (latest then popular profile passes) → outlier list (recent breakouts and historical/pinned hits, each with a post date) → **Play** or thumbnail (overlay lightbox, close visible, video plays; no Open on TikTok on the video) → **Breakdown** (metadata disclaimer at top, same lightbox + brief). Confirm `@handle` opens TikTok profile in one tab. At ≤720px width: full-width scan row and tappable **Play** / **Breakdown** on outlier rows. Try Instant chips or another live URL. Refresh, wordmark, or Cancel scan returns to idle landing with default URL; no brand panel during site read. No footer notice when Convex is healthy. Agents do not fetch localhost.

---

## Deploy checklist

- [ ] Before push to `main`: `npm run build` locally (Next typechecks `convex/`; catches batch return-type mismatches Vercel would fail on)
- [x] Git remote
- [x] Convex **dev** push (`npx convex dev --once` on `mellow-mule-141`). Production `npx convex deploy` only if the owner asked to ship
- [x] Convex dev env set (`OPENROUTER_API_KEY`, `APIFY_API_KEY`, `BRIGHTDATA_BROWSER_*`, `BRIGHTDATA_API_KEY`, `BRIGHTDATA_SERP_ZONE` for live competitors)
- [x] `FIRECRAWL_API_KEY` on Convex dev (fast site read; repo `.env` alone is not enough)
- [ ] Vercel linked + preview deploy
- [ ] Production Convex + `CONVEX_DEPLOY_KEY` on Vercel
