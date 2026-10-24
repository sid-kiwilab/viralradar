# Viralradar — session journal

Dated log of what shipped each work session. Stable ops and architecture live in [LIVE.md](LIVE.md).

Newest entries at the top.

---

## 2026-10-24 — Home Convex query no longer breaks prerender

- **Shipped:** One shared `ConvexReactClient`. `api.health.get` runs only after the page mounts, so Next.js 16 prerender of `/` does not call `useQuery` outside `ConvexProvider`. `.gitignore` also lists `node_modules/` (Git was already excluding that folder).
- **Key files:** `app/ConvexClientProvider.tsx`, `app/home-client.tsx`, `.gitignore`, `docs/LIVE.md`
- **Gaps:** Scan, scrape, and breakdowns are still stubs. Scaffold is still uncommitted on GitHub.
- **Harness:** REVIEW (no findings) → FIX (no diff) → SYNC.

## 2026-10-24 — Scraper comment matches Browser API

- **Shipped:** TikTok scraper stub comment now points at Bright Data Browser API (`BRIGHTDATA_BROWSER_WSS`). Dev deployment already had the file from the FIX push.
- **Key files:** `convex/scraper/tiktok.ts`, `docs/LIVE.md`
- **Gaps:** Scrape is still not implemented. Scan, scoring UI, and breakdowns are still stubs.
- **Harness:** REVIEW → FIX → SYNC.

## 2026-10-24 — Convex dev push is automatic

- **Shipped:** FIX and SYNC now push `convex/` to the **dev** deployment with `npx convex dev --once`. Production deploy stays manual and only when the owner asks to ship. Breaking schema pushes are not forced.
- **Key files:** `harness/FIX.md`, `harness/SYNC.md`, `docs/AGENT-CONVENTIONS.md`
- **Follow-up:** Owner logged in. Dev deployment `mellow-mule-141` has schema, indexes, and functions. Convex env vars set from local `.env` (values not in git). `.env.local` written by Convex CLI.
- **Harness:** skill update (owner asked).

## 2026-10-24 — Harness REVIEW / FIX / SYNC (scaffold hardening)

- **Shipped:** `.gitignore` for env/build/scratch; `start.bat`; OpenRouter on Convex (not Next env); `breakdowns.getOrCreate` stub; `rankedByBrand` score filter + 2000 row cap; `npm run convex:codegen`; README/LIVE env and Bright Data naming (`USERNAME`/`PASSWORD`, not `BRIGHTDATA_API_KEY`).
- **Key files:** `.gitignore`, `start.bat`, `convex/posts.ts`, `convex/breakdowns.ts`, `package.json`, `.env.example`, `README.md`, `docs/LIVE.md`
- **Gaps:** App scaffold still uncommitted on GitHub until owner commits. Scan pipeline not built.
- **Harness:** REVIEW → FIX → SYNC.

## 2026-10-24 — App scaffold (Next.js + Convex shell)

- **Shipped:** Next.js 16 app in repo root, Convex schema + function stubs, dark URL-input home, `/post/[postId]` placeholder, OpenRouter helper (`openai` SDK, not Anthropic native), Playwright Chromium install, `.env.example`, README and LIVE updated.
- **Key files:** `app/`, `convex/`, `convex/lib/openrouter.ts`, `package.json`, `README.md`, `docs/LIVE.md`
- **Gaps:** Owner runs `npx convex dev` and Convex env vars. Scan, scrape, score, breakdown not implemented. Regenerate `convex/_generated` with `npx convex dev` after linking deployment.
- **Harness:** setup pass (plan).

## 2026-10-24 — Repo bootstrap

- **Shipped:** Local git, first README commit, remote on `main`, docs/harness for Viralradar only.
- **Key files:** `docs/`, `harness/`
- **Gaps:** No app yet (superseded by scaffold entry above).
