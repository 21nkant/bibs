"use client";

// A game card rendered from a TOOL OUTPUT (never from model text). "Hold my spot" calls
// joinGameAction, the same server action as the Join button: the human tap is the only write,
// and the server re-checks every rule (rating range, overlap, capacity) on join.
import clsx from "clsx";
import { CircleAlert, Lightbulb, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { joinGameAction } from "@/app/actions";
import { holdEligibility, type AgentGame } from "@/lib/agent/game";
import type { JoinResult } from "@/lib/types";

type HoldState = { kind: "idle" } | { kind: "pending" } | { kind: "done"; result: JoinResult } | { kind: "failed" };

function SpotsLine({ game }: { game: AgentGame }) {
  if (game.spotsLeft > 0) {
    return (
      <span className="font-medium text-up tabular">
        {game.spotsLeft} {game.spotsLeft === 1 ? "spot" : "spots"} left
      </span>
    );
  }
  return (
    <span className="font-medium text-down tabular">
      Full{game.waitlistCount ? ` · ${game.waitlistCount} waiting` : ""}
    </span>
  );
}

function ViewerChip({ game }: { game: AgentGame }) {
  if (game.viewerSpot === "joined") {
    return (
      <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-paper">
        You&apos;re in
      </span>
    );
  }
  if (game.viewerSpot === "waitlist") {
    return (
      <span className="shrink-0 rounded-full border border-accent/60 px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-accent tabular">
        Waitlist #{game.viewerWaitlistPosition ?? "?"}
      </span>
    );
  }
  return null;
}

function HoldResult({ result }: { result: JoinResult }) {
  if (result.ok && result.status === "joined") {
    return (
      <p className="font-mono text-sm font-medium text-up" role="status">
        Joined ✓ <span className="font-sans font-normal text-ink/70">See you on the pitch.</span>
      </p>
    );
  }
  if (result.ok && result.status === "waitlist") {
    return (
      <p className="font-mono text-sm font-medium text-accent tabular" role="status">
        Waitlist #{result.position}. You&apos;ll move up automatically if a spot opens.
      </p>
    );
  }
  return (
    <p className="flex items-start gap-1.5 text-sm text-down" role="status">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {result.ok ? "Couldn't hold your spot." : result.message}
    </p>
  );
}

// Hold outcomes outlive the card: closing and reopening the sheet (or a later answer showing the
// same game) must not offer "Hold my spot" again for a game the player already holds.
const holdsByGame = new Map<string, HoldState>();

export function AssistantGameCard({
  game,
  highlighted = false,
  onNavigate,
}: {
  game: AgentGame;
  highlighted?: boolean; // proposed by the assistant via propose_booking
  onNavigate?: () => void;
}) {
  const [hold, setHoldState] = useState<HoldState>(() => holdsByGame.get(game.id) ?? { kind: "idle" });
  const setHold = (h: HoldState) => {
    if (h.kind === "done" && h.result.ok) holdsByGame.set(game.id, h);
    setHoldState(h);
  };
  const eligibility = holdEligibility(game, new Date());
  const field = [game.park, game.fieldNumber ? `Field ${game.fieldNumber}` : null, game.borough].filter(Boolean).join(" · ");

  async function onHold() {
    setHold({ kind: "pending" });
    try {
      setHold({ kind: "done", result: await joinGameAction(game.id) });
    } catch {
      setHold({ kind: "failed" });
    }
  }

  return (
    <article
      className={clsx(
        "rounded-xl border p-3.5",
        highlighted ? "border-accent/50 bg-card" : "border-line bg-card/80",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-[12px] font-medium uppercase tracking-[0.08em] text-ink/85 tabular">{game.when}</p>
        <ViewerChip game={game} />
      </div>
      <h4 className="mt-1 font-display text-lg font-medium leading-tight tracking-[-0.02em]">
        <Link href={`/games/${game.id}`} onClick={onNavigate} className="hover:underline decoration-ink/30 underline-offset-4">
          {game.title}
        </Link>
      </h4>
      <p className="mt-0.5 truncate text-[13px] text-ink-2">{field}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
        {game.lit ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 font-medium text-accent">
            <Lightbulb className="size-3" aria-hidden /> Lights
          </span>
        ) : (
          <span className="text-ink-2">No lights</span>
        )}
        <SpotsLine game={game} />
        <span className={clsx("tabular", game.viewerFits ? "text-ink/80" : "text-down")}>
          Rating {game.minRating}–{game.maxRating}
        </span>
      </div>

      <div className="mt-3">
        {hold.kind === "done" ? (
          <HoldResult result={hold.result} />
        ) : hold.kind === "failed" ? (
          <p className="text-sm text-down" role="status">Couldn&apos;t reach Bibs. Check your connection and try again.</p>
        ) : eligibility.canHold ? (
          <button
            type="button"
            onClick={onHold}
            disabled={hold.kind === "pending"}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent font-display text-[15px] font-medium text-paper transition active:scale-[0.98] disabled:opacity-70"
          >
            {hold.kind === "pending" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
            {hold.kind === "pending" ? "Holding…" : eligibility.joinsWaitlist ? "Join the waitlist" : "Hold my spot"}
          </button>
        ) : game.viewerSpot === null && eligibility.reason ? (
          <p className="text-[13px] text-ink-2">{eligibility.reason}</p>
        ) : null}
      </div>
    </article>
  );
}
