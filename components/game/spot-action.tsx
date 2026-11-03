"use client";

import clsx from "clsx";
import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { joinGameAction, leaveGameAction } from "@/app/actions";
import { Banner, type BannerMessage } from "@/components/ui/banner";
import type { GameStatus } from "@/lib/types";

type Props = {
  gameId: string;
  status: GameStatus;
  started: boolean;
  viewerSpot: "joined" | "waitlist" | null;
  viewerWaitlistPosition: number | null;
  viewerFits: boolean;
  viewerRating: number;
  spotsLeft: number;
  waitlistCount: number;
  minRating: number;
  maxRating: number;
};

type Mode =
  | { kind: "join"; label: string; sub: string }
  | { kind: "leave"; label: string; sub: string }
  | { kind: "blocked"; label: string; sub: string };

function modeFor(p: Props): Mode | null {
  if (p.status === "played") return null;
  if (p.status === "cancelled") return { kind: "blocked", label: "Game cancelled", sub: "The organizer called this one off." };
  if (p.status === "locked") {
    // A locked player's team is on the board; only outsiders need to hear why they can't join.
    if (p.viewerSpot === "joined") return null;
    return p.viewerSpot === "waitlist"
      ? {
          kind: "blocked",
          label: "Teams are set",
          sub: `You were on the waitlist (#${p.viewerWaitlistPosition ?? "?"}), and the organizer locked the roster.`,
        }
      : { kind: "blocked", label: "Teams are set", sub: "The organizer locked the roster for this game." };
  }
  if (p.started) return { kind: "blocked", label: "Already kicked off", sub: "This game has started." };
  if (p.viewerSpot === "joined") return { kind: "leave", label: "Leave game", sub: "Your spot goes to the next person on the waitlist." };
  if (p.viewerSpot === "waitlist") return { kind: "leave", label: "Leave waitlist", sub: "You'll lose your place in line." };
  if (!p.viewerFits) {
    return {
      kind: "blocked",
      label: "Not your level",
      sub: `This game is for ${p.minRating}–${p.maxRating}. You're ${p.viewerRating}.`,
    };
  }
  if (p.spotsLeft > 0) {
    return {
      kind: "join",
      label: "Join game",
      sub: p.spotsLeft === 1 ? "Last spot. It's yours if you take it." : `${p.spotsLeft} spots left.`,
    };
  }
  return { kind: "join", label: "Join waitlist", sub: `It's full. You'd be #${p.waitlistCount + 1} in line.` };
}

export function SpotAction(props: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<BannerMessage | null>(null);
  const [confirming, setConfirming] = useState(false);
  const armedAt = useRef(0);
  const seq = useRef(0);
  const mode = modeFor(props);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  if (!mode) return null;

  const say = (tone: BannerMessage["tone"], text: string) => setMessage({ tone, text, id: ++seq.current });

  function run() {
    if (!mode || mode.kind === "blocked") return;
    if (mode.kind === "leave" && (!confirming || Date.now() - armedAt.current < 400)) {
      // A double-tap must not count as the confirming second tap.
      if (!confirming) armedAt.current = Date.now();
      setConfirming(true);
      return;
    }
    setConfirming(false);
    startTransition(async () => {
      if (mode.kind === "join") {
        const r = await joinGameAction(props.gameId);
        if (!r.ok) say("error", r.message);
        else if (r.status === "joined") say("success", "You're in. See you on the field.");
        else say("info", `You're #${r.position} on the waitlist. If someone drops, you move up automatically.`);
      } else {
        const r = await leaveGameAction(props.gameId);
        if (!r.ok) say("error", r.message);
        else if (r.promoted) say("info", `You're out. Spot passed to ${r.promoted.name}.`);
        else say("info", "You're out. Your spot is open again.");
      }
    });
  }

  const blocked = mode.kind === "blocked";
  const label = pending
    ? mode.kind === "join"
      ? mode.label === "Join waitlist"
        ? "Getting you in line"
        : "Holding your spot"
      : "Leaving"
    : confirming
      ? "Tap again to give up your spot"
      : mode.label;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={run}
        disabled={blocked || pending}
        aria-busy={pending || undefined}
        className={clsx(
          "flex w-full items-center justify-center gap-2 rounded-[3px] border px-5 py-3.5 text-[15px] font-medium transition",
          mode.kind === "join" &&
            "border-ink bg-ink text-paper hover:opacity-90 disabled:opacity-70",
          mode.kind === "leave" &&
            (confirming
              ? "border-down/60 bg-down/10 text-down"
              : "border-line-strong bg-transparent text-ink hover:border-ink"),
          blocked && "cursor-not-allowed border-line bg-card text-ink-3",
          pending && "cursor-wait",
        )}
      >
        {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : null}
        {label}
      </button>
      <p className="text-center text-xs text-ink-2">{mode.sub}</p>
      <Banner message={message} />
    </div>
  );
}
