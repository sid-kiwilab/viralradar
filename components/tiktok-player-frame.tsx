"use client";

import { useCallback, useEffect, useState } from "react";
import { tiktokPlayerEmbedUrl } from "@/convex/lib/tiktokUrls";

type TikTokPlayerFrameProps = {
  videoId: string;
  title: string;
  autoplay?: boolean;
  className?: string;
  onLoad?: () => void;
  onGiveUp?: () => void;
};

const LOAD_TIMEOUT_MS = 20_000;

/** TikTok player/v1 iframe with loading state (mount only when visible). */
export function TikTokPlayerFrame({
  videoId,
  title,
  autoplay = false,
  className = "",
  onLoad,
  onGiveUp,
}: TikTokPlayerFrameProps) {
  const src = tiktokPlayerEmbedUrl(videoId, { autoplay });
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!src || loaded) return;
    const timer = window.setTimeout(() => {
      setTimedOut(true);
      onGiveUp?.();
    }, LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [src, loaded, onGiveUp]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    setTimedOut(false);
    onLoad?.();
  }, [onLoad]);

  if (!src) {
    return (
      <div
        className={`tiktok-player-frame tiktok-player-unavailable ${className}`.trim()}
        role="status"
      >
        Video unavailable
      </div>
    );
  }

  return (
    <div
      className={`tiktok-player-frame${loaded ? " is-loaded" : ""} ${className}`.trim()}
    >
      {!loaded && !timedOut ? (
        <p className="tiktok-player-loading" role="status">
          Loading TikTok…
        </p>
      ) : null}
      {timedOut && !loaded ? (
        <p className="tiktok-player-timeout" role="status">
          TikTok is taking a while. Try again or open on TikTok below.
        </p>
      ) : null}
      <iframe
        key={src}
        title={title}
        src={src}
        className="tiktok-player-iframe"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="no-referrer"
        scrolling="no"
        onLoad={handleLoad}
      />
    </div>
  );
}
