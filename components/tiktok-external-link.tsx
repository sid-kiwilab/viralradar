"use client";

import type { MouseEvent, ReactNode } from "react";
import { sanitizeTikTokWebUrl } from "@/convex/lib/tiktokUrls";

/** Outbound TikTok profile (or other) link — plain new tab, no referrer. */
export function TikTokExternalLink({
  href,
  children,
  className,
  onClick,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const safeHref = sanitizeTikTokWebUrl(href.trim() || "https://www.tiktok.com/");

  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      className={className}
      onClick={onClick}
    >
      {children}
    </a>
  );
}
