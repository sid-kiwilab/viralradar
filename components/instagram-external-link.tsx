"use client";

import type { MouseEvent, ReactNode } from "react";
import { sanitizeInstagramWebUrl } from "@/convex/lib/instagramUrls";

/** Outbound Instagram profile link — plain new tab, no referrer. */
export function InstagramExternalLink({
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
  const safeHref = sanitizeInstagramWebUrl(
    href.trim() || "https://www.instagram.com/",
  );

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
