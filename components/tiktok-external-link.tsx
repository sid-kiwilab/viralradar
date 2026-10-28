"use client";

import type { MouseEvent, ReactNode } from "react";
import { tiktokOutboundHref } from "@/convex/lib/tiktokUrls";

/** Outbound TikTok link: same-origin hop, then TikTok with no referrer. */
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
  return (
    <a
      href={tiktokOutboundHref(href)}
      target="_blank"
      rel="noopener"
      className={className}
      onClick={onClick}
    >
      {children}
    </a>
  );
}
