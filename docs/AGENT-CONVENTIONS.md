# Agent conventions (Viralradar)

Stable rules for Cursor agents and harness passes. Ops: [LIVE.md](LIVE.md). Session log: [JOURNAL.md](JOURNAL.md).

This repo is **Viralradar** (`c:\flutter_apps\viralradar`, [sid-kiwilab/viralradar](https://github.com/sid-kiwilab/viralradar)). Stay in this repo. Do not follow docs, env, stack, or product rules from a sibling app.

Harness: `harness/PLAN.md` → build → `REVIEW.md` → `FIX.md` → `SYNC.md`. DONT MODIFY those files. Write the plan in chat.

## Local UI verification (owner)

The repo owner **always** verifies the running app in the browser themselves.

Agents **must not**:

- Fetch, `curl`, or `WebFetch` localhost (or any other local dev URL) to “check” the UI
- Use browser automation against localhost for visual or UX verification
- End UI work with “refresh localhost” as the main handoff — the owner will test when they choose

Agents **may** run this repo's build and lint commands when they exist.

Human dev entry: [README.md](../README.md).

## Convex schema push (dev)

On **FIX** and **SYNC**, if `convex/schema.ts` or Convex functions changed, the agent runs:

```bash
npx convex dev --once --typecheck disable
```

That pushes to the **dev** deployment only (`CONVEX_DEPLOYMENT` in `.env`). The owner does not run this by hand.

Agents **must not**:

- Run `npx convex deploy` or `vercel --prod` unless the user asked to ship production
- Force a schema push Convex rejected as breaking
- Remove tables or required fields in an auto-push (additive changes only)
- Commit `.env` or print real keys
- Point this app at another product’s deployment without the user saying so

Document host/env/schema changes in [LIVE.md](LIVE.md) before treating any URL as live.

## Never guess

Never invent a number that can be measured. If you cannot measure it, say so. Do not fill the gap.

## Feasibility (owner)

When the owner asks if something is possible, answer **yes or no** (and blockers) first. Do not estimate their build speed or argue timeline unless they ask for estimates.

## UI conventions

- Keep the scaffold lean until product voice is defined — plain and clear
- Avoid hyphens and em dashes in static UI strings unless the user asks otherwise
