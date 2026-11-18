# FIX: patch what REVIEW proved

**Job:** generator again, **narrow**. **Not:** re-plan, not ship, not a second product.

Act on REVIEW findings that **survived the counter** (or on a bug you hit while patching those). Fresh intent: make those rows false. Do not expand the original feature.

## 1. Order

1. **High**, then **medium**.
2. **Low** only if it is one line.
3. If you **disagree** with a REVIEW row: put it under **Skipped** with a one-line counter — do not silently ignore **high/medium**.

## 2. Rules

- Diff as small as the finding. No “while I’m here” cleanup unless it is dead code you must touch.
- Gut shims and leftover paths; no backwards-compat theater.
- After edits, re-check the **runtime** surface you changed (client unmount, in-flight flags, form submit).
- Still **no** `npm run build` / `npm run lint` (that is **PUSH**). ReadLints on touched files. Owner verifies UI in browser if the finding was behavioral — agents do not fetch localhost.
- Stay in **viralradar**. New env vars: placeholders in `.env.example` + [docs/LIVE.md](../docs/LIVE.md) (or leave for SYNC).

## 3. Convex (dev only)

If this pass changes `convex/schema.ts` or any Convex function, push to the **dev** deployment yourself — do not ask the owner to run Convex.

```bash
npx convex dev --once --typecheck disable
```

Uses `CONVEX_DEPLOYMENT` in `.env`. Never `npx convex deploy` or `vercel --prod` unless Sid asked **this turn**. If Convex refuses a breaking schema change, stop and report — prefer additive schema. New Convex secrets: `npx convex env set NAME value` from local `.env`; never print values; never commit `.env`.

## 4. Report

- **Fixed** — finding → what changed
- **Skipped** — finding → why (including “REVIEW was wrong because…”)
- **Still open** — anything you could not finish

**Stop.** Tell the user to drop **REVIEW.md** again. You do not get to declare **No findings** from the FIX seat — that is self-preferential bias. **SYNC** / **PUSH** are forbidden until REVIEW says **No findings**.