import clsx from "clsx";

/** One pip per spot. Filled pips are taken; the viewer's own spot glows bib orange. */
export function SpotsMeter({
  capacity,
  joined,
  waitlist,
  viewerJoined = false,
  className,
}: {
  capacity: number;
  joined: number;
  waitlist: number;
  viewerJoined?: boolean;
  className?: string;
}) {
  const left = Math.max(0, capacity - joined);
  const full = left === 0;
  return (
    <div className={className}>
      <div className="flex gap-[3px]" role="img" aria-label={`${joined} of ${capacity} spots taken`}>
        {Array.from({ length: capacity }, (_, i) => (
          <span
            key={i}
            className={clsx(
              "h-1.5 flex-1 rounded-full",
              i < joined ? (viewerJoined && i === joined - 1 ? "bg-bib" : "bg-chalk/85") : "bg-night-line",
            )}
          />
        ))}
      </div>
      <div className="mt-2 flex items-baseline justify-between text-xs">
        <span className="font-display tabular text-chalk/80">
          <span className="font-semibold text-chalk">{joined}</span>/{capacity} in
        </span>
        <span className="tabular">
          {full ? <span className="font-semibold text-bib">Full</span> : (
            <span className="font-semibold text-up">
              {left} {left === 1 ? "spot" : "spots"} left
            </span>
          )}
          {waitlist > 0 ? <span className="text-muted"> · {waitlist} on waitlist</span> : null}
        </span>
      </div>
    </div>
  );
}
