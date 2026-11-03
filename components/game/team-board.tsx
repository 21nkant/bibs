"use client";

import clsx from "clsx";
import { RotateCcw } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { WinBar } from "@/components/ui/win-bar";
import { percent } from "@/lib/format";
import type { RosterPlayer } from "@/lib/types";

type Phase = "naive" | "balanced";

function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : name;
}

function avg(ps: RosterPlayer[]) {
  return ps.length ? Math.round(ps.reduce((s, p) => s + p.rating, 0) / ps.length) : 0;
}

/**
 * Bibs vs No bibs. With `play`, it opens on the naive sign-up split and reshuffles into the
 * saved balanced teams, so the organizer sees exactly what the balancer fixed.
 */
export function TeamBoard({
  joined,
  naiveWinProbA,
  balancedWinProbA,
  viewerId,
  play,
  onReplay,
}: {
  joined: RosterPlayer[]; // in sign-up order
  naiveWinProbA: number | null;
  balancedWinProbA: number | null;
  viewerId: string;
  play: boolean;
  onReplay: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(play ? "naive" : "balanced");

  useEffect(() => {
    if (!play) return;
    const t = setTimeout(() => setPhase("balanced"), 1300);
    return () => clearTimeout(t);
  }, [play]);

  const teams = useMemo(() => {
    const cut = Math.ceil(joined.length / 2);
    const naiveA = new Set(joined.slice(0, cut).map((p) => p.userId));
    const inA = (p: RosterPlayer) => (phase === "naive" ? naiveA.has(p.userId) : p.team === "A");
    const order = (ps: RosterPlayer[]) =>
      phase === "naive"
        ? ps
        : [...ps].sort((x, y) => (x.position === "gk" ? -1 : 0) - (y.position === "gk" ? -1 : 0) || y.rating - x.rating);
    return { A: order(joined.filter(inA)), B: order(joined.filter((p) => !inA(p))) };
  }, [joined, phase]);

  const prob = phase === "naive" ? naiveWinProbA : balancedWinProbA;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="relative h-5 flex-1 overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={phase}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={clsx(
                "absolute inset-0 eyebrow-plain",
                phase === "naive" ? "text-ink-2" : "text-up",
              )}
            >
              {phase === "naive" ? "Sign-up order" : "Balanced by rating"}
            </motion.p>
          </AnimatePresence>
        </div>
        {phase === "balanced" && naiveWinProbA !== null ? (
          <button
            type="button"
            onClick={onReplay}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-ink-2 transition hover:bg-line/60 hover:text-ink"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Replay
          </button>
        ) : null}
      </div>

      {prob !== null ? <WinBar probA={prob} className="mt-3" /> : null}

      <LayoutGroup>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {(["A", "B"] as const).map((t) => (
            <div
              key={t}
              className={clsx(
                "rounded-xl border p-2",
                t === "A" ? "border-accent/25 bg-accent/[0.06]" : "border-ink/15 bg-ink/[0.03]",
              )}
            >
              <div className="flex items-baseline justify-between px-1.5 pb-2 pt-1">
                <span className={clsx("font-mono text-sm font-medium", t === "A" ? "text-accent" : "text-ink")}>
                  {t === "A" ? "Bibs" : "No bibs"}
                </span>
                <span className="font-mono text-xs text-ink-2 tabular">
                  avg <AnimatedNumber value={avg(teams[t])} className="text-ink/90" />
                </span>
              </div>
              <ul className="space-y-1">
                {teams[t].map((p, i) => (
                  <motion.li
                    key={p.userId}
                    layoutId={`team-${p.userId}`}
                    layout="position"
                    transition={{ layout: { type: "spring", stiffness: 170, damping: 22, delay: i * 0.03 } }}
                    className={clsx(
                      "flex items-center gap-2 rounded-lg px-1.5 py-1.5",
                      p.userId === viewerId && "bg-ink/[0.07] ring-1 ring-ink/15",
                    )}
                  >
                    <motion.span
                      initial={false}
                      animate={{
                        backgroundColor: t === "A" ? "var(--color-accent)" : "rgba(0, 0, 0, 0)",
                        borderColor: t === "A" ? "var(--color-accent)" : "var(--color-ink-2)",
                      }}
                      className="size-2.5 shrink-0 rounded-full border"
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                      {p.userId === viewerId ? "You" : shortName(p.name)}
                    </span>
                    {p.position === "gk" ? (
                      <span className="font-mono text-[9px] font-medium tracking-wider text-accent">GK</span>
                    ) : null}
                    <span className="font-mono text-xs text-ink/70 tabular">{p.rating}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </LayoutGroup>

      {phase === "balanced" && naiveWinProbA !== null && balancedWinProbA !== null ? (
        <p className="mt-3 text-xs leading-relaxed text-ink-2">
          Splitting by sign-up order would have been{" "}
          <span className="font-display text-ink/90 tabular">
            {percent(naiveWinProbA)}/{100 - percent(naiveWinProbA)}
          </span>
          . Now it&rsquo;s{" "}
          <span className="font-display text-up tabular">
            {percent(balancedWinProbA)}/{100 - percent(balancedWinProbA)}
          </span>
          .
        </p>
      ) : null}
    </div>
  );
}

