"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { convex } from "./ConvexClientProvider";
import { isBrightDataTikTokBlockMessage } from "@/lib/scraperErrorHints";
import {
  DEFAULT_TRY_BRAND_INPUT,
  isInstantTryBrandInput,
  TRY_BRAND_URLS,
} from "@/lib/demo-brands";
import { MAX_COMPETITOR_BRANDS } from "@/lib/demo-limits";
import { PostThumbnail } from "@/components/post-thumbnail";
import { tiktokProfileUrl } from "@/convex/lib/tiktokUrls";
import {
  TikTokLightbox,
  type TikTokLightboxTarget,
} from "@/components/tiktok-lightbox";
import { TikTokExternalLink } from "@/components/tiktok-external-link";
import { SiteShell } from "@/components/site-shell";
import { ScanStatus } from "@/components/scan-status";
import { isTikTokWaitUiDetail } from "@/lib/tiktok-wait";
import { WalkthroughSlot } from "@/components/walkthrough-slot";
import { formatMultiplier, formatPostDate, formatViews } from "@/lib/formatMetrics";
import {
  formatDiscoverTimings,
  formatUnderstandTimings,
} from "@/lib/formatTimings";

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
  const [brandId, setBrandId] = useState<Id<"brands"> | null>(null);
  const [jobId, setJobId] = useState<Id<"scanJobs"> | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stepBusy, setStepBusy] = useState(false);
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([]);
  const [selectedBrandCompetitors, setSelectedBrandCompetitors] = useState<
    string[]
  >([]);
  const [lightboxTarget, setLightboxTarget] =
    useState<TikTokLightboxTarget | null>(null);
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
  const rerunBrandRead = useMutation(api.scanJobs.rerunBrandRead);
  const continueAfterBrand = useMutation(api.scanJobs.continueAfterBrand);
  const rerunCompetitorFind = useMutation(api.scanJobs.rerunCompetitorFind);
  const continueAfterCompetitorBrands = useMutation(
    api.scanJobs.continueAfterCompetitorBrands,
  );
  const abandonScan = useMutation(api.scanJobs.abandonScan);

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

  const proposedAccounts = useMemo(
    () =>
      (job?.proposedAccounts ?? []).filter(
        (account) => account.source !== "niche",
      ),
    [job?.proposedAccounts],
  );
  const siteLinkedAccounts = useMemo(
    () =>
      proposedAccounts.filter((account) => account.foundVia === "site"),
    [proposedAccounts],
  );
  const suggestedAccounts = useMemo(
    () =>
      proposedAccounts.filter(
        (account) => account.foundVia === "search" || !account.foundVia,
      ),
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
    setSelectedCompetitors([]);
  }, [job?.proposedAccounts]);

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
  const isLanding = brandId == null && jobId == null;
  const showToolLabel = Boolean(brandId && job && scanInProgress);
  const showSessionLoading = pinPending || submitting;

  const onScan = useCallback(async () => {
    if (!convex || !brandUrl.trim()) return;
    setScanError(null);
    setLightboxTarget(null);
    setSubmitting(true);
    try {
      const result = await startFromUrl({ url: brandUrl.trim() });
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
  }, [brandUrl, startFromUrl]);

  const closeLightbox = useCallback(() => setLightboxTarget(null), []);

  const clearHomeState = useCallback(() => {
    setBrandUrl(DEFAULT_TRY_BRAND_INPUT);
    setBrandId(null);
    setJobId(null);
    setScanError(null);
    setSelectedCompetitors([]);
    setSelectedBrandCompetitors([]);
    setLightboxTarget(null);
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

  const onBrandReviewStage =
    job?.status === "waiting" && job.stage === "review_brand";
  const onCompetitorBrandReviewStage =
    job?.status === "waiting" && job.stage === "review_competitor_brands";

  const brandInference = useQuery(
    api.brandInferences.latestByJob,
    jobId && onBrandReviewStage ? { jobId } : "skip",
  );
  const competitorDiscovery = useQuery(
    api.competitorDiscoveries.latestByJob,
    jobId && onCompetitorBrandReviewStage ? { jobId } : "skip",
  );

  useEffect(() => {
    if (!onCompetitorBrandReviewStage) {
      return;
    }
    const names = competitorDiscovery?.competitors.map((c) => c.name) ?? [];
    if (names.length === 0) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from server list
    setSelectedBrandCompetitors(names);
  }, [onCompetitorBrandReviewStage, competitorDiscovery?.competitors]);

  const onRereadBrand = useCallback(async () => {
    if (!job) return;
    setScanError(null);
    setStepBusy(true);
    try {
      await rerunBrandRead({ jobId: job._id });
    } catch (err) {
      if (!mountedRef.current) return;
      const message =
        err instanceof Error ? err.message : "Could not re-read the brand site";
      setScanError(message);
    } finally {
      if (mountedRef.current) {
        setStepBusy(false);
      }
    }
  }, [job, rerunBrandRead]);

  const onContinueAfterBrand = useCallback(async () => {
    if (!job) return;
    setScanError(null);
    setStepBusy(true);
    try {
      await continueAfterBrand({ jobId: job._id });
    } catch (err) {
      if (!mountedRef.current) return;
      const message =
        err instanceof Error ? err.message : "Could not find competitors";
      setScanError(message);
    } finally {
      if (mountedRef.current) {
        setStepBusy(false);
      }
    }
  }, [job, continueAfterBrand]);

  const onRerunCompetitorFind = useCallback(async () => {
    if (!job) return;
    setScanError(null);
    setStepBusy(true);
    try {
      await rerunCompetitorFind({ jobId: job._id });
    } catch (err) {
      if (!mountedRef.current) return;
      const message =
        err instanceof Error ? err.message : "Could not find competitors again";
      setScanError(message);
    } finally {
      if (mountedRef.current) {
        setStepBusy(false);
      }
    }
  }, [job, rerunCompetitorFind]);

  const onContinueAfterCompetitorBrands = useCallback(async () => {
    if (!job) return;
    setScanError(null);
    setStepBusy(true);
    try {
      await continueAfterCompetitorBrands({
        jobId: job._id,
        competitorNames: selectedBrandCompetitors,
      });
    } catch (err) {
      if (!mountedRef.current) return;
      const message =
        err instanceof Error ? err.message : "Could not look up accounts";
      setScanError(message);
    } finally {
      if (mountedRef.current) {
        setStepBusy(false);
      }
    }
  }, [job, continueAfterCompetitorBrands, selectedBrandCompetitors]);

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

  const toggleBrandCompetitor = (name: string) => {
    setSelectedBrandCompetitors((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const allProposedHandles = useMemo(
    () => proposedAccounts.map((account) => account.handle),
    [proposedAccounts],
  );

  const selectAllProposed = () => {
    setSelectedCompetitors([...allProposedHandles]);
  };

  const deselectAllProposed = () => {
    setSelectedCompetitors([]);
  };

  const onConfirmStage =
    job?.status === "waiting" && job.stage === "review_competitors";
  const lookupAccountsLabel =
    selectedBrandCompetitors.length === 1
      ? "Look up 1 account"
      : `Look up ${selectedBrandCompetitors.length} accounts`;
  const searchAccountsLabel =
    selectedCompetitors.length === 1
      ? "Search 1 TikTok account"
      : `Search ${selectedCompetitors.length} TikTok accounts`;

  const canScan = Boolean(
    convex && brandUrl.trim() && !submitting && !scanInProgress,
  );
  const isFastScanUrl = isInstantTryBrandInput(brandUrl);
  const scanButtonLabel =
    submitting || isRunning
      ? "Scanning…"
      : isFastScanUrl
        ? "Fast scan"
        : "Scan";

  const showBrandSummary =
    brand &&
    job &&
    job.stage !== "queued" &&
    job.stage !== "understand_site" &&
    (job.stage === "find_competitors" ||
      job.stage === "review_competitor_brands" ||
      job.stage === "find_handles" ||
      job.stage === "review_competitors" ||
      job.stage === "search_tiktok" ||
      job.stage === "score" ||
      jobFailed) &&
    !onBrandReviewStage &&
    !onCompetitorBrandReviewStage;

  const showFailedCompetitorList =
    jobFailed &&
    ((job?.proposedAccounts?.length ?? 0) > 0 ||
      (job?.proposedCompetitors?.length ?? 0) > 0);

  const canCancelScan =
    !jobFailed &&
    (isRunning || job?.status === "waiting");

  const showResults =
    job?.status === "completed" && !isRunning && !submitting;

  const isScrapingTikTok = Boolean(
    job &&
      (job.stage === "search_tiktok" || job.stage === "score") &&
      (job.status === "running" || job.status === "pending"),
  );

  const pendingScrapeSkeletons = useMemo(() => {
    const confirmed = job?.confirmedHandles ?? [];
    if (confirmed.length === 0) {
      return 0;
    }
    const done = new Set(
      (job?.scrapeHandlesCompleted ?? []).map((handle) =>
        handle.toLowerCase(),
      ),
    );
    return confirmed.filter((handle) => !done.has(handle.toLowerCase())).length;
  }, [job?.confirmedHandles, job?.scrapeHandlesCompleted]);

  const showOutlierSection = Boolean(
    brandId && (showResults || isScrapingTikTok) && posts !== undefined,
  );

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
              Winning organic formats in your niche that AI can recreate.
            </div>
            <h1 className="content-h1">
              Viral <em>Radar</em>
            </h1>
            <p className="content-lede">
              Outlier TikTok posts, scored for whether AI can recreate them.
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
            className="url-scan-row"
            onSubmit={(event) => {
              event.preventDefault();
              if (canScan) {
                void onScan();
              }
            }}
          >
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
                placeholder="duolingo.com"
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
          </form>

          {isLanding ? (
            <div className="input-helper">
              <p className="content-note">
                Paste a brand URL. Confirm competitors. See outlier posts.
              </p>
              <TryBrandChips
                disabled={scanInProgress}
                onSelectHost={setBrandUrl}
              />
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
            <>
              <ScanStatus
                stage={job.stage}
                status={job.status}
                detail={job.detail}
              />
              {job.stage === "find_competitors" &&
              (job.status === "running" || job.status === "pending") ? (
                <p className="content-note demo-limit-note">
                  Demo: we look up at most {MAX_COMPETITOR_BRANDS} competitor
                  brands per scan.
                </p>
              ) : null}
            </>
          ) : null}

          {showBrandSummary && brand ? (
            <div className="panel-divider">
              <h2 className="panel-h2">{brand.name}</h2>
              <p className="panel-body">
                <span className="text-muted">Niche:</span> {brand.niche}
              </p>
              {brand.positioning && !onConfirmStage ? (
                <p className="panel-body">{brand.positioning}</p>
              ) : null}
            </div>
          ) : null}

          {onBrandReviewStage ? (
            <div className="panel-divider brand-review">
              {brandInference === undefined ? (
                <p className="content-note">Loading understanding…</p>
              ) : brandInference ? (
                <>
                  <h2 className="panel-h2">{brandInference.name}</h2>
                  <p className="content-note brand-review-timing">
                    {formatUnderstandTimings({
                      pageReadMs: brandInference.pageReadMs,
                      inferMs: brandInference.inferMs,
                      understandMs: brandInference.understandMs,
                    })}
                  </p>
                  <dl className="brand-review-fields">
                    <div>
                      <dt className="text-muted">Niche</dt>
                      <dd>{brandInference.niche}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Service</dt>
                      <dd>{brandInference.service}</dd>
                    </div>
                    {brandInference.products.length > 0 ? (
                      <div>
                        <dt className="text-muted">Products</dt>
                        <dd>
                          <ul className="brand-review-products">
                            {brandInference.products.map((product) => (
                              <li key={product}>{product}</li>
                            ))}
                          </ul>
                        </dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="text-muted">Audience</dt>
                      <dd>{brandInference.audience}</dd>
                    </div>
                    {brandInference.positioning ? (
                      <div>
                        <dt className="text-muted">Positioning</dt>
                        <dd>{brandInference.positioning}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="text-muted">Not this</dt>
                      <dd>{brandInference.notThis}</dd>
                    </div>
                  </dl>
                </>
              ) : brand ? (
                <>
                  <h2 className="panel-h2">{brand.name}</h2>
                  <p className="panel-body">
                    <span className="text-muted">Niche:</span> {brand.niche}
                  </p>
                  {brand.positioning ? (
                    <p className="panel-body">{brand.positioning}</p>
                  ) : null}
                  <p className="content-note">
                    Saved understanding is missing. Use Read again.
                  </p>
                </>
              ) : (
                <p className="content-note">Loading understanding…</p>
              )}
            </div>
          ) : null}

          {onCompetitorBrandReviewStage ? (
            <div className="panel-divider brand-review">
              {competitorDiscovery === undefined ? (
                <p className="content-note">Loading competitors…</p>
              ) : competitorDiscovery ? (
                <>
                  <p className="content-note text-left">
                    Confirm direct competitors for {brand?.name ?? "this brand"}.
                    Uncheck any brand you do not want us to look up on TikTok.
                  </p>
                  <p className="content-note text-left">
                    {competitorDiscovery.notice ??
                      (competitorDiscovery.source === "serp"
                        ? "Competitors from Google search."
                        : "Competitors from model list (Google search not configured on Convex).")}
                  </p>
                  <p className="content-note brand-review-timing">
                    {formatDiscoverTimings({
                      queryMs: competitorDiscovery.queryMs,
                      serpMs: competitorDiscovery.serpMs,
                      extractMs: competitorDiscovery.extractMs,
                      discoverMs: competitorDiscovery.discoverMs,
                    })}
                  </p>
                  <ul className="competitor-list">
                    {competitorDiscovery.competitors.map((competitor) => (
                      <li key={competitor.name}>
                        <label>
                          <input
                            type="checkbox"
                            checked={selectedBrandCompetitors.includes(
                              competitor.name,
                            )}
                            onChange={() =>
                              toggleBrandCompetitor(competitor.name)
                            }
                          />
                          <span className="competitor-account">
                            <span>{competitor.name}</span>
                            {competitor.website ? (
                              <span className="competitor-handle">
                                <a
                                  href={competitor.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {competitor.website.replace(/^https:\/\//, "")}
                                </a>
                              </span>
                            ) : null}
                            {competitor.reason ? (
                              <span className="content-note competitor-reason">
                                {competitor.reason}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="content-note">
                  Saved competitor list is missing. Use Find again.
                </p>
              )}
            </div>
          ) : null}

          {onConfirmStage ? (
            <div className="panel-divider">
              <p className="content-note text-left">
                Confirm competitor TikTok accounts for {brand?.name ?? "this brand"}{" "}
                ({brand?.niche ?? "niche"}). Uncheck any handle you do not want
                scraped.
              </p>
              {proposedAccounts.length > 0 ? (
                <>
                  <div className="account-select-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-compact"
                      onClick={selectAllProposed}
                      disabled={allProposedHandles.length === 0}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-compact"
                      onClick={deselectAllProposed}
                      disabled={selectedCompetitors.length === 0}
                    >
                      Deselect all
                    </button>
                  </div>
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
                </>
              ) : (
                <p className="panel-body">
                  No competitor TikTok accounts found.
                </p>
              )}
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

          {onConfirmStage ? (
            <p className="confirm-disclaimer content-note text-left panel-divider">
              We scan TikTok only. Accounts without a handle are skipped.
              Breakdowns use caption, duration, and baseline, not the video.
            </p>
          ) : null}

          {onBrandReviewStage ? (
            <div className="actions-row">
              <button
                type="button"
                disabled={stepBusy}
                onClick={() => void onRereadBrand()}
                className="btn btn-ghost"
                aria-busy={stepBusy}
              >
                {stepBusy ? "Working…" : "Read again"}
              </button>
              <button
                type="button"
                disabled={stepBusy || !brandInference}
                onClick={() => void onContinueAfterBrand()}
                className="btn btn-solid btn-hero"
                aria-busy={stepBusy}
              >
                {stepBusy ? "Starting…" : "Find competitors"}
              </button>
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

          {onCompetitorBrandReviewStage ? (
            <div className="actions-row">
              <button
                type="button"
                disabled={stepBusy}
                onClick={() => void onRerunCompetitorFind()}
                className="btn btn-ghost"
                aria-busy={stepBusy}
              >
                {stepBusy ? "Working…" : "Find again"}
              </button>
              <button
                type="button"
                disabled={
                  stepBusy ||
                  !competitorDiscovery ||
                  selectedBrandCompetitors.length === 0
                }
                onClick={() => void onContinueAfterCompetitorBrands()}
                className="btn btn-solid btn-hero"
                aria-busy={stepBusy}
              >
                {stepBusy ? "Starting…" : lookupAccountsLabel}
              </button>
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

          {onConfirmStage || (canCancelScan && !onBrandReviewStage && !onCompetitorBrandReviewStage) ? (
            <div className="actions-row">
              {onConfirmStage && proposedAccounts.length > 0 ? (
                <button
                  type="button"
                  disabled={stepBusy || selectedCompetitors.length === 0}
                  onClick={() => void onSearchTikTok()}
                  className="btn btn-solid btn-hero"
                  aria-busy={stepBusy}
                >
                  {stepBusy ? "Starting…" : searchAccountsLabel}
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

      {isScrapingTikTok &&
      job?.detail &&
      !isTikTokWaitUiDetail(job.detail) ? (
        <p className="content-note scrape-progress-note">{job.detail}</p>
      ) : null}

      {showResults && job?.detail ? (
        <p className="content-note scrape-partial-note">{job.detail}</p>
      ) : null}

      {showOutlierSection &&
      ((posts?.length ?? 0) > 0 || pendingScrapeSkeletons > 0) ? (
        <section className="outlier-section">
          <h2 className="content-h2">Outlier posts</h2>
          <ul className="post-list">
            {(posts ?? []).map((post) => {
              const handle = handleById.get(post.handleId);
              const watchTitle = handle?.handle
                ? `@${handle.handle} on TikTok`
                : "TikTok video";
              return (
                <li key={post._id} className="post-row">
                  <button
                    type="button"
                    className="post-thumb-play"
                    onClick={() =>
                      setLightboxTarget({
                        videoId: post.postId,
                        title: watchTitle,
                      })
                    }
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
                    ) : null}
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
                        onClick={() =>
                          setLightboxTarget({
                            videoId: post.postId,
                            title: watchTitle,
                          })
                        }
                      >
                        Play
                      </button>
                      <Link href={`/post/${post._id}`}>Breakdown</Link>
                    </div>
                  </div>
                </li>
              );
            })}
            {Array.from({ length: pendingScrapeSkeletons }).map((_, index) => (
              <li key={`skeleton-${index}`} className="post-row post-row-skeleton">
                <div className="post-thumb-placeholder post-thumb-skeleton" />
                <div className="post-body">
                  <div className="skeleton-line skeleton-line-wide" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line skeleton-line-short" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {showResults && posts?.length === 0 ? (
        <div className="empty-outliers">
          <p className="content-note">
            No breakout posts above 2x baseline.
          </p>
          <TryBrandChips
            disabled={scanInProgress}
            rowClassName="empty-try-row"
            onSelectHost={setBrandUrl}
          />
        </div>
      ) : null}

      <ConvexHealthNotice />

      <TikTokLightbox target={lightboxTarget} onClose={closeLightbox} />
    </SiteShell>
  );
}
