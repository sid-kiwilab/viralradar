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

export function sanitizeTikTokWebUrl(storedUrl: string): string {
  try {
    const u = new URL(storedUrl.trim());
    if (!u.hostname.toLowerCase().includes("tiktok.com")) {
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
