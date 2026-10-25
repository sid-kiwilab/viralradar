"use client";

import { useAction, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  sanitizeTikTokWebUrl,
  tiktokProfileUrl,
  tiktokVideoUrl,
} from "@/convex/lib/tiktokUrls";
import { TikTokExternalLink } from "@/components/tiktok-external-link";
import { formatMultiplier, formatViews } from "@/lib/formatMetrics";
import { convex } from "@/app/ConvexClientProvider";

const BRIEF_FIELDS = [
  { key: "hook" as const, label: "Hook" },
  { key: "format" as const, label: "Format" },
  { key: "pacing" as const, label: "Pacing" },
  { key: "captionPattern" as const, label: "Caption pattern" },
  { key: "whyItWorked" as const, label: "Why it worked" },
  { key: "paidAdaptation" as const, label: "Suggested paid adaptation" },
];

export function PostBreakdownClient({ postId }: { postId: Id<"posts"> }) {
  const post = useQuery(api.posts.getPost, convex ? { postId } : "skip");
  const handle = useQuery(
    api.handles.get,
    convex && post?.handleId ? { handleId: post.handleId } : "skip",
  );
  const breakdown = useQuery(
    api.breakdowns.byPost,
    convex ? { postId } : "skip",
  );
  const getOrCreate = useAction(api.actions.breakdownPost.getOrCreate);

  const [genError, setGenError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const runIdRef = useRef(0);
  const autoStartedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runBreakdown = useCallback(async () => {
    if (!convex) {
      return;
    }
    const runId = ++runIdRef.current;
    if (!mountedRef.current) {
      return;
    }
    setGenError(null);
    setGenerating(true);
    try {
      await getOrCreate({ postId });
    } catch (err) {
      if (!mountedRef.current || runIdRef.current !== runId) {
        return;
      }
      const message =
        err instanceof Error ? err.message : "Could not generate breakdown";
      setGenError(message);
    } finally {
      if (mountedRef.current && runIdRef.current === runId) {
        setGenerating(false);
      }
    }
  }, [getOrCreate, postId]);

  useEffect(() => {
    if (!convex) {
      return;
    }
    if (breakdown === undefined || post === undefined) {
      return;
    }
    if (breakdown !== null || post === null) {
      return;
    }
    if (autoStartedRef.current) {
      return;
    }
    autoStartedRef.current = true;
    queueMicrotask(() => {
      void runBreakdown();
    });
  }, [breakdown, post, runBreakdown]);

  if (!convex) {
    return (
      <div className="content-panel">
        <p className="content-note">
          Set NEXT_PUBLIC_CONVEX_URL in .env.local (run npx convex dev).
        </p>
      </div>
    );
  }

  if (post === undefined || breakdown === undefined) {
    return (
      <div className="content-panel">
        <p className="content-note">Loading breakdown…</p>
      </div>
    );
  }

  if (post === null) {
    return (
      <div className="content-panel job-panel">
        <p className="content-eyebrow">Breakdown</p>
        <h1 className="panel-h2 panel-title-spaced">Post not found</h1>
        <p className="panel-body">
          This outlier link may be stale. Run a new scan from the home page.
        </p>
      </div>
    );
  }

  const showBrief = breakdown !== null;
  const showGenerating = !showBrief && generating && !genError;
  const showPending = !showBrief && !generating && !genError;

  return (
    <div className="content-panel job-panel breakdown-panel">
      <p className="content-eyebrow">Breakdown</p>
      <h1 className="panel-h2 panel-title-spaced">Structural brief</h1>
      <p className="panel-body breakdown-lede">
        Pattern extraction from caption and account context — not a copy of the
        video.
      </p>

      <div className="breakdown-post-header">
        {post.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.thumbnail} alt="" className="post-thumb breakdown-thumb" />
        ) : (
          <div className="post-thumb-placeholder breakdown-thumb" />
        )}
        <div className="breakdown-post-meta">
          <div className="post-meta">
            <span className="post-handle">
              {handle?.handle ? (
                <TikTokExternalLink href={tiktokProfileUrl(handle.handle)}>
                  @{handle.handle}
                </TikTokExternalLink>
              ) : (
                "@tiktok"
              )}
            </span>
            {post.outlierScore != null ? (
              <span className="score-pill">
                {formatMultiplier(post.outlierScore)}
              </span>
            ) : null}
            <span className="post-views">{formatViews(post.views)} views</span>
          </div>
          <p className="post-caption">{post.caption || "No caption"}</p>
          <div className="post-links">
            <TikTokExternalLink
              href={
                handle?.handle
                  ? tiktokVideoUrl(handle.handle, post.postId)
                  : sanitizeTikTokWebUrl(post.url)
              }
            >
              Open on TikTok
            </TikTokExternalLink>
          </div>
        </div>
      </div>

      {showBrief ? (
        <dl className="brief-list">
          {BRIEF_FIELDS.map(({ key, label }) => (
            <div key={key} className="brief-row">
              <dt className="brief-label">{label}</dt>
              <dd className="brief-value">{breakdown[key]}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {showGenerating || showPending ? (
        <p className="content-note breakdown-status">
          {showGenerating
            ? "Analysing structure with the model…"
            : "Preparing breakdown…"}
        </p>
      ) : null}

      {genError ? (
        <div className="breakdown-error">
          <p className="content-note">{genError}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void runBreakdown()}
            disabled={generating}
          >
            Retry breakdown
          </button>
        </div>
      ) : null}
    </div>
  );
}
