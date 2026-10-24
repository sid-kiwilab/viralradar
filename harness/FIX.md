# FIX — execute lean fixes

DONT MODIFY THIS FILE

This is the Viralradar fix harness for this repo (`c:\flutter_apps\viralradar`, [sid-kiwilab/viralradar](https://github.com/sid-kiwilab/viralradar)).

Act on review findings (or obvious bugs you find while fixing). This is the **do work** pass.

## Rules

- Lean diffs only — fix what is worth fixing, skip noise
- Gut dead starter code
- Keep architecture minimal and robust
- Re-check race-prone areas after changes: client fetches after unmount, form submits, API routes
- If you add an env var, update this repo's env example and [LIVE.md](../docs/LIVE.md) in the same pass (or leave that for SYNC)
- Stay in this repo. Do not port behavior from a sibling app unless the user asked
- Follow [`docs/LIVE.md`](../docs/LIVE.md). Do not invent stack, database, or deploy rules in this file

## Convex (dev only)

If this pass changes `convex/schema.ts` or any Convex function, push it yourself. Do not ask the owner to run Convex.

```bash
npx convex dev --once --typecheck disable
```

That updates the **dev** deployment in `CONVEX_DEPLOYMENT` (`.env`). It does not touch production.

- Never run `npx convex deploy` or `vercel --prod` unless the user explicitly asked to ship production
- If Convex refuses the push (breaking schema), stop and report. Do not force a destructive schema change
- Prefer additive schema (new tables, optional fields, new indexes). Do not remove tables or required fields in the same pass as an auto-push
- New Convex secrets: `npx convex env set NAME value` from local `.env`. Never print the value. Never commit `.env`

## Verify

After changes, run this repo's build and lint commands when they exist.

Owner verifies UI in the browser; do not fetch localhost. Do not invent a migrator, eval harness, or deploy script unless the user asked.

## Report back

- **Fixed** — bullet list of what changed
- **Skipped** — anything intentionally left alone and why (one line each)

Then the user drops **SYNC**.

DONT MODIFY THIS FILE
