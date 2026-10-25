# Viralradar — live operation

Operational reference for this Next.js + Convex app.  
Local dev: [README.md](../README.md). Session history: [JOURNAL.md](JOURNAL.md).

## Current state

| Item | Value |
|------|--------|
| Path | `c:\flutter_apps\viralradar` |
| Org / repo | [sid-kiwilab/viralradar](https://github.com/sid-kiwilab/viralradar) |
| Product | **Viral Radar** — organic outlier short-form signal (TikTok first) |
| Domain | unset |
| Stack | Next.js 16, React 19, Tailwind 4, Convex, `playwright-core` (remote CDP), OpenRouter (`openai` SDK) |
| App root | `app/` (no `src/`) |
| Dev server | `npm run dev` or [`start.bat`](../start.bat) → owner verifies in browser |
| Routes | `/`, `/post/[postId]` (cached structural brief) |
| Backend | Convex Cloud (`convex/`) |
| LLM | OpenRouter → default `anthropic/claude-sonnet-4.6` ([`convex/lib/openrouter.ts`](../convex/lib/openrouter.ts)); optional `OPENROUTER_MODEL` on Convex |
| Scraper | Brand sites: Bright Data Browser API. Competitors: Bright Data **SERP API** when `BRIGHTDATA_API_KEY` + `BRIGHTDATA_SERP_ZONE` are set. TikTok: Apify `clockworks/tiktok-scraper` when `APIFY_API_KEY` is set; else Bright Data ([`convex/scraper/apifyTikTok.ts`](../convex/scraper/apifyTikTok.ts), [`convex/scraper/tiktok.ts`](../convex/scraper/tiktok.ts)) |
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

- **Home** ([`app/home-client.tsx`](../app/home-client.tsx)): Mog Check style landing when idle (`brandId` unset or job not loaded yet / missing); compact tool mode once a job exists. **viralradar** wordmark ([`components/site-header.tsx`](../components/site-header.tsx) button via `SiteShell` `onHomeClick`) and **Cancel scan** call `resetHome` (abandon active job if needed, then clear URL/`brandId` like a refresh). Brand summary hidden during `queued` / `understand_site`. Paste a URL and **Scan** (`brands.startFromUrl` fails in-progress jobs for that URL before a new job). After site + competitor infer, **`review_competitors`**: [`ScanStatus`](../components/scan-status.tsx) shows `job.detail` from [`competitorReviewDetail`](../convex/discovery/competitorsFromBrand.ts) (Google vs fallback vs SERP not configured); account groups **Linked on their site** (`foundVia: site`, no-Apify path), **Suggested accounts** (Apify user search), **Niche creators**; each `@handle` opens canonical TikTok via [`TikTokExternalLink`](../components/tiktok-external-link.tsx) (`referrer: no-referrer` in layout); unchecked rows are not scraped. **Search TikTok** runs scrape for checked handles only. Outlier **Breakdown** opens cached structural brief. Footer shows Convex issues only when misconfigured or unhealthy.
- **Scan job patches** ([`convex/scanJobs.ts`](../convex/scanJobs.ts)): internal **`patch`** and **`markRunning`** no-op when job is already `failed` or `completed` (stale actions after cancel/rescan).
- **Scan pipeline** ([`convex/actions/scanBrand.ts`](../convex/actions/scanBrand.ts)): two internal actions (`readSite`, `searchTikTok`). Stages: `understand_site` → `find_competitors` → `review_competitors` (`waiting`) → `search_tiktok` → `score` → `done` (or `failed`). **`isJobActive`** after each long await and before TikTok upserts / `completed`; [`patchFromScan`](../convex/brands.ts) no-ops unless the job is active and matches `brandId`.
- **Site read**: cookie-banner block, captcha wait, one retry; page text only (no raw `fetch` of the brand URL).
- **Competitors**: When **`BRIGHTDATA_API_KEY`** + **`BRIGHTDATA_SERP_ZONE`** are set, OpenRouter builds 3 Google queries → Bright Data **SERP API** Direct API (`data_format: json`, organic title/link/snippet) → OpenRouter extracts up to 5 names **only from those results** ([`discoverCompetitors`](../convex/discovery/competitorsFromBrand.ts), [`brightDataSerp.ts`](../convex/scraper/brightDataSerp.ts)). SERP errors or empty results fall back to a memory-based list; fallback reason is stored on `scanJobs.detail` for confirm. With **`APIFY_API_KEY`**, one batched Apify user search resolves names (`foundVia: search` on [`proposedAccounts`](../convex/schema.ts)); [`pickAccountForName`](../convex/scraper/apifyTikTok.ts) prefers exact handle/display over prefix matches. Without Apify, only a `tiktok.com/@…` link on each competitor homepage (`foundVia: site`). Niche creators from video search + [`filterTikTokAccounts`](../convex/discovery/filterTikTokAccounts.ts).
- **TikTok**: After confirm, checked handles scrape latest 24 videos via `clockworks/tiktok-scraper` (one batched user search during `find_competitors` when Apify is set). No video/cover downloads. Bright Data is for the pasted brand URL site read only (not competitor homepages when Apify is on). Without Apify, TikTok scraping still goes through Bright Data and needs Browser zone [KYC](https://brightdata.com/cp/kyc).
- **Scoring**: median views per handle (min 5 posts) → `outlierScore` = views / baseline ([`convex/scoring.ts`](../convex/scoring.ts)).
- **Breakdown**: outlier row **Breakdown** → [`/post/[postId]`](../app/post/[postId]/page.tsx). [`actions/breakdownPost.getOrCreate`](../convex/actions/breakdownPost.ts) loads caption + handle siblings + brand context, calls OpenRouter once, caches in `breakdowns` (`breakdownGenerations` lock avoids duplicate LLM calls). Metadata only — no video download.
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
| [`app/layout.tsx`](../app/layout.tsx) | Root layout; `metadata.referrer: no-referrer` for outbound links |
| [`app/home-client.tsx`](../app/home-client.tsx) | Landing + scan UI, `resetHome`, job progress, ranked posts |
| [`components/tiktok-external-link.tsx`](../components/tiktok-external-link.tsx) | Outbound TikTok anchors (`no-referrer`) |
| [`convex/lib/tiktokUrls.ts`](../convex/lib/tiktokUrls.ts) | Canonical profile/video URLs + sanitize for stored links |
| [`components/site-header.tsx`](../components/site-header.tsx) | Wordmark link (post page) or home reset button |
| [`components/site-shell.tsx`](../components/site-shell.tsx) | Hero video, grain, header shell |
| [`components/scan-status.tsx`](../components/scan-status.tsx) | Radar animation + stage chips during scan |
| [`components/landing-below-fold.tsx`](../components/landing-below-fold.tsx) | Idle marketing (process strip, sample shape, demo footer) |
| [`lib/site-constants.ts`](../lib/site-constants.ts) | Hero video URL, try-brand URLs |
| [`lib/stageLabel.ts`](../lib/stageLabel.ts) | Scan stage status copy |
| [`app/globals.css`](../app/globals.css) | Landing design tokens (NASC / Mog Check subset) |
| [`convex/brands.ts`](../convex/brands.ts) | `startFromUrl` (fail active jobs for URL), `patchFromScan` (job-guarded brand write) |
| [`convex/scanJobs.ts`](../convex/scanJobs.ts) | `latestByBrand`, `searchConfirmedCompetitors`, `abandonScan`, `proposedAccounts` (`foundVia`, `source`), guarded internal patches |
| [`convex/lib/proposedAccount.ts`](../convex/lib/proposedAccount.ts) | Validator for proposed TikTok rows on scan jobs |
| [`convex/scraper/tiktokLinks.ts`](../convex/scraper/tiktokLinks.ts) | Parse `tiktok.com/@…` from page links (no-Apify competitor path) |
| [`convex/discovery/filterTikTokAccounts.ts`](../convex/discovery/filterTikTokAccounts.ts) | LLM relevance filter for niche creator candidates |
| [`convex/discovery/nicheSearchQueries.ts`](../convex/discovery/nicheSearchQueries.ts) | Niche TikTok video search queries from brand context |
| [`lib/scraperErrorHints.ts`](../lib/scraperErrorHints.ts) | Client hint when error is Bright Data TikTok KYC |
| [`convex/actions/scanBrand.ts`](../convex/actions/scanBrand.ts) | Stepped scan internal actions |
| [`convex/lib/scraperErrors.ts`](../convex/lib/scraperErrors.ts) | User-facing Bright Data error text |
| [`convex/discovery/brandFromUrl.ts`](../convex/discovery/brandFromUrl.ts) | Brand inference from page text |
| [`convex/discovery/competitorsFromBrand.ts`](../convex/discovery/competitorsFromBrand.ts) | SERP + fallback competitor discovery |
| [`convex/discovery/competitorSearchQueries.ts`](../convex/discovery/competitorSearchQueries.ts) | Google queries for competitor SERP |
| [`convex/scraper/brightDataSerp.ts`](../convex/scraper/brightDataSerp.ts) | Bright Data SERP organic results |
| [`convex/scraper/browser.ts`](../convex/scraper/browser.ts) | Bright Data page fetch helper |
| [`convex/scraper/apifyTikTok.ts`](../convex/scraper/apifyTikTok.ts) | Clockworks TikTok search + profile via Apify |
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

Owner verifies UI in the browser: idle landing → Scan → confirm accounts (check scan status line for Google vs fallback competitors; open `@handle` links, uncheck wrong guesses) → Search TikTok → outlier list → **Breakdown** on a row. Refresh, wordmark, or Cancel scan returns to idle landing; no brand panel during site read. No footer notice when Convex is healthy. Agents do not fetch localhost.

---

## Deploy checklist

- [x] Git remote
- [x] Convex **dev** push (`npx convex dev --once` on `mellow-mule-141`). Production `npx convex deploy` only if the owner asked to ship
- [x] Convex dev env set (`OPENROUTER_API_KEY`, `APIFY_API_KEY`, `BRIGHTDATA_BROWSER_*`, `BRIGHTDATA_API_KEY`, `BRIGHTDATA_SERP_ZONE` for live competitors)
- [ ] Vercel linked + preview deploy
- [ ] Production Convex + `CONVEX_DEPLOY_KEY` on Vercel
