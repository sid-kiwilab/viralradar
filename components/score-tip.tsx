/** Short definition on hover/focus (native tooltip). */
export function ScoreTip({ tip }: { tip: string }) {
  return (
    <button
      type="button"
      className="score-tip-btn"
      aria-label={tip}
      title={tip}
    >
      ?
    </button>
  );
}
