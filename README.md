# Viral Radar

Organic signal layer for short-form video: paste a brand URL, confirm TikTok accounts (suggested handles and niche creators; `@handle` and **Open on TikTok** use canonical profile/video URLs), then surface outlier posts from checked accounts, ranked by multiplier vs each account baseline. Click **viralradar** or **Cancel scan** (or refresh) to return to the idle landing. Structural breakdown on click is still a stub.

Repo: [sid-kiwilab/viralradar](https://github.com/sid-kiwilab/viralradar)

## Stack

- Next.js (App Router, TypeScript, Tailwind)
- Convex (schema, queries, mutations, actions)
- Playwright + Bright Data (brand site read)
- Apify Clockworks TikTok scraper (`clockworks/tiktok-scraper`) when `APIFY_API_KEY` is set
- LLM: [OpenRouter](https://openrouter.ai/) via `openai` SDK (`anthropic/claude-sonnet-4.6` default; override with Convex `OPENROUTER_MODEL`)
- Hosting: Vercel + Convex Cloud

## Local dev

```bash
cd c:\flutter_apps\viralradar
npm install
npx convex dev
```

Leave `npx convex dev` running (GitHub sign-in, project `viral-radar`). It writes `NEXT_PUBLIC_CONVEX_URL` to `.env.local`.

In another terminal:

```bash
npm run dev
```

Or double-click [`start.bat`](start.bat) (same as `npm run dev`).

After linking Convex, run `npx convex dev` once and commit any updated `convex/_generated` files so types match your deployment.

Open the app locally. If Convex is wired up, the home page shows no backend notice at the bottom.

```bash
npm run build
npm run lint
npm run convex:codegen   # after npx convex dev linked a deployment
```

Local `.env` is gitignored (keep secrets there for your notes if you want). Only [`.env.example`](.env.example) is committed.

## Env vars

| Where | Variable | Purpose |
|-------|----------|---------|
| `.env.local` | `NEXT_PUBLIC_CONVEX_URL` | Convex dev/prod URL (from `npx convex dev`) |
| `.env.local` | `CONVEX_DEPLOYMENT` | Convex deployment id |
| Convex dashboard / CLI | `OPENROUTER_API_KEY` | OpenRouter API key for Claude and other models |
| Convex | `APIFY_API_KEY` | Apify token for TikTok (`clockworks/tiktok-scraper`) |
| Convex | `BRIGHTDATA_BROWSER_WSS` or `BRIGHTDATA_BROWSER_USERNAME` + `BRIGHTDATA_BROWSER_PASSWORD` | Bright Data **Browser API** for brand site reads |
| Convex | `OPENROUTER_MODEL` | Optional; default `anthropic/claude-sonnet-4.6` |
| Local `.env` (optional) | Same Browser API vars | Local Playwright tests only |
| Vercel | `CONVEX_DEPLOY_KEY` | Deploy Convex with `npx convex deploy --cmd "next build"` when ready |

Copy [`.env.example`](.env.example) to **`.env.local`**. Never commit real keys. Do not put `OPENROUTER_API_KEY` or `APIFY_API_KEY` in `.env.local`; set them on Convex only (below).

```bash
npx convex env set OPENROUTER_API_KEY sk-or-REPLACE
npx convex env set APIFY_API_KEY apify_api_REPLACE
npx convex env set BRIGHTDATA_BROWSER_WSS "wss://USER:PASS@brd.superproxy.io:9222"
```

Use the **Copy command** string from Bright Data Browser API (Playwright) for brand site reads. TikTok uses Apify when `APIFY_API_KEY` is set. Bright Data TikTok still needs [KYC](https://brightdata.com/cp/kyc) on the Browser zone.

## Docs

- Live ops: [`docs/LIVE.md`](docs/LIVE.md)
- Session journal: [`docs/JOURNAL.md`](docs/JOURNAL.md)
- Harness: [`harness/PLAN.md`](harness/PLAN.md) → REVIEW → FIX → SYNC (do not modify)

## Roadmap (out of v1)

- Instagram Reels, YouTube Shorts, LinkedIn
- Historical tracking, multi-brand compare
- Auth and saved history
