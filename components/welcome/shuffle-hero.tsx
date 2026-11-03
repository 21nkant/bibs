"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { WinBar } from "@/components/ui/win-bar";

type P = { id: string; ini: string; rating: number; gk?: boolean };

// Sign-up order: the strong regulars signed up first, so "first seven vs the rest" is lopsided.
const PLAYERS: P[] = [
  { id: "mc", ini: "MC", rating: 1395 },
  { id: "km", ini: "KM", rating: 1380, gk: true },
  { id: "lp", ini: "LP", rating: 1360 },
  { id: "oh", ini: "OH", rating: 1340 },
  { id: "jm", ini: "JM", rating: 1325 },
  { id: "tb", ini: "TB", rating: 1310 },
  { id: "ab", ini: "AB", rating: 1270 },
  { id: "ar", ini: "AR", rating: 1235 },
  { id: "ba", ini: "BA", rating: 1150, gk: true },
  { id: "pn", ini: "PN", rating: 1120 },
  { id: "lo", ini: "LO", rating: 1105 },
  { id: "nr", ini: "NR", rating: 1090 },
  { id: "hs", ini: "HS", rating: 1060 },
  { id: "mb", ini: "MB", rating: 1045 },
];
const NAIVE_A = new Set(PLAYERS.slice(0, 7).map((p) => p.id));
const BALANCED_A = new Set(["mc", "lp", "tb", "ar", "ba", "lo", "hs"]);
const ODDS = { naive: 0.78, balanced: 0.51 };

// Left-half formation (x%, y%) on a landscape pitch: keeper, two back, three middle, one up top.
const GK_SLOT = [6.5, 50] as const;
const OUT_SLOTS = [
  [18, 27],
  [18, 73],
  [30, 14],
  [30, 50],
  [30, 86],
  [40.5, 50],
] as const;

function layout(teamA: Set<string>) {
  const pos = new Map<string, { x: number; y: number; a: boolean }>();
  for (const isA of [true, false]) {
    const team = PLAYERS.filter((p) => teamA.has(p.id) === isA);
    const keeper = team.find((p) => p.gk);
    const outfield = team.filter((p) => p !== keeper);
    const place = (p: P, [x, y]: readonly [number, number]) =>
      pos.set(p.id, { x: isA ? x : 100 - x, y, a: isA });
    if (keeper) place(keeper, GK_SLOT);
    outfield.forEach((p, i) => place(p, OUT_SLOTS[i % OUT_SLOTS.length]));
  }
  return pos;
}
const LAYOUTS = { naive: layout(NAIVE_A), balanced: layout(BALANCED_A) };

export function ShuffleHero() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"naive" | "balanced">("naive");

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setPhase((p) => (p === "naive" ? "balanced" : "naive")), phase === "naive" ? 2200 : 4600);
    return () => clearTimeout(t);
  }, [phase, reduce]);

  const shown = reduce ? "balanced" : phase;
  const pos = LAYOUTS[shown];

  return (
    <figure className="surface-dark relative overflow-hidden rounded-xl border border-line">
      <div className="flex h-10 items-center gap-2 border-b border-line bg-card px-4">
        <span className="flex gap-1.5" aria-hidden>
          <i className="size-2.5 rounded-full bg-line-strong" />
          <i className="size-2.5 rounded-full bg-line-strong" />
          <i className="size-2.5 rounded-full bg-line-strong" />
        </span>
        <span className="ml-2 font-mono text-[11px] tracking-[0.08em] text-ink-3">Tuesday Night 7v7 · lock &amp; balance</span>
      </div>
      <div className="p-4 sm:p-6">
      <figcaption className="flex items-center justify-between">
        <div className="relative h-5 flex-1 overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={shown}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 eyebrow-plain"
            >
              {shown === "naive" ? (
                <span className="text-ink-2">Sign-up order</span>
              ) : (
                <span className="text-up">Balanced by Bibs</span>
              )}
            </motion.span>
          </AnimatePresence>
        </div>
        <span className="font-mono text-[11px] text-ink-3">7v7 · McCarren Park</span>
      </figcaption>

      <div className="relative mt-3 aspect-[107/70] overflow-hidden rounded-xl border border-ink/15 bg-paper">
        {/* mowing stripes */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-100"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, color-mix(in oklab, var(--color-ink) 3%, transparent) 0 10%, transparent 10% 20%)",
          }}
        />
                <LandscapeLines />
        {PLAYERS.map((p, i) => {
          const s = pos.get(p.id)!;
          return (
            <motion.div
              key={p.id}
              layout
              layoutId={`hero-${p.id}`}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
              transition={{ layout: { type: "spring", stiffness: 120, damping: 18, delay: i * 0.035 } }}
            >
              <motion.span
                initial={false}
                animate={{
                  backgroundColor: s.a ? "var(--color-accent)" : "var(--color-dark-raised)",
                  color: s.a ? "var(--color-dark)" : "var(--color-on-dark)",
                  borderColor: s.a ? "var(--color-accent)" : "var(--color-on-dark-2)",
                }}
                transition={{ duration: 0.4, delay: i * 0.035 + 0.15 }}
                className="grid size-7 place-items-center rounded-full border font-mono text-[10px] font-medium sm:size-8"
              >
                {p.gk ? "GK" : p.ini}
              </motion.span>
              <span className="mt-0.5 font-mono text-[9px] font-medium text-ink/70 tabular">{p.rating}</span>
            </motion.div>
          );
        })}
      </div>

      <WinBar probA={ODDS[shown]} className="mt-5" />
      </div>
    </figure>
  );
}

function LandscapeLines() {
  const line = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1,
    vectorEffect: "non-scaling-stroke" as const,
  };
  return (
    <svg
      viewBox="0 0 105 68"
      preserveAspectRatio="none"
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full text-ink/25"
    >
      <line x1="52.5" y1="0" x2="52.5" y2="68" {...line} />
      <ellipse cx="52.5" cy="34" rx="9.15" ry="9.15" {...line} />
      <rect x="-1" y="13.84" width="17.5" height="40.32" {...line} />
      <rect x="-1" y="24.84" width="6.5" height="18.32" {...line} />
      <rect x="88.5" y="13.84" width="17.5" height="40.32" {...line} />
      <rect x="99.5" y="24.84" width="6.5" height="18.32" {...line} />
      <path d="M16.5 26.7 A9.15 9.15 0 0 1 16.5 41.3" {...line} />
      <path d="M88.5 26.7 A9.15 9.15 0 0 0 88.5 41.3" {...line} />
    </svg>
  );
}
