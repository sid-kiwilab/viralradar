/** Pre-cached Try chips (shared with Convex demo cache). */
export const DEMO_BRAND_HOSTS = [
  "cluely.com",
  "gymshark.com",
  "duolingo.com",
  "oatly.com",
] as const;

/** Official TikTok handles for dev Fast-scan cache seeding (CLI only). */
export const TRY_TIKTOK_HANDLE_BY_HOST: Record<
  "gymshark.com" | "duolingo.com" | "oatly.com",
  string
> = {
  "gymshark.com": "gymshark",
  "duolingo.com": "duolingo",
  "oatly.com": "oatly",
};

export const TIKTOK_TRY_HOSTS = Object.keys(
  TRY_TIKTOK_HANDLE_BY_HOST,
) as (keyof typeof TRY_TIKTOK_HANDLE_BY_HOST)[];

export const TRY_BRAND_URLS = DEMO_BRAND_HOSTS.map(
  (host) => `https://${host}`,
) as readonly string[];

/** Default URL in the home field (pre-cached instant demo). */
export const DEFAULT_TRY_BRAND_INPUT = "cluely.com";

const TRY_HOST_SET = new Set<string>(DEMO_BRAND_HOSTS);

export function isInstantTryBrandInput(url: string): boolean {
  try {
    const trimmed = url.trim();
    if (!trimmed) {
      return false;
    }
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const host = new URL(withProtocol).hostname
      .replace(/^www\./i, "")
      .toLowerCase();
    return TRY_HOST_SET.has(host);
  } catch {
    return false;
  }
}
