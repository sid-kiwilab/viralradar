import type { ReactNode, MouseEvent } from "react";

/** Outbound TikTok link — canonical URL, no referrer (avoids 403 from localhost referrers). */
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
      href={href}
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
