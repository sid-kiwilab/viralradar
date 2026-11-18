"use client";

import { useEffect, useState } from "react";
import { stageLabel } from "@/lib/stageLabel";
import {
  isTikTokWaitDetail,
  pickTikTokJokeLine,
  TIKTOK_WAIT_A11Y_LABEL,
  TIKTOK_WAIT_DETAIL,
} from "@/lib/tiktok-wait";

const STAGES = [
  { id: "site", label: "Site" },
  { id: "tiktok", label: "TikTok" },
  { id: "score", label: "Score" },
] as const;

const JOKE_ROTATE_MS = 12_000;

function TikTokJokeLine() {
  const [jokeLine, setJokeLine] = useState(() => pickTikTokJokeLine());

  useEffect(() => {
    const id = window.setInterval(() => {
      setJokeLine((prev) => pickTikTokJokeLine(prev));
    }, JOKE_ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  return <span aria-hidden="true">{jokeLine}</span>;
}

function stageIndex(stage: string): number {
  switch (stage) {
    case "queued":
    case "understand_site":
      return 0;
    case "search_tiktok":
      return 1;
    case "score":
    case "done":
      return 2;
    case "failed":
      return -1;
    default:
      return 0;
  }
}

export function ScanStatus({
  stage,
  status,
  detail,
}: {
  stage: string;
  status: string;
  detail?: string | null;
}) {
  const isRunning = status === "pending" || status === "running";
  const isWaiting = status === "waiting";
  const activeIdx = stageIndex(stage);
  const allStagesDone = activeIdx >= STAGES.length;
  const staticLabel = stageLabel(stage, status, detail);
  const showJokes = isRunning && isTikTokWaitDetail(detail);

  const motionClass =
    isRunning ? "scan-status is-running" : isWaiting ? "scan-status is-waiting" : "scan-status";

  const statusLineKey = showJokes ? "tiktok-wait-jokes" : staticLabel;

  return (
    <div className={motionClass} aria-busy={isRunning}>
      <div className="scan-status-visual">
        <div className="radar-disc" aria-hidden>
          <span className="radar-ring radar-ring-1" />
          <span className="radar-ring radar-ring-2" />
          <span className="radar-ring radar-ring-3" />
          <span className="radar-sweep" />
          <span className="radar-core" />
        </div>
      </div>

      <ul className="scan-stage-chips" aria-label="Scan progress">
        {STAGES.map((s, i) => (
          <li
            key={s.id}
            className={
              activeIdx < 0
                ? "scan-stage-chip"
                : allStagesDone || i < activeIdx
                  ? "scan-stage-chip is-done"
                  : i === activeIdx
                    ? "scan-stage-chip is-active"
                    : "scan-stage-chip"
            }
          >
            {s.label}
          </li>
        ))}
      </ul>

      <p className="scan-status-text" key={statusLineKey}>
        {isRunning ? <span className="scan-live-dot" aria-hidden /> : null}
        {showJokes ? (
          <>
            <span className="sr-only" aria-live="polite">
              {TIKTOK_WAIT_A11Y_LABEL}
            </span>
            <TikTokJokeLine key={detail?.trim() ?? TIKTOK_WAIT_DETAIL} />
          </>
        ) : (
          <span aria-live="polite">{staticLabel}</span>
        )}
      </p>
    </div>
  );
}
