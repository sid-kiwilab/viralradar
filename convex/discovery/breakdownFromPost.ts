"use node";

import { createOpenRouterClient } from "../lib/openrouter";
import { chatJson } from "../lib/llmJson";

export type BreakdownContext = {
  post: {
    caption: string;
    duration: number;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    outlierScore?: number;
    soundId?: string;
  };
  brand: {
    name: string;
    niche: string;
    positioning?: string;
  };
  handle: {
    handle: string;
    displayName?: string;
  };
  baselineViews?: number;
  siblings: Array<{
    caption: string;
    duration: number;
    views: number;
    outlierScore?: number;
  }>;
};

export type BreakdownBrief = {
  hook: string;
  format: string;
  pacing: string;
  captionPattern: string;
  whyItWorked: string;
  paidAdaptation: string;
};

const SYSTEM = `You extract a structural creative brief from TikTok post metadata only. You did NOT watch the video — no frames, no cuts, no on-screen text beyond what appears in the caption field.

Rules:
- Ground claims in caption text, duration (seconds), engagement counts, outlier score vs baseline, and contrast with sibling posts on the same account.
- For hook, format, and pacing: infer cautiously from caption + duration + siblings. If visuals are unclear, say "likely" or note "not observed in metadata".
- whyItWorked: explain why this post beat the account baseline using evidence (score, views vs baseline, caption/hook pattern vs typical sibling captions).
- paidAdaptation: one concrete brief for the scanned brand (name/niche in payload) to adapt the STRUCTURE — same hook rhythm and caption pattern — with their product/story. Do NOT instruct copying the source video or creator likeness.
- Each field: 1–3 short sentences or a compact bullet line. Plain language for a performance marketer.

Return JSON keys: hook, format, pacing, captionPattern, whyItWorked, paidAdaptation (all strings).`;

export async function inferBreakdownFromPost(
  context: BreakdownContext,
): Promise<{ brief: BreakdownBrief; rawModelOutput: string }> {
  const client = createOpenRouterClient();
  const userPayload = JSON.stringify(context);
  const brief = await chatJson<BreakdownBrief>(client, SYSTEM, userPayload);
  validateBrief(brief);
  return { brief, rawModelOutput: JSON.stringify(brief) };
}

function validateBrief(brief: BreakdownBrief): void {
  const keys: (keyof BreakdownBrief)[] = [
    "hook",
    "format",
    "pacing",
    "captionPattern",
    "whyItWorked",
    "paidAdaptation",
  ];
  for (const key of keys) {
    if (!brief[key]?.trim()) {
      throw new Error(`Model returned empty breakdown field: ${key}`);
    }
  }
}
