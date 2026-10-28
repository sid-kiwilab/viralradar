"use client";

import type { MouseEvent, ReactNode } from "react";
import { sanitizeTikTokWebUrl } from "@/convex/lib/tiktokUrls";

/** Outbound TikTok link: canonical URL, no referrer (avoids TikTok 403 from app origin). */
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

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }
    const modified =
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0;
    if (modified) {
      return;
    }
    const opened = window.open(safeHref, "_blank", "noopener,noreferrer");
    if (opened) {
      event.preventDefault();
    }
  };

  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      className={className}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
