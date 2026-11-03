"use client";

// A visible trail of what the assistant did, built from the tool parts of the message:
// "Searching Brooklyn · Thu 5–11 PM · lights → 3 games". It shows the filters the server actually
// applied (from the tool output), so the player can see exactly how their words were interpreted.
import clsx from "clsx";
import { CalendarDays, Check, CircleAlert, Info, LoaderCircle, Search, Ticket } from "lucide-react";
import type { ReactNode } from "react";
import { formatWindow, parseNyTime } from "@/lib/agent/time";
import type { BibsUIMessage } from "@/lib/agent/ui";

type Part = BibsUIMessage["parts"][number];
export type ToolPart = Extract<
  Part,
  { type: "tool-search_games" | "tool-get_game" | "tool-get_my_games" | "tool-propose_booking" }
>;

export function isBibsToolPart(p: Part): p is ToolPart {
  return p.type === "tool-search_games" || p.type === "tool-get_game" || p.type === "tool-get_my_games" || p.type === "tool-propose_booking";
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function windowLabel(from?: string, to?: string): string | null {
  if (!from && !to) return "next 7 days";
  const a = from ? parseNyTime(from) : null;
  const b = to ? parseNyTime(to) : null;
  if (!a || !b) return null;
  return formatWindow(a.toISOString(), b.toISOString());
}

function searchLabel(part: Extract<ToolPart, { type: "tool-search_games" }>): string {
  const input = part.input ?? {};
  const applied = part.state === "output-available" ? part.output.applied : null;
  const borough = applied?.borough ?? input.borough ?? "all boroughs";
  const bits = [
    `Searching ${borough}`,
    // Show the requested window; fall back to the applied one when the model left it open.
    windowLabel(input.from, input.to) ?? (applied ? windowLabel(applied.from, applied.to) : null),
    (applied?.litOnly ?? input.litOnly) ? "lights" : null,
    (applied?.hasSpots ?? input.hasSpots) ? "open spots" : null,
    (applied?.fitsMyLevel ?? input.fitsMyLevel) === false ? "any level" : null,
  ].filter(Boolean);
  return bits.join(" · ");
}

function describe(part: ToolPart): { icon: ReactNode; label: string; result: string | null } {
  const done = part.state === "output-available";
  switch (part.type) {
    case "tool-search_games":
      return {
        icon: <Search className="size-3.5" aria-hidden />,
        label: searchLabel(part),
        result: done ? plural(part.output.count, "game") : null,
      };
    case "tool-get_my_games":
      return {
        icon: <CalendarDays className="size-3.5" aria-hidden />,
        label: "Checking your games",
        result: done ? `${part.output.count} upcoming` : null,
      };
    case "tool-get_game":
      return {
        icon: <Info className="size-3.5" aria-hidden />,
        label: done ? `Looking up ${part.output.game.title}` : "Looking up a game",
        result: done ? plural(part.output.game.spotsLeft, "spot") + " left" : null,
      };
    case "tool-propose_booking":
      return {
        icon: <Ticket className="size-3.5" aria-hidden />,
        label: done ? `Lining up ${part.output.game.title}` : "Lining up a spot",
        result: done ? (part.output.canHold ? "ready to hold" : "can't hold") : null,
      };
  }
}

export function StepTrail({ parts }: { parts: ToolPart[] }) {
  if (!parts.length) return null;
  return (
    <ol className="mb-2 space-y-1" aria-label="What Bibs did">
      {parts.map((part) => {
        const { icon, label, result } = describe(part);
        const failed = part.state === "output-error" || part.state === "output-denied";
        const running = !failed && part.state !== "output-available";
        return (
          <li
            key={part.toolCallId}
            className={clsx(
              "flex items-start gap-2 text-[12px] leading-5",
              failed ? "text-down" : running ? "text-ink/70" : "text-ink-2",
            )}
          >
            <span className="mt-[3px] shrink-0">
              {running ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : failed ? <CircleAlert className="size-3.5" aria-hidden /> : icon}
            </span>
            <span className="min-w-0">
              {label}
              {result ? (
                <>
                  <span className="text-ink-2/70"> → </span>
                  <span className="font-medium text-ink/85">{result}</span>
                  <Check className="ml-1 inline size-3 text-up" aria-hidden />
                </>
              ) : failed ? (
                <span> · {part.state === "output-error" ? "couldn't complete" : "skipped"}</span>
              ) : (
                <span className="text-ink-2/70">…</span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
