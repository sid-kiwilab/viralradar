"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { TikTokPlayerFrame } from "@/components/tiktok-player-frame";
import { TikTokExternalLink } from "@/components/tiktok-external-link";
import { tiktokVideoUrl } from "@/convex/lib/tiktokUrls";

export type TikTokLightboxTarget = {
  videoId: string;
  title: string;
  handle?: string;
};

type TikTokLightboxProps = {
  target: TikTokLightboxTarget | null;
  onClose: () => void;
};

export function TikTokLightbox({ target, onClose }: TikTokLightboxProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = target != null;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  if (!open || typeof document === "undefined") {
    return null;
  }

  const profileVideoUrl =
    target.handle != null
      ? tiktokVideoUrl(target.handle, target.videoId)
      : null;

  return createPortal(
    <div
      className="tiktok-lightbox-backdrop"
      role="presentation"
      onClick={onBackdropClick}
    >
      <div
        className="tiktok-lightbox-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <p id={titleId} className="sr-only">
          {target.title}
        </p>
        <button
          ref={closeRef}
          type="button"
          className="tiktok-lightbox-close"
          onClick={onClose}
          aria-label="Close video"
        >
          ×
        </button>
        <TikTokPlayerFrame
          key={target.videoId}
          videoId={target.videoId}
          title={target.title}
          autoplay
          className="tiktok-player-lightbox"
        />
        {profileVideoUrl ? (
          <p className="tiktok-lightbox-fallback">
            Won&apos;t load?{" "}
            <TikTokExternalLink href={profileVideoUrl}>
              Open on TikTok
            </TikTokExternalLink>
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
