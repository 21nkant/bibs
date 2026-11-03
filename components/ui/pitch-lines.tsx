import clsx from "clsx";

// A top-down pitch in thin chalk lines (real proportions, 68 × 105 m, portrait).
// Strokes don't scale, so lines stay 1px crisp at any size.
export function PitchLines({ className, strokeWidth = 1 }: { className?: string; strokeWidth?: number }) {
  const line = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    vectorEffect: "non-scaling-stroke" as const,
  };
  return (
    <svg
      viewBox="-1 -1 70 107"
      preserveAspectRatio="none"
      aria-hidden
      className={clsx("pointer-events-none", className)}
    >
      <rect x="0" y="0" width="68" height="105" {...line} />
      <line x1="0" y1="52.5" x2="68" y2="52.5" {...line} />
      <circle cx="34" cy="52.5" r="9.15" {...line} />
      <circle cx="34" cy="52.5" r="0.5" fill="currentColor" />
      {/* top end */}
      <rect x="13.84" y="0" width="40.32" height="16.5" {...line} />
      <rect x="24.84" y="0" width="18.32" height="5.5" {...line} />
      <circle cx="34" cy="11" r="0.45" fill="currentColor" />
      <path d="M26.7 16.5 A9.15 9.15 0 0 0 41.3 16.5" {...line} />
      {/* bottom end */}
      <rect x="13.84" y="88.5" width="40.32" height="16.5" {...line} />
      <rect x="24.84" y="99.5" width="18.32" height="5.5" {...line} />
      <circle cx="34" cy="94" r="0.45" fill="currentColor" />
      <path d="M26.7 88.5 A9.15 9.15 0 0 1 41.3 88.5" {...line} />
      {/* corner arcs */}
      <path d="M0 1 A1 1 0 0 0 1 0" {...line} />
      <path d="M67 0 A1 1 0 0 0 68 1" {...line} />
      <path d="M0 104 A1 1 0 0 1 1 105" {...line} />
      <path d="M67 105 A1 1 0 0 1 68 104" {...line} />
    </svg>
  );
}

/** The fixed backdrop behind every screen: floodlight wash, bib mesh, faint chalk lines. */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 opacity-60" />
      <div className="absolute inset-x-0 top-0 h-[70vh]" />
      <div className="absolute left-1/2 top-24 w-[min(140vw,720px)] -translate-x-1/2 text-ink/[0.045]">
        <PitchLines className="aspect-[70/107] w-full" />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-paper to-transparent" />
    </div>
  );
}
