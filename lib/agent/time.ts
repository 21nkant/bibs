// New York time helpers for the assistant. Pure (no server imports), so the tools, the system
// prompt, the evals and the client UI all format and parse time the same way.
import { TIME_ZONE } from "@/lib/types";

type NyParts = { year: number; month: number; day: number; hour: number; minute: number; weekday: string };

const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  weekday: "short",
  hourCycle: "h23",
});

export function nyParts(d: Date): NyParts {
  const p = Object.fromEntries(partsFmt.formatToParts(d).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    weekday: p.weekday,
  };
}

// Minutes east of UTC for New York at instant `d` (-300 in winter, -240 in summer).
export function nyOffsetMinutes(d: Date): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, timeZoneName: "longOffset" })
    .formatToParts(d)
    .find((p) => p.type === "timeZoneName")!.value; // "GMT-05:00"
  const m = name.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

export function nyOffsetLabel(d: Date): string {
  const off = nyOffsetMinutes(d);
  const sign = off < 0 ? "-" : "+";
  const abs = Math.abs(off);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

// A New York wall-clock time -> the real instant (handles DST by re-checking the offset).
export function nyWallTime(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const first = new Date(guess - nyOffsetMinutes(new Date(guess)) * 60_000);
  return new Date(guess - nyOffsetMinutes(first) * 60_000);
}

// ISO 8601 with an explicit New York offset, e.g. 2026-11-05T19:00:00-05:00.
export function toNyIso(d: Date): string {
  const p = nyParts(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:00${nyOffsetLabel(d)}`;
}

// Parses a model-supplied time. With an offset or Z it is exact; without one it is read as New York
// wall time (models sometimes drop the offset). Returns null for anything unparseable.
export function parseNyTime(input: string): Date | null {
  const s = input.trim();
  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(s)) {
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : new Date(t);
  }
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const d = nyWallTime(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function nyDateKey(d: Date): string {
  const p = nyParts(d);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_DAYS: Record<string, string> = {
  Sun: "Sunday", Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday",
};

function clock(hour: number, minute: number, withSuffix = true): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const mm = minute ? `:${String(minute).padStart(2, "0")}` : "";
  return withSuffix ? `${h}${mm} ${hour < 12 ? "AM" : "PM"}` : `${h}${mm}`;
}

// "Thu Nov 5 · 7 PM" — the label the model quotes and the cards show.
export function formatWhen(d: Date | string): string {
  const p = nyParts(typeof d === "string" ? new Date(d) : d);
  return `${p.weekday} ${MONTHS[p.month - 1]} ${p.day} · ${clock(p.hour, p.minute)}`;
}

// "Tuesday, Nov 3, 2026, 10 AM"
export function formatNowLong(d: Date): string {
  const p = nyParts(d);
  return `${LONG_DAYS[p.weekday]}, ${MONTHS[p.month - 1]} ${p.day}, ${p.year}, ${clock(p.hour, p.minute)}`;
}

// Short label for a search window, for the step trail: "Thu 6–11 PM", "Sat Nov 7 – Sun Nov 8".
export function formatWindow(fromIso: string, toIso: string): string {
  const a = nyParts(new Date(fromIso));
  const b = nyParts(new Date(toIso));
  const sameDay = a.year === b.year && a.month === b.month && a.day === b.day;
  if (sameDay) {
    const sameHalf = a.hour < 12 === b.hour < 12;
    return `${a.weekday} ${clock(a.hour, a.minute, !sameHalf)}–${clock(b.hour, b.minute)}`;
  }
  // A window ending at midnight reads better as "through the previous day".
  const end = b.hour === 0 && b.minute === 0 ? nyParts(new Date(new Date(toIso).getTime() - 60_000)) : b;
  const startLabel = `${a.weekday} ${MONTHS[a.month - 1]} ${a.day}`;
  const endLabel = `${end.weekday} ${MONTHS[end.month - 1]} ${end.day}`;
  return startLabel === endLabel ? `${startLabel}` : `${startLabel} – ${endLabel}`;
}

// The next `n` days as "Wed Nov 4 = 2026-11-04", so the model never has to do calendar math.
export function upcomingDays(now: Date, n: number): string[] {
  const p = nyParts(now);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = nyWallTime(p.year, p.month, p.day + i, 12);
    const q = nyParts(d);
    out.push(`${LONG_DAYS[q.weekday]} ${MONTHS[q.month - 1]} ${q.day} = ${nyDateKey(d)}${i === 0 ? " (today)" : ""}`);
  }
  return out;
}
