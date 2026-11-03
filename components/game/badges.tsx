import clsx from "clsx";
import { Lightbulb } from "lucide-react";
import type { ReactNode } from "react";
import type { GameStatus, GameSummary } from "@/lib/types";

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border border-night-line px-2 py-0.5 text-[11px] font-medium text-chalk/80",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function LightsBadge() {
  return (
    <Badge className="border-floodlight/20 bg-floodlight/10 text-floodlight">
      <Lightbulb className="size-3" aria-hidden />
      Lights
    </Badge>
  );
}

export function GkBadge() {
  return (
    <span className="rounded-md bg-floodlight/12 px-1.5 py-px font-display text-[10px] font-bold tracking-wider text-floodlight">
      GK
    </span>
  );
}

const STATUS: Partial<Record<GameStatus, { label: string; className: string }>> = {
  locked: { label: "Teams set", className: "border-up/30 bg-up/10 text-up" },
  played: { label: "Final", className: "border-night-line bg-night-line/60 text-chalk/80" },
  cancelled: { label: "Cancelled", className: "border-down/30 bg-down/10 text-down" },
};

export function StatusBadge({ status }: { status: GameStatus }) {
  const s = STATUS[status];
  return s ? <Badge className={s.className}>{s.label}</Badge> : null;
}

/** The viewer's own relationship to a game: "Joined" or "Waitlist #2". */
export function ViewerSpotBadge({ game }: { game: Pick<GameSummary, "viewerSpot" | "viewerWaitlistPosition"> }) {
  if (game.viewerSpot === "joined") {
    return (
      <span className="rounded-full bg-bib px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-wider text-night">
        Joined
      </span>
    );
  }
  if (game.viewerSpot === "waitlist") {
    return (
      <span className="rounded-full border border-bib/60 px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-wider text-bib tabular">
        Waitlist #{game.viewerWaitlistPosition ?? "?"}
      </span>
    );
  }
  return null;
}
