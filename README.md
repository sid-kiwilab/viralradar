# Viral Radar

**Winning organic formats in your niche that AI can recreate.**

Paste a brand URL (Enter or **Scan**) → review brand understanding → confirm competitor TikTok accounts → list outlier TikTok posts (≥ 2× vs that account’s recent median) → open **Breakdown** (outlier, recreatability, hook, paid adaptation). List order is outlier score today; recreatability is per post, not in the rank yet.

Full pipeline, limits, and stack: **[How it works](/how-it-works)** (also linked in the app header).

Repo: [sid-kiwilab/viralradar](https://github.com/sid-kiwilab/viralradar)

## What it does

1. **Understand the brand**: Firecrawl scrapes the pasted homepage when configured on Convex (~25s cap); Bright Data Browser is the fallback. OpenRouter infers name, niche, service, products, audience, and what category to exclude (`brand-infer-v2`), stored in `brandInferences` for eval; the UI still shows name, niche, and positioning.
2. **Review brand understanding**: After the homepage read, the scan pauses so you can **Read again** (site + infer only) or **Find competitors** when the understanding looks right. Site read and infer timings are shown.
3. **Find competitors**: Up to **3** competitor brands per scan (demo limit). Three Google queries via Bright Data SERP when configured, with grounded extraction; memory fallback if SERP is off or empty (plain-language notice on confirm, not raw API errors).
4. **Confirm handles**: You review competitor TikTok accounts (exact handle or display-name match only). Uncheck wrong guesses before any TikTok scrape. If none match, confirm shows a simple none-found message.
5. **Score outliers**: Two Clockworks passes per confirmed handle — latest ~24 and top ~20 popular (pinned included), then deduped. Each post gets `outlierScore = views ÷ median of the handle’s ~24 most recent scraped posts` (median needs at least **5** posts).
6. **Rank for display**: Home shows scraped posts with multiplier **≥ 2×** that recent baseline, sorted by score (no date cutoff). Each card shows the post month/year. **Play** or the cover opens a centered TikTok lightbox (`player/v1` embed, compact player).
7. **Breakdown**: One OpenRouter call per outlier (cached): hook, caption pattern, why it beat baseline, paid brief, recreatability (1-5), and confidence (low/medium/high). **`?` tooltips** on the breakdown page explain each score. Video is not analysed.

**Instant results** (Gymshark, Duolingo, Oatly only): URL field defaults to `duolingo.com` (host-only is fine); **Enter** or the primary button reads **Fast scan** for those hosts and reopens the last completed job when scored posts exist. Any other URL shows **Scan** and always runs a live pipeline (no instant reopen; prior posts for that brand are wiped when the scan starts). Live TikTok steps use Apify Clockworks (**2× 120s** on each profile pass, **3× 180s** on account search); the scan UI updates between attempts (retry copy + rotating wait lines, not a frozen spinner) and still reaches confirm when handle lookup is slow ([`docs/LIVE.md`](docs/LIVE.md)). Covers are stored in Convex at scrape time ([`thumbnailStorageId`](convex/schema.ts)). Run each Try brand once on your demo deployment to seed. **Dev cache CLI** (Convex dev only): drop every scanned brand except the Try three — `npx convex run demoCache:clearNonTryBrandCaches`; one other host — `npx convex run demoCache:clearBrandCacheByHost '{"host":"example.com"}'`; re-seed Try hosts — `npx convex run demoCache:clearTryBrandCaches` or `clearTryBrandCacheByHost` with `duolingo.com` / `gymshark.com` / `oatly.com`.

## Outlier scoring

| Step | Rule |
|------|------|
| Baseline | Median views of the handle’s ~24 most recent scraped posts (minimum 5) |
| Outlier score | `post.views / baseline` |
| UI filter | Score ≥ 2×, highest first; post date shown on each card |

Templates and raw view counts mislead; a 3× post on a 50M-view account is a different signal than 3× on a 2k-view account. Scoring against **that account’s** median keeps the signal comparable.

## What Breakdown is (and is not)

Breakdown does **not** watch the video. It uses caption text, duration, engagement, outlier score vs baseline, and sibling posts on the same handle. **Format** and **pacing** fields stay metadata-only (duration vs siblings); they do not describe cuts, B-roll, or on-screen visuals.

For frame-accurate creative analysis, you would add video understanding later; v1 is pattern extraction for performance marketers. Recreatability (1–5) is how easy the post is to recreate with current AI gen tools—see **`?` tooltips** on the breakdown page.

## Routes

- `/`: scan + outlier list
- `/how-it-works`: methodology (public)
- `/post/[postId]`: structural breakdown (cached per post; metadata disclaimer at top; **Play** opens TikTok in the same overlay lightbox)

## Stack

- Next.js (App Router, TypeScript, Tailwind)
- Convex (schema, queries, mutations, actions)
- Firecrawl + Bright Data Browser (brand site read: Firecrawl first, Browser fallback; optional Bright Data SERP for competitor Google search)
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

Run **`npm run build`** before pushing to `main` — Next typechecks `convex/` and catches the same errors Vercel would fail on. See [docs/LIVE.md](docs/LIVE.md) deploy checklist.

## Env vars

| Where | Variable | Purpose |
|-------|----------|---------|
| `.env.local` | `NEXT_PUBLIC_CONVEX_URL` | Convex dev/prod URL |
| `.env.local` | `CONVEX_DEPLOYMENT` | Convex deployment id |
| Convex | `OPENROUTER_API_KEY` | OpenRouter API key |
| Convex | `APIFY_API_KEY` | Apify token for TikTok |
| Convex | `FIRECRAWL_API_KEY` | Firecrawl scrape for brand site reads (fast path) |
| Convex | `BRIGHTDATA_BROWSER_WSS` or `BRIGHTDATA_BROWSER_USERNAME` + `BRIGHTDATA_BROWSER_PASSWORD` | Bright Data Browser API fallback when Firecrawl cannot read the site |
| Convex | `BRIGHTDATA_API_KEY` + `BRIGHTDATA_SERP_ZONE` | Bright Data SERP for live competitor Google search (optional) |
| Convex | `OPENROUTER_MODEL` | Optional model override |
| Vercel | `CONVEX_DEPLOY_KEY` | `npx convex deploy --cmd "next build"` when ready |

Copy [`.env.example`](.env.example) to `.env.local`. Never commit real keys. Set scraper and LLM keys on **Convex** only:

```bash
npx convex env set OPENROUTER_API_KEY sk-or-REPLACE
npx convex env set APIFY_API_KEY apify_api_REPLACE
npx convex env set FIRECRAWL_API_KEY fc-REPLACE
npx convex env set BRIGHTDATA_BROWSER_WSS "wss://USER:PASS@brd.superproxy.io:9222"
npx convex env set BRIGHTDATA_API_KEY REPLACE
npx convex env set BRIGHTDATA_SERP_ZONE your_serp_zone_name
```

## Docs

- Product direction (Instagram-first research layer): [`docs/PRODUCT.md`](docs/PRODUCT.md)
- Live ops: [`docs/LIVE.md`](docs/LIVE.md)
- Session journal: [`docs/JOURNAL.md`](docs/JOURNAL.md)

## Roadmap (out of v1)

- Video-aware breakdown (frames / transcript)
- Instagram Reels, YouTube Shorts
- Historical tracking, multi-brand compare, auth
