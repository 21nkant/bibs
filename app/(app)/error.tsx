"use client";

import { RotateCcw } from "lucide-react";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mt-16 flex flex-col items-center rounded-xl border border-line bg-card/70 px-6 py-12 text-center">
      <p className="font-display text-xl font-medium">Lost the signal</p>
      <p className="mt-2 max-w-[18rem] text-sm text-ink-2">We couldn&rsquo;t load this just now. Your spots and ratings are safe.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper"
      >
        <RotateCcw className="size-4" aria-hidden />
        Try again
      </button>
    </div>
  );
}
