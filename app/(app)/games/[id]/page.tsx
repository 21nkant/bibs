import clsx from "clsx";
import { ChevronLeft, Lightbulb, MapPin, Quote } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { StatusBadge } from "@/components/game/badges";
import { fieldLine } from "@/components/game/game-card";
import { MatchCenter } from "@/components/game/match-center";
import { Roster } from "@/components/game/roster";
import { SpotAction } from "@/components/game/spot-action";
import { SpotsMeter } from "@/components/game/spots-meter";
import { ACCESS, firstName, formatDay, formatTimeRange, levelRange } from "@/lib/format";
import { getGame } from "@/lib/service";
import { getViewer } from "../../viewer";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Metadata and the page share one read per request.
const load = cache(async (id: string) => {
  if (!UUID.test(id)) return null;
  const viewer = await getViewer();
  const game = await getGame(viewer.id, id);
  return game ? { viewer, game } : null;
});

export async function generateMetadata({ params }: PageProps<"/games/[id]">): Promise<Metadata> {
  const data = await load((await params).id);
  return { title: data?.game.title ?? "Game" };
}

export default async function GamePage({ params }: PageProps<"/games/[id]">) {
  const data = await load((await params).id);
  if (!data) notFound();
  const { viewer, game } = data;
  const now = new Date();
  const day = formatDay(game.startsAt, now);
  const joined = game.roster.filter((p) => p.status === "joined");
  const fits = game.viewerFits;
  const teamsShown = game.status === "locked" || game.status === "played";

  return (
    <>
      <nav className="flex items-center justify-between pt-1">
        <Link
          href="/"
          className="-ml-2 inline-flex items-center gap-0.5 rounded-full py-1.5 pl-1 pr-3 text-sm font-medium text-chalk/80 transition hover:bg-night-raised hover:text-chalk"
        >
          <ChevronLeft className="size-5" aria-hidden />
          Games
        </Link>
        <StatusBadge status={game.status} />
      </nav>

      <header className="mt-5">
        <p className="font-display text-sm font-bold uppercase tracking-[0.1em]">
          <span className={day === "Tonight" || day === "Today" ? "text-bib" : "text-chalk"}>{day}</span>
          <span className="text-muted"> · </span>
          <span className="text-chalk/85 tabular">{formatTimeRange(game.startsAt, game.durationMin)}</span>
        </p>
        <h1 className="mt-1.5 font-display text-[2rem] font-extrabold leading-[1.05] tracking-tight text-balance">
          {game.title}
        </h1>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-chalk/75">
          <MapPin className="size-4 shrink-0 text-muted" aria-hidden />
          <span className="truncate">{fieldLine(game.field)}</span>
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {game.field.lit ? (
            <span className="inline-flex items-center gap-1 text-floodlight">
              <Lightbulb className="size-3.5" aria-hidden /> Floodlit
            </span>
          ) : (
            <span>No lights</span>
          )}
          {game.field.surface ? <span className="capitalize">{game.field.surface}</span> : null}
          <span>
            Organized by {game.viewerIsOrganizer ? "you" : game.organizer.name}
          </span>
        </p>
      </header>

      <dl className="mt-6 divide-y divide-night-line overflow-hidden rounded-2xl border border-night-line bg-night-raised/80">
        <div className="px-4 py-3.5">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{ACCESS[game.access].label}</dt>
          <dd className="mt-1 text-sm text-chalk/85">{ACCESS[game.access].explain}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Level</dt>
            <dd className="mt-1 font-display text-lg font-bold tabular">{levelRange(game.minRating, game.maxRating)}</dd>
          </div>
          <dd
            className={clsx(
              "rounded-full px-3 py-1 text-xs font-semibold",
              fits ? "bg-up/10 text-up" : "bg-down/10 text-down",
            )}
          >
            {fits ? `You're ${viewer.rating}, in range` : `You're ${viewer.rating}, outside range`}
          </dd>
        </div>
        <div className="px-4 py-4">
          <dt className="sr-only">Spots</dt>
          <dd>
            <SpotsMeter
              capacity={game.capacity}
              joined={game.joinedCount}
              waitlist={game.waitlistCount}
              viewerJoined={game.viewerSpot === "joined"}
            />
          </dd>
        </div>
      </dl>

      <MatchCenter
        gameId={game.id}
        status={game.status}
        viewerId={viewer.id}
        viewerIsOrganizer={game.viewerIsOrganizer}
        joined={joined}
        capacity={game.capacity}
        naiveWinProbA={game.naiveWinProbA}
        balancedWinProbA={game.balancedWinProbA}
        scoreA={game.scoreA}
        scoreB={game.scoreB}
      />

      <div className="mt-5">
        <SpotAction
          gameId={game.id}
          status={game.status}
          started={new Date(game.startsAt).getTime() <= now.getTime()}
          viewerSpot={game.viewerSpot}
          viewerFits={game.viewerFits}
          viewerRating={viewer.rating}
          spotsLeft={game.spotsLeft}
          waitlistCount={game.waitlistCount}
          minRating={game.minRating}
          maxRating={game.maxRating}
        />
      </div>

      {game.note ? (
        <figure className="mt-8 rounded-2xl border border-night-line bg-night-raised/50 p-4">
          <Quote className="size-4 text-bib" aria-hidden />
          <blockquote className="mt-2 whitespace-pre-line text-sm leading-relaxed text-chalk/85">{game.note}</blockquote>
          <figcaption className="mt-2 text-xs text-muted">
            {game.viewerIsOrganizer ? "Your note" : `From ${firstName(game.organizer.name)}, the organizer`}
          </figcaption>
        </figure>
      ) : null}



      <Roster roster={game.roster} capacity={game.capacity} viewerId={viewer.id} showJoined={!teamsShown} />
    </>
  );
}
