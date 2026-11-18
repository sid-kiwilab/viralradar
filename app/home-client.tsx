"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { convex } from "./ConvexClientProvider";
import {
  DEFAULT_TRY_BRAND_INPUT,
  isInstantTryBrandInput,
  TRY_BRAND_URLS,
} from "@/lib/demo-brands";
import { PostThumbnail } from "@/components/post-thumbnail";
import { instagramProfileUrl } from "@/convex/lib/instagramUrls";
import { tiktokProfileUrl } from "@/convex/lib/tiktokUrls";
import {
  TikTokLightbox,
  type TikTokLightboxTarget,
} from "@/components/tiktok-lightbox";
import {
  InstagramLightbox,
  type InstagramLightboxTarget,
} from "@/components/instagram-lightbox";
import { InstagramExternalLink } from "@/components/instagram-external-link";
import { TikTokExternalLink } from "@/components/tiktok-external-link";
import { SiteShell } from "@/components/site-shell";
import { ScanStatus } from "@/components/scan-status";
import { isTikTokWaitUiDetail } from "@/lib/tiktok-wait";
import { WalkthroughSlot } from "@/components/walkthrough-slot";
import { formatMultiplier, formatPostDate, formatViews } from "@/lib/formatMetrics";
import { SCAN_AGAIN_HINT } from "@/lib/scanRescan";
import { CONTACT_EMAIL } from "@/lib/site-constants";

function ConvexHealthNotice() {
  const health = useQuery(api.health.get, convex ? {} : "skip");
  if (!convex) {
    return (
      <p className="convex-note">
        Set NEXT_PUBLIC_CONVEX_URL in .env.local (run npx convex dev).
      </p>
    );
  }
  if (health === undefined || health.ok) {
    return null;
  }
  return <p className="convex-note">Backend unavailable.</p>;
}

function tryBrandHost(url: string): string {
  return url.replace(/^https:\/\//, "");
}

function TryBrandChips({
  disabled,
  rowClassName,
  onSelectHost,
}: {
  disabled: boolean;
  rowClassName?: string;
  onSelectHost: (host: string) => void;
}) {
  return (
    <div className={rowClassName ? `try-row ${rowClassName}` : "try-row"}>
      <span className="try-label">Instant results:</span>
      {TRY_BRAND_URLS.map((url) => {
        const host = tryBrandHost(url);
        return (
          <button
            key={url}
            type="button"
            className="try-chip"
            disabled={disabled}
            onClick={() => onSelectHost(host)}
            title="Pre-cached; use Fast scan for immediate outliers"
          >
            {host}
          </button>
        );
      })}
    </div>
  );
}

export function HomeClient() {
  const [brandUrl, setBrandUrl] = useState(DEFAULT_TRY_BRAND_INPUT);
  const [excludeHandlesInput, setExcludeHandlesInput] = useState("");
  const [brandId, setBrandId] = useState<Id<"brands"> | null>(null);
  const [jobId, setJobId] = useState<Id<"scanJobs"> | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stepBusy, setStepBusy] = useState(false);
  const [tiktokLightbox, setTiktokLightbox] =
    useState<TikTokLightboxTarget | null>(null);
  const [instagramLightbox, setInstagramLightbox] =
    useState<InstagramLightboxTarget | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    try {
      sessionStorage.removeItem("viralradar.brandId");
    } catch {
      // ignore
    }
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const startFromUrl = useMutation(api.brands.startFromUrl);
  const abandonScan = useMutation(api.scanJobs.abandonScan);
  const health = useQuery(api.health.get, convex ? {} : "skip");

  const brand = useQuery(api.brands.getBrand, brandId ? { brandId } : "skip");
  const jobById = useQuery(
    api.scanJobs.getById,
    jobId ? { jobId } : "skip",
  );
  const pinPending = jobId != null && jobById === undefined;
  const pinMatchesBrand =
    jobId != null &&
    jobById != null &&
    brandId != null &&
    jobById.brandId === brandId;
  const pinMissingOrMismatch =
    jobId != null &&
    jobById !== undefined &&
    (jobById === null ||
      (brandId != null && jobById.brandId !== brandId));
  const jobLatest = useQuery(
    api.scanJobs.latestByBrand,
    brandId && (!jobId || pinMissingOrMismatch) ? { brandId } : "skip",
  );
  const job = pinPending
    ? undefined
    : pinMatchesBrand
      ? jobById
      : jobLatest;
  const handles = useQuery(
    api.handles.listByBrand,
    brandId ? { brandId } : "skip",
  );
  const posts = useQuery(
    api.posts.rankedByBrand,
    brandId ? { brandId, limit: 40 } : "skip",
  );
  const handleById = useMemo(() => {
    const map = new Map<string, NonNullable<typeof handles>[number]>();
    if (handles) {
      for (const h of handles) {
        map.set(h._id, h);
      }
    }
    return map;
  }, [handles]);

  const isRunning = job?.status === "pending" || job?.status === "running";
  const scanInProgress = isRunning || job?.status === "waiting";
  const jobFailed = job?.status === "failed";
  const isLanding = brandId == null && jobId == null;
  const showToolLabel = Boolean(brandId && job && scanInProgress);
  const showSessionLoading = pinPending || submitting;

  const onScan = useCallback(async () => {
    if (!convex || !brandUrl.trim()) return;
    setScanError(null);
    setTiktokLightbox(null);
    setInstagramLightbox(null);
    setSubmitting(true);
    try {
      const result = await startFromUrl({
        url: brandUrl.trim(),
        excludeHandlesInput: excludeHandlesInput.trim() || undefined,
      });
      if (!mountedRef.current) return;
      setBrandId(result.brandId);
      setJobId(result.jobId ?? null);
    } catch (err) {
      if (!mountedRef.current) return;
      const message = err instanceof Error ? err.message : "Scan could not start";
      setScanError(message);
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  }, [brandUrl, excludeHandlesInput, startFromUrl]);

  const clearHomeState = useCallback(() => {
    setBrandUrl(DEFAULT_TRY_BRAND_INPUT);
    setExcludeHandlesInput("");
    setBrandId(null);
    setJobId(null);
    setScanError(null);
    setTiktokLightbox(null);
    setInstagramLightbox(null);
    setSubmitting(false);
    setStepBusy(false);
  }, []);

  const resetHome = useCallback(async () => {
    const jobActive =
      job &&
      (job.status === "pending" ||
        job.status === "running" ||
        job.status === "waiting");

    if (jobActive) {
      setStepBusy(true);
      try {
        await abandonScan({ jobId: job._id });
      } catch {
        // still return to idle landing
      } finally {
        if (mountedRef.current) {
          setStepBusy(false);
        }
      }
    }

    if (!mountedRef.current) return;
    clearHomeState();
  }, [job, abandonScan, clearHomeState]);

  const loadBrandInference =
    Boolean(jobId) &&
    job != null &&
    job.stage !== "queued" &&
    job.stage !== "understand_site";
  const brandInference = useQuery(
    api.brandInferences.latestByJob,
    loadBrandInference ? { jobId: jobId! } : "skip",
  );
  const nicheSearch = useQuery(
    api.nicheSearches.latestByJob,
    jobId &&
      (job?.stage === "find_niche_queries" ||
        job?.stage === "search_reels" ||
        jobFailed)
      ? { jobId }
      : "skip",
  );

  const showcaseMode = health?.showcaseMode === true;
  const isFastScanUrl = isInstantTryBrandInput(brandUrl);
  const canScan = Boolean(
    convex &&
      brandUrl.trim() &&
      !submitting &&
      !scanInProgress &&
      (!showcaseMode || isFastScanUrl),
  );
  const scanButtonLabel =
    submitting || isRunning
      ? "Scanning…"
      : isFastScanUrl
        ? "Fast scan"
        : "Scan";

  const showBrandSummary = Boolean(
    brand &&
      job &&
      job.stage !== "queued" &&
      job.stage !== "understand_site",
  );

  const canCancelScan = !jobFailed && (isRunning || job?.status === "waiting");

  const showResults =
    job?.status === "completed" && !isRunning && !submitting;

  const igSearchSummary = useQuery(
    api.posts.instagramSearchSummary,
    showResults && brandId ? { brandId } : "skip",
  );

  const isScraping =
    Boolean(
      job &&
        (job.stage === "search_reels" ||
          job.stage === "search_tiktok" ||
          job.stage === "score") &&
        (job.status === "running" || job.status === "pending"),
    );

  const showOutlierSection = Boolean(
    brandId && (showResults || isScraping) && posts !== undefined,
  );

  const showScanStatus = Boolean(
    job && (isRunning || job.status === "waiting"),
  );

  const showJobPanel = Boolean(
    brandId && job && job.status !== "completed",
  );

  const searchHashtags: string[] =
    job?.hashtags ?? nicheSearch?.hashtags ?? [];
  const searchKeywords: string[] =
    job?.keywords ?? nicheSearch?.keywords ?? [];

  return (
    <SiteShell isLanding={isLanding} onHomeClick={() => void resetHome()}>
      <div className={`form-stage${isLanding ? "" : " form-stage-compact"}`}>
        {isLanding ? (
          <div className="form-hero">
            <div className="hero-badge">
              <svg
                className="hero-badge-star"
                viewBox="0 0 24 24"
                fill="white"
                aria-hidden
              >
                <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" />
              </svg>
              Winning organic formats in your niche that AI can recreate.
            </div>
            <h1 className="content-h1">
              Viral <em>Radar</em>
            </h1>
            <p className="content-lede">
              Paste a brand URL. We infer the niche and pull outlier Instagram
              Reels. Try brands still show cached TikTok outliers.
            </p>
            <WalkthroughSlot />
          </div>
        ) : showToolLabel ? (
          <p className="content-eyebrow tool-mode-label">Scan in progress</p>
        ) : showSessionLoading ? (
          <p className="content-eyebrow tool-mode-label">Loading scan…</p>
        ) : null}

        <div className="form-meta">
          <form
            className="scan-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (canScan) {
                void onScan();
              }
            }}
          >
            <div className="url-scan-row">
              <div className="field">
                <label htmlFor="brand-url" className="sr-only">
                  Brand URL
                </label>
                <input
                  id="brand-url"
                  name="brandUrl"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="cluely.com"
                  value={brandUrl}
                  onChange={(event) => setBrandUrl(event.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={!canScan}
                className="btn btn-solid url-scan-btn"
                aria-busy={submitting || isRunning}
              >
                {scanButtonLabel}
              </button>
            </div>
            <div className="field exclude-handles-field">
              <label htmlFor="exclude-handles" className="exclude-handles-label">
                Exclude Instagram handles{" "}
                <span className="text-muted">(optional)</span>
              </label>
              <input
                id="exclude-handles"
                name="excludeHandles"
                type="text"
                autoComplete="off"
                placeholder="yourbrand, cofounder"
                value={excludeHandlesInput}
                disabled={scanInProgress}
                onChange={(event) =>
                  setExcludeHandlesInput(event.target.value)
                }
              />
              <p className="content-note exclude-handles-hint">
                Comma-separated @handles. Their Reels won&apos;t appear in
                niche results. Leave blank to include everyone.
              </p>
            </div>
          </form>

          {isLanding ? (
            <div className="input-helper">
              <p className="content-note">
                {showcaseMode
                  ? "Cached demo — Fast scan a seeded brand below. Source code on GitHub for the full pipeline."
                  : "Paste a brand URL. See outlier Reels in that niche."}
              </p>
              <TryBrandChips
                disabled={scanInProgress}
                onSelectHost={setBrandUrl}
              />
              <p className="content-note try-your-brand-row">
                Your brand?{" "}
                <a
                  className="try-your-brand-link"
                  href={`mailto:${CONTACT_EMAIL}?subject=Viral%20Radar%20scan`}
                >
                  Try your brand
                </a>
              </p>
            </div>
          ) : null}

          {scanError ? (
            <div className="error-banner" role="alert">
              {scanError}
            </div>
          ) : null}
        </div>
      </div>

      {showJobPanel && job ? (
        <div className="content-panel job-panel">
          {showScanStatus ? (
            <ScanStatus
              stage={job.stage}
              status={job.status}
              detail={job.detail}
            />
          ) : null}

          {showBrandSummary && brand ? (
            <div className="panel-divider">
              <h2 className="panel-h2">{brandInference?.name ?? brand.name}</h2>
              <p className="panel-body">
                <span className="text-muted">Niche:</span>{" "}
                {brandInference?.niche ?? brand.niche}
              </p>
              {searchHashtags.length > 0 ? (
                <p className="panel-body">
                  <span className="text-muted">Hashtags:</span>{" "}
                  {searchHashtags.map((tag) => `#${tag}`).join(" ")}
                </p>
              ) : null}
              {searchKeywords.length > 0 ? (
                <p className="panel-body">
                  <span className="text-muted">Keywords:</span>{" "}
                  {searchKeywords.join(" · ")}
                </p>
              ) : null}
            </div>
          ) : null}

          {jobFailed && job.error ? (
            <div className="panel-divider">
              <p className="error-text">{job.error}</p>
              {searchHashtags.length > 0 || searchKeywords.length > 0 ? (
                <div className="discover-queries text-left">
                  <p className="content-note discover-queries-label">
                    Instagram searches we ran
                  </p>
                  <ol className="discover-queries-list">
                    {searchHashtags.map((tag) => (
                      <li key={`#${tag}`}>#{tag}</li>
                    ))}
                    {searchKeywords.map((kw) => (
                      <li key={kw}>{kw}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
              {!job.error.includes(SCAN_AGAIN_HINT) ? (
                <p className="content-note text-left">
                  Start a new scan from the URL box when you want to try again.
                </p>
              ) : null}
            </div>
          ) : null}

          {canCancelScan ? (
            <div className="actions-row">
              <button
                type="button"
                disabled={stepBusy}
                onClick={() => void resetHome()}
                className="btn btn-ghost"
              >
                Cancel scan
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {isScraping &&
      job?.detail &&
      !isTikTokWaitUiDetail(job.detail) ? (
        <p className="content-note scrape-progress-note">{job.detail}</p>
      ) : null}

      {showOutlierSection && (posts?.length ?? 0) > 0 ? (
        <section className="outlier-section">
          <h2 className="content-h2">Outlier posts</h2>
          <ul className="post-list">
            {(posts ?? []).map((post) => {
              const handle = handleById.get(post.handleId);
              const isIg = post.platform === "instagram";
              const watchTitle = handle?.handle
                ? `@${handle.handle} on ${isIg ? "Instagram" : "TikTok"}`
                : isIg
                  ? "Instagram Reel"
                  : "TikTok video";
              return (
                <li key={post._id} className="post-row">
                  <button
                    type="button"
                    className="post-thumb-play"
                    onClick={() => {
                      if (isIg) {
                        setInstagramLightbox({
                          shortcode: post.postId,
                          title: watchTitle,
                        });
                      } else {
                        setTiktokLightbox({
                          videoId: post.postId,
                          title: watchTitle,
                        });
                      }
                    }}
                    aria-label={`Play ${watchTitle}`}
                  >
                    <PostThumbnail src={post.thumbnailUrl} />
                    <span className="post-thumb-play-icon" aria-hidden>
                      ▶
                    </span>
                  </button>
                  <div className="post-body">
                    {post.outlierScore != null ? (
                      <span className="score-pill score-pill-hero">
                        {formatMultiplier(post.outlierScore)}
                      </span>
                    ) : isIg ? (
                      <span className="score-pill score-pill-muted">
                        Views only
                      </span>
                    ) : null}
                    <div className="post-meta">
                      <span className="post-handle">
                        {handle?.handle ? (
                          isIg ? (
                            <InstagramExternalLink
                              href={instagramProfileUrl(handle.handle)}
                            >
                              @{handle.handle}
                            </InstagramExternalLink>
                          ) : (
                            <TikTokExternalLink
                              href={tiktokProfileUrl(handle.handle)}
                            >
                              @{handle.handle}
                            </TikTokExternalLink>
                          )
                        ) : (
                          isIg ? "@instagram" : "@tiktok"
                        )}
                      </span>
                      <span className="post-views">
                        {formatViews(post.views)} views
                      </span>
                      {post.postedAt ? (
                        <span className="post-date">
                          {formatPostDate(post.postedAt)}
                        </span>
                      ) : null}
                    </div>
                    <p className="post-caption">
                      {post.caption || "No caption"}
                    </p>
                    <div className="post-links">
                      <button
                        type="button"
                        className="post-link-btn"
                        onClick={() => {
                          if (isIg) {
                            setInstagramLightbox({
                              shortcode: post.postId,
                              title: watchTitle,
                            });
                          } else {
                            setTiktokLightbox({
                              videoId: post.postId,
                              title: watchTitle,
                            });
                          }
                        }}
                      >
                        Play
                      </button>
                      <Link href={`/post/${post._id}`}>Breakdown</Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {showResults && posts?.length === 0 ? (
        <div className="empty-outliers">
          <p className="content-note">
            {(igSearchSummary?.count ?? 0) > 0
              ? `Found ${igSearchSummary!.count} niche Reel${igSearchSummary!.count === 1 ? "" : "s"}; none reached 2× baseline.`
              : "No breakout posts above 2x baseline."}
          </p>
          <TryBrandChips
            disabled={scanInProgress}
            rowClassName="empty-try-row"
            onSelectHost={setBrandUrl}
          />
        </div>
      ) : null}

      <ConvexHealthNotice />

      <TikTokLightbox target={tiktokLightbox} onClose={() => setTiktokLightbox(null)} />
      <InstagramLightbox
        target={instagramLightbox}
        onClose={() => setInstagramLightbox(null)}
      />
    </SiteShell>
  );
}
