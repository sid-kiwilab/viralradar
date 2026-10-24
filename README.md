# Viral Radar

Organic signal layer for short-form video: paste a brand URL, confirm the inferred brand and competitors, then surface outlier TikTok posts from those accounts, ranked by multiplier vs each account baseline. Structural breakdown on click is still a stub.

Repo: [sid-kiwilab/viralradar](https://github.com/sid-kiwilab/viralradar)

## Stack

- Next.js (App Router, TypeScript, Tailwind)
- Convex (schema, queries, mutations, actions)
- Playwright + Bright Data (TikTok scrape, local/worker path)
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

Open the app locally and confirm the home page shows **Convex connected.**

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
| Convex | `BRIGHTDATA_BROWSER_WSS` or `BRIGHTDATA_BROWSER_USERNAME` + `BRIGHTDATA_BROWSER_PASSWORD` | Bright Data **Browser API** for Playwright (`connectOverCDP`) |
| Convex | `OPENROUTER_MODEL` | Optional; default `anthropic/claude-sonnet-4.6` |
| Local `.env` (optional) | Same Browser API vars | Local Playwright tests only |
| Vercel | `CONVEX_DEPLOY_KEY` | Deploy Convex with `npx convex deploy --cmd "next build"` when ready |

Copy [`.env.example`](.env.example) to **`.env.local`**. Never commit real keys. Do not put `OPENROUTER_API_KEY` in `.env` / `.env.local`; set it on Convex only (below).

```bash
npx convex env set OPENROUTER_API_KEY sk-or-REPLACE
npx convex env set BRIGHTDATA_BROWSER_WSS "wss://USER:PASS@brd.superproxy.io:9222"
```

Use the **Copy command** string from Bright Data Browser API (Playwright). Zone password may differ from the account API key. TikTok targets may require Bright Data [KYC](https://brightdata.com/cp/kyc) on the Browser zone.

## Docs

- Live ops: [`docs/LIVE.md`](docs/LIVE.md)
- Session journal: [`docs/JOURNAL.md`](docs/JOURNAL.md)
- Agent conventions: [`docs/AGENT-CONVENTIONS.md`](docs/AGENT-CONVENTIONS.md)
- Harness: [`harness/PLAN.md`](harness/PLAN.md) → REVIEW → FIX → SYNC (do not modify)

## Roadmap (out of v1)

- Instagram Reels, YouTube Shorts, LinkedIn
- Historical tracking, multi-brand compare
- Auth and saved history
