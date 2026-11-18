import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

const STEPS = [
  {
    title: "URL in",
    body: "Read the brand homepage. Infer name, niche, and positioning. Pull TikTok links from the site when present.",
  },
  {
    title: "TikTok",
    body: "Resolve the brand handle (demo map, site links, or Apify search). Scrape recent posts from that profile via Clockworks TikTok scraper.",
  },
  {
    title: "Outlier score",
    body: "Views ÷ median of that account’s scraped posts when we have at least 5. List shows breakouts at 2× and up.",
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
          Paste a brand URL. We find their TikTok and score posts against that
          account’s baseline so a small brand’s hit is comparable to a large
          one’s.
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