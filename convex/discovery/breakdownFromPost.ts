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
  recreatabilityScore: number;
  recreatabilityReason: string;
  confidence: "low" | "medium" | "high";
};

const SYSTEM = `You extract a structural creative brief from TikTok post metadata only. You did NOT watch the video: no frames, no cuts, no on-screen text beyond what appears in the caption field.

Rules:
- Ground claims in caption text, duration (seconds), engagement counts, outlier score vs baseline, and contrast with sibling posts on the same account.
- hook: infer from caption opening and any transformation shorthand in the caption only.
- format: NEVER describe visuals (no talking-head, screen recording, rapid-cut, B-roll, demo, rewatch loop). Only state duration in seconds vs sibling median duration, or write "Visual format not observed in metadata."
- pacing: NEVER describe edit rhythm or cuts. Only compare this post's duration (seconds) to sibling durations and what that implies for scroll commitment, or write "Pacing beyond duration not observed in metadata."
- captionPattern: contrast this caption's structure and hashtags vs typical sibling captions.
- whyItWorked: explain why this post beat the account baseline using evidence (score, views vs baseline, caption/hook pattern vs typical sibling captions).
- paidAdaptation: one concrete brief for the scanned brand (name/niche in payload) to adapt the STRUCTURE (same hook rhythm and caption pattern) with their product/story. Do NOT instruct copying the source video or creator likeness.
- Each brief field: at most 2 short sentences. No filler. Plain language for a performance marketer.
- recreatabilityReason: one sentence, max 25 words.
- recreatabilityScore: integer 1-5. How feasible it is for current AI video tools to produce a brand-adapted version of this post's STRUCTURE (caption hook rhythm, duration band, caption pattern) without copying the creator or exact visuals. 1 = very hard, 5 = straightforward from metadata alone.
- recreatabilityReason: one short sentence explaining the score.
- confidence: "low" | "medium" | "high". How much of the brief is directly observed (caption, duration, views, outlier score, sibling contrast) vs inferred. High = rich caption + clear sibling contrast; low = sparse caption or few siblings.

Return JSON keys: hook, format, pacing, captionPattern, whyItWorked, paidAdaptation (strings), recreatabilityScore (number), recreatabilityReason (string), confidence ("low"|"medium"|"high").`;

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
  const stringFields: Array<
    keyof Pick<
      BreakdownBrief,
      | "hook"
      | "format"
      | "pacing"
      | "captionPattern"
      | "whyItWorked"
      | "paidAdaptation"
      | "recreatabilityReason"
    >
  > = [
    "hook",
    "format",
    "pacing",
    "captionPattern",
    "whyItWorked",
    "paidAdaptation",
    "recreatabilityReason",
  ];
  for (const key of stringFields) {
    if (!brief[key]?.trim()) {
      throw new Error(`Model returned empty breakdown field: ${key}`);
    }
  }
  const score = brief.recreatabilityScore;
  if (!Number.isFinite(score) || score < 1 || score > 5) {
    throw new Error("Model returned invalid recreatabilityScore");
  }
  if (!brief.recreatabilityReason?.trim()) {
    throw new Error("Model returned empty recreatabilityReason");
  }
  if (
    brief.confidence !== "low" &&
    brief.confidence !== "medium" &&
    brief.confidence !== "high"
  ) {
    throw new Error("Model returned invalid confidence");
  }
}
