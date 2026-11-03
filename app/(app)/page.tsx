import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FilterChips, parseGameQuery, type GameQuery } from "@/components/game/filter-chips";
import { GameCard } from "@/components/game/game-card";
import { firstName, greeting, nyMidnight } from "@/lib/format";
import { searchGames } from "@/lib/service";
import type { GameFilters } from "@/lib/types";
import { getViewer } from "./viewer";

export const metadata: Metadata = { title: "Games" };

function toFilters(q: GameQuery, now: Date): GameFilters {
  const filters: GameFilters = { fitsMyLevel: !!q.fit, limit: 50 };
  if (q.borough) filters.borough = q.borough;
  if (q.lights) filters.litOnly = true;
  if (q.when === "tonight") {
    filters.from = now.toISOString();
    filters.to = nyMidnight(1, now).toISOString();
  } else if (q.when === "week") {
    filters.from = now.toISOString();
    filters.to = new Date(now.getTime() + 7 * 86_400_000).toISOString();
  }
  return filters;
}

export default async function GamesPage({ searchParams }: PageProps<"/">) {
  const viewer = await getViewer();
  const query = parseGameQuery(await searchParams);
  const now = new Date();
  const games = await searchGames(viewer.id, toFilters(query, now));
  const filtered = !!(query.borough || query.when || query.lights || query.fit);

  return (
    <>
      <header className="flex items-end justify-between gap-4 pt-4">
        <div>
          <p className="text-sm text-muted">
            {greeting(now)}, {firstName(viewer.name)}
          </p>
          <h1 className="mt-0.5 font-display text-3xl font-extrabold tracking-tight">Find a game</h1>
        </div>
        <Link
          href="/me"
          className="flex flex-col items-end rounded-2xl border border-night-line bg-night-raised/70 px-3.5 py-2 transition hover:border-chalk/25"
        >
          <span className="font-display text-2xl font-extrabold leading-none tabular">{viewer.rating}</span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Your rating</span>
        </Link>
      </header>

      <div className="mt-6">
        <FilterChips query={query} />
      </div>

      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {games.length === 0
          ? "No games"
          : `${games.length} ${games.length === 1 ? "game" : "games"} ${
              query.when === "tonight" ? "tonight" : query.when === "week" ? "this week" : "in the next two weeks"
            }`}
      </p>

      {games.length === 0 ? (
        <div className="mt-3 flex flex-col items-center rounded-2xl border border-dashed border-night-line px-6 py-12 text-center">
          <SearchX className="size-7 text-muted" aria-hidden />
          <p className="mt-3 font-display text-lg font-bold">Nothing on that pitch</p>
          <p className="mt-1 text-sm text-muted">
            {filtered ? "Try a wider search. Most games go up a day or two ahead." : "No games are posted yet."}
          </p>
          {filtered ? (
            <Link href="/" className="mt-5 rounded-full bg-chalk px-4 py-2 text-sm font-semibold text-night">
              Clear filters
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {games.map((g) => (
            <li key={g.id}>
              <GameCard game={g} now={now} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
