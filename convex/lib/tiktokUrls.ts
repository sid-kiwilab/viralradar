/** Canonical TikTok URLs for scrapers and UI (shared; no Apify webVideoUrl tokens). */

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

export type TikTokPlayerOptions = {
  /** User opened the player (lightbox). */
  autoplay?: boolean;
};

/** Official TikTok embed player (v1) — prefer over embed/v2 for controls and sizing. */
export function tiktokPlayerEmbedUrl(
  videoId: string,
  options: TikTokPlayerOptions = {},
): string | null {
  const id = videoId.trim();
  if (!id) return null;
  const params = new URLSearchParams({
    autoplay: options.autoplay ? "1" : "0",
    rel: "0",
    music_info: "0",
    description: "0",
  });
  return `https://www.tiktok.com/player/v1/${encodeURIComponent(id)}?${params.toString()}`;
}
