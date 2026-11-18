"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { instagramEmbedUrl } from "@/convex/lib/instagramUrls";

export type InstagramLightboxTarget = {
  shortcode: string;
  title: string;
};

type InstagramLightboxProps = {
  target: InstagramLightboxTarget | null;
  onClose: () => void;
};

export function InstagramLightbox({ target, onClose }: InstagramLightboxProps) {
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
        <div className="tiktok-lightbox-stage">
          <button
            ref={closeRef}
            type="button"
            className="tiktok-lightbox-close"
            onClick={onClose}
            aria-label="Close video"
          >
            ×
          </button>
          <iframe
            key={target.shortcode}
            className="tiktok-player-lightbox"
            src={instagramEmbedUrl(target.shortcode)}
            title={target.title}
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
