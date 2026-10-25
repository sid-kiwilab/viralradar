"use client";

import { stageLabel } from "@/lib/stageLabel";

const STAGES = [
  { id: "site", label: "Site" },
  { id: "competitors", label: "Competitors" },
  { id: "tiktok", label: "TikTok" },
  { id: "score", label: "Score" },
] as const;

function stageIndex(stage: string): number {
  switch (stage) {
    case "queued":
    case "understand_site":
      return 0;
    case "find_competitors":
    case "review_competitors":
      return 1;
    case "search_tiktok":
      return 2;
    case "score":
    case "done":
      return 3;
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
  const label = stageLabel(stage, status, detail);
  const motionClass =
    isRunning ? "scan-status is-running" : isWaiting ? "scan-status is-waiting" : "scan-status";

  return (
    <div className={motionClass} aria-live="polite" aria-busy={isRunning}>
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
                : i < activeIdx
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

      <p className="scan-status-text" key={label}>
        {isRunning ? <span className="scan-live-dot" aria-hidden /> : null}
        {label}
      </p>
    </div>
  );
}
