"use client";

import clsx from "clsx";
import { CalendarCheck, Goal, Sparkles, UserRound } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { openAssistant } from "@/components/assistant/ask-event";

const TABS = [
  { href: "/", label: "Games", icon: Goal, match: (p: string) => p === "/" || p.startsWith("/games") },
  { href: "/my-games", label: "My games", icon: CalendarCheck, match: (p: string) => p.startsWith("/my-games") },
  { href: "/me", label: "You", icon: UserRound, match: (p: string) => p.startsWith("/me") },
] as const;

export function TabBar() {
  const path = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(path);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "relative flex h-16 flex-col items-center justify-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] transition-colors",
                  active ? "text-ink" : "text-ink-3 hover:text-ink-2",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="tab-indicator"
                    className="absolute inset-x-10 -top-px h-px bg-accent"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <Icon className="size-5" strokeWidth={1.6} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={openAssistant}
            aria-haspopup="dialog"
            className="flex h-16 w-full flex-col items-center justify-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-accent transition-colors hover:text-ink"
          >
            <Sparkles className="size-5" strokeWidth={1.6} aria-hidden />
            Ask Bibs
          </button>
        </li>
      </ul>
    </nav>
  );
}
