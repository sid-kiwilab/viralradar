# Viralradar: session journal

Dated log of what shipped each work session. Stable ops and architecture live in [LIVE.md](LIVE.md).

Newest entries at the top.

---

## 2026-10-28: Live scan wipes stale posts (non-Try + fresh Try)

- **Shipped:** [`startFromUrl`](../convex/brands.ts) only reopens a completed job for the **three Try hosts** (Fast scan). Every **live** scan now calls [`purgeBrandScanData`](../convex/lib/purgeBrandScan.ts) first so old jobs/posts/handles cannot reappear on the same brand row (e.g. usefastlane.ai). Shared purge extracted from [`demoCache.ts`](../convex/demoCache.ts).
- **Key files:** `convex/brands.ts`, `convex/lib/purgeBrandScan.ts`, `convex/demoCache.ts`, `README.md`, `docs/LIVE.md`
- **Gaps:** None; owner re-scans a non-Try URL to confirm outlier list stays empty until the new run finishes.
- **Harness:** REVIEW (no findings) → FIX (no-op) → SYNC.

---

## 2026-10-28: Clear non-Try brand data (dev CLI)

- **Shipped:** [`clearNonTryBrandCaches`](../convex/demoCache.ts) wipes jobs/posts/handles/breakdowns for **every brand except** gymshark.com, duolingo.com, oatly.com. [`clearBrandCacheByHost`](../convex/demoCache.ts) for a single non-Try host; **refuses** Try hosts (use `clearTryBrandCacheByHost` instead). Ran `clearNonTryBrandCaches` on dev to drop e.g. usefastlane.ai leftovers. Product rule: only the three Try URLs get **Fast scan** reopen; other URLs always live-scan (each start purges that brand — see live-scan entry above). Bulk CLI clears orphan brand rows without rescanning.
- **Key files:** `convex/demoCache.ts`, `docs/LIVE.md`, `README.md`
- **Gaps:** None for dev cleanup; owner re-seeds Try brands only if those three were cleared on purpose.
- **Harness:** REVIEW (no findings) → FIX (no-op) → SYNC.

---

## 2026-10-28: TikTok wait UI (Clockworks retries)

- **Shipped:** Live scan no longer sits on a static spinner for up to **3×180s** Clockworks waits. [`runActor`](../convex/scraper/apifyTikTok.ts) patches `scanJobs.detail` at attempt start (`tiktok-wait-{n}`), after timeouts (plain retry sentences), then calm timeout copy on give-up. [`ScanStatus`](../components/scan-status.tsx) rotates a six-line joke pool every 12s while detail is a wait token; retry/progress copy preempts jokes; screen readers get stable **Contacting TikTok.** [`lib/tiktok-wait.ts`](../lib/tiktok-wait.ts) shared by Convex + Next. [`readSite`](../convex/actions/scanBrand.ts) and profile scrape pass the same progress hook. Scrape progress note hides wait/retry duplicates.
- **Key files:** `lib/tiktok-wait.ts`, `convex/scraper/apifyTikTok.ts`, `convex/actions/scanBrand.ts`, `components/scan-status.tsx`, `lib/stageLabel.ts`, `app/home-client.tsx`
- **Gaps:** Owner verifies a **live Scan** (non–Try URL) through a slow Clockworks window: retry lines between attempts, jokes during attempts, no raw Apify JSON. Fast scan never hits this path.
- **Harness:** plan → build → REVIEW → FIX (no-op) → SYNC.

---

## 2026-10-28: Open on TikTok 403 hardening

- **Shipped:** TikTok WAF 403 from app-origin `Referer` (localhost or prod domain). [`next.config.ts`](../next.config.ts) sends **`Referrer-Policy: no-referrer`** on `/` and `/:path*`. [`TikTokExternalLink`](../components/tiktok-external-link.tsx) opens via `window.open(..., "noopener,noreferrer")` when allowed, else native `_blank`; sanitizes hrefs with [`sanitizeTikTokWebUrl`](../convex/lib/tiktokUrls.ts) (`www.tiktok.com`, no query junk). Layout `metadata.referrer` unchanged.
- **Key files:** `next.config.ts`, `components/tiktok-external-link.tsx`, `convex/lib/tiktokUrls.ts`, `app/layout.tsx`
- **Gaps:** Owner verifies **Open on TikTok** after a **Vercel deploy** (header is prod-critical). Residual 403s from cookies/VPN/region/extensions are outside the app.
- **Harness:** build → REVIEW → FIX → REVIEW (no findings) → FIX (no-op) → SYNC.

---

## 2026-10-28: How-it-works intro copy

- **Shipped:** `/how-it-works` lead paragraph rewritten (tool-first, baseline vs raw views, organic companion to paid ad research). Removed **Thesis** section heading; intro sits under the page title.
- **Key files:** `app/how-it-works/page.tsx`
- **Gaps:** None.
- **Harness:** SYNC (copy-only).

---

## 2026-10-28: Per-host Try cache clear (dev CLI)

- **Shipped:** Internal [`clearTryBrandCacheByHost`](../convex/demoCache.ts) to wipe one Instant host (gymshark.com, duolingo.com, oatly.com) without touching the other two; shared `clearTryBrandByHostKey` with `clearTryBrandCaches`. Not exposed to the Next.js client. README + LIVE CLI examples.
- **Key files:** `convex/demoCache.ts`, `README.md`, `docs/LIVE.md`
- **Gaps:** Owner re-seeds Duolingo (or any cleared host) with one full scan before demo **Fast scan** is instant again.
- **Harness:** REVIEW → FIX (internalMutation) → REVIEW (no findings) → FIX (no-op) → SYNC.

---

## 2026-10-28: Breakdown score tooltips (UX + copy)

- **Shipped:** [`ScoreTip`](../components/score-tip.tsx) — hover/focus definitions portaled to `document.body` with inline styles (avoids Tailwind Turbopack stripping hide rules from label-row tooltips). Tap toggle on coarse pointer. [`SCORE_TIPS`](../app/post/[postId]/post-breakdown-client.tsx) on breakdown: outlier, recreatability (AI gen ease, 1–5 only in tooltip), confidence. [`next.config.ts`](../next.config.ts) skips `@tailwindcss/turbopack` on `*.module.css`. Docs aligned with tooltip copy.
- **Key files:** `components/score-tip.tsx`, `app/post/[postId]/post-breakdown-client.tsx`, `next.config.ts`, `app/how-it-works/page.tsx`, `README.md`, `docs/LIVE.md`, `app/globals.css`
- **Gaps:** Owner verifies breakdown `?` on desktop hover + phone tap. Frame-by-frame recreatability not built; model prompt still metadata-only ([`breakdownFromPost.ts`](../convex/discovery/breakdownFromPost.ts)).
- **Harness:** REVIEW → FIX → SYNC.

---

## 2026-10-28: Demo scrape limits (batch TikTok, 3 brands, no niche)

- **Shipped:** One batched Clockworks profile scrape for all confirmed handles, then per-handle upsert/score (`Saving results X of Y…`). Removed niche creator video search and LLM filter (deleted `nicheSearchQueries.ts`, `filterTikTokAccounts.ts`). Competitor discovery capped at **3** brands ([`lib/demo-limits.ts`](../lib/demo-limits.ts)). TikTok resolve proposes **exact** handle/display matches only (`isExactAccountMatch`); empty confirm copy when none found (Search hidden). Demo note during `find_competitors`. Legacy `source: "niche"` rows filtered in confirm UI.
- **Key files:** `lib/demo-limits.ts`, `convex/actions/scanBrand.ts`, `convex/scraper/apifyTikTok.ts`, `convex/discovery/competitorsFromBrand.ts`, `convex/scanJobs.ts`, `app/home-client.tsx`, `lib/stageLabel.ts`, `docs/LIVE.md`, `README.md`, `app/how-it-works/page.tsx`
- **Gaps:** Owner verifies live **Scan** (non–Try URL): demo cap note, one Apify profile run in dashboard, none-found confirm. Re-seed Try brands if cached confirm lists look stale after stricter exact match.
- **Harness:** plan → build → REVIEW → FIX → REVIEW (no findings) → FIX (no-op) → SYNC (initial).

---

## 2026-10-28: Clockworks timeout hardening

- **Shipped:** Clockworks `run-sync` **3× retry** on timeout only ([`convex/scraper/apifyTikTok.ts`](../convex/scraper/apifyTikTok.ts)); calm user copy ([`convex/lib/apifyMessages.ts`](../convex/lib/apifyMessages.ts), [`scraperErrors.ts`](../convex/lib/scraperErrors.ts)) — no Apify JSON in UI. **Fail-soft** competitor TikTok search in [`readSite`](../convex/actions/scanBrand.ts): confirm with SERP names + **No TikTok account found** when lookup fails; niche search no longer aborts when brand handles empty. `isJobActive` after long Apify block.
- **Key files:** `convex/scraper/apifyTikTok.ts`, `convex/lib/apifyMessages.ts`, `convex/lib/scraperErrors.ts`, `convex/actions/scanBrand.ts`, `docs/LIVE.md`
- **Gaps:** **Owner:** re-seed Try brands (full scan ×3) before demo DM; Fast scan must be instant for Gymshark / Duolingo / Oatly.
- **Harness:** implement → REVIEW → FIX (no-op) → SYNC → REVIEW (no findings) → FIX (no-op) → SYNC.

---

## 2026-10-28: Interview hardening (cache scope, covers, breakdown UX)

- **Shipped:** **Instant results** for Gymshark / Duolingo / Oatly only (`startFromUrl` reopens completed job); all other URLs run a live pipeline. Home defaults to `duolingo.com`; **Fast scan** CTA when input matches a Try host ([`isInstantTryBrandInput`](../lib/demo-brands.ts)). Shared **`TryBrandChips`** on landing and empty outlier state; brand field accepts bare hosts (`type="text"`, `inputMode="url"`). Outlier list hidden while a new scan is **`submitting`**. Cover images in Convex at scrape (`thumbnailStorageId`, backfill on demo reopen); [`PostThumbnail`](../components/post-thumbnail.tsx) remounts per URL for stable load/error state. `/how-it-works` + Data section (Instant results / Fast scan copy). Breakdown: score tooltips, lean brief UI. Landing footer only (no process strip). Job pin (`getById`), `isLanding` when no session, `Loading scan…` while pin pending, `latestByBrand` by `startedAt`. `proposedAccounts` useMemo. ESLint `_` ignore for scrape destructuring. Dev **Try cache reset**: [`convex/demoCache.ts`](../convex/demoCache.ts) `clearTryBrandCaches` (CLI in [LIVE.md](LIVE.md)); stale three-brand dev data cleared once on `mellow-mule-141`.
- **Key files:** `convex/schema.ts`, `convex/posts.ts`, `convex/scanJobs.ts`, `convex/brands.ts`, `convex/demoCache.ts`, `convex/actions/scanBrand.ts`, `convex/actions/thumbnails.ts`, `lib/demo-brands.ts`, `app/how-it-works/page.tsx`, `app/post/[postId]/post-breakdown-client.tsx`, `components/post-thumbnail.tsx`, `components/score-tip.tsx`, `components/landing-below-fold.tsx`, `app/home-client.tsx`, `eslint.config.mjs`, `docs/LIVE.md`, `README.md`
- **Gaps:** Delete stale `breakdowns` for shorter briefs; `TELLA_EMBED_URL` when recorded.
- **Harness:** plan → build → REVIEW → FIX → SYNC (×2) → cache clear → REVIEW → FIX (LIVE reset docs) → SYNC.

---

## 2026-10-28: How it works + breakdown scores

- **Shipped:** Breakdown recreatability + confidence (schema, prompt, UI score row). Methodology card and roadmap on breakdown page. `/how-it-works` (honest stack/scoring). Header link. Confirm disclaimer. Parallel TikTok scrape with incremental upsert, `Scraping competitor X of Y`, live skeleton rows. Landing Tella placeholder (`TELLA_EMBED_URL`). README hero + how-it-works link.
- **Key files:** `convex/schema.ts`, `convex/discovery/breakdownFromPost.ts`, `convex/actions/scanBrand.ts`, `app/post/[postId]/post-breakdown-client.tsx`, `app/how-it-works/page.tsx`, `components/site-header.tsx`, `components/walkthrough-slot.tsx`, `app/home-client.tsx`, `README.md`, `docs/LIVE.md`
- **Gaps:** Delete old `breakdowns` rows to regenerate scores. Seed demo Try brands on Convex. Paste Tella URL when recorded. Owner verifies scrape progress + breakdown in browser.
- **Harness:** plan → build → SYNC.

---

## 2026-10-28: Demo polish pass

- **Shipped:** Breakdown prompt bans visual guesses (format/pacing metadata-only). Demo cache for Gymshark / Duolingo / Oatly when a completed scan + scored posts exist. Outlier list filter ≥2× in 90 days + empty copy. Confirm gate: select all/none, Search N accounts, shorter niche line. Per-handle TikTok scrape with partial failure on `job.detail`. Hero multiplier typography on outlier rows. README methodology (scoring + no-video caveat).
- **Key files:** `convex/discovery/breakdownFromPost.ts`, `convex/brands.ts`, `convex/lib/demoBrands.ts`, `convex/posts.ts`, `convex/actions/scanBrand.ts`, `app/home-client.tsx`, `app/globals.css`, `lib/site-constants.ts`, `README.md`, `docs/LIVE.md`
- **Gaps:** Demo cache empty until owner runs the three Try brands once on the demo Convex deployment. Cached breakdown rows need delete in dashboard to pick up new prompt. Owner verifies confirm + results + breakdown in browser.
- **Harness:** plan → build → SYNC.

---

## 2026-10-25: SERP competitors + breakdown (harness SYNC)

- **Shipped:** Bright Data SERP competitor path (`data_format: json`, HTML detection, grounded extract, memory fallback with `scanJobs.detail` on confirm via `competitorReviewDetail` + [`lib/stageLabel.ts`](../lib/stageLabel.ts)). Structural outlier **Breakdown** (OpenRouter, cached `breakdowns`, generation lock). Docs/env for `BRIGHTDATA_SERP_ZONE`.
- **Key files:** `convex/scraper/brightDataSerp.ts`, `convex/discovery/competitorsFromBrand.ts`, `convex/actions/breakdownPost.ts`, `app/post/[postId]/post-breakdown-client.tsx`, `docs/LIVE.md`, `README.md`
- **Gaps:** Senna brief clipboard not built. Owner verifies SERP line on confirm and breakdown in browser. Rotate API key if exposed in chat.
- **Harness:** plan → build → REVIEW → FIX → SYNC.

---

## 2026-10-25: SERP-backed competitor discovery

- **Shipped:** Competitor names from 3 Google queries via Bright Data SERP API (`BRIGHTDATA_API_KEY` + `BRIGHTDATA_SERP_ZONE`), then LLM extraction grounded in organic snippets only; memory fallback if SERP unset or fails. TikTok path unchanged (Apify).
- **Key files:** `convex/scraper/brightDataSerp.ts`, `convex/discovery/competitorSearchQueries.ts`, `convex/discovery/competitorsFromBrand.ts`, `convex/actions/scanBrand.ts`, `docs/LIVE.md`
- **Gaps:** Superseded by harness SYNC entry above for confirm UX and FIX polish.
- **Harness:** plan → build.

---

## 2026-10-25: Structural outlier breakdown

- **Shipped:** **Breakdown** on outlier rows calls OpenRouter once with caption, duration, engagement, baseline, brand niche, and sibling posts on the handle; result cached in `breakdowns` (`whyItWorked` added to schema). Post page shows hook, format, pacing, caption pattern, why it worked, and paid adaptation with retry on failure.
- **Key files:** `convex/actions/breakdownPost.ts`, `convex/discovery/breakdownFromPost.ts`, `convex/breakdowns.ts`, `app/post/[postId]/post-breakdown-client.tsx`, `lib/formatMetrics.ts`, `docs/LIVE.md`
- **Gaps:** Senna clipboard handoff not built. Brief is metadata-inferred, not frame-accurate. Owner verifies breakdown in browser.
- **Harness:** plan → build → REVIEW → FIX → SYNC.

---

## 2026-10-25: TikTok link hardening

- **Shipped:** Canonical `tiktok.com/@handle` and `/video/{id}` URLs (no Apify query junk). Shared [`convex/lib/tiktokUrls.ts`](../convex/lib/tiktokUrls.ts); [`TikTokExternalLink`](../components/tiktok-external-link.tsx) + site `referrer: no-referrer` to reduce browser 403s from localhost referrers.
- **Key files:** `convex/lib/tiktokUrls.ts`, `components/tiktok-external-link.tsx`, `app/layout.tsx`, `app/home-client.tsx`, `convex/scraper/apifyTikTok.ts`
- **Gaps:** 403 can still be extensions or bad TikTok cookies in the user’s main browser profile. Breakdowns stub.
- **Harness:** REVIEW → FIX → SYNC.

---

## 2026-10-25: Apify competitor search + confirm links

- **Shipped:** With `APIFY_API_KEY`, competitors resolve in one batched Apify user search (`foundVia: search`); no competitor homepage crawl. Without Apify, TikTok handles come only from site links (`foundVia: site`). Confirm UI groups **Linked on their site**, **Suggested accounts**, and **Niche creators**; `@handle` opens the TikTok profile. Outlier rows link handles too. `pickAccountForName` prefers exact handle/display over prefix guesses.
- **Key files:** `convex/actions/scanBrand.ts`, `convex/scraper/apifyTikTok.ts`, `convex/lib/proposedAccount.ts`, `app/home-client.tsx`, `docs/LIVE.md`
- **Gaps:** Search guesses still need manual uncheck. **Linked on their site** empty when Apify-only. Breakdowns stub.
- **Harness:** REVIEW → FIX → SYNC (build/lint pass).

---

## 2026-10-25: Brand + niche TikTok discovery

- **Shipped:** Scan infers niche search queries alongside competitor names. Apify merges official brand handles with creators from video search (brands first, cap 8). Missing brand TikTok no longer fails the job if niche fills the list. Confirm UI groups Official accounts vs Niche creators.
- **Key files:** `convex/discovery/nicheSearchQueries.ts`, `convex/scraper/apifyTikTok.ts`, `convex/actions/scanBrand.ts`, `convex/schema.ts`, `app/home-client.tsx`, `docs/LIVE.md`
- **Gaps:** Niche authors can be off-topic; user must uncheck. Breakdowns stub.
- **Harness:** build pass (plan).

---

## 2026-10-25: Confirm TikTok handles before scrape

- **Shipped:** Scan resolves competitor names to TikTok accounts (close handle/display match only; skip if none). Confirm step shows `@handle`, verified, followers. Search TikTok scrapes those profiles only. Duolingo language-app set looked official; the hole was guessing without showing the account.
- **Key files:** `convex/scraper/apifyTikTok.ts`, `convex/actions/scanBrand.ts`, `convex/scanJobs.ts`, `convex/schema.ts`, `app/home-client.tsx`
- **Gaps:** No website/bio proof. Fan accounts can still win if the handle is a close prefix. Breakdowns stub.
- **Harness:** build pass.

---

## 2026-10-25: One-pass brand + competitors

- **Shipped:** Scan no longer pauses after brand infer. `readSite` reads the site, infers the brand, then infers competitors in one action. The only confirm step is competitor checkboxes → **Search TikTok**. Removed `continueToCompetitors` and `inferCompetitors`.
- **Key files:** `convex/actions/scanBrand.ts`, `convex/scanJobs.ts`, `app/home-client.tsx`, `components/scan-status.tsx`, `lib/stageLabel.ts`, `docs/LIVE.md`
- **Gaps:** Breakdowns stub. Bright Data TikTok still KYC-blocked. Owner verifies the shorter confirm flow.
- **Harness:** build pass.

---

## 2026-10-25: Apify TikTok fallback

- **Shipped:** Search TikTok uses Apify `clockworks/tiktok-scraper` when `APIFY_API_KEY` is on Convex (user search, then latest 24 videos per handle). Bright Data stays for brand site reads and as the TikTok fallback if the key is missing. Key set on the dev deployment from local `.env` (value not in git).
- **Key files:** `convex/scraper/apifyTikTok.ts`, `convex/scraper/tiktok.ts`, `convex/lib/scraperErrors.ts`, `.env.example`, `docs/LIVE.md`, `README.md`
- **Gaps:** Breakdowns stub. Bright Data TikTok still KYC-blocked. Owner verifies a full scan in the browser.
- **Harness:** build pass.

---

## 2026-10-25: Drop unused agent conventions

- **Shipped:** Removed `docs/AGENT-CONVENTIONS.md`. Pointers now go to LIVE / README. Harness PLAN, REVIEW, FIX, SYNC read LIVE for stack and deploy rules.
- **Key files:** `docs/AGENT-CONVENTIONS.md` (deleted), `docs/LIVE.md`, `README.md`, `harness/PLAN.md`, `harness/REVIEW.md`, `harness/FIX.md`, `harness/SYNC.md`
- **Gaps:** TikTok still blocked on Bright Data Browser KYC. Site read and competitor infer already work. Apify Clockworks actors are the interim TikTok path if KYC stays pending.
- **Harness:** docs only.

---

## 2026-10-24: Reset home and stale scan guards

- **Shipped:** Wordmark and Cancel scan reset to idle landing (`resetHome`). Brand panel only after site read completes. `patchFromScan` requires active `jobId`; scan actions re-check job after long awaits and before marking TikTok `completed`. Stale Bright Data/LLM/scrape work cannot update brand, competitors, or job after cancel/rescan. Idle layout while `latestByBrand` is loading (`job == null`).
- **Key files:** `app/home-client.tsx`, `components/site-header.tsx`, `components/site-shell.tsx`, `convex/brands.ts`, `convex/actions/scanBrand.ts`, `app/globals.css`, `docs/LIVE.md`, `README.md`
- **Gaps:** In-flight browser requests still run until they finish; they no longer write to Convex. Partial TikTok rows if cancel lands mid-upsert. TikTok KYC. Breakdowns stub.
- **Harness:** plan → build → REVIEW → FIX → SYNC.

## 2026-10-24: Mog Check landing + scan UX polish

- **Shipped:** Mog Check style shell (hero video, grain, Inter + Instrument Serif, thesis hero, try URLs). Tool mode during active scan; idle below fold uses process strip (`URL in → …`), example output shape, demo footer. **`ScanStatus`**: circular radar + stage chips (no scan line). Refresh clears UI (no `sessionStorage` restore). **`startFromUrl`** fails any in-progress job for that brand before starting a new one. **`scanJobs.patch` / `markRunning`** ignore terminal jobs so stale actions cannot revive cancelled scans. Convex footer only when URL missing or health not ok. URL row + Try chip alignment fixes.
- **Key files:** `app/globals.css`, `app/layout.tsx`, `app/home-client.tsx`, `app/post/[postId]/page.tsx`, `components/`, `lib/site-constants.ts`, `lib/stageLabel.ts`, `convex/brands.ts`, `convex/scanJobs.ts`, `README.md`
- **Gaps:** TikTok blocked until Bright Data KYC. Breakdowns stub. Owner verifies in browser.
- **Harness:** plan → build → REVIEW → FIX → SYNC.

## 2026-10-24: Harness REVIEW / FIX / SYNC (scan polish + docs)

- **Shipped:** Post upsert scoped per brand; `abandonScan` for waiting steps; failed-job brand/competitor display; KYC error formatting; home action spacing (`flex-col` primary + cancel). Docs synced for stepped flow, `abandonScan`, and env notes.
- **Key files:** `convex/posts.ts`, `convex/scanJobs.ts`, `app/home-client.tsx`, `lib/scraperErrorHints.ts`, `docs/LIVE.md`, `README.md`
- **Gaps:** TikTok blocked until Bright Data KYC. Breakdowns stub.
- **Harness:** REVIEW (no findings) → FIX (no code) → SYNC.

## 2026-10-24: Stepped scan (brand review → competitor confirm → TikTok)

- **Shipped:** Scan split into three actions with `waiting` pauses. Home shows brand summary, **Find competitors**, checkbox confirm, then **Search TikTok**. Bright Data TikTok compliance errors shortened (KYC). OpenRouter default `claude-sonnet-4.6`, JSON fence parsing.
- **Key files:** `convex/actions/scanBrand.ts`, `convex/scanJobs.ts`, `convex/schema.ts`, `app/home-client.tsx`, `convex/lib/scraperErrors.ts`, `convex/lib/llmJson.ts`, `convex/lib/openrouter.ts`, `docs/LIVE.md`
- **Gaps:** TikTok still blocked until Bright Data KYC on the zone. Breakdowns stub.
- **Harness:** plan → build.

## 2026-10-24: Brand scan pipeline (site → competitors → TikTok outliers)

- **Shipped:** Enabled home Scan via `brands.startFromUrl` and internal `actions/scanBrand.run`. Bright Data Browser API reads brand sites (cookie block, captcha wait, retry). OpenRouter infers brand and up to five competitors. Second browser session searches TikTok, scrapes profile grids, upserts handles/posts, median baseline scoring. Home shows job stage, errors, and ranked outlier list.
- **Key files:** `convex/actions/scanBrand.ts`, `convex/scraper/browser.ts`, `convex/scraper/tiktok.ts`, `convex/scanJobs.ts`, `convex/brands.ts`, `convex/posts.ts`, `convex/scoring.ts`, `convex/discovery/*`, `app/home-client.tsx`, `convex.json`, `docs/LIVE.md`
- **Gaps:** Breakdowns still stub. TikTok DOM/JSON parsing may need tuning per account. Owner verifies scan in browser.
- **Harness:** build pass (plan).

## 2026-10-24: Home Convex query no longer breaks prerender

- **Shipped:** One shared `ConvexReactClient`. `api.health.get` runs only after the page mounts, so Next.js 16 prerender of `/` does not call `useQuery` outside `ConvexProvider`. `.gitignore` also lists `node_modules/` (Git was already excluding that folder).
- **Key files:** `app/ConvexClientProvider.tsx`, `app/home-client.tsx`, `.gitignore`, `docs/LIVE.md`
- **Gaps:** Scan, scrape, and breakdowns are still stubs. Scaffold is still uncommitted on GitHub.
- **Harness:** REVIEW (no findings) → FIX (no diff) → SYNC.

## 2026-10-24: Scraper comment matches Browser API

- **Shipped:** TikTok scraper stub comment now points at Bright Data Browser API (`BRIGHTDATA_BROWSER_WSS`). Dev deployment already had the file from the FIX push.
- **Key files:** `convex/scraper/tiktok.ts`, `docs/LIVE.md`
- **Gaps:** Scrape is still not implemented. Scan, scoring UI, and breakdowns are still stubs.
- **Harness:** REVIEW → FIX → SYNC.

## 2026-10-24: Convex dev push is automatic

- **Shipped:** FIX and SYNC now push `convex/` to the **dev** deployment with `npx convex dev --once`. Production deploy stays manual and only when the owner asks to ship. Breaking schema pushes are not forced.
- **Key files:** `harness/FIX.md`, `harness/SYNC.md`, `docs/AGENT-CONVENTIONS.md`
- **Follow-up:** Owner logged in. Dev deployment `mellow-mule-141` has schema, indexes, and functions. Convex env vars set from local `.env` (values not in git). `.env.local` written by Convex CLI.
- **Harness:** skill update (owner asked).

## 2026-10-24: Harness REVIEW / FIX / SYNC (scaffold hardening)

- **Shipped:** `.gitignore` for env/build/scratch; `start.bat`; OpenRouter on Convex (not Next env); `breakdowns.getOrCreate` stub; `rankedByBrand` score filter + 2000 row cap; `npm run convex:codegen`; README/LIVE env and Bright Data naming (`USERNAME`/`PASSWORD`, not `BRIGHTDATA_API_KEY`).
- **Key files:** `.gitignore`, `start.bat`, `convex/posts.ts`, `convex/breakdowns.ts`, `package.json`, `.env.example`, `README.md`, `docs/LIVE.md`
- **Gaps:** App scaffold still uncommitted on GitHub until owner commits. Scan pipeline not built.
- **Harness:** REVIEW → FIX → SYNC.

## 2026-10-24: App scaffold (Next.js + Convex shell)

- **Shipped:** Next.js 16 app in repo root, Convex schema + function stubs, dark URL-input home, `/post/[postId]` placeholder, OpenRouter helper (`openai` SDK, not Anthropic native), Playwright Chromium install, `.env.example`, README and LIVE updated.
- **Key files:** `app/`, `convex/`, `convex/lib/openrouter.ts`, `package.json`, `README.md`, `docs/LIVE.md`
- **Gaps:** Owner runs `npx convex dev` and Convex env vars. Scan, scrape, score, breakdown not implemented. Regenerate `convex/_generated` with `npx convex dev` after linking deployment.
- **Harness:** setup pass (plan).

## 2026-10-24: Repo bootstrap

- **Shipped:** Local git, first README commit, remote on `main`, docs/harness for Viralradar only.
- **Key files:** `docs/`, `harness/`
- **Gaps:** No app yet (superseded by scaffold entry above).
