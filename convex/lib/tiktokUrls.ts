/** Canonical TikTok URLs for scrapers and UI (shared; no Apify webVideoUrl tokens). */

export const TIKTOK_OUT_PATH = "/out/tiktok";

export function normalizeTikTokHandle(raw: string): string {
  return raw.replace(/^@/, "").trim();
}

export function tiktokProfileUrl(handle: string): string {
  const h = normalizeTikTokHandle(handle);
  if (!h) return "https://www.tiktok.com/";
  return `https://www.tiktok.com/@${h}`;
}

export function tiktokVideoUrl(handle: string, videoId: string): string {
  const h = normalizeTikTokHandle(handle);
  const id = videoId.trim();
  if (!h || !id) return "https://www.tiktok.com/";
  return `https://www.tiktok.com/@${h}/video/${id}`;
}

function isTikTokHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "tiktok.com" || host.endsWith(".tiktok.com");
}

export function isAllowedTikTokWebUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && isTikTokHost(parsed.hostname);
  } catch {
    return false;
  }
}

export function sanitizeTikTokWebUrl(storedUrl: string): string {
  try {
    const u = new URL(storedUrl.trim());
    if (!isTikTokHost(u.hostname)) {
      return storedUrl;
    }
    u.protocol = "https:";
    u.hostname = "www.tiktok.com";
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return storedUrl;
  }
}

/** Same-origin hop so the browser does not send this app as Referer to TikTok. */
export function tiktokOutboundHref(storedUrl: string): string {
  const safe = sanitizeTikTokWebUrl(storedUrl.trim() || "https://www.tiktok.com/");
  return `${TIKTOK_OUT_PATH}?u=${encodeURIComponent(safe)}`;
}
