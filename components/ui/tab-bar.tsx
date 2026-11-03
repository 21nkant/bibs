"use client";

import clsx from "clsx";
import { CalendarCheck, Goal, UserRound } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
      className="fixed inset-x-0 bottom-0 z-30 border-t border-night-line bg-night/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(path);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold tracking-wide transition-colors",
                  active ? "text-chalk" : "text-muted hover:text-chalk/80",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="tab-indicator"
                    className="absolute inset-x-8 top-0 h-0.5 rounded-full bg-bib shadow-[0_0_14px_2px_rgba(255,90,31,0.45)]"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <Icon className={clsx("size-[22px]", active && "text-bib")} strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
