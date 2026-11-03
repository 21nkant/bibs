"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

const STRIP = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ""];

/** Rolls each digit from `from` to `to`, like a mechanical counter. */
export function Odometer({ from, to, delay = 0, className }: { from: number; to: number; delay?: number; className?: string }) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    const t = setTimeout(() => setValue(to), delay * 1000);
    return () => clearTimeout(t);
  }, [to, delay]);

  const width = Math.max(String(from).length, String(to).length);
  const digits = String(value).padStart(width, " ").split("");

  return (
    <span className={className} aria-label={String(to)}>
      <span aria-hidden className="inline-flex tabular">
        {digits.map((ch, i) => {
          const idx = ch === " " ? 10 : Number(ch);
          return (
            <span key={i} className="relative inline-block h-[1em] overflow-hidden leading-none">
              <span className="invisible">0</span>
              <motion.span
                className="absolute inset-x-0 top-0 flex flex-col"
                initial={false}
                animate={{ y: `${(-idx * 100) / STRIP.length}%` }}
                transition={{ type: "spring", stiffness: 70, damping: 15, delay: (width - i) * 0.06 }}
              >
                {STRIP.map((d, j) => (
                  <span key={j} className="block h-[1em] leading-none">
                    {d || " "}
                  </span>
                ))}
              </motion.span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
