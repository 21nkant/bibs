"use client";

import clsx from "clsx";
import { Minus, Plus, Shuffle } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState, useTransition } from "react";
import { lockGameAction, submitResultAction } from "@/app/actions";
import { Banner, type BannerMessage } from "@/components/ui/banner";
import { PrimaryButton } from "@/components/ui/submit-button";
import { signed } from "@/lib/format";
import type { GameStatus, RatingChange, RosterPlayer } from "@/lib/types";
import { Odometer } from "./odometer";
import { TeamBoard } from "./team-board";

export type MatchProps = {
  gameId: string;
  status: GameStatus;
  viewerId: string;
  viewerIsOrganizer: boolean;
  joined: RosterPlayer[]; // sign-up order
  capacity: number;
  naiveWinProbA: number | null;
  balancedWinProbA: number | null;
  scoreA: number | null;
  scoreB: number | null;
};

/**
 * Everything after sign-ups: lock & balance (organizer), the teams, the result, and the rating moves.
 * One client component across those states, so the shuffle and odometers survive the server refresh.
 */
export function MatchCenter(p: MatchProps) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<BannerMessage | null>(null);
  const [shuffleKey, setShuffleKey] = useState(0);
  const [changes, setChanges] = useState<RatingChange[] | null>(null);
  const seq = useRef(0);
  const say = (tone: BannerMessage["tone"], text: string) => setMessage({ tone, text, id: ++seq.current });

  const teamsReady = p.joined.length > 0 && p.joined.every((x) => x.team !== null);

  function lock() {
    // Arm the shuffle first, so the board mounts straight into the naive split when the
    // refreshed (locked) game arrives instead of flashing the balanced teams.
    setShuffleKey((k) => k + 1);
    startTransition(async () => {
      const r = await lockGameAction(p.gameId);
      if (!r.ok) return say("error", r.message);
      setMessage(null);
    });
  }

  function submit(a: number, b: number) {
    startTransition(async () => {
      const r = await submitResultAction(p.gameId, a, b);
      if (!r.ok) return say("error", r.message);
      setMessage(null);
      setChanges(r.changes);
    });
  }

  if (p.status === "cancelled") return null;

  // Open: only the organizer has something to do here.
  if (p.status === "open" || !teamsReady) {
    if (!p.viewerIsOrganizer || p.status !== "open") return null;
    return (
      <Section title="Organizer">
        <div className="surface-dark rounded-xl border border-line bg-card p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
              <Shuffle className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-display text-base font-medium">Lock &amp; balance teams</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">
                <span className="font-display text-ink tabular">
                  {p.joined.length}/{p.capacity}
                </span>{" "}
                in. Locking closes the roster and splits everyone into two even teams by rating.
              </p>
            </div>
          </div>
          <PrimaryButton className="mt-4" onClick={lock} pending={pending} pendingLabel="Balancing teams">
            Lock &amp; balance teams
          </PrimaryButton>
          <Banner message={message} className="mt-3" />
        </div>
      </Section>
    );
  }

  return (
    <>
      {p.status === "played" ? (
        <Section title="Final">
          <Result p={p} changes={changes} />
        </Section>
      ) : null}

      {p.status === "locked" ? (
      <Section title="Teams">
        <div className="surface-dark rounded-xl border border-line bg-card p-4">
          <TeamBoard
            key={shuffleKey}
            joined={p.joined}
            naiveWinProbA={p.naiveWinProbA}
            balancedWinProbA={p.balancedWinProbA}
            viewerId={p.viewerId}
            play={shuffleKey > 0}
            onReplay={() => setShuffleKey((k) => k + 1)}
          />
        </div>
      </Section>
      ) : null}

      {p.status === "locked" && p.viewerIsOrganizer ? (
        <Section title="After the game">
          <ScoreForm pending={pending} onSubmit={submit} />
          <Banner message={message} className="mt-3" />
        </Section>
      ) : null}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 eyebrow-plain">{title}</h2>
      {children}
    </section>
  );
}

function ScoreForm({ pending, onSubmit }: { pending: boolean; onSubmit: (a: number, b: number) => void }) {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  return (
    <div className="surface-dark rounded-xl border border-line bg-card p-4">
      <p className="font-display text-base font-medium">Enter result</p>
      <p className="mt-1 text-sm text-ink-2">Ratings update for everyone the moment you save.</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stepper label="Bibs" tone="A" value={a} onChange={setA} />
        <Stepper label="No bibs" tone="B" value={b} onChange={setB} />
      </div>
      <PrimaryButton className="mt-4" onClick={() => onSubmit(a, b)} pending={pending} pendingLabel="Saving result">
        Save result · {a}–{b}
      </PrimaryButton>
    </div>
  );
}

function Stepper({
  label,
  tone,
  value,
  onChange,
}: {
  label: string;
  tone: "A" | "B";
  value: number;
  onChange: (v: number) => void;
}) {
  const btn =
    "grid size-10 place-items-center rounded-full border border-line bg-paper text-ink transition hover:border-ink/30 active:scale-95 disabled:opacity-30";
  return (
    <div
      className={clsx(
        "flex flex-col items-center rounded-xl border px-3 py-3",
        tone === "A" ? "border-accent/25 bg-accent/[0.06]" : "border-ink/15 bg-ink/[0.03]",
      )}
    >
      <span className={clsx("font-mono text-sm font-medium", tone === "A" ? "text-accent" : "text-ink")}>{label}</span>
      <motion.span
        key={value}
        initial={{ y: -6, opacity: 0.4 }}
        animate={{ y: 0, opacity: 1 }}
        className="my-1 font-display text-5xl font-medium tabular"
      >
        {value}
      </motion.span>
      <div className="flex gap-3">
        <button type="button" aria-label={`${label} minus one`} className={btn} disabled={value <= 0} onClick={() => onChange(value - 1)}>
          <Minus className="size-4" />
        </button>
        <button type="button" aria-label={`${label} plus one`} className={btn} disabled={value >= 30} onClick={() => onChange(value + 1)}>
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

type Move = { userId: string; name: string; team: "A" | "B"; before: number; after: number };

function Result({ p, changes }: { p: MatchProps; changes: RatingChange[] | null }) {
  const moves: Move[] =
    changes ??
    p.joined
      .filter((x) => x.team && x.ratingBefore !== null && x.ratingAfter !== null)
      .map((x) => ({ userId: x.userId, name: x.name, team: x.team!, before: x.ratingBefore!, after: x.ratingAfter! }));
  const animate = changes !== null;
  const a = p.scoreA ?? 0;
  const b = p.scoreB ?? 0;
  const verdict = a === b ? "Draw" : a > b ? "Bibs win" : "No bibs win";

  return (
    <div className="surface-dark rounded-xl border border-line bg-card p-4">
      <div className="flex items-center justify-center gap-5">
        <div className="text-center">
          <p className="font-mono text-sm font-medium text-accent">Bibs</p>
          <p className="font-display text-6xl font-medium tabular">{a}</p>
        </div>
        <span className="font-display text-2xl text-ink-2">–</span>
        <div className="text-center">
          <p className="font-mono text-sm font-medium text-ink">No bibs</p>
          <p className="font-display text-6xl font-medium tabular">{b}</p>
        </div>
      </div>
      <p className="mt-1 text-center eyebrow-plain">{verdict}</p>

      <div className="mt-5 space-y-4">
        {(["A", "B"] as const).map((t) => (
          <ul key={t} className="space-y-0.5">
            <li className="flex items-center justify-between px-2 pb-1">
              <span className={clsx("font-mono text-xs font-medium", t === "A" ? "text-accent" : "text-ink")}>
                {t === "A" ? "Bibs" : "No bibs"}
              </span>
              <span className="eyebrow-plain">Rating</span>
            </li>
            {moves
              .filter((m) => m.team === t)
              .sort((x, y) => y.after - x.after)
              .map((m, i) => {
                const d = m.after - m.before;
                return (
                  <li
                    key={m.userId}
                    className={clsx(
                      "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm",
                      m.userId === p.viewerId && "bg-ink/[0.07] ring-1 ring-ink/15",
                    )}
                  >
                    <span
                      className={clsx(
                        "size-2.5 shrink-0 rounded-full border",
                        t === "A" ? "border-accent bg-accent" : "border-ink/65",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {m.userId === p.viewerId ? "You" : m.name}
                    </span>
                    <span className="font-mono text-xs text-ink-2 tabular">{m.before}</span>
                    <span className="text-xs text-ink-2" aria-hidden>
                      →
                    </span>
                    {animate ? (
                      <Odometer from={m.before} to={m.after} delay={0.4 + i * 0.1} className="font-mono text-sm font-medium" />
                    ) : (
                      <span className="font-mono text-sm font-medium tabular">{m.after}</span>
                    )}
                    <motion.span
                      initial={animate ? { opacity: 0, scale: 0.6 } : false}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: animate ? 1 + i * 0.1 : 0, type: "spring", stiffness: 400, damping: 22 }}
                      className={clsx(
                        "w-14 text-right font-mono text-xs font-medium tabular",
                        d > 0 ? "text-up" : d < 0 ? "text-down" : "text-ink-2",
                      )}
                    >
                      {d > 0 ? "▲ " : d < 0 ? "▼ " : ""}
                      {signed(d)}
                    </motion.span>
                  </li>
                );
              })}
          </ul>
        ))}
      </div>
    </div>
  );
}
