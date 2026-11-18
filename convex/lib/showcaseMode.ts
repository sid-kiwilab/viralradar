/** Hosted public demo: only reopen cached scans for demo hosts (Convex env). */
export function isShowcaseMode(): boolean {
  const raw = process.env.SHOWCASE_MODE?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export const SHOWCASE_DEMO_ONLY_MESSAGE =
  "Live site is a cached demo. Pick an instant brand chip or Fast scan a seeded host. To run your own brand, clone the repo with your keys or email sid@kiwilab.ai.";

export const SHOWCASE_CACHE_MISSING_MESSAGE =
  "This demo brand is not seeded yet on this deployment. Try another instant brand or email sid@kiwilab.ai.";