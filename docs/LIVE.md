# Viralradar: live operation

Operational reference for this Next.js + Convex app.  
Local dev: [README.md](../README.md). Session history: [JOURNAL.md](JOURNAL.md).

## Current state

| Item | Value |
|------|--------|
| Path | `c:\flutter_apps\viralradar` |
| Org / repo | [sid-kiwilab/viralradar](https://github.com/sid-kiwilab/viralradar) |
| Product | **Viral Radar**: organic outlier short-form signal (TikTok first) |
| Domain | unset |
| Stack | Next.js 16, React 19, Tailwind 4, Convex, `playwright-core` (remote CDP), OpenRouter (`openai` SDK) |
| App root | `app/` (no `src/`) |
| Dev server | `npm run dev` or [`start.bat`](../start.bat) → owner verifies in browser |
| Routes | `/`, `/how-it-works`, `/post/[postId]` (cached structural brief) |
| Backend | Convex Cloud (`convex/`) |
| LLM | OpenRouter → default `anthropic/claude-sonnet-4.6` ([`convex/lib/openrouter.ts`](../convex/lib/openrouter.ts)); optional `OPENROUTER_MODEL` on Convex |
| Scraper | Brand sites: Bright Data Browser API. Competitors: Bright Data **SERP API** (optional; memory fallback). TikTok: **Apify Clockworks today**; Bright Data TikTok planned for unit economics ([`convex/scraper/apifyTikTok.ts`](../convex/scraper/apifyTikTok.ts), [`convex/scraper/tiktok.ts`](../convex/scraper/tiktok.ts)) |
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
  ConvexCloud --> BrowserAPI[Bright Data Browser API]
  ConvexCloud --> SerpAPI[Bright Data SERP API]
  ConvexCloud --> Apify[Apify Clockworks TikTok]
  BrowserAPI --> BrandSite[Brand website read]
  SerpAPI --> GoogleSearch[Google organic results]
  Apify --> TikTok[TikTok search and profiles]
```

- **Home** ([`app/home-client.tsx`](../app/home-client.tsx)): Idle landing when no `brandId`/`jobId` (hero, **`TryBrandChips`** / Instant results for Gymshark/Duolingo/Oatly, default URL `duolingo.com`, bare-host brand input, demo footer via [`landing-below-fold.tsx`](../components/landing-below-fold.tsx)); **Walkthrough** when `TELLA_EMBED_URL` set. Primary CTA: **Fast scan** when input matches a Try host ([`isInstantTryBrandInput`](../lib/demo-brands.ts)), else **Scan**. **`startFromUrl`**: Try hosts reopen last **completed** job; other URLs always **live** scan ([`convex/brands.ts`](../convex/brands.ts)). Reset/home restores default URL. Client pins `jobId` via [`scanJobs.getById`](../convex/scanJobs.ts) (`Loading scan…` while pending); completed outlier list hidden while **`submitting`** a new scan. **`find_competitors`**: demo note (max **3** brands, [`lib/demo-limits.ts`](../lib/demo-limits.ts)). **`review_competitors`**: confirm disclaimer; select all/none; **Search N TikTok account(s)** (hidden when no confident matches). Batched profile scrape + per-handle save skeletons; outliers ≥2× / 90d; [`PostThumbnail`](../components/post-thumbnail.tsx). Header → [`/how-it-works`](../app/how-it-works/page.tsx).
- **Scan job patches** ([`convex/scanJobs.ts`](../convex/scanJobs.ts)): internal **`patch`** and **`markRunning`** no-op when job is already `failed` or `completed` (stale actions after cancel/rescan).
- **Scan pipeline** ([`convex/actions/scanBrand.ts`](../convex/actions/scanBrand.ts)): two internal actions (`readSite`, `searchTikTok`). Stages: `understand_site` → `find_competitors` → `review_competitors` (`waiting`) → `search_tiktok` → `score` → `done` (or `failed`). **`isJobActive`** after each long await and before TikTok upserts / `completed`; [`patchFromScan`](../convex/brands.ts) no-ops unless the job is active and matches `brandId`.
- **Site read**: cookie-banner block, captcha wait, one retry; page text only (no raw `fetch` of the brand URL).
- **Competitors**: Up to **3** competitor brands per scan ([`lib/demo-limits.ts`](../lib/demo-limits.ts) → [`discoverCompetitors`](../convex/discovery/competitorsFromBrand.ts)). When **`BRIGHTDATA_API_KEY`** + **`BRIGHTDATA_SERP_ZONE`** are set, OpenRouter builds 3 Google queries → Bright Data **SERP API** Direct API (`data_format: json`, organic title/link/snippet) → OpenRouter extracts names **only from those results** ([`brightDataSerp.ts`](../convex/scraper/brightDataSerp.ts)). SERP errors or empty results fall back to a memory-based list; fallback reason is stored on `scanJobs.detail` for confirm. With **`APIFY_API_KEY`**, one batched Clockworks user search resolves names (`foundVia: search` on [`proposedAccounts`](../convex/schema.ts)); **3× retry** on actor timeout with **`scanJobs.detail`** updates between attempts (plain retry copy, then fail-soft to confirm); while each attempt runs, [`ScanStatus`](../components/scan-status.tsx) shows rotating wait lines from [`lib/tiktok-wait.ts`](../lib/tiktok-wait.ts) ([`apifyTikTok.ts`](../convex/scraper/apifyTikTok.ts), [`scanBrand.ts`](../convex/actions/scanBrand.ts)). [`pickAccountForName`](../convex/scraper/apifyTikTok.ts) accepts **exact** handle or display name only (no prefix guesses). Without Apify, only a `tiktok.com/@…` link on each competitor homepage (`foundVia: site`). No niche creator video search.
- **TikTok**: After confirm, all checked handles scrape latest 24 videos in **one batched** `clockworks/tiktok-scraper` profile run; then upsert + recompute scores per handle (`Saving results X of Y…`). Same Clockworks retry + **`detail`** wait/retry UX as competitor lookup (`Loading @handles…` and save progress override joke lines). `confirmedHandles` / `scrapeHandlesCompleted` on [`scanJobs`](../convex/schema.ts). Job completes if any handle returns posts; partial failures on `job.detail`. **No video download**; **cover images** fetched server-side at scrape into Convex file storage (`posts.thumbnailStorageId`, [`storeThumbnail.ts`](../convex/lib/storeThumbnail.ts)); demo reopen schedules [`backfillForBrand`](../convex/actions/thumbnails.ts) for legacy rows. Bright Data is for site read (+ SERP), not TikTok when Apify is set.
- **Scoring**: median views per handle (min 5 posts) → `outlierScore` = views / baseline ([`convex/scoring.ts`](../convex/scoring.ts)). **Display** ([`posts.rankedByBrand`](../convex/posts.ts)): last 90 days, score ≥ 2×, sorted by multiplier.
- **Breakdown**: [`/post/[postId]`](../app/post/[postId]/page.tsx). One OpenRouter call per post (cached in `breakdowns` on revisit). UI: outlier / recreatability / confidence with [`ScoreTip`](../components/score-tip.tsx) tooltips; link to `/how-it-works`. Metadata-only brief ([`discovery/breakdownFromPost.ts`](../convex/discovery/breakdownFromPost.ts)).
- **Open on TikTok**: [`TikTokExternalLink`](../components/tiktok-external-link.tsx) + HTTP **`Referrer-Policy: no-referrer`** ([`next.config.ts`](../next.config.ts)) so TikTok does not 403 on the app origin as `Referer`. Canonical `www.tiktok.com` URLs. Deploy to Vercel for the header in prod.
- **Gitignore**: `.env*`, `node_modules/`, `.next/`, `.vercel/`, `.convex/`, `/tmp/`, Playwright reports.

---

## Environment variables

### Next.js (`.env.local`, gitignored)

Do not put `OPENROUTER_API_KEY`, `APIFY_API_KEY`, or `BRIGHTDATA_*` here. Convex actions read deployment env only.

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
| `BRIGHTDATA_BROWSER_WSS` | For site read | Full Playwright CDP URL from Browser API “Copy command” |
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
| [`components/tiktok-external-link.tsx`](../components/tiktok-external-link.tsx) | Outbound TikTok: sanitized URL, `window.open` + `noopener,noreferrer` (native `_blank` if popup blocked) |
| [`convex/lib/tiktokUrls.ts`](../convex/lib/tiktokUrls.ts) | Canonical profile/video URLs; `sanitizeTikTokWebUrl` forces `www` + strips query |
| [`components/site-header.tsx`](../components/site-header.tsx) | Wordmark link (post page) or home reset button |
| [`components/site-shell.tsx`](../components/site-shell.tsx) | Hero video, grain, header shell |
| [`components/scan-status.tsx`](../components/scan-status.tsx) | Radar + stage chips; rotating TikTok wait copy while Clockworks attempts run |
| [`lib/tiktok-wait.ts`](../lib/tiktok-wait.ts) | Wait token, retry strings, joke pool; shared Convex + UI |
| [`components/landing-below-fold.tsx`](../components/landing-below-fold.tsx) | Idle landing footer (demo + how-it-works link) |
| [`lib/demo-brands.ts`](../lib/demo-brands.ts) | Try hosts, `DEFAULT_TRY_BRAND_INPUT`, `isInstantTryBrandInput` (Fast scan label) |
| [`lib/site-constants.ts`](../lib/site-constants.ts) | Hero video, re-exports Try URLs, `TELLA_EMBED_URL` |
| [`components/post-thumbnail.tsx`](../components/post-thumbnail.tsx) | Stored cover URL; remount on URL change; placeholder on error |
| [`components/score-tip.tsx`](../components/score-tip.tsx) | Breakdown `?` tooltips (portal + inline styles; desktop hover / touch tap) |
| [`next.config.ts`](../next.config.ts) | `Referrer-Policy: no-referrer` on `/` and `/:path*`; Turbopack: Tailwind on `*.css` only, `*.module.css` bypass |
| [`app/how-it-works/page.tsx`](../app/how-it-works/page.tsx) | Methodology page (real stack) |
| [`components/walkthrough-slot.tsx`](../components/walkthrough-slot.tsx) | Landing Tella embed placeholder |
| [`components/site-header.tsx`](../components/site-header.tsx) | Wordmark + How it works link |
| [`convex/lib/demoBrands.ts`](../convex/lib/demoBrands.ts) | Demo host match helpers (imports [`lib/demo-brands.ts`](../lib/demo-brands.ts)) |
| [`convex/actions/thumbnails.ts`](../convex/actions/thumbnails.ts) | Backfill stored covers for demo cache reopen |
| [`convex/lib/storeThumbnail.ts`](../convex/lib/storeThumbnail.ts) | Fetch TikTok cover into Convex storage at scrape |
| [`convex/lib/postThumbnail.ts`](../convex/lib/postThumbnail.ts) | Resolve `thumbnailUrl` for queries |
| [`lib/stageLabel.ts`](../lib/stageLabel.ts) | Scan stage status copy (hides internal `tiktok-wait*` tokens) |
| [`app/globals.css`](../app/globals.css) | Landing design tokens (NASC / Mog Check subset) |
| [`convex/brands.ts`](../convex/brands.ts) | `startFromUrl` (Try hosts only: reopen completed scan; else live scan; fail active jobs), `patchFromScan` |
| [`convex/demoCache.ts`](../convex/demoCache.ts) | Dev CLI: `clearNonTryBrandCaches` (drop all brands except Try three), `clearBrandCacheByHost` (one non-Try host), `clearTryBrandCaches` / `clearTryBrandCacheByHost` (Try only); not callable from the Next.js client |
| [`convex/scanJobs.ts`](../convex/scanJobs.ts) | `getById`, `latestByBrand` (newest `startedAt`), `searchConfirmedCompetitors`, `abandonScan`, guarded internal patches |
| [`convex/lib/proposedAccount.ts`](../convex/lib/proposedAccount.ts) | Validator for proposed TikTok rows on scan jobs |
| [`convex/scraper/tiktokLinks.ts`](../convex/scraper/tiktokLinks.ts) | Parse `tiktok.com/@…` from page links (no-Apify competitor path) |
| [`lib/demo-limits.ts`](../lib/demo-limits.ts) | Demo cap: max competitor brands per scan |
| [`lib/scraperErrorHints.ts`](../lib/scraperErrorHints.ts) | Client hint when error is Bright Data TikTok KYC |
| [`convex/actions/scanBrand.ts`](../convex/actions/scanBrand.ts) | Stepped scan internal actions |
| [`convex/lib/apifyMessages.ts`](../convex/lib/apifyMessages.ts) | User-facing Clockworks timeout / generic Apify copy |
| [`convex/lib/scraperErrors.ts`](../convex/lib/scraperErrors.ts) | User-facing scraper errors (Bright Data, Apify; no vendor JSON) |
| [`convex/discovery/brandFromUrl.ts`](../convex/discovery/brandFromUrl.ts) | Brand inference from page text |
| [`convex/discovery/competitorsFromBrand.ts`](../convex/discovery/competitorsFromBrand.ts) | SERP + fallback competitor discovery |
| [`convex/discovery/competitorSearchQueries.ts`](../convex/discovery/competitorSearchQueries.ts) | Google queries for competitor SERP |
| [`convex/scraper/brightDataSerp.ts`](../convex/scraper/brightDataSerp.ts) | Bright Data SERP organic results |
| [`convex/scraper/browser.ts`](../convex/scraper/browser.ts) | Bright Data page fetch helper |
| [`convex/scraper/apifyTikTok.ts`](../convex/scraper/apifyTikTok.ts) | Clockworks via Apify; 3× timeout retry; patches `detail` between attempts; logs raw failures server-side |
| [`convex/scraper/tiktok.ts`](../convex/scraper/tiktok.ts) | TikTok entry: Apify if keyed, else Bright Data |
| [`convex/posts.ts`](../convex/posts.ts) | Upsert posts, `rankedByBrand` |
| [`convex/scoring.ts`](../convex/scoring.ts) | Median baseline and multiplier |
| [`convex/breakdowns.ts`](../convex/breakdowns.ts) | Breakdown queries + cache insert |
| [`convex/actions/breakdownPost.ts`](../convex/actions/breakdownPost.ts) | OpenRouter structural brief action |
| [`convex/discovery/breakdownFromPost.ts`](../convex/discovery/breakdownFromPost.ts) | Breakdown LLM prompt |
| [`app/post/[postId]/post-breakdown-client.tsx`](../app/post/[postId]/post-breakdown-client.tsx) | Brief UI + retry |
| [`lib/formatMetrics.ts`](../lib/formatMetrics.ts) | Views / multiplier formatting |
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

Owner verifies UI in the browser: idle landing (prefilled `duolingo.com`, **Fast scan**) → for a live **Scan**, watch **find_competitors** (demo cap ≤3 brands; if Clockworks is slow, **ScanStatus** should show retry lines and rotating wait copy, not a frozen line) → confirm exact-match accounts or **No competitor TikTok accounts found** → **Search TikTok** (one batched profile scrape) → outlier list → **Open on TikTok** (after Vercel deploy: no 403 from our referrer) → **Breakdown** on a row. Try Instant chips or another live URL. Refresh, wordmark, or Cancel scan returns to idle landing with default URL; no brand panel during site read. No footer notice when Convex is healthy. Agents do not fetch localhost.

---

## Deploy checklist

- [x] Git remote
- [x] Convex **dev** push (`npx convex dev --once` on `mellow-mule-141`). Production `npx convex deploy` only if the owner asked to ship
- [x] Convex dev env set (`OPENROUTER_API_KEY`, `APIFY_API_KEY`, `BRIGHTDATA_BROWSER_*`, `BRIGHTDATA_API_KEY`, `BRIGHTDATA_SERP_ZONE` for live competitors)
- [ ] Vercel linked + preview deploy
- [ ] Production Convex + `CONVEX_DEPLOY_KEY` on Vercel
