# Viral Radar — product direction

Locked 2026-10-31. Research / inspiration product. Instagram first. Remix later.

**Shipped in repo:** Instagram Reels live **Scan**; TikTok on Try-brand **Fast scan** cache only. Live ops and showcase: [`README.md`](../README.md), [`LIVE.md`](LIVE.md). This file is direction + roadmap (not harness — see [`harness/HARNESS.md`](../harness/HARNESS.md)).

---

## Decision

Ship the **signal layer**, not the generator.

Users see organic breakouts in their niche, scored for AI recreatability. They copy or download a brief and generate anywhere — Vidgy, Fastlane, Arcads, HeyGen, in-house, or an agency.

Remix / generation stays on the roadmap. Do not build it this cycle.

Why this instead of remix:

- Remix is 2–3 weekends of real work plus a different kind of complexity (video gen reliability, character consistency, output quality variance).
- That axis already has teams (Vidgy, Fastlane, HeyGen, Arcads). Fighting them on generation is the wrong fight.
- Research alone is a defensible product, faster to real users, and a bigger market because it is tool-agnostic.
- Fastlane going cold frees the product to be the thing underneath every generator, not a weaker clone of one.

---

## What it is

**Viral Radar:** winning organic formats in a niche, scored for AI recreatability. Inspiration layer for creators and marketing teams.

It feeds a human or any generator the user already has. It does not feed its own generator.

**Public landing (shipped copy):**

> Winning organic formats in your niche that AI can recreate.

Research layer today; generation on the roadmap (see below).

---

## Platform order

**Instagram Reels first. TikTok second.**

Instagram is the primary live connector; TikTok stays on cached Try-brand demos until live TikTok is worth reopening.

Still two platforms in the scoped product. YouTube Shorts stays later.

| Order | Platform | Status |
|-------|----------|--------|
| 1 | Instagram Reels | **Shipped** — live Scan. Primary surface. |
| 2 | TikTok | Shipped (Fast scan / cached). **Paused** on live scan until handle match is reliable; Reels first. |
| 3 | YouTube Shorts | Later. |

---

## In scope

- Instagram Reels + TikTok
- Outlier scoring + recreatability on each breakdown
- Structural breakdown + paid adaptation brief
- Download or copy the brief; generate it anywhere

## Out of scope this cycle

- Video generation
- Character / AI influencer integration
- Posting / distribution
- Warmed accounts

These stay off the public promise except as a single honest roadmap line on How it works.

---

## Who the user is

| User | Job |
|------|-----|
| Content marketers at DTC brands | What is working this week in the niche |
| Agencies with multiple clients | Research across brand niches |
| Creators | Format inspiration — which breakout patterns to adapt |
| Fastlane / Vidgy / Arcads users | Sharper briefs into a generator they already pay for |

Willingness to pay is for research, not for another video tool.

---

## Pricing instinct

Not implemented. Direction only.

| Tier | Price | What they get |
|------|-------|----------------|
| Free | $0 | 3 scans / month, limited breakdowns |
| Pro | $29 / mo | Unlimited scans, full breakdowns |
| Teams | $99 / mo | Multiple brands, API |

Real SaaS range for creators and small marketing teams. Nothing here competes on generation quality.

---

## What a scan does (target product)

1. Paste a brand URL.
2. Infer niche and find format-source brands (Instagram breakout proxies in the niche).
3. Resolve Instagram (primary) and TikTok handles. User confirms before scrape.
4. Pull organic posts. Score outliers vs that account’s recent median.
5. Filter for recreatability on the breakdown (weight into rank later).
6. Structural breakdown + paid adaptation brief.
7. User copies the brief and generates it in whatever tool they already have.

Honest limit that stays: breakdowns do not watch the video. Caption, duration, engagement, outlier vs baseline, sibling posts. Frame-accurate analysis is a later item.

---

## Instagram scrape (when Reels is added)

Three sources per handle, then dedupe by post id.

| Source | Limit | Why |
|--------|-------|-----|
| Latest | 5 | Current activity. Enough to know what they are posting this week. |
| Popular | 10–15 | Historical bangers. Outliers show up fast; diminishing returns past 15. |
| Pinned | whatever is pinned (~2) | Brand’s own showcase. High-signal, free quality flag. |

Roughly **5 + 15 + 2 ≈ 22 posts per handle**, vs today’s TikTok dual-pass of ~44 (latest 24 + popular 20). About half the volume, same or better signal.

Pinned is a **source, not a weight**. Still score on outlier multiplier like everything else. Do not let pinned posts dominate the ranking just because they are pinned.

UI: small **Pinned** badge on cards that came from a pin. Visual only.

If the Instagram actor has no pinned-only pass, take `isPinned` / equivalent off the latest scrape. Pinned posts usually appear first on the profile anyway.

```
latest 5  +  popular 15  +  pinned
        → dedupe by postId
        → score vs that handle’s recent median
        → show ≥ 2×
```

TikTok can move to the same shape later (latest 5 + popular 15 + pinned). Do not change the live TikTok scrape in the Instagram weekend unless it is free.

### Weak-signal skip (after Instagram works)

If a competitor has fewer than **1,000 followers** or has not posted in **60 days**, skip the scrape. No signal to extract. Likely drops 20–40% of resolved handles that would have been wasted spend.

Do this after the connector works, not in the first Instagram pass.

### Competitor cap

Live demo cap is **3** brands. Direction is **5** once Instagram is in and cost is measured. Do not raise the cap until scrape volume is the new (smaller) shape.

### Cost levers — code first, no vendor swap

Do these after Instagram ships and demo brands still show strong outliers:

1. Scrape less per handle (the 5 / 15 / pinned shape above).
2. Cap competitors (3 now, 5 later — not 10).
3. Aggressive cache (Try brands already reopen; extend the idea).
4. Skip dead / tiny accounts (1k followers / 60-day rule).
5. Request only fields used for scoring and breakdown (views, caption, duration, date, pinned, thumbnail) if the actor bills on payload.
6. Vendor swap only if volume still hurts: Ensemble Data (Instagram-specialised), a cheaper Instagram API, or Playwright + Smartproxy. Not the first move.

Pick for this repo: **#1 + #2 + #3**. All code. No vendor risk. Expected Instagram cost cut ~70–75% vs a naive dual-pass of 24+20.

Apify stays for reliability until unit economics force a change. Bright Data for Instagram is the same class of later decision as Bright Data for TikTok.

---

## Roadmap

Shown on How it works once copy is updated. Full vision without committing remix this cycle.

| Item | When |
|------|------|
| Instagram Reels (primary connector) | Shipped (2026-11) |
| Recreatability weighted into rank | After Reels, when the list needs it |
| TikTok scrape trimmed to 5 / 15 / pinned | After Reels, if cost or consistency wants it |
| YouTube Shorts | Later |
| Brand’s own posts in the ranking | Later |
| View-count floor filter | Later |
| Handle resolution verification | Later |
| Remix / generation: brief + character → generated Reel | Future — demand or partner |
| Video content analysis (watch the frames) | Future |

Why remix stays on the list:

- Keeps the research → generation loop honest.
- Lets users and partners ask for it (demand signal before build).
- If Fastlane / Vidgy come back: remix is roadmapped, can be built inside their stack.

---

## Build order (locked)

| When | What |
|------|------|
| This week (weekday) | Pipeline outreach: Vidgy, Leonardo, Linktree, Relevance AI. Product is the feed, not the renderer. |
| Next weekend | Instagram Reels connector. Instagram-first in UI copy. Latest 5 + popular 15 + pinned if the actor supports it without a fight; otherwise ship Reels with a sane first scrape and trim after. |
| Weekend after | Polish UI. Pricing page. Start distribution (landing, acquisition). |
| Future | Remix layer when users ask loud enough or a partner wants it inside their stack. |

Do not start remix because it is interesting. Start it because there is demand or a partner.

---

## Partnership posture

Do not compete head-on with Fastlane / Vidgy / Arcads / HeyGen on generation quality.

Viral Radar is the research layer those tools need underneath. Outreach talks about briefs and outliers, not “we also generate.”

---

## Owner verifies the UI

The owner opens localhost. The agent never does.

Do not open, fetch, screenshot, or click `localhost` / `127.0.0.1` / the local Next port. Do not start a second `next dev` to self-test. After a UI change, say what changed and stop.

Cursor rule: [`.cursor/rules/owner-verifies-ui.mdc`](../.cursor/rules/owner-verifies-ui.mdc).

---

## What this file is not

- Not the agent harness. Cursor workflow: one phase file per turn — see [`harness/HARNESS.md`](../harness/HARNESS.md) (`PLAN` → Build → `REVIEW` ⇄ `FIX` → `SYNC` → `PUSH`).
- Not the live product spec. Live behaviour is [README.md](../README.md) and [LIVE.md](LIVE.md).
- Not a license to expand scope mid-weekend. Instagram Reels + copy shift is the next build. Scrape trim, skip rules, pricing page, and remix are sequenced above.
- Not a promise that generation ships. It is listed so the vision is visible and the commitment is not.
