/** Stored on scanJobs.detail while a Clockworks attempt is in flight (not shown raw). */
export const TIKTOK_WAIT_DETAIL = "tiktok-wait";

export const TIKTOK_RETRY_SLOW = "TikTok lookup slow, retrying...";
export const TIKTOK_RETRY_STILL_SLOW =
  "TikTok lookup still slow, one more try...";

export const TIKTOK_WAIT_A11Y_LABEL = "Contacting TikTok.";

export const TIKTOK_JOKE_POOL = [
  "Negotiating with TikTok...",
  "TikTok's rate limiter is awake",
  "Convincing TikTok we're friendly...",
  "Dodging the TikTok bouncer...",
  "Still working, TikTok is slow today",
  "Scrape in progress, TikTok vibes variable",
] as const;

export function isTikTokWaitDetail(detail: string | null | undefined): boolean {
  const trimmed = detail?.trim();
  if (!trimmed) {
    return false;
  }
  return (
    trimmed === TIKTOK_WAIT_DETAIL ||
    trimmed.startsWith(`${TIKTOK_WAIT_DETAIL}-`)
  );
}

/** Copy owned by ScanStatus; omit from secondary detail lines. */
export function isTikTokWaitUiDetail(detail: string | null | undefined): boolean {
  if (!detail?.trim()) {
    return false;
  }
  if (isTikTokWaitDetail(detail)) {
    return true;
  }
  return (
    detail === TIKTOK_RETRY_SLOW || detail === TIKTOK_RETRY_STILL_SLOW
  );
}

export function pickTikTokJokeLine(exclude?: string): string {
  const pool = TIKTOK_JOKE_POOL.filter((line) => line !== exclude);
  const choices = pool.length > 0 ? pool : [...TIKTOK_JOKE_POOL];
  return choices[Math.floor(Math.random() * choices.length)]!;
}
