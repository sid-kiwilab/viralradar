import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

const STEPS = [
  {
    title: "URL in",
    body: "Read the brand homepage. Infer the specific product or service, niche, audience, and what category to avoid lumping it into. The scan pauses here so you can re-read the site or continue when the understanding looks right. Timings for site read and model infer are shown.",
  },
  {
    title: "Competitors",
    body: "Find brands in that same specific niche—Google when configured, otherwise the model—not a broader parent category. SERP names must appear in search results; fallback lists use the same understanding.",
  },
  {
    title: "TikTok accounts",
    body: "Up to three competitors. Only exact handle or display-name matches. You confirm before anything is scraped.",
  },
  {
    title: "Posts",
    body: "Latest ~24 and top ~20 by popularity per account, pinned included, duplicates removed. Caption and stats only. The video is not downloaded.",
  },
  {
    title: "Outlier score",
    body: "Median views of the ~24 most recent posts. Needs at least 5. Score = views ÷ that median. An old hit is compared with how the account performs now, not with other viral posts.",
  },
  {
    title: "Ranking",
    body: "2× and up, highest first. The date is on each card. No cutoff by age.",
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
              Views ÷ that account&apos;s median from its last ~24 posts. Shown
              at 2× and up, highest first.
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
            Bright Data reads the site and runs Google search. Apify Clockworks
            pulls TikTok for now. Convex stores the data and updates the screen
            live. OpenRouter and Claude Sonnet write the breakdowns.
          </p>
        </section>

        <div className="how-split">
          <section className="how-section">
            <h2 className="how-h2">Kept from each post</h2>
            <ul className="how-list how-list-bullets">
              <li>Latest ~24 and top ~20, pinned included</li>
              <li>Views, caption, length, likes, comments, shares, date</li>
            </ul>
          </section>
          <section className="how-section">
            <h2 className="how-h2">Not included</h2>
            <ul className="how-list how-list-bullets">
              <li>The video itself</li>
              <li>The scanned brand&apos;s own TikTok</li>
              <li>Meta paid ads</li>
            </ul>
          </section>
        </div>

        <section className="how-section">
          <h2 className="how-h2">Data</h2>
          <p className="panel-body">
            Posts stay in the Viral Radar database so a scan can be reopened.
            We do not train models on them. We do not share them.
          </p>
        </section>

        <section className="how-section">
          <h2 className="how-h2">Limits</h2>
          <ul className="how-list how-list-bullets">
            <li>
              A suggested TikTok can be the wrong account. Uncheck it before the
              scrape.
            </li>
            <li>
              Breakdowns use the caption and stats only. Thin posts come back as
              &quot;not observed.&quot;
            </li>
            <li>Small or B2B niches often have few posts at 2×.</li>
            <li>
              Gymshark, Duolingo, and Oatly reopen the last finished scan. Any
              other URL runs a new one. A breakdown is saved after the first run.
            </li>
            <li>
              The list is sorted by outlier only. Recreatability is on the
              breakdown and does not change the order yet. Next change: weight
              it in, so posts AI cannot recreate drop down the list.
            </li>
          </ul>
        </section>

        <section className="how-section">
          <h2 className="how-h2">Next</h2>
          <ul className="how-list how-list-bullets">
            <li>Pull TikTok through Bright Data instead of Apify, to cut cost per scan</li>
            <li>Instagram Reels and YouTube Shorts</li>
            <li>Add the scanned brand&apos;s own TikTok to the list</li>
            <li>Hide posts under a minimum view count</li>
            <li>Confirm a matched TikTok is the right account</li>
            <li>Read the video, not just the caption and stats</li>
          </ul>
        </section>

        <p className="content-note how-footer-note">
          <Link href="/">Run a scan</Link>. Gymshark, Duolingo, and Oatly are
          pre-cached. Use Fast scan on the home page for instant results.
        </p>
      </article>
    </SiteShell>
  );
}
