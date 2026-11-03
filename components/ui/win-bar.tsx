"use client";

import clsx from "clsx";
import { motion } from "motion/react";
import { AnimatedNumber } from "./animated-number";

/** Win probability for Bibs (A) vs No bibs (B), morphing as the teams change. */
export function WinBar({
  probA,
  className,
  labelA = "Bibs",
  labelB = "No bibs",
}: {
  probA: number;
  className?: string;
  labelA?: string;
  labelB?: string;
}) {
  const a = Math.round(probA * 100);
  return (
    <div className={clsx("w-full", className)}>
      <div className="flex items-baseline justify-between font-mono text-sm tabular">
        <span className="flex items-baseline gap-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-ink-2">{labelA}</span>
          <span className="font-bold text-accent">
            <AnimatedNumber value={a} />%
          </span>
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className="font-bold text-ink">
            <AnimatedNumber value={100 - a} />%
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-ink-2">{labelB}</span>
        </span>
      </div>
      <div className="relative mt-2 flex h-2 gap-[3px] overflow-hidden rounded-full">
        <motion.div
          className="h-full rounded-l-full bg-accent"
          initial={false}
          animate={{ width: `${a}%` }}
          transition={{ type: "spring", stiffness: 70, damping: 18 }}
        />
        <div className="h-full flex-1 rounded-r-full bg-ink/85" />
      </div>
    </div>
  );
}
