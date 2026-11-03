import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { ACCESS, formatDay, formatTime, levelRange } from "@/lib/format";
import type { GameSummary } from "@/lib/types";
import { Badge, LightsBadge, StatusBadge, ViewerSpotBadge } from "./badges";
import { SpotsMeter } from "./spots-meter";

export function fieldLine(field: GameSummary["field"]) {
  return [field.park, field.fieldNumber ? `Field ${field.fieldNumber}` : null, field.borough].filter(Boolean).join(" · ");
}

export function GameCard({ game, now }: { game: GameSummary; now: Date }) {
  const day = formatDay(game.startsAt, now);
  const dim = !game.viewerFits && game.viewerSpot === null;
  return (
    <Link
      href={`/games/${game.id}`}
      className={clsx(
        "group block rounded-2xl border border-night-line bg-night-raised/80 p-4 transition hover:border-chalk/20 hover:bg-night-raised active:scale-[0.995]",
        dim && "opacity-55 hover:opacity-80",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-[13px] font-bold uppercase tracking-[0.08em]">
          <span className={day === "Tonight" || day === "Today" ? "text-bib" : "text-chalk/85"}>{day}</span>
          <span className="text-muted"> · </span>
          <span className="text-chalk/85 tabular">{formatTime(game.startsAt)}</span>
        </p>
        <ViewerSpotBadge game={game} />
      </div>
      <h3 className="mt-1.5 flex items-center gap-1 font-display text-xl font-bold leading-tight tracking-tight">
        <span className="truncate">{game.title}</span>
        <ChevronRight className="size-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-chalk" aria-hidden />
      </h3>
      <p className="mt-0.5 truncate text-sm text-muted">{fieldLine(game.field)}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {game.field.lit ? <LightsBadge /> : null}
        <Badge>{ACCESS[game.access].label}</Badge>
        <Badge className="font-display tabular">{levelRange(game.minRating, game.maxRating)}</Badge>
        <StatusBadge status={game.status} />
      </div>

      {dim ? (
        <p className="mt-3 text-xs font-medium text-chalk/80">
          Not your level: <span className="font-display tabular">{levelRange(game.minRating, game.maxRating)}</span>
        </p>
      ) : null}

      <SpotsMeter
        className="mt-4"
        capacity={game.capacity}
        joined={game.joinedCount}
        waitlist={game.waitlistCount}
        viewerJoined={game.viewerSpot === "joined"}
      />
    </Link>
  );
}
