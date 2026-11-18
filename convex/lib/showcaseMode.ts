import {
  SHOWCASE_CACHE_MISSING_MESSAGE,
  SHOWCASE_DEMO_ONLY_MESSAGE,
} from "../../lib/showcaseMode";

export { SHOWCASE_CACHE_MISSING_MESSAGE, SHOWCASE_DEMO_ONLY_MESSAGE };

/** Hosted public demo: only reopen cached scans for demo hosts (Convex env). */
export function isShowcaseMode(): boolean {
  const raw = process.env.SHOWCASE_MODE?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}