import { CalendarX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { GameCard } from "@/components/game/game-card";
import { getMyGames } from "@/lib/service";
import type { GameSummary } from "@/lib/types";
import { getViewer } from "../viewer";

export const metadata: Metadata = { title: "My games" };

function Group({ title, games, now, empty }: { title: string; games: GameSummary[]; now: Date; empty: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-baseline justify-between eyebrow-plain">
        {title}
        <span className="font-display tabular text-ink/80">{games.length}</span>
      </h2>
      {games.length === 0 ? (
        empty
      ) : (
        <ul className="space-y-3">
          {games.map((g) => (
            <li key={g.id}>
              <GameCard game={g} now={now} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function MyGamesPage() {
  const viewer = await getViewer();
  const games = await getMyGames(viewer.id);
  const now = new Date();
  const upcoming = games.filter((g) => g.viewerSpot === "joined");
  // A waitlist spot on a locked game is history, not a plan.
  const waitlist = games.filter((g) => g.viewerSpot === "waitlist" && g.status === "open");

  return (
    <>
      <header className="pt-4">
        <p className="text-sm text-ink-2">Where you&rsquo;re playing</p>
        <h1 className="mt-0.5 font-display text-3xl font-medium tracking-[-0.02em]">My games</h1>
      </header>

      {games.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-xl border border-dashed border-line px-6 py-14 text-center">
          <CalendarX className="size-7 text-ink-2" aria-hidden />
          <p className="mt-3 font-display text-lg font-medium">Nothing on the calendar</p>
          <p className="mt-1 max-w-[16rem] text-sm text-ink-2">
            There&rsquo;s usually a game tonight somewhere in the city. Grab a spot before it fills.
          </p>
          <Link href="/" className="mt-5 rounded-full bg-accent px-5 py-2.5 font-mono text-sm font-medium text-paper">
            Find a game
          </Link>
        </div>
      ) : (
        <>
          <Group
            title="Upcoming"
            games={upcoming}
            now={now}
            empty={
              <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-2">
                No confirmed spots yet.{" "}
                <Link href="/" className="font-medium text-ink underline underline-offset-4">
                  Find a game
                </Link>
              </p>
            }
          />
          {waitlist.length > 0 ? (
            <Group
              title="Waitlist"
              games={waitlist}
              now={now}
              empty={null}
            />
          ) : null}
          {waitlist.length > 0 ? (
            <p className="mt-3 px-1 text-xs leading-relaxed text-ink-2">
              When someone drops, the next person in line gets the spot automatically. It&rsquo;ll move to Upcoming.
            </p>
          ) : null}
        </>
      )}
    </>
  );
}
