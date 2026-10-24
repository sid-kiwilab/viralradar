# PLAN — plan the feature

DONT MODIFY THIS FILE

This is the Viralradar planning harness for this repo (`c:\flutter_apps\viralradar`, [sid-kiwilab/viralradar](https://github.com/sid-kiwilab/viralradar)). Write the plan in chat. Do not paste a feature into this file.

You are in **planning mode**. Do not implement unless the user explicitly asks you to build in the same message.

Order: **PLAN → build → REVIEW → FIX → SYNC**. One harness file per phase.

## 1. Discover context

Read these first:

- [`README.md`](../README.md)
- [`docs/LIVE.md`](../docs/LIVE.md)
- [`docs/JOURNAL.md`](../docs/JOURNAL.md)
- [`docs/AGENT-CONVENTIONS.md`](../docs/AGENT-CONVENTIONS.md)
- Recent edits in the area being changed

Do not re-litigate work already documented or already shipped.
Stay in this repo. Do not pull architecture, env, or product rules from a sibling app.

## 2. Output a concise plan

Include:

- **Scope** — what we are building and why
- **Likely touch points** — files and routes that match this repo's layout
- **Risks** — from this repo's stack, secrets, and client vs server boundaries
- **Out of scope** — what we are explicitly not doing this pass
- **Open questions** — only if blocked; keep to 1–2 critical items

Keep it short. No code yet.

## 3. Build constraints (apply to the plan)

- Lean and minimal — match this repo's existing layout
- Simple beats clever; remove dead code when it is in the way
- Robust by design — no race conditions, abort or unmount guards on client fetches
- Plain, clear copy unless this repo already has a defined voice
- Never commit secrets. Document new env vars in this repo's env example and [LIVE.md](../docs/LIVE.md)
- Follow [`docs/AGENT-CONVENTIONS.md`](../docs/AGENT-CONVENTIONS.md). Do not invent stack, database, or deploy rules in this file

DONT MODIFY THIS FILE
