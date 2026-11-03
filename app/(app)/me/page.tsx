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
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} vectorEffect="non-scaling-stroke" className="text-ink/50" />
      <circle cx={lx} cy={ly} r={2.2} className="fill-accent" vectorEffect="non-scaling-stroke" />
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
        <span className="grid size-12 place-items-center rounded-full border border-line bg-card font-display text-base font-medium">
          {initials(viewer.name)}
        </span>
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-medium tracking-[-0.02em]">{viewer.name}</h1>
          <p className="text-sm text-ink-2">
            {POSITION_LABEL[viewer.position]} · Signed up as {LEVEL_LABEL[viewer.level].toLowerCase()}
          </p>
        </div>
      </header>

      <section className="relative mt-6 overflow-hidden rounded-xl border border-line bg-card/80 p-5">
        <div aria-hidden className="absolute inset-x-0 -top-1/2 h-full opacity-70" />
        <div className="relative flex items-start justify-between">
          <p className="eyebrow-plain">Rating</p>
          {provisional ? (
            <span className="rounded-full border border-accent/25 bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
              Provisional
            </span>
          ) : null}
        </div>
        <p className="relative mt-1 font-display text-7xl font-medium leading-none tracking-[-0.02em] tabular">{viewer.rating}</p>
        <div className="relative mt-4 flex gap-6 text-sm">
          <div>
            <p className="font-display text-xl font-medium tabular">{viewer.gamesPlayed}</p>
            <p className="text-xs text-ink-2">games played</p>
          </div>
          {history.length > 0 ? (
            <div>
              <p className={clsx("font-display text-xl font-medium tabular", net > 0 ? "text-up" : net < 0 ? "text-down" : "")}>
                {signed(net)}
              </p>
              <p className="text-xs text-ink-2">last {history.length} {history.length === 1 ? "game" : "games"}</p>
            </div>
          ) : null}
        </div>
        {history.length >= 2 ? (
          <div className="relative mt-4">
            <Sparkline history={history} />
          </div>
        ) : null}
        {provisional ? (
          <p className="relative mt-4 text-xs leading-relaxed text-ink-2">
            Provisional until you&rsquo;ve played 5 games. Each result is still teaching Bibs how you play.
          </p>
        ) : null}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 eyebrow-plain">History</h2>
        {history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center">
            <p className="text-sm text-ink-2">Play a game and your rating starts moving.</p>
            <Link href="/" className="mt-4 inline-block rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper">
              Find a game
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card/60">
            {history.map((h) => {
              const d = h.after - h.before;
              return (
                <li key={h.gameId}>
                  <Link href={`/games/${h.gameId}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-card">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{h.title}</p>
                      <p className="text-xs text-ink-2">
                        {formatShortDate(h.startsAt)} ·{" "}
                        {h.won === null ? "Draw" : h.won ? <span className="text-up">Won</span> : <span className="text-down">Lost</span>}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-ink-2 tabular">
                      {h.before} → <span className="text-ink">{h.after}</span>
                    </span>
                    <span
                      className={clsx(
                        "w-14 text-right font-mono text-sm font-medium tabular",
                        d > 0 ? "text-up" : d < 0 ? "text-down" : "text-ink-2",
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
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-line px-5 py-3.5 text-sm font-semibold text-ink/80 transition hover:border-down/40 hover:text-down"
        >
          <LogOut className="size-4" aria-hidden />
          Log out
        </button>
      </form>
    </>
  );
}
