"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { convex } from "./ConvexClientProvider";
import { isBrightDataTikTokBlockMessage } from "@/lib/scraperErrorHints";
import { TRY_BRAND_URLS } from "@/lib/site-constants";
import {
  sanitizeTikTokWebUrl,
  tiktokProfileUrl,
  tiktokVideoUrl,
} from "@/convex/lib/tiktokUrls";
import { TikTokExternalLink } from "@/components/tiktok-external-link";
import { SiteShell } from "@/components/site-shell";
import { ScanStatus } from "@/components/scan-status";
import { LandingBelowFold } from "@/components/landing-below-fold";
import { formatMultiplier, formatViews } from "@/lib/formatMetrics";

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

function formatFans(fans: number): string {
  if (fans >= 1_000_000) {
    return `${(fans / 1_000_000).toFixed(1)}M`;
  }
  if (fans >= 1_000) {
    return `${(fans / 1_000).toFixed(1)}K`;
  }
  return String(fans);
}

export function HomeClient() {
  const [brandUrl, setBrandUrl] = useState("");
  const [brandId, setBrandId] = useState<Id<"brands"> | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stepBusy, setStepBusy] = useState(false);
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([]);
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
  const searchConfirmedCompetitors = useMutation(
    api.scanJobs.searchConfirmedCompetitors,
  );
  const abandonScan = useMutation(api.scanJobs.abandonScan);

  const brand = useQuery(api.brands.getBrand, brandId ? { brandId } : "skip");
  const job = useQuery(
    api.scanJobs.latestByBrand,
    brandId ? { brandId } : "skip",
  );
  const handles = useQuery(
    api.handles.listByBrand,
    brandId ? { brandId } : "skip",
  );
  const posts = useQuery(
    api.posts.rankedByBrand,
    brandId ? { brandId, limit: 40 } : "skip",
  );

  const proposedAccounts = job?.proposedAccounts ?? [];
  const siteLinkedAccounts = useMemo(
    () =>
      proposedAccounts.filter(
        (account) =>
          account.source !== "niche" && account.foundVia === "site",
      ),
    [proposedAccounts],
  );
  const suggestedAccounts = useMemo(
    () =>
      proposedAccounts.filter(
        (account) =>
          account.source !== "niche" &&
          (account.foundVia === "search" || !account.foundVia),
      ),
    [proposedAccounts],
  );
  const nicheAccounts = useMemo(
    () => proposedAccounts.filter((account) => account.source === "niche"),
    [proposedAccounts],
  );

  const renderAccountRow = (account: (typeof proposedAccounts)[number]) => (
    <li key={account.handle}>
      <label>
        <input
          type="checkbox"
          checked={selectedCompetitors.includes(account.handle)}
          onChange={() => toggleCompetitor(account.handle)}
        />
        <span className="competitor-account">
          <span>{account.name}</span>
          <span className="competitor-handle">
            <TikTokExternalLink
              href={tiktokProfileUrl(account.handle)}
              onClick={(event) => event.stopPropagation()}
            >
              @{account.handle}
            </TikTokExternalLink>
            {account.verified ? " · verified" : ""}
            {account.fans ? ` · ${formatFans(account.fans)} followers` : ""}
          </span>
        </span>
      </label>
    </li>
  );

  useEffect(() => {
    if (job?.proposedAccounts?.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from server list
      setSelectedCompetitors(
        job.proposedAccounts.map((account) => account.handle),
      );
      return;
    }
    if (job?.proposedCompetitors?.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from server list
      setSelectedCompetitors([...job.proposedCompetitors]);
    }
  }, [job?.proposedAccounts, job?.proposedCompetitors]);

  const handleById = useMemo(() => {
    const map = new Map<
      string,
      NonNullable<typeof handles>[number]
    >();
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
  const isLanding = !brandId || job == null;
  const showToolLabel = Boolean(brandId && job && scanInProgress);

  const onScan = useCallback(async () => {
    if (!convex || !brandUrl.trim()) return;
    setScanError(null);
    setSubmitting(true);
    try {
      const result = await startFromUrl({ url: brandUrl.trim() });
      if (!mountedRef.current) return;
      setBrandId(result.brandId);
    } catch (err) {
      if (!mountedRef.current) return;
      const message = err instanceof Error ? err.message : "Scan could not start";
      setScanError(message);
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  }, [brandUrl, startFromUrl]);

  const clearHomeState = useCallback(() => {
    setBrandUrl("");
    setBrandId(null);
    setScanError(null);
    setSelectedCompetitors([]);
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

  const onSearchTikTok = useCallback(async () => {
    if (!job) return;
    setScanError(null);
    setStepBusy(true);
    try {
      await searchConfirmedCompetitors({
        jobId: job._id,
        competitors: selectedCompetitors,
      });
    } catch (err) {
      if (!mountedRef.current) return;
      const message =
        err instanceof Error ? err.message : "Could not start TikTok search";
      setScanError(message);
    } finally {
      if (mountedRef.current) {
        setStepBusy(false);
      }
    }
  }, [job, searchConfirmedCompetitors, selectedCompetitors]);

  const toggleCompetitor = (name: string) => {
    setSelectedCompetitors((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const canScan = Boolean(
    convex && brandUrl.trim() && !submitting && !scanInProgress,
  );

  const showBrandSummary =
    brand &&
    job &&
    job.stage !== "queued" &&
    job.stage !== "understand_site" &&
    (job.stage === "find_competitors" ||
      job.stage === "review_competitors" ||
      job.stage === "search_tiktok" ||
      job.stage === "score" ||
      jobFailed);

  const showFailedCompetitorList =
    jobFailed &&
    ((job?.proposedAccounts?.length ?? 0) > 0 ||
      (job?.proposedCompetitors?.length ?? 0) > 0);

  const canCancelScan =
    !jobFailed &&
    (isRunning || job?.status === "waiting");

  const showResults = job?.status === "completed" && !isRunning;

  const showScanStatus = Boolean(
    job && (isRunning || job.status === "waiting"),
  );

  const showJobPanel = Boolean(
    brandId && job && job.status !== "completed",
  );

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
              The organic signal layer for AI content tools.
            </div>
            <h1 className="content-h1">
              Viral <em>Radar</em>
            </h1>
            <p className="content-lede">
              Templates recycle. Outliers break out. We find what is actually
              working in your niche right now, scored against each account&apos;s
              own baseline, not raw views.
            </p>
          </div>
        ) : showToolLabel ? (
          <p className="content-eyebrow tool-mode-label">Scan in progress</p>
        ) : null}

        <div className="form-meta">
          <div className="url-scan-row">
            <div className="field">
              <label htmlFor="brand-url" className="sr-only">
                Brand URL
              </label>
              <input
                id="brand-url"
                name="brandUrl"
                type="url"
                placeholder="gymshark.com"
                value={brandUrl}
                onChange={(event) => setBrandUrl(event.target.value)}
              />
            </div>
            <button
              type="button"
              disabled={!canScan}
              onClick={() => void onScan()}
              className="btn btn-solid url-scan-btn"
              aria-busy={submitting || isRunning}
            >
              {submitting || isRunning ? "Scanning…" : "Scan"}
            </button>
          </div>

          {isLanding ? (
            <div className="input-helper">
              <p className="content-note">
                Paste a brand URL. Confirm competitors. We rank breakout posts.
              </p>
              <div className="try-row">
                <span className="try-label">Try:</span>
                {TRY_BRAND_URLS.map((url) => (
                  <button
                    key={url}
                    type="button"
                    className="try-chip"
                    disabled={scanInProgress}
                    onClick={() => setBrandUrl(url)}
                  >
                    {url.replace(/^https:\/\//, "")}
                  </button>
                ))}
              </div>
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
              <h2 className="panel-h2">{brand.name}</h2>
              <p className="panel-body">
                <span className="text-muted">Niche:</span> {brand.niche}
              </p>
              {brand.positioning ? (
                <p className="panel-body">{brand.positioning}</p>
              ) : null}
            </div>
          ) : null}

          {job.status === "waiting" && job.stage === "review_competitors" ? (
            <div className="panel-divider">
              <p className="content-note text-left">
                Confirm these are the right accounts, then Search TikTok.
                Uncheck any handle you do not want scraped.
              </p>
              {proposedAccounts.length > 0 ? (
                <>
                  {siteLinkedAccounts.length > 0 ? (
                    <>
                      <p className="competitor-group-label">Linked on their site</p>
                      <ul className="competitor-list">
                        {siteLinkedAccounts.map(renderAccountRow)}
                      </ul>
                    </>
                  ) : null}
                  {suggestedAccounts.length > 0 ? (
                    <>
                      <p className="competitor-group-label">Suggested accounts</p>
                      <ul className="competitor-list">
                        {suggestedAccounts.map(renderAccountRow)}
                      </ul>
                    </>
                  ) : null}
                  {nicheAccounts.length > 0 ? (
                    <>
                      <p className="competitor-group-label">Niche creators</p>
                      <ul className="competitor-list">
                        {nicheAccounts.map(renderAccountRow)}
                      </ul>
                    </>
                  ) : null}
                </>
              ) : null}
              {(job.competitorsWithoutTikTok ?? []).length > 0 ? (
                <div className="panel-divider">
                  <p className="competitor-group-label">No TikTok account found</p>
                  <ul className="competitor-list">
                    {job.competitorsWithoutTikTok!.map((name) => (
                      <li key={name} className="panel-body">
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {showFailedCompetitorList ? (
            <ul className="competitor-list panel-divider">
              <li className="content-note list-plain">
                Competitors considered:
              </li>
              {(job.proposedAccounts ?? []).length > 0
                ? job.proposedAccounts!.map((account) => (
                    <li key={account.handle} className="panel-body">
                      {account.name}{" "}
                      <TikTokExternalLink href={tiktokProfileUrl(account.handle)}>
                        @{account.handle}
                      </TikTokExternalLink>
                    </li>
                  ))
                : (job.proposedCompetitors ?? []).map((name) => (
                    <li key={name} className="panel-body">
                      {name}
                    </li>
                  ))}
            </ul>
          ) : null}

          {jobFailed && job.error ? (
            <div className="panel-divider">
              <p className="error-text">{job.error}</p>
              {isBrightDataTikTokBlockMessage(job.error) ? (
                <p className="content-note text-left">
                  Complete Bright Data KYC for your Browser zone, then run Scan
                  again and search TikTok when approved.
                </p>
              ) : null}
            </div>
          ) : null}

          {(job.status === "waiting" && job.stage === "review_competitors") ||
          canCancelScan ? (
            <div className="actions-row">
              {job.status === "waiting" && job.stage === "review_competitors" ? (
                <button
                  type="button"
                  disabled={stepBusy || selectedCompetitors.length === 0}
                  onClick={() => void onSearchTikTok()}
                  className="btn btn-solid btn-hero"
                  aria-busy={stepBusy}
                >
                  {stepBusy ? "Starting…" : "Search TikTok"}
                </button>
              ) : null}
              {canCancelScan ? (
                <button
                  type="button"
                  disabled={stepBusy}
                  onClick={() => void resetHome()}
                  className="btn btn-ghost"
                >
                  Cancel scan
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {showResults && posts && posts.length > 0 ? (
        <section className="outlier-section">
          <h2 className="content-h2">Outlier posts</h2>
          <ul className="post-list">
            {posts.map((post) => {
              const handle = handleById.get(post.handleId);
              return (
                <li key={post._id} className="post-row">
                  {post.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.thumbnail}
                      alt=""
                      className="post-thumb"
                    />
                  ) : (
                    <div className="post-thumb-placeholder" />
                  )}
                  <div className="post-body">
                    <div className="post-meta">
                      <span className="post-handle">
                        {handle?.handle ? (
                          <TikTokExternalLink
                            href={tiktokProfileUrl(handle.handle)}
                          >
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
                      <span className="post-views">
                        {formatViews(post.views)} views
                      </span>
                    </div>
                    <p className="post-caption">
                      {post.caption || "No caption"}
                    </p>
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
        <p className="content-note">
          Scan finished but no scored outlier posts yet. Accounts need at least
          five videos for a baseline.
        </p>
      ) : null}

      {isLanding ? <LandingBelowFold /> : null}

      <ConvexHealthNotice />
    </SiteShell>
  );
}
