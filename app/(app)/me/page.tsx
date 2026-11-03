import clsx from "clsx";
import { LogOut } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { logOut } from "@/app/auth-actions";
import { LEVEL_LABEL, POSITION_LABEL, formatShortDate, initials, signed } from "@/lib/format";
import { getRatingHistory } from "@/lib/service";
import { getViewer } from "../viewer";

export const metadata: Metadata = { title: "You" };

type Entry = Awaited<ReturnType<typeof getRatingHistory>>[number];

/** Rating over time, oldest to newest. */
function Sparkline({ history }: { history: Entry[] }) {
  const points = [...history].reverse();
  const values = [points[0].before, ...points.map((p) => p.after)];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 20);
  const w = 100;
  const h = 32;
  const xy = values.map((v, i) => [(i / (values.length - 1)) * w, h - ((v - min) / span) * (h - 4) - 2] as const);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
  const [lx, ly] = xy[xy.length - 1];
  return (
    <svg viewBox={`-2 -2 ${w + 4} ${h + 4}`} className="h-12 w-full overflow-visible" aria-hidden preserveAspectRatio="none">
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" className="text-chalk/50" />
      <circle cx={lx} cy={ly} r={2.2} className="fill-bib" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default async function MePage() {
  const viewer = await getViewer();
  const history = await getRatingHistory(viewer.id);
  const provisional = viewer.gamesPlayed < 5;
  const net = history.reduce((s, h) => s + (h.after - h.before), 0);

  return (
    <>
      <header className="flex items-center gap-3 pt-4">
        <span className="grid size-12 place-items-center rounded-full border border-night-line bg-night-raised font-display text-base font-bold">
          {initials(viewer.name)}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-extrabold tracking-tight">{viewer.name}</h1>
          <p className="text-sm text-muted">
            {POSITION_LABEL[viewer.position]} · Signed up as {LEVEL_LABEL[viewer.level].toLowerCase()}
          </p>
        </div>
      </header>

      <section className="relative mt-6 overflow-hidden rounded-3xl border border-night-line bg-night-raised/80 p-5">
        <div aria-hidden className="absolute inset-x-0 -top-1/2 h-full bg-floodlight-glow opacity-70" />
        <div className="relative flex items-start justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Rating</p>
          {provisional ? (
            <span className="rounded-full border border-floodlight/25 bg-floodlight/10 px-2.5 py-0.5 text-[11px] font-semibold text-floodlight">
              Provisional
            </span>
          ) : null}
        </div>
        <p className="relative mt-1 font-display text-7xl font-extrabold leading-none tracking-tight tabular">{viewer.rating}</p>
        <div className="relative mt-4 flex gap-6 text-sm">
          <div>
            <p className="font-display text-xl font-bold tabular">{viewer.gamesPlayed}</p>
            <p className="text-xs text-muted">games played</p>
          </div>
          {history.length > 0 ? (
            <div>
              <p className={clsx("font-display text-xl font-bold tabular", net > 0 ? "text-up" : net < 0 ? "text-down" : "")}>
                {signed(net)}
              </p>
              <p className="text-xs text-muted">last {history.length} {history.length === 1 ? "game" : "games"}</p>
            </div>
          ) : null}
        </div>
        {history.length >= 2 ? (
          <div className="relative mt-4">
            <Sparkline history={history} />
          </div>
        ) : null}
        {provisional ? (
          <p className="relative mt-4 text-xs leading-relaxed text-muted">
            Provisional until you&rsquo;ve played 5 games. Each result is still teaching Bibs how you play.
          </p>
        ) : null}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">History</h2>
        {history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-night-line px-4 py-8 text-center">
            <p className="text-sm text-muted">Play a game and your rating starts moving.</p>
            <Link href="/" className="mt-4 inline-block rounded-full bg-chalk px-4 py-2 text-sm font-semibold text-night">
              Find a game
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-night-line overflow-hidden rounded-2xl border border-night-line bg-night-raised/60">
            {history.map((h) => {
              const d = h.after - h.before;
              return (
                <li key={h.gameId}>
                  <Link href={`/games/${h.gameId}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-night-raised">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{h.title}</p>
                      <p className="text-xs text-muted">
                        {formatShortDate(h.startsAt)} ·{" "}
                        {h.won === null ? "Draw" : h.won ? <span className="text-up">Won</span> : <span className="text-down">Lost</span>}
                      </p>
                    </div>
                    <span className="font-display text-xs text-muted tabular">
                      {h.before} → <span className="text-chalk">{h.after}</span>
                    </span>
                    <span
                      className={clsx(
                        "w-14 text-right font-display text-sm font-bold tabular",
                        d > 0 ? "text-up" : d < 0 ? "text-down" : "text-muted",
                      )}
                    >
                      {d > 0 ? "▲ " : d < 0 ? "▼ " : ""}
                      {signed(d)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <form action={logOut} className="mt-10">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-night-line px-5 py-3.5 text-sm font-semibold text-chalk/80 transition hover:border-down/40 hover:text-down"
        >
          <LogOut className="size-4" aria-hidden />
          Log out
        </button>
      </form>
    </>
  );
}
