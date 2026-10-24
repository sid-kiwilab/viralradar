# SYNC — update necessary docs

DONT MODIFY THIS FILE

This is the Viralradar sync harness for this repo (`c:\flutter_apps\viralradar`, [sid-kiwilab/viralradar](https://github.com/sid-kiwilab/viralradar)). It is not a session log.

Run after review (no findings) or after fix. Do not run mid-build.

Update Viralradar documentation to match what shipped this session.

## 1. Active docs (this repo)

| Doc | Path | Use for |
|-----|------|---------|
| Site README | [`README.md`](../README.md) | Dev commands, env var table, project structure |
| Live operations / architecture | [`docs/LIVE.md`](../docs/LIVE.md) | Routes, env vars, key files, deploy checklist |
| Session journal | [`docs/JOURNAL.md`](../docs/JOURNAL.md) | Dated log — what shipped, key files, known gaps |
| Harness | `harness/PLAN.md`, `REVIEW.md`, `FIX.md`, `SYNC.md` | Phase skills — DONT MODIFY THESE FILES |

Optional: `docs/plans/` for saved plans on large features (only when the user asks). Never save a feature plan into a harness file.

## 2. Update what changed

| If this changed… | Update… |
|------------------|---------|
| Routes, APIs, env vars, integrations | [LIVE.md](../docs/LIVE.md) — architecture, key files, env blocks |
| Production state, deploy notes, checklist items | [LIVE.md](../docs/LIVE.md) — current state / checklist |
| Dev commands, new scripts, public routes, env descriptions | [`README.md`](../README.md) |
| New env vars | Env example + [LIVE.md](../docs/LIVE.md) + README — placeholders only, never real keys |
| Shipped feature with gaps worth tracking | [JOURNAL.md](../docs/JOURNAL.md) — prepend a dated entry (newest first): what shipped, key files, known gaps |

Keep entries concise. Do not duplicate long history — link or summarize.
Stay in this repo. Do not copy another app's product, host, or env story into these files.
Follow [`docs/LIVE.md`](../docs/LIVE.md) for database and deploy.

## 2b. Convex (dev only)

If `convex/` changed this session (schema or functions) and FIX did not already push, push it yourself:

```bash
npx convex dev --once --typecheck disable
```

Dev deployment only (`CONVEX_DEPLOYMENT` in `.env`). Never `npx convex deploy` or `vercel --prod` unless the user explicitly asked to ship production. If the push is rejected as a breaking schema change, stop and report. Do not print secrets.

## 3. Rolling overflow

When a doc gets too big:

- **JOURNAL** — ~25 entries or unwieldy → move older sections to `docs/archive/JOURNAL_<n>.md`
- **LIVE** — ~500 lines or a section superseded → move to `docs/archive/LIVE_<n>.md`
- Leave a pointer at the top of the active file linking to archives
- Never delete Viralradar history — archive and link

## 4. Report

List each file updated with a one-line summary of what changed.

DONT MODIFY THIS FILE
