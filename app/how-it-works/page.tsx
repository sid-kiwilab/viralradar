import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

const STEPS = [
  {
    title: "URL in",
    body: "Read the brand homepage. Infer name, niche, and positioning.",
  },
  {
    title: "Competitors",
    body: "Search Google for similar brands. Names come only from those results. If search is off or empty, the model names competitors from what it knows.",
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
    body: "One saved brief per post: hook, caption pattern, why it beat the baseline, and a prompt for a paid version of that format. Also recreatability (1–5) and how sure the brief is (low, medium, high). The video is not watched.",
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
          Find formats in a niche that AI can actually remake.
        </p>
        <p className="panel-body how-dek">
          AI video tools generate the ads. A viral post only helps if those
          tools can produce a brand version of it. Viral Radar lists TikTok
          posts that beat that account&apos;s usual views, then scores each one
          for recreatability. The brief is the prompt the generator can run.
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
            live. OpenRouter and Claude Sonnet write the briefs.
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
            Posts stay in the Viral Radar database so a scan and its briefs can
            be reopened. We do not train models on them. We do not share them.
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
              Briefs use the caption and stats only. Thin posts come back as
              &quot;not observed.&quot;
            </li>
            <li>Small or B2B niches often have few posts at 2×.</li>
            <li>
              Gymshark, Duolingo, and Oatly reopen the last finished scan. Any
              other URL runs a new one. A brief is saved after the first run.
            </li>
            <li>
              The list is sorted by outlier only. Recreatability is on the
              breakdown and does not change the order yet. Next change: weight
              it in, so posts AI cannot remake drop down the list.
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
            <li>Hand the brief to a video generator in one click</li>
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
