"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { WinBar } from "@/components/ui/win-bar";
import { balanceTeams, winProbability } from "@/lib/engine/balance";

type P = { id: string; ini: string; rating: number; gk?: boolean };
type Spot = { x: number; y: number; a: boolean };

// Tonight's roster in sign-up order: the strong regulars signed up first.
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
const byId = new Map(PLAYERS.map((p) => [p.id, p]));
const NAMES: Record<string, string> = {
  mc: "Maya", km: "Kofi", lp: "Lena", oh: "Omar", jm: "Jess", tb: "Tariq", ab: "Ade",
  ar: "Alex", ba: "Ben", pn: "Priya", lo: "Luis", nr: "Nina", hs: "Hana", mb: "Marco",
};

// Left-half formation (x%, y%) on a landscape pitch: keeper, two back, three middle, one up top.
const GK_SLOT = [6.5, 50] as const;
const OUT_SLOTS = [
  [17, 24],
  [17, 76],
  [29, 12],
  [29, 50],
  [29, 88],
  [42, 50],
] as const;

function layout(teamA: Set<string>) {
  const pos = new Map<string, Spot>();
  for (const isA of [true, false]) {
    const team = PLAYERS.filter((p) => teamA.has(p.id) === isA);
    const keeper = team.find((p) => p.gk);
    const outfield = team.filter((p) => p !== keeper);
    const place = (p: P, [x, y]: readonly [number, number]) => pos.set(p.id, { x: isA ? x : 100 - x, y, a: isA });
    if (keeper) place(keeper, GK_SLOT);
    outfield.forEach((p, i) => place(p, OUT_SLOTS[i % OUT_SLOTS.length]));
  }
  return pos;
}

// ---- The demo runs the real balancer (lib/engine/balance.ts) on this roster. ----------------
const NAIVE_A = new Set(PLAYERS.slice(0, 7).map((p) => p.id));
const split = balanceTeams(PLAYERS.map((p) => ({ id: p.id, rating: p.rating, position: p.gk ? "gk" : "outfield" })));
// Keep the bibs on whichever balanced team shares more players with the sign-up-order bibs.
const overlap = (ids: string[]) => ids.filter((id) => NAIVE_A.has(id)).length;
const BALANCED_A = new Set(overlap(split.teamA) >= overlap(split.teamB) ? split.teamA : split.teamB);

// Players who change sides, paired up (keepers together) so each swap is one crossing of the halfway line.
const keepersFirst = (ps: P[]) => [...ps.filter((p) => p.gk), ...ps.filter((p) => !p.gk)];
const leaving = keepersFirst(PLAYERS.filter((p) => NAIVE_A.has(p.id) && !BALANCED_A.has(p.id)));
const joining = keepersFirst(PLAYERS.filter((p) => !NAIVE_A.has(p.id) && BALANCED_A.has(p.id)));
const SWAPS = leaving.map((p, i) => [p, joining[i]] as const);

// Positions after 0..n swaps: the two players in a swap trade places, everyone else stays put.
const STATES: Map<string, Spot>[] = [layout(NAIVE_A)];
for (const [out, inn] of SWAPS) {
  const next = new Map(STATES.at(-1)!);
  const a = next.get(out.id)!;
  const b = next.get(inn.id)!;
  next.set(out.id, b);
  next.set(inn.id, a);
  STATES.push(next);
}
const ratingsOn = (s: Map<string, Spot>, a: boolean) =>
  [...s].filter(([, spot]) => spot.a === a).map(([id]) => byId.get(id)!.rating);
const PROBS = STATES.map((s) => winProbability(ratingsOn(s, true), ratingsOn(s, false)));
const avg = (xs: number[]) => Math.round(xs.reduce((t, x) => t + x, 0) / xs.length);
const FINAL = STATES.at(-1)!;
const AVG_A = avg(ratingsOn(FINAL, true));
const AVG_B = avg(ratingsOn(FINAL, false));

// Every way to split 14 players into two 7s, counting mirror images once: C(14,7) / 2 = 1,716.
const choose = (n: number, k: number): number => (k === 0 ? 1 : (n * choose(n - 1, k - 1)) / k);
const SPLITS = choose(PLAYERS.length, Math.floor(PLAYERS.length / 2)) / 2;

// Steps: 0 sign-up order · 1 search · 2..n+1 one swap each · n+2 balanced.
const SEARCH = 1;
const BALANCED = SWAPS.length + 2;
const HOLD_MS = (step: number) => (step === 0 ? 4000 : step === SEARCH ? 2800 : step === BALANCED ? 5000 : 1400);
const swapsDone = (step: number) => Math.max(0, Math.min(SWAPS.length, step - 1));

export function ShuffleHero() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setStep((s) => (s === BALANCED ? 0 : s + 1)), HOLD_MS(step));
    return () => clearTimeout(t);
  }, [step, reduce]);

  // The split counter ticks through every candidate while the "search" step is showing.
  useEffect(() => {
    if (step !== SEARCH) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 1500);
      setChecked(Math.round(SPLITS * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  const shown = reduce ? BALANCED : step;
  const done = swapsDone(shown);
  const pos = STATES[done];
  const current = shown > SEARCH && shown < BALANCED ? SWAPS[done - 1] : null;
  const moving = new Set(current ? [current[0].id, current[1].id] : []);

  const label =
    shown === 0 ? "Sign-up order" : shown === BALANCED ? "Balanced" : shown === SEARCH ? "Searching" : "Balancing";
  const labelTone = shown === 0 ? "text-down" : shown === BALANCED ? "text-up" : "text-on-dark";

  // Plain-English narration, one sentence per step.
  const pct = (p: number) => Math.round(p * 100);
  const who = (p: P) => `${NAMES[p.id]} (${p.rating})`;
  let status: React.ReactNode;
  if (shown === 0) {
    status = (
      <>
        14 players signed up. Split by sign-up order, the Bibs team wins{" "}
        <b className="text-accent">{pct(PROBS[0])}%</b> of the time.
      </>
    );
  } else if (shown === SEARCH) {
    status = (
      <span className="tabular">
        Bibs checks every way to split them: <b>{checked.toLocaleString("en-US")}</b> of {SPLITS.toLocaleString("en-US")}, one
        goalkeeper per side.
      </span>
    );
  } else if (current) {
    status = (
      <>
        Swap {done} of {SWAPS.length}: <b>{who(current[0])}</b> ⇄ <b>{who(current[1])}</b>
      </>
    );
  } else {
    status = (
      <span className="tabular">
        <b className="text-up">{pct(PROBS.at(-1)!)} / {100 - pct(PROBS.at(-1)!)}.</b> A fair game. Team averages{" "}
        {AVG_A.toLocaleString("en-US")} vs {AVG_B.toLocaleString("en-US")}.
      </span>
    );
  }
  const stepNo = shown === 0 ? 1 : shown === SEARCH ? 2 : shown === BALANCED ? 4 : 3;

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
                key={label}
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -14, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={`absolute inset-0 eyebrow-plain ${labelTone}`}
              >
                {label}
              </motion.span>
            </AnimatePresence>
          </div>
          <span className="font-mono text-[11px] text-ink-3">7v7 · McCarren Park</span>
        </figcaption>

        <div className="relative mt-3 aspect-[107/70] overflow-hidden rounded-xl border border-ink/15 bg-paper">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, color-mix(in oklab, var(--color-ink) 3%, transparent) 0 10%, transparent 10% 20%)",
            }}
          />
          <LandscapeLines />
          {PLAYERS.map((p) => {
            const s = pos.get(p.id)!;
            const isMoving = moving.has(p.id);
            return (
              <motion.div
                key={p.id}
                initial={false}
                animate={{ left: `${s.x}%`, top: `${s.y}%` }}
                transition={{ type: "spring", stiffness: 110, damping: 17 }}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                style={{ zIndex: isMoving ? 2 : 1 }}
              >
                <motion.span
                  initial={false}
                  animate={{
                    backgroundColor: s.a ? "var(--color-accent)" : "var(--color-dark-raised)",
                    color: s.a ? "var(--color-dark)" : "var(--color-on-dark)",
                    borderColor: isMoving ? "var(--color-on-dark)" : s.a ? "var(--color-accent)" : "var(--color-on-dark-2)",
                    scale: isMoving ? 1.18 : 1,
                  }}
                  transition={{ duration: 0.35 }}
                  className="grid size-7 place-items-center rounded-full border font-mono text-[10px] font-medium sm:size-8"
                >
                  {p.gk ? "GK" : p.ini}
                </motion.span>
                <span className="mt-0.5 font-mono text-[9px] font-medium text-ink/70 tabular">{p.rating}</span>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] tracking-[0.06em] text-ink-3">
          <span className="flex items-center gap-1.5">
            <i className="size-2.5 rounded-full bg-accent" /> Bibs team
          </span>
          <span className="flex items-center gap-1.5">
            <i className="size-2.5 rounded-full border border-on-dark-2" /> No-bibs team
          </span>
          <span>number = player rating</span>
        </div>

        <div className="mt-4 flex items-start gap-3">
          <span className="mt-1 flex shrink-0 gap-1" aria-label={`Step ${stepNo} of 4`}>
            {[1, 2, 3, 4].map((n) => (
              <i key={n} className={`h-1.5 w-4 rounded-full ${n <= stepNo ? "bg-accent" : "bg-line-strong"}`} />
            ))}
          </span>
          <p className="min-h-[2.75rem] text-[14px] leading-snug text-ink sm:text-[15px]" aria-live="polite">
            {status}
          </p>
        </div>
        <p className="mt-3 eyebrow-plain text-ink-3">Chance to win</p>
        <WinBar probA={PROBS[done]} className="mt-1.5" />
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
