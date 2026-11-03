// Display helpers. Every game time is shown in New York time, wherever the server runs.
import { TIME_ZONE, type FieldAccess, type Level, type Position } from "@/lib/types";

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit" });
const hourFmt = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, hour: "numeric", hourCycle: "h23" });
const weekdayFmt = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short" });
const dateFmt = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short", month: "short", day: "numeric" });
const shortDateFmt = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, month: "short", day: "numeric" });

// Intl may put a narrow no-break space before AM/PM; normalize so server and client agree.
const clean = (s: string) => s.replace(/[  ]/g, " ");

function nyDayNumber(d: Date) {
  const [y, m, day] = dayKeyFmt.format(d).split("-").map(Number);
  return Date.UTC(y, m - 1, day) / 86_400_000;
}

function nyOffsetMin(d: Date) {
  const name =
    new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, timeZoneName: "longOffset" })
      .formatToParts(d)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT-05:00";
  const m = name.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return -300;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

/** Midnight in New York, `dayOffset` days from today, as a UTC Date. */
export function nyMidnight(dayOffset = 0, now = new Date()): Date {
  const [y, m, d] = dayKeyFmt.format(now).split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d + dayOffset));
  return new Date(guess.getTime() - nyOffsetMin(guess) * 60_000);
}

export function nyHour(d: Date = new Date()) {
  return Number(hourFmt.format(d)) % 24;
}

/** "Tonight", "Today", "Tomorrow", "Thu", or "Tue, Nov 10". */
export function formatDay(iso: string, now: Date = new Date()) {
  const d = new Date(iso);
  const diff = nyDayNumber(d) - nyDayNumber(now);
  if (diff === 0) return nyHour(d) >= 17 ? "Tonight" : "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return weekdayFmt.format(d);
  return clean(dateFmt.format(d));
}

/** "7:00 PM" */
export function formatTime(iso: string) {
  return clean(timeFmt.format(new Date(iso)));
}

/** "Tonight · 7:00 PM" */
export function formatWhen(iso: string, now: Date = new Date()) {
  return `${formatDay(iso, now)} · ${formatTime(iso)}`;
}

/** "7:00 – 8:30 PM" */
export function formatTimeRange(iso: string, durationMin: number) {
  const start = formatTime(iso);
  const end = formatTime(new Date(new Date(iso).getTime() + durationMin * 60_000).toISOString());
  const [s, sMer] = start.split(" ");
  const [e, eMer] = end.split(" ");
  return sMer === eMer ? `${s} – ${e} ${eMer}` : `${start} – ${end}`;
}

/** "Nov 3" */
export function formatShortDate(iso: string) {
  return clean(shortDateFmt.format(new Date(iso)));
}

export function greeting(now: Date = new Date()) {
  const h = nyHour(now);
  if (h < 5) return "Late one";
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

export const ACCESS: Record<FieldAccess, { label: string; explain: string }> = {
  open: {
    label: "Open play",
    explain: "First come. NYC Parks fields aren't reservable without a permit.",
  },
  permit: { label: "Permit held", explain: "Permit held by the organizer, so the field is booked for this game." },
  rented: { label: "Rented", explain: "Rented field, booked by the organizer." },
};

export const POSITION_LABEL: Record<Position, string> = { gk: "Goalkeeper", outfield: "Outfield" };
export const LEVEL_LABEL: Record<Level, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export function levelRange(min: number, max: number) {
  return `${min}–${max}`;
}

export function firstName(name: string) {
  return name.split(" ")[0] ?? name;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** "+14" / "−9" (true minus sign) */
export function signed(n: number) {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "±0";
}

export function percent(p: number) {
  return Math.round(p * 100);
}
