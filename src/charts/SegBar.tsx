// Thin two-part bar that sits beside its figures (wins and losses).
// It carries no text: the numbers next to it do.

export function SegBar({a, b, ariaLabel}: {a: number; b: number; ariaLabel: string}) {
  const total = a + b;
  if (total <= 0) {
    return null;
  }
  return (
    <div className="viz">
      <div className="viz-seg" role="img" aria-label={ariaLabel}>
        {a > 0 ? <span className="viz-seg-part" data-tone="accent" style={{flex: `${a} 1 0`}} /> : null}
        {b > 0 ? <span className="viz-seg-part" data-tone="context" style={{flex: `${b} 1 0`}} /> : null}
      </div>
    </div>
  );
}
