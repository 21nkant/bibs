import clsx from "clsx";
import { initials } from "@/lib/format";
import type { RosterPlayer } from "@/lib/types";
import { GkBadge } from "./badges";

function Row({ p, lead, isViewer }: { p: RosterPlayer; lead: string; isViewer: boolean }) {
  return (
    <li
      className={clsx(
        "flex items-center gap-3 rounded-xl px-3 py-2.5",
        isViewer ? "bg-bib/[0.08] ring-1 ring-bib/30" : "odd:bg-night-raised/50",
      )}
    >
      <span className="w-6 text-right font-display text-xs text-muted tabular">{lead}</span>
      <span className="grid size-8 shrink-0 place-items-center rounded-full border border-night-line bg-night font-display text-[11px] font-bold text-chalk/85">
        {initials(p.name)}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {p.name}
        {isViewer ? <span className="ml-1.5 text-xs font-semibold text-bib">You</span> : null}
      </span>
      {p.position === "gk" ? <GkBadge /> : null}
      <span className="w-11 text-right font-display text-sm font-semibold tabular">{p.rating}</span>
    </li>
  );
}

export function Roster({
  roster,
  capacity,
  viewerId,
  showJoined,
}: {
  roster: RosterPlayer[];
  capacity: number;
  viewerId: string;
  showJoined: boolean;
}) {
  if (!showJoined) return null; // once teams are set, the team board is the roster
  const joined = roster.filter((p) => p.status === "joined");
  const waitlist = roster.filter((p) => p.status === "waitlist");
  return (
    <>
      <section className="mt-8">
        <h2 className="mb-3 flex items-baseline justify-between text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Who&rsquo;s in
          <span className="font-display tabular text-chalk/80">
            {joined.length}/{capacity}
          </span>
        </h2>
        {joined.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-night-line px-4 py-6 text-center text-sm text-muted">
            Nobody yet. First one in sets the tone.
          </p>
        ) : (
          <ul className="space-y-1">
            {joined.map((p, i) => (
              <Row key={p.userId} p={p} lead={String(i + 1)} isViewer={p.userId === viewerId} />
            ))}
          </ul>
        )}
      </section>
      {waitlist.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 flex items-baseline justify-between text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Waitlist
            <span className="font-display tabular text-chalk/80">{waitlist.length}</span>
          </h2>
          <ul className="space-y-1">
            {waitlist.map((p, i) => (
              <Row key={p.userId} p={p} lead={`#${i + 1}`} isViewer={p.userId === viewerId} />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
