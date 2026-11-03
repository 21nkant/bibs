import clsx from "clsx";
import { Lightbulb } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { BOROUGHS, type Borough } from "@/lib/types";

export type GameQuery = {
  borough?: Borough;
  when?: "tonight" | "week";
  lights?: boolean;
  fit?: boolean;
};

export function parseGameQuery(sp: Record<string, string | string[] | undefined>): GameQuery {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);
  const borough = BOROUGHS.find((b) => b === one("borough"));
  const when = one("when");
  return {
    borough,
    when: when === "tonight" || when === "week" ? when : undefined,
    lights: one("lights") === "1",
    fit: one("fit") === "1",
  };
}

function href(q: GameQuery) {
  const p = new URLSearchParams();
  if (q.borough) p.set("borough", q.borough);
  if (q.when) p.set("when", q.when);
  if (q.lights) p.set("lights", "1");
  if (q.fit) p.set("fit", "1");
  const s = p.toString();
  return s ? `/?${s}` : "/";
}

function Chip({ to, active, children }: { to: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={to}
      scroll={false}
      aria-pressed={active}
      className={clsx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-[3px] border px-3 py-1.5 text-[13px] font-medium transition",
        active
          ? "border-ink bg-ink text-paper"
          : "border-line-strong bg-transparent text-ink-2 hover:border-ink hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}

export function FilterChips({ query }: { query: GameQuery }) {
  return (
    <div className="space-y-2">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <Chip to={href({ ...query, borough: undefined })} active={!query.borough}>
          All NYC
        </Chip>
        {BOROUGHS.map((b) => (
          <Chip key={b} to={href({ ...query, borough: query.borough === b ? undefined : b })} active={query.borough === b}>
            {b}
          </Chip>
        ))}
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <Chip to={href({ ...query, when: query.when === "tonight" ? undefined : "tonight" })} active={query.when === "tonight"}>
          Tonight
        </Chip>
        <Chip to={href({ ...query, when: query.when === "week" ? undefined : "week" })} active={query.when === "week"}>
          This week
        </Chip>
        <Chip to={href({ ...query, lights: !query.lights })} active={!!query.lights}>
          <Lightbulb className="size-3.5" aria-hidden />
          Lights only
        </Chip>
        <Chip to={href({ ...query, fit: !query.fit })} active={!!query.fit}>
          My level
        </Chip>
      </div>
    </div>
  );
}
