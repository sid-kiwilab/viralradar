# PLAN: scope the work

**Job:** think. **Not:** implement, review, or ship.

Use this in Cursor **Plan** mode. Do not write product code. No `npm run build`, no lint, no prod deploy.

After Sid accepts, he clicks **Build** in the IDE. That *is* implementation. There is no `IMPLEMENT.md`.

## 0. Fresh intent — the goal that later files must not shrink

Restate the user request in **one sentence**. This sentence is the contract. Build / REVIEW / FIX / SYNC / PUSH re-read it; they do not quietly replace it with “what we managed to ship.”

## 1. Discover (minimum, not a tour)

- Always: [AGENTS.md](../AGENTS.md), [docs/LIVE.md](../docs/LIVE.md)
- Then: files in the area being changed (`app/`, `components/`, `convex/`, `lib/` as needed)
- Only if routes, env, or deploy story may change: [README.md](../README.md)
- [docs/JOURNAL.md](../docs/JOURNAL.md) only if recent session notes matter for this pass

Do not re-litigate already-shipped work. Do not dump the whole repo into context. Stay in **viralradar** — no sibling-app architecture.

## 2. Output (short, testable)

| Section | What belongs here |
|---------|-------------------|
| **Scope** | What we are doing and why |
| **Done when** | Observable finish line — UI behavior, files, API contract. Not “feels done.” |
| **Touch points** | Likely paths (guess from discovery, not a fake spec) |
| **Out of scope** | Explicit non-goals this pass |
| **Risks** | Convex client vs server, OpenRouter/Apify keys on Convex deployment, secrets in git |
| **Build constraints** | Copy the block in §4 into the plan so **Build** inherits it |

**Open questions:** at most 1–2, and only if you are actually blocked. Prefer a decision + “confirm if wrong.”

## 3. How to plan (do not over-spec)

- High-level: deliverables and constraints, **not** line-by-line implementation. Wrong details in a plan cascade into Build.
- Lean: no legacy shims, no “just in case” paths, simple over clever.
- UI: call out race-prone spots (stale fetch, unmount, double submit) as risks, not as a novel architecture.
- Classify size in one line: **small** (one module) vs **wide** (many files). Wide work still one plan — Build slices it; you do not spawn a workflow.

## 4. Carry into Build (write this into the plan, do not code)

Cursor’s **Build** button only sees the plan you just wrote. Put this block in that plan:

- Implement **only** Done when. No drive-by refactors, no extra features.
- Read `node_modules/next/dist/docs/` before App Router edits; App Router lives under `app/` (no `src/`).
- **No** `vercel --prod` or `npx convex deploy` unless Sid asked **this turn**.
- Stay in **viralradar** — follow [docs/LIVE.md](../docs/LIVE.md) for stack, env, and Convex rules.
- Client UI: stale-response guards, unmount, no duplicate in-flight fetches on paths you change.
- **No** `npm run build` / `npm run lint` (that is **PUSH**). Cheap checks only (editor lints; owner verifies UI in browser — agents do not fetch localhost).
- When Done when is met: list files changed, list anything still missing, **stop**. Do not self-REVIEW. Sid drops **REVIEW.md**.

**Stop.** Sid clicks **Build** when he accepts. Then he drops **REVIEW.md**. Do not look for an IMPLEMENT file.