"use client";

import { useState } from "react";

type PostThumbnailProps = {
  src: string | undefined | null;
  className?: string;
};

function PostThumbnailImage({
  url,
  className,
}: {
  url: string;
  className: string;
}) {
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  if (failed) {
    return (
      <div
        className={`post-thumb-placeholder ${className}`}
        aria-hidden
        title="Preview unavailable"
      />
    );
  }

  return (
    <>
      {!ready ? (
        <div
          className={`post-thumb-placeholder ${className}`}
          aria-hidden
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className={className}
        referrerPolicy="no-referrer"
        style={ready ? undefined : { display: "none" }}
        onLoad={() => setReady(true)}
        onError={() => setFailed(true)}
      />
    </>
  );
}

/** TikTok CDN URLs expire or 403; fall back to placeholder instead of a broken img. */
export function PostThumbnail({ src, className = "post-thumb" }: PostThumbnailProps) {
  const url = src?.trim() ?? "";

  if (!url) {
    return (
      <div
        className={`post-thumb-placeholder ${className}`}
        aria-hidden
        title="Preview unavailable"
      />
    );
  }

  return <PostThumbnailImage key={url} url={url} className={className} />;
}
