import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

const STEPS = [
  {
    title: "URL in",
    body: "Read the brand homepage. Infer the shoppable category (not the unique ingredient or process), audience, and what nearby bucket to avoid. Optionally exclude your Instagram handles so your own Reels stay off the niche list.",
  },
  {
    title: "Niche searches",
    body: "Turn that brand’s category into Instagram hashtags and keywords (any DTC — not a food-only template). No competitor list, no Google SERP, no confirm screen.",
  },
  {
    title: "Reels",
    body: "Hashtag search finds niche Reels; we drop parent-tag / explore hits that are not actually in-aisle, then load recent Reels from the top creators for per-account baselines. Fast scan on Try brands still reopens cached TikTok outliers.",
  },
  {
    title: "Outlier score",
    body: "Views ÷ that account’s median when we have at least 5 of their Reels. No mixed-set guess. Without a baseline, the card shows views only.",
  },
  {
    title: "Ranking",
    body: "Breakouts (2× and up) first, sorted by multiplier; then views-only niche hits by view count. Date on each card.",
  },
  {
    title: "Breakdown",
    body: "Hook, format, and recreatability (1–5) from caption and stats. Video not watched.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <SiteShell isLanding={false}>
      <Link href="/" className="btn btn-ghost page-back">
        Back
      </Link>
      <article className="how-it-works">
        <h1 className="content-h1">How it works</h1>
        <p className="content-lede">
          Paste a brand URL. We find outlier Reels in that niche — scored
          against the account (or the scrape set) so a small brand’s hit is
          comparable to a large one’s.
        </p>
        <ol className="how-steps">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <h2>
                {i + 1}. {step.title}
              </h2>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </article>
    </SiteShell>
  );
}
