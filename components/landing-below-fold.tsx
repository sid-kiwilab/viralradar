export function LandingBelowFold() {
  return (
    <div className="landing-below">
      <nav className="process-strip" aria-label="How it works">
        <ul className="process-list">
          <li>URL in</li>
          <li>Competitors confirmed</li>
          <li>Ranked outliers</li>
        </ul>
      </nav>

      <section className="content-panel sample-output-panel">
        <p className="content-eyebrow">Example output</p>
        <p className="content-note sample-output-note">
          Illustration only. Multipliers appear after a real scan.
        </p>
        <ul className="sample-post-list" aria-hidden>
          {[0, 1, 2].map((i) => (
            <li key={i} className="sample-post-row">
              <div className="sample-thumb" />
              <div className="sample-post-body">
                <div className="sample-post-meta">
                  <span className="sample-handle">@account</span>
                  <span className="sample-score-pill">outlier score</span>
                </div>
                <div className="sample-caption-bar" />
                <div className="sample-caption-bar sample-caption-short" />
              </div>
            </li>
          ))}
        </ul>
        <p className="content-note scoring-note">
          Scoring: post views divided by that account&apos;s median views (minimum
          five posts on the profile).
        </p>
      </section>

      <footer className="demo-footer">
        <p className="content-note">
          Built as a demo. Platform agnostic by design. TikTok first, Reels and
          Shorts next.
        </p>
      </footer>
    </div>
  );
}
