import type { NextRequest } from "next/server";
import {
  isAllowedTikTokWebUrl,
  sanitizeTikTokWebUrl,
} from "@/convex/lib/tiktokUrls";

const NO_REFERRER_HEADERS = {
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("u") ?? "";
  const target = sanitizeTikTokWebUrl(raw);
  if (!isAllowedTikTokWebUrl(target)) {
    return new Response("Invalid TikTok link.", {
      status: 400,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        ...NO_REFERRER_HEADERS,
      },
    });
  }

  const href = escapeHtml(target);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="refresh" content="0;url=${href}">
  <title>Opening TikTok</title>
</head>
<body style="margin:0;background:#0b0b0c;color:#e8e8ea;font:14px system-ui,sans-serif;padding:24px">
  <p>Opening TikTok…</p>
  <p><a href="${href}" rel="noreferrer noopener" referrerpolicy="no-referrer">Continue</a></p>
  <script>location.replace(${JSON.stringify(target)});</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...NO_REFERRER_HEADERS,
    },
  });
}
