export function normalizeInstagramHandle(raw: string): string {
  return raw.replace(/^@/, "").trim();
}

export function instagramProfileUrl(handle: string): string {
  const h = normalizeInstagramHandle(handle);
  if (!h) return "https://www.instagram.com/";
  return `https://www.instagram.com/${encodeURIComponent(h)}/`;
}

/** Reels tab URL for apify/instagram-scraper profile baseline pass. */
export function instagramProfileReelsUrl(handle: string): string {
  const h = normalizeInstagramHandle(handle);
  if (!h) return "https://www.instagram.com/";
  return `https://www.instagram.com/${encodeURIComponent(h)}/reels/`;
}

function isInstagramHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "instagram.com" || host.endsWith(".instagram.com");
}

export function instagramShortcodeFromUrl(url: string): string | undefined {
  try {
    const path = new URL(url).pathname;
    const match = path.match(/\/(?:p|reel|reels|tv)\/([^/?#]+)/i);
    return match?.[1] || undefined;
  } catch {
    return undefined;
  }
}

export function instagramReelUrl(shortcode: string): string {
  return `https://www.instagram.com/reel/${encodeURIComponent(shortcode)}/`;
}

export function instagramEmbedUrl(shortcode: string): string {
  return `https://www.instagram.com/reel/${encodeURIComponent(shortcode)}/embed/`;
}

export function sanitizeInstagramWebUrl(storedUrl: string): string {
  try {
    const u = new URL(storedUrl.trim());
    if (!isInstagramHost(u.hostname)) {
      return storedUrl;
    }
    u.protocol = "https:";
    u.hostname = "www.instagram.com";
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return storedUrl;
  }
}
