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
| Routes | `/`, `/post/[postId]` (breakdown placeholder) |
| Backend | Convex Cloud (`convex/`) |
| LLM | OpenRouter → default `anthropic/claude-sonnet-4.6` ([`convex/lib/openrouter.ts`](../convex/lib/openrouter.ts)); optional `OPENROUTER_MODEL` on Convex |
| Scraper | Bright Data Browser API via `connectOverCDP` ([`convex/scraper/browser.ts`](../convex/scraper/browser.ts), [`convex/scraper/tiktok.ts`](../convex/scraper/tiktok.ts)) |
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
  BrowserAPI --> BrandSite[Brand website read]
  BrowserAPI --> TikTok[TikTok search and profiles]
```

- **Home** ([`app/home-client.tsx`](../app/home-client.tsx)): Mog Check style landing when idle (`brandId` unset or job not loaded yet / missing); compact tool mode once a job exists. **viralradar** wordmark ([`components/site-header.tsx`](../components/site-header.tsx) button via `SiteShell` `onHomeClick`) and **Cancel scan** call `resetHome` (abandon active job if needed, then clear URL/`brandId` like a refresh). Brand summary hidden during `queued` / `understand_site`. Paste a URL and **Scan** (`brands.startFromUrl` fails in-progress jobs for that URL before a new job). Footer shows Convex issues only when misconfigured or unhealthy.
- **Scan job patches** ([`convex/scanJobs.ts`](../convex/scanJobs.ts)): internal **`patch`** and **`markRunning`** no-op when job is already `failed` or `completed` (stale actions after cancel/rescan).
- **Scan pipeline** ([`convex/actions/scanBrand.ts`](../convex/actions/scanBrand.ts)): three internal actions (`readSite`, `inferCompetitors`, `searchTikTok`). Stages: `understand_site` → `review_brand` (`waiting`) → `find_competitors` → `review_competitors` (`waiting`) → `search_tiktok` → `score` → `done` (or `failed`). **`isJobActive`** after each long await and before TikTok upserts / `completed`; [`patchFromScan`](../convex/brands.ts) no-ops unless the job is active and matches `brandId`.
- **Site read**: cookie-banner block, captcha wait, one retry; page text only (no raw `fetch` of the brand URL).
- **Competitors**: OpenRouter from stored page excerpt (max 5); user confirms names before TikTok runs.
- **TikTok / Bright Data**: TikTok requires Browser zone [KYC](https://brightdata.com/cp/kyc) approval. Compliance blocks surface as a short message via [`convex/lib/scraperErrors.ts`](../convex/lib/scraperErrors.ts). Site reads still use Bright Data. If KYC stays pending, TikTok search/profile can go through Apify Clockworks (`tiktok-user-search-scraper` + `tiktok-profile-scraper`) behind the same `scrapeCompetitorsOnTikTok` interface.
- **Scoring**: median views per handle (min 5 posts) → `outlierScore` = views / baseline ([`convex/scoring.ts`](../convex/scoring.ts)).
- **Still stub**: [`breakdowns.getOrCreate`](../convex/breakdowns.ts).
- **Gitignore**: `.env*`, `node_modules/`, `.next/`, `.vercel/`, `.convex/`, `/tmp/`, Playwright reports.

---

## Environment variables

### Next.js (`.env.local`, gitignored)

Do not put `OPENROUTER_API_KEY` or `BRIGHTDATA_*` here. Convex actions read deployment env only.

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_CONVEX_URL` | Yes for UI | Convex deployment URL |
| `CONVEX_DEPLOYMENT` | Yes for CLI | Set by `npx convex dev` |

### Convex deployment (`npx convex env set`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENROUTER_API_KEY` | For LLM steps | OpenRouter API key |
| `OPENROUTER_MODEL` | Optional | OpenRouter model id (default `anthropic/claude-sonnet-4.6`) |
| `BRIGHTDATA_BROWSER_WSS` | For scrape | Full Playwright CDP URL from Browser API “Copy command” |
| `BRIGHTDATA_BROWSER_USERNAME` | Optional split | e.g. `brd-customer-…-zone-scraping_browser1` |
| `BRIGHTDATA_BROWSER_PASSWORD` | Optional split | Zone password from copy command (may ≠ account API key) |

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
| [`app/home-client.tsx`](../app/home-client.tsx) | Landing + scan UI, `resetHome`, job progress, ranked posts |
| [`components/site-header.tsx`](../components/site-header.tsx) | Wordmark link (post page) or home reset button |
| [`components/site-shell.tsx`](../components/site-shell.tsx) | Hero video, grain, header shell |
| [`components/scan-status.tsx`](../components/scan-status.tsx) | Radar animation + stage chips during scan |
| [`components/landing-below-fold.tsx`](../components/landing-below-fold.tsx) | Idle marketing (process strip, sample shape, demo footer) |
| [`lib/site-constants.ts`](../lib/site-constants.ts) | Hero video URL, try-brand URLs |
| [`lib/stageLabel.ts`](../lib/stageLabel.ts) | Scan stage status copy |
| [`app/globals.css`](../app/globals.css) | Landing design tokens (NASC / Mog Check subset) |
| [`convex/brands.ts`](../convex/brands.ts) | `startFromUrl` (fail active jobs for URL), `patchFromScan` (job-guarded brand write) |
| [`convex/scanJobs.ts`](../convex/scanJobs.ts) | `latestByBrand`, `continueToCompetitors`, `searchConfirmedCompetitors`, `abandonScan`, guarded internal patches |
| [`lib/scraperErrorHints.ts`](../lib/scraperErrorHints.ts) | Client hint when error is Bright Data TikTok KYC |
| [`convex/actions/scanBrand.ts`](../convex/actions/scanBrand.ts) | Stepped scan internal actions |
| [`convex/lib/scraperErrors.ts`](../convex/lib/scraperErrors.ts) | User-facing Bright Data error text |
| [`convex/discovery/brandFromUrl.ts`](../convex/discovery/brandFromUrl.ts) | Brand inference from page text |
| [`convex/discovery/competitorsFromBrand.ts`](../convex/discovery/competitorsFromBrand.ts) | Competitor list (max 5) |
| [`convex/scraper/browser.ts`](../convex/scraper/browser.ts) | Bright Data page fetch helper |
| [`convex/scraper/tiktok.ts`](../convex/scraper/tiktok.ts) | TikTok search + profile scrape |
| [`convex/posts.ts`](../convex/posts.ts) | Upsert posts, `rankedByBrand` |
| [`convex/scoring.ts`](../convex/scoring.ts) | Median baseline and multiplier |
| [`convex/breakdowns.ts`](../convex/breakdowns.ts) | Breakdown stub |
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

Owner verifies UI in the browser: idle landing → Scan → confirm brand → Find competitors → confirm list → Search TikTok. Refresh, wordmark, or Cancel scan returns to idle landing; no brand panel during site read. No footer notice when Convex is healthy. Agents do not fetch localhost.

---

## Deploy checklist

- [x] Git remote
- [x] Convex **dev** push (`npx convex dev --once` on `mellow-mule-141`). Production `npx convex deploy` only if the owner asked to ship
- [x] Convex dev env set (`OPENROUTER_API_KEY`, `BRIGHTDATA_BROWSER_*`)
- [ ] Vercel linked + preview deploy
- [ ] Production Convex + `CONVEX_DEPLOY_KEY` on Vercel
