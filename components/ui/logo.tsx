import clsx from "clsx";

export function BibMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        d="M7.2 2.5h2.2c.3 1.9 1.2 3 2.6 3s2.3-1.1 2.6-3h2.2v3.6c0 1.4 2.1 2 2.1 4.2V21.5H5.1V10.3c0-2.2 2.1-2.8 2.1-4.2z"
        fill="currentColor"
      />
      <path d="M8.2 13.5h7.6" stroke="var(--color-paper)" strokeOpacity=".35" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-2 font-display text-[1.3rem] font-medium tracking-[-0.02em]", className)}>
      <BibMark className="size-5 text-accent" />
      Bibs
    </span>
  );
}
