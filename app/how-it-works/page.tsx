import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

const STEPS = [
  {
    title: "URL in",
    body: "Read the brand homepage. Infer name, niche, and positioning. Pull TikTok links from the page when they’re present. Site-read and infer timings show on the job when useful.",
  },
  {
    title: "TikTok",
    body: "Resolve the brand handle — demo map on Try hosts, else site links, else Apify user search. Scrape that profile via Clockworks (latest + popular passes, duplicates removed). Caption and stats only; video not downloaded.",
  },
  {
    title: "Outlier score",
    body: "Median views from that account’s scraped posts when we have at least 5. Score = views ÷ median. An old hit is measured against how that account performs now, not against other viral posts.",
  },
  {
    title: "Ranking",
    body: "Breakouts at 2× and up, highest multiplier first. Date on each card. Showcase hosts can reopen a cached scan instead of spending Apify credits again.",
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
      <article className="content-panel how-it-works-panel">
        <h1 className="panel-h2 panel-title-spaced">How Viral Radar works</h1>
        <p className="how-lead">
          Winning organic formats in your niche that AI can recreate.
        </p>

        <div className="how-scores">
          <section className="how-score is-key">
            <p className="how-kicker">Key signal</p>
            <h2 className="how-score-title">Recreatability</h2>
            <p>
              1–5. Can current AI video tools make a brand version of this
              format? Scored on each breakdown. Not used to sort the list yet.
            </p>
          </section>
          <section className="how-score">
            <p className="how-kicker">Sorts the list today</p>
            <h2 className="how-score-title">Outlier</h2>
            <p>
              Views ÷ that account&apos;s median from recent scraped posts.
              Shown at 2× and up, highest first.
            </p>
          </section>
        </div>

        <section className="how-section">
          <h2 className="how-h2">A scan</h2>
          <ol className="how-steps">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="how-step-n">{index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <span>{step.body}</span>
                </div>
              </li>
            ))}
          </ol>
          <p className="how-stack">
            Firecrawl reads the site first (Bright Data Browser if needed).
            Apify Clockworks pulls TikTok. Convex stores the data and updates
            the screen live. OpenRouter writes the breakdowns.
          </p>
        </section>

        <div className="how-split">
          <section className="how-section">
            <h2 className="how-h2">Kept from each post</h2>
            <ul className="how-list how-list-bullets">
              <li>Latest and popular profile passes (deduped)</li>
              <li>Views, caption, length, likes, comments, shares, date</li>
            </ul>
          </section>
          <section className="how-section">
            <h2 className="how-h2">Not included</h2>
            <ul className="how-list how-list-bullets">
              <li>The video file itself (metadata only)</li>
              <li>Instagram Reels niche search (not on live Scan)</li>
              <li>Meta paid ads</li>
            </ul>
          </section>
        </div>

        <section className="how-section">
          <h2 className="how-h2">Data</h2>
          <p className="panel-body">
            Posts stay in the Viral Radar database so a scan can be reopened. We
            do not train models on them. We do not share them.
          </p>
        </section>

        <section className="how-section">
          <h2 className="how-h2">Limits</h2>
          <ul className="how-list how-list-bullets">
            <li>
              Apify search can land on the wrong TikTok. Site links and the Try
              host map are more reliable when they exist.
            </li>
            <li>
              Breakdowns use the caption and stats only. Thin posts come back as
              &quot;not observed.&quot;
            </li>
            <li>Small or B2B brands often have few posts at 2×.</li>
            <li>
              Gymshark, Duolingo, and Oatly reopen the last finished scan with{" "}
              <strong>Fast scan</strong>. Any other URL runs live TikTok unless
              the hosted site is in showcase mode (cache-only for those three).
            </li>
            <li>
              The list is sorted by outlier only. Recreatability is on the
              breakdown and does not change the order yet.
            </li>
          </ul>
        </section>

        <section className="how-section">
          <h2 className="how-h2">Next</h2>
          <ul className="how-list how-list-bullets">
            <li>Trim scrape shape (5 / 15 / pinned) if Apify cost needs it</li>
            <li>Weight recreatability in the home ranking</li>
            <li>YouTube Shorts</li>
            <li>Frame-level video analysis on breakdowns</li>
          </ul>
        </section>

        <p className="content-note how-footer-note">
          <Link href="/">Run a scan</Link>. Gymshark, Duolingo, and Oatly are
          pre-cached — use <strong>Fast scan</strong> on the home page for
          instant results.
        </p>
      </article>
    </SiteShell>
  );
}