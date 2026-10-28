# Viralradar journal archive 2

Rolled from [JOURNAL.md](../JOURNAL.md) on 2026-10-28 (2026-10-25 entries). Newer: [JOURNAL.md](../JOURNAL.md). Older: [JOURNAL_1.md](JOURNAL_1.md).

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
