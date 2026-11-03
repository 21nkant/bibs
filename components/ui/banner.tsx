"use client";

import clsx from "clsx";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export type BannerTone = "success" | "info" | "error";
export type BannerMessage = { tone: BannerTone; text: string; id: number };

const TONE = {
  success: { icon: CircleCheck, className: "border-up/30 bg-up/10 text-up" },
  info: { icon: Info, className: "border-floodlight/25 bg-floodlight/[0.07] text-floodlight" },
  error: { icon: CircleAlert, className: "border-down/30 bg-down/10 text-down" },
} as const;

/** Inline result of a server write: what happened, in a sentence. */
export function Banner({ message, className }: { message: BannerMessage | null; className?: string }) {
  return (
    <div aria-live="polite" className={className}>
      <AnimatePresence mode="wait" initial={false}>
        {message ? (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={clsx(
              "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm font-medium",
              TONE[message.tone].className,
            )}
          >
            {(() => {
              const Icon = TONE[message.tone].icon;
              return <Icon className="mt-px size-[18px] shrink-0" aria-hidden />;
            })()}
            <span className="text-chalk/90">{message.text}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
