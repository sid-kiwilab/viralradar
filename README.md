# Viral Radar

**Winning organic formats in your niche that AI can recreate.**

Paste a brand URL → read the site → find the brand on TikTok → score outlier posts against that account → open a structural breakdown scored for AI recreatability.

**Two ways to use it**

| Mode | What you get |
|------|----------------|
| **Live demo** (hosted site) | Fast scan on **pre-seeded** brands only. No Apify/OpenRouter spend from visitors. |
| **Self-host** (this repo) | Full live TikTok scan with **your** Convex keys. Clone, `npx convex dev`, set env on Convex. |

Repo: [sid-kiwilab/viralradar](https://github.com/sid-kiwilab/viralradar)

![Stack](https://img.shields.io/badge/Next.js-16-black) ![Convex](https://img.shields.io/badge/Convex-backend-0F5627) ![License](https://img.shields.io/badge/license-MIT-green)

## Quick start (self-host)

```bash
git clone https://github.com/sid-kiwilab/viralradar.git
cd viralradar
npm install
npx convex dev
```

Leave `npx convex dev` running. It writes `NEXT_PUBLIC_CONVEX_URL` to `.env.local`.

In another terminal:

```bash
npm run dev
# Windows: start.bat
```

Open [http://localhost:3000](http://localhost:3000). Paste any brand URL and **Scan** (showcase lock **off** on your Convex deployment).

Copy [`.env.example`](.env.example) for local Next vars. Set scraper + LLM keys on **Convex** only:

```bash
npx convex env set OPENROUTER_API_KEY sk-or-REPLACE
npx convex env set APIFY_API_KEY apify_api_REPLACE
npx convex env set FIRECRAWL_API_KEY fc-REPLACE
npx convex env set BRIGHTDATA_BROWSER_WSS "wss://USER:PASS@brd.superproxy.io:9222"
```

### Hosted demo (cost lock)

On the **public** Convex deployment only:

```bash
npx convex env set SHOWCASE_MODE 1
```

With showcase on, the home page is **demo-only** (banner + three Try brands; no live scan for other URLs). `startFromUrl` only reopens completed scans for demo hosts (`gymshark.com`, `duolingo.com`, `oatly.com`) when posts exist. Seed once with showcase **off**, then `SHOWCASE_MODE=1`. Omit locally to keep full **Scan**.

## What it does (product)

1. **Understand the brand** — Firecrawl scrapes the homepage (Bright Data Browser fallback). OpenRouter infers name, niche, and positioning.
2. **TikTok** — Resolve handle from demo map, site links, or Apify search; scrape profile posts (Clockworks TikTok scraper).
3. **Score** — Outlier = `views ÷` that handle’s median (≥5 posts on that account).
4. **Breakdown** — Hook, format, recreatability from caption + stats (video not analyzed).

## How a scan thinks (code map)

Read these in order — this is the real pipeline, not a mock:

| Step | What happens | Code |
|------|----------------|------|
| 1 | Job orchestration (site → TikTok → score) | [`convex/actions/scanBrand.ts`](convex/actions/scanBrand.ts) |
| 2 | Brand infer (`brand-infer-v4`) | [`convex/discovery/brandFromUrl.ts`](convex/discovery/brandFromUrl.ts) |
| 3 | TikTok handle resolve + profile scrape | [`convex/scraper/apifyTikTok.ts`](convex/scraper/apifyTikTok.ts), [`convex/scraper/tiktokLinks.ts`](convex/scraper/tiktokLinks.ts) |
| 4 | Median baseline + outlier score | [`convex/scoring.ts`](convex/scoring.ts) |
| 5 | Breakdown brief (metadata only) | [`convex/discovery/breakdownFromPost.ts`](convex/discovery/breakdownFromPost.ts) |
| 6 | Start / cache reopen | [`convex/brands.ts`](convex/brands.ts) `startFromUrl` |
| 7 | Showcase gate (hosted demo only) | [`convex/lib/showcaseMode.ts`](convex/lib/showcaseMode.ts) |

## Outlier scoring

| Rule | Detail |
|------|--------|
| Baseline | Median views of up to 24 recent scraped posts on **that** handle (min 5) |
| Outlier | `post.views / baseline` |
| List | ≥ 2× breakouts sorted by multiplier |

Templates and raw view counts mislead; scoring against **that account’s** median keeps signals comparable.

## API keys at a glance

| Convex env | Required for | Purpose |
|------------|----------------|---------|
| `OPENROUTER_API_KEY` | Brand infer, breakdown | OpenRouter (default `anthropic/claude-sonnet-4.6`) |
| `APIFY_API_KEY` | Live Scan + Try seed | `clockworks/tiktok-scraper` |
| `FIRECRAWL_API_KEY` | Site read | Brand homepage scrape |
| `BRIGHTDATA_BROWSER_WSS` (or username + password) | Site read fallback | Playwright over CDP |
| `SHOWCASE_MODE` | Hosted demo only | `1` = cache-only scans |

Never commit real keys. Next.js only needs `NEXT_PUBLIC_CONVEX_URL` + `CONVEX_DEPLOYMENT` in `.env.local`.

## Routes

- `/` — scan + outlier list
- `/how-it-works` — methodology
- `/post/[postId]` — structural breakdown (cached per post)

## Stack

Next.js (App Router) · Convex · Firecrawl · Bright Data Browser · Apify (TikTok) · OpenRouter

## Docs

- Ops / deploy notes: [`docs/LIVE.md`](docs/LIVE.md)
- Product direction: [`docs/PRODUCT.md`](docs/PRODUCT.md)

## License

MIT — [LICENSE](LICENSE)