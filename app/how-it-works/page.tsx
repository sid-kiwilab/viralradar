import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

export default function HowItWorksPage() {
  return (
    <SiteShell isLanding={false}>
      <Link href="/" className="btn btn-ghost page-back">
        Back
      </Link>
      <article className="content-panel how-it-works-panel">
        <p className="content-eyebrow">Methodology</p>
        <h1 className="panel-h2 panel-title-spaced">How Viral Radar works</h1>

        <section className="how-section">
          <p className="panel-body">
            Finds all-time outliers in the niche. Posts are scored against each
            account&apos;s own recent view distribution, surfacing format
            breakers whether they&apos;re recent or historical. Think of it as
            the organic companion to paid ad research: paid shows what people
            spend on, this shows what has worked and what&apos;s working.
          </p>
        </section>

        <section className="how-section">
          <h2 className="how-h2">Pipeline</h2>
          <ol className="how-list">
            <li>
              <strong>URL in</strong>: Bright Data Browser API reads the brand
              homepage (Playwright over CDP). OpenRouter infers name, niche, and
              positioning from page text.
            </li>
            <li>
              <strong>Competitors</strong>: Three Google queries via Bright Data
              SERP when configured; OpenRouter extracts brand names grounded in
              organic snippets only. Memory fallback if SERP is off or empty.
            </li>
            <li>
              <strong>TikTok handles</strong>: Up to three competitor brands per
              scan (demo limit). Apify Clockworks user search per name; only exact
              handle or display-name matches are proposed. You confirm accounts
              before any profile scrape.
            </li>
            <li>
              <strong>Posts</strong>: Two Clockworks profile passes per confirmed
              handle — latest ~24 and top ~20 by popularity (pinned included) —
              then deduped (metadata only; no video download). Planned move to
              Bright Data for TikTok to improve unit economics and own the
              extraction schema.
            </li>
            <li>
              <strong>Outlier score</strong>: For each handle: median views of
              the ~24 most recent scraped posts (minimum 5 posts). Score = post
              views ÷ that recent median. Historical hits are scored against
              current performance, not against other all-time virals. This is
              not a 30-day rolling median.
            </li>
            <li>
              <strong>Ranking</strong>: UI shows scraped posts with multiplier
              ≥ 2×, highest first. Each card shows the post date so historical
              breakouts are readable as such. No 90-day cutoff.
            </li>
            <li>
              <strong>Breakdown</strong>: One OpenRouter call per outlier
              (cached): hook, caption pattern, why it beat baseline, paid
              adaptation, plus recreatability (1–5) and confidence
              (low/medium/high). Video content is not analysed.
            </li>
          </ol>
        </section>

        <section className="how-section">
          <h2 className="how-h2">What we scrape</h2>
          <ul className="how-list how-list-bullets">
            <li>
              Latest ~24 plus top ~20 by popularity per confirmed TikTok handle
              (pinned included; deduped)
            </li>
            <li>Views, caption, duration, likes, comments, shares, post date</li>
            <li>
              Display filter: ≥ 2× recent baseline; date shown on each card
            </li>
          </ul>
        </section>

        <section className="how-section">
          <h2 className="how-h2">What we do not do</h2>
          <ul className="how-list how-list-bullets">
            <li>Watch or download video content for breakdowns</li>
            <li>Include the scanned brand&apos;s own TikTok in the ranking (yet)</li>
            <li>Scrape Meta paid ads (separate product lane)</li>
          </ul>
        </section>

        <section className="how-section">
          <h2 className="how-h2">Data</h2>
          <p className="panel-body">
            Scraped posts are stored only in the Viral Radar database for
            caching and scan history. No model training on scraped data. No
            third-party sharing.
          </p>
        </section>

        <section className="how-section">
          <h2 className="how-h2">Infrastructure</h2>
          <ul className="how-list how-list-bullets">
            <li>
              <strong>Convex</strong>: brands, scan jobs, posts, cached
              breakdowns; real-time UI subscriptions
            </li>
            <li>
              <strong>Bright Data</strong>: Browser API for site read; SERP API
              for competitor Google search
            </li>
            <li>
              <strong>Apify (today)</strong>: Clockworks TikTok scraper for
              handle search and profile posts. Next step: Bright Data for TikTok
              (same stack as site + SERP) for better unit economics.
            </li>
            <li>
              <strong>OpenRouter</strong>: extraction, competitor queries,
              breakdown (default Claude Sonnet)
            </li>
          </ul>
        </section>

        <section className="how-section">
          <h2 className="how-h2">Known limitations</h2>
          <ul className="how-list how-list-bullets">
            <li>
              Handle resolution can guess wrong; use the confirm step and uncheck
              bad accounts.
            </li>
            <li>
              Breakdowns are metadata-only; format and pacing may read &quot;not
              observed in metadata&quot; when caption/duration are thin.
            </li>
            <li>
              Thin or B2B niches may yield few outliers above the 2× / 90-day
              bar.
            </li>
            <li>
              Each scan is a point in time. Instant results (Gymshark, Duolingo,
              Oatly) reopen the last completed scan; any other brand URL runs a
              fresh scan. Breakdown briefs are saved per post after the first
              generation.
            </li>
          </ul>
        </section>

        <section className="how-section">
          <h2 className="how-h2">Roadmap</h2>
          <ul className="how-list how-list-bullets">
            <li>TikTok via Bright Data (replace Apify for unit economics)</li>
            <li>Instagram Reels, YouTube Shorts</li>
            <li>Brand&apos;s own TikTok posts in the ranking</li>
            <li>View-count floor filter</li>
            <li>Handle resolution verification</li>
            <li>
              Direct generation-agent brief export (one-click handoff to
              generator)
            </li>
            <li>Video content analysis (frame sampling)</li>
          </ul>
        </section>

        <p className="content-note how-footer-note">
          <Link href="/">Run a scan</Link>. Gymshark, Duolingo, and Oatly are
          pre-cached — use Fast scan on the home page for instant outliers.
        </p>
      </article>
    </SiteShell>
  );
}
