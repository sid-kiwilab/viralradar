"use client";

import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { convex } from "./ConvexClientProvider";
import { isBrightDataTikTokBlockMessage } from "@/lib/scraperErrorHints";

const BRAND_STORAGE_KEY = "viralradar.brandId";

function ConvexHealthStatus() {
  const health = useQuery(api.health.get);
  if (health === undefined) {
    return <>Connecting to Convex…</>;
  }
  return health.ok ? <>Convex connected.</> : <>Convex query did not return ok.</>;
}

function stageLabel(
  stage: string,
  status: string,
  detail?: string | null,
): string {
  if (status === "waiting" && stage === "review_brand") {
    return "Review the brand summary below, then continue.";
  }
  if (status === "waiting" && stage === "review_competitors") {
    return "Do these look like the right competitors?";
  }
  if (status === "failed") {
    return "Scan failed.";
  }
  if (detail?.trim()) {
    return detail;
  }
  switch (stage) {
    case "queued":
      return "Starting scan…";
    case "understand_site":
      return "Reading the brand site…";
    case "find_competitors":
      return "Finding competitors…";
    case "search_tiktok":
      return "Searching TikTok…";
    case "score":
      return "Scoring outlier posts…";
    case "done":
      return "Scan complete.";
    case "failed":
      return "Scan failed.";
    default:
      return "Working…";
  }
}

function formatMultiplier(score: number): string {
  if (score >= 10) {
    return `${score.toFixed(1)}x`;
  }
  return `${score.toFixed(2)}x`;
}

function formatViews(views: number): string {
  if (views >= 1_000_000) {
    return `${(views / 1_000_000).toFixed(1)}M`;
  }
  if (views >= 1_000) {
    return `${(views / 1_000).toFixed(1)}K`;
  }
  return String(views);
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
    try {
      const stored = sessionStorage.getItem(BRAND_STORAGE_KEY);
      if (stored) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- external sessionStorage
        setBrandId(stored as Id<"brands">);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const startFromUrl = useMutation(api.brands.startFromUrl);
  const continueToCompetitors = useMutation(api.scanJobs.continueToCompetitors);
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

  useEffect(() => {
    if (job?.proposedCompetitors?.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from server list
      setSelectedCompetitors([...job.proposedCompetitors]);
    }
  }, [job?.proposedCompetitors]);

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

  const onScan = useCallback(async () => {
    if (!convex || !brandUrl.trim()) return;
    setScanError(null);
    setSubmitting(true);
    try {
      const result = await startFromUrl({ url: brandUrl.trim() });
      if (!mountedRef.current) return;
      setBrandId(result.brandId);
      try {
        sessionStorage.setItem(BRAND_STORAGE_KEY, result.brandId);
      } catch {
        // ignore
      }
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

  const onFindCompetitors = useCallback(async () => {
    if (!job) return;
    setScanError(null);
    setStepBusy(true);
    try {
      await continueToCompetitors({ jobId: job._id });
    } catch (err) {
      if (!mountedRef.current) return;
      const message =
        err instanceof Error ? err.message : "Could not continue scan";
      setScanError(message);
    } finally {
      if (mountedRef.current) {
        setStepBusy(false);
      }
    }
  }, [job, continueToCompetitors]);

  const onAbandonScan = useCallback(async () => {
    if (!job) return;
    setScanError(null);
    setStepBusy(true);
    try {
      await abandonScan({ jobId: job._id });
    } catch (err) {
      if (!mountedRef.current) return;
      const message =
        err instanceof Error ? err.message : "Could not cancel scan";
      setScanError(message);
    } finally {
      if (mountedRef.current) {
        setStepBusy(false);
      }
    }
  }, [job, abandonScan]);

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
    (job.stage === "review_brand" ||
      job.stage === "review_competitors" ||
      job.stage === "find_competitors" ||
      job.status === "completed" ||
      jobFailed ||
      isRunning);

  const showFailedCompetitorList =
    jobFailed && (job?.proposedCompetitors?.length ?? 0) > 0;

  const canCancelScan =
    !jobFailed &&
    (isRunning || job?.status === "waiting");

  const showResults = job?.status === "completed" && !isRunning;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-16 sm:px-8">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
          Viral Radar
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          Find organic outliers in your niche
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-zinc-400">
          Paste a brand URL. We read the site, you confirm competitors, then we
          search TikTok and rank breakout posts vs each account baseline.
        </p>
      </header>

      <div className="space-y-4">
        <label htmlFor="brand-url" className="sr-only">
          Brand URL
        </label>
        <input
          id="brand-url"
          name="brandUrl"
          type="url"
          placeholder="https://example.com"
          value={brandUrl}
          onChange={(event) => setBrandUrl(event.target.value)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 outline-none ring-zinc-600 focus:border-zinc-600 focus:ring-2"
        />
        <button
          type="button"
          disabled={!canScan}
          onClick={() => void onScan()}
          className="block rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 sm:inline-block"
        >
          {submitting || isRunning ? "Scanning…" : "Scan"}
        </button>
        {scanError ? (
          <p className="text-sm text-red-400" role="alert">
            {scanError}
          </p>
        ) : null}
      </div>

      {brandId && job ? (
        <section className="space-y-5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-5 py-5">
          <p className="text-sm leading-relaxed text-zinc-400">
            {stageLabel(job.stage, job.status, job.detail)}
          </p>

          {showBrandSummary && brand ? (
            <div className="space-y-3 border-t border-zinc-800 pt-4">
              <h2 className="text-lg font-medium text-zinc-100">{brand.name}</h2>
              <p className="text-sm text-zinc-400">
                <span className="text-zinc-500">Niche:</span> {brand.niche}
              </p>
              {brand.positioning ? (
                <p className="text-sm leading-relaxed text-zinc-300">
                  {brand.positioning}
                </p>
              ) : null}
            </div>
          ) : null}

          {job.status === "waiting" && job.stage === "review_competitors" ? (
            <div className="space-y-3 border-t border-zinc-800 pt-4">
              <p className="text-sm text-zinc-500">Select competitors to search on TikTok</p>
              <ul className="space-y-2.5">
                {(job.proposedCompetitors ?? []).map((name) => (
                  <li key={name}>
                    <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-200">
                      <input
                        type="checkbox"
                        checked={selectedCompetitors.includes(name)}
                        onChange={() => toggleCompetitor(name)}
                        className="h-4 w-4 rounded border-zinc-600 bg-zinc-900"
                      />
                      {name}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {showFailedCompetitorList ? (
            <ul className="space-y-2 border-t border-zinc-800 pt-4 text-sm text-zinc-400">
              <li className="text-zinc-500">Competitors considered:</li>
              {(job.proposedCompetitors ?? []).map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          ) : null}

          {jobFailed && job.error ? (
            <div className="space-y-3 border-t border-zinc-800 pt-4">
              <p className="text-sm leading-relaxed text-red-400">{job.error}</p>
              {isBrightDataTikTokBlockMessage(job.error) ? (
                <p className="text-sm leading-relaxed text-zinc-500">
                  Complete Bright Data KYC for your Browser zone, then run Scan
                  again and search TikTok when approved.
                </p>
              ) : null}
            </div>
          ) : null}

          {(job.status === "waiting" && job.stage === "review_brand") ||
          (job.status === "waiting" && job.stage === "review_competitors") ||
          canCancelScan ? (
            <div className="flex flex-col items-start gap-3 border-t border-zinc-800 pt-4">
              {job.status === "waiting" && job.stage === "review_brand" ? (
                <button
                  type="button"
                  disabled={stepBusy}
                  onClick={() => void onFindCompetitors()}
                  className="block rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-950 disabled:opacity-50"
                >
                  {stepBusy ? "Starting…" : "Find competitors"}
                </button>
              ) : null}
              {job.status === "waiting" && job.stage === "review_competitors" ? (
                <button
                  type="button"
                  disabled={stepBusy || selectedCompetitors.length === 0}
                  onClick={() => void onSearchTikTok()}
                  className="block rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-950 disabled:opacity-50"
                >
                  {stepBusy ? "Starting…" : "Search TikTok"}
                </button>
              ) : null}
              {canCancelScan ? (
                <button
                  type="button"
                  disabled={stepBusy}
                  onClick={() => void onAbandonScan()}
                  className="block py-1 text-sm text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline disabled:opacity-50"
                >
                  Cancel scan
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {showResults && posts && posts.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-zinc-100">Outlier posts</h2>
          <ul className="flex flex-col gap-4">
            {posts.map((post) => {
              const handle = handleById.get(post.handleId);
              return (
                <li
                  key={post._id}
                  className="flex gap-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3"
                >
                  {post.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.thumbnail}
                      alt=""
                      className="h-24 w-16 shrink-0 rounded object-cover bg-zinc-800"
                    />
                  ) : (
                    <div className="h-24 w-16 shrink-0 rounded bg-zinc-800" />
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium text-zinc-100">
                        @{handle?.handle ?? "tiktok"}
                      </span>
                      {post.outlierScore != null ? (
                        <span className="rounded bg-emerald-950/80 px-2 py-0.5 text-emerald-300">
                          {formatMultiplier(post.outlierScore)}
                        </span>
                      ) : null}
                      <span className="text-zinc-500">
                        {formatViews(post.views)} views
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm text-zinc-400">
                      {post.caption || "No caption"}
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
                      >
                        Open on TikTok
                      </a>
                      <Link
                        href={`/post/${post._id}`}
                        className="text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
                      >
                        Breakdown
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {showResults && posts?.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Scan finished but no scored outlier posts yet. Accounts need at least
          five videos for a baseline.
        </p>
      ) : null}

      <p className="text-sm text-zinc-500">
        {convex ? (
          <ConvexHealthStatus />
        ) : (
          "Set NEXT_PUBLIC_CONVEX_URL in .env.local (run npx convex dev)."
        )}
      </p>
    </main>
  );
}
