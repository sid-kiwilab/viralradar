# Viral Radar

**The organic layer for Fastlane-style campaign agents**: find breakout short-form posts scored against each account’s own baseline, not raw views.

Paste a brand URL → confirm competitor TikTok accounts → rank outlier posts → open a structural **Breakdown** brief (outlier multiplier, recreatability, confidence) for paid creative adaptation.

Full pipeline, limits, and stack: **[How it works](/how-it-works)** (also linked in the app header).

Repo: [sid-kiwilab/viralradar](https://github.com/sid-kiwilab/viralradar)

## What it does

1. **Understand the brand**: Bright Data Browser API reads the pasted homepage; OpenRouter infers name, niche, and positioning from page text.
2. **Find competitors**: Three Google queries via Bright Data SERP (when configured), with grounded extraction from organic results; memory fallback if SERP is off or empty.
3. **Confirm handles**: You review proposed accounts (site-linked, suggested, niche creators). Uncheck wrong guesses before any TikTok scrape.
4. **Score outliers**: Latest posts per handle via Apify Clockworks TikTok today (Bright Data planned for unit economics). Each post gets `outlierScore = views ÷ median views on that handle` (median needs at least **5** posts on the handle).
5. **Rank for display**: Home shows posts from the last **90 days** with multiplier **≥ 2×** baseline, sorted by score.
6. **Breakdown**: One OpenRouter call per outlier (cached): hook, caption pattern, why it beat baseline, paid brief, recreatability (1-5), and confidence (low/medium/high). Video is not analysed.

**Instant results** (Gymshark, Duolingo, Oatly only): URL field defaults to `duolingo.com` (host-only is fine); the primary button reads **Fast scan** for those hosts and reopens the last completed job when scored posts exist. Any other URL shows **Scan** and always runs a live pipeline. Covers are stored in Convex at scrape time ([`thumbnailStorageId`](convex/schema.ts)). Run each Try brand once on your demo deployment to seed.

## Methodology (outlier scoring)

| Step | Rule |
|------|------|
| Baseline | Median view count across the handle’s scraped posts (minimum 5 posts) |
| Outlier score | `post.views / baseline` |
| UI filter | Last 90 days, score ≥ 2×, highest first |

Templates and raw view counts mislead; a 3× post on a 50M-view account is a different signal than 3× on a 2k-view account. Normalizing to **that account’s** median is the core thesis.

## What Breakdown is (and is not)

Breakdown does **not** watch the video. It uses caption text, duration, engagement, outlier score vs baseline, and sibling posts on the same handle. **Format** and **pacing** fields stay metadata-only (duration vs siblings); they do not describe cuts, B-roll, or on-screen visuals.

For frame-accurate creative analysis, you would add video understanding later; v1 is pattern extraction for performance marketers. Recreatability (1-5) scores how feasible **AI video tools** can reproduce structure from metadata; see tooltips on the breakdown page.

## Routes

- `/`: scan + outlier list
- `/how-it-works`: methodology (public)
- `/post/[postId]`: structural breakdown (cached per post)

## Stack

- Next.js (App Router, TypeScript, Tailwind)
- Convex (schema, queries, mutations, actions)
- Playwright + Bright Data (brand site read; optional SERP for competitor Google search)
- Apify Clockworks TikTok scraper today; Bright Data for TikTok on the roadmap (unit economics)
- OpenRouter via `openai` SDK (default `anthropic/claude-sonnet-4.6`)
- Hosting: Vercel + Convex Cloud (when deployed)

## Local dev

```bash
cd c:\flutter_apps\viralradar
npm install
npx convex dev
```

Leave `npx convex dev` running. It writes `NEXT_PUBLIC_CONVEX_URL` to `.env.local`.

In another terminal:

```bash
npm run dev
```

Or double-click [`start.bat`](start.bat).

```bash
npm run build
npm run lint
npm run convex:codegen
```

## Env vars

| Where | Variable | Purpose |
|-------|----------|---------|
| `.env.local` | `NEXT_PUBLIC_CONVEX_URL` | Convex dev/prod URL |
| `.env.local` | `CONVEX_DEPLOYMENT` | Convex deployment id |
| Convex | `OPENROUTER_API_KEY` | OpenRouter API key |
| Convex | `APIFY_API_KEY` | Apify token for TikTok |
| Convex | `BRIGHTDATA_BROWSER_WSS` or `BRIGHTDATA_BROWSER_USERNAME` + `BRIGHTDATA_BROWSER_PASSWORD` | Bright Data Browser API for site reads |
| Convex | `BRIGHTDATA_API_KEY` + `BRIGHTDATA_SERP_ZONE` | Bright Data SERP for live competitor Google search (optional) |
| Convex | `OPENROUTER_MODEL` | Optional model override |
| Vercel | `CONVEX_DEPLOY_KEY` | `npx convex deploy --cmd "next build"` when ready |

Copy [`.env.example`](.env.example) to `.env.local`. Never commit real keys. Set scraper and LLM keys on **Convex** only:

```bash
npx convex env set OPENROUTER_API_KEY sk-or-REPLACE
npx convex env set APIFY_API_KEY apify_api_REPLACE
npx convex env set BRIGHTDATA_BROWSER_WSS "wss://USER:PASS@brd.superproxy.io:9222"
npx convex env set BRIGHTDATA_API_KEY REPLACE
npx convex env set BRIGHTDATA_SERP_ZONE your_serp_zone_name
```

## Docs

- Live ops: [`docs/LIVE.md`](docs/LIVE.md)
- Session journal: [`docs/JOURNAL.md`](docs/JOURNAL.md)

## Roadmap (out of v1)

- Video-aware breakdown (frames / transcript)
- Instagram Reels, YouTube Shorts
- Historical tracking, multi-brand compare, auth
