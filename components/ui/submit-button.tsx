"use client";

import clsx from "clsx";
import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

export function PrimaryButton({
  pending,
  children,
  pendingLabel,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pending?: boolean; pendingLabel?: ReactNode }) {
  return (
    <button
      {...rest}
      disabled={pending || rest.disabled}
      aria-busy={pending || undefined}
      className={clsx(
        "flex w-full items-center justify-center gap-2 rounded-2xl bg-bib px-5 py-4 font-display text-base font-bold text-night shadow-[0_10px_40px_-14px_rgba(255,90,31,0.75)] transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none",
        pending && "cursor-wait",
        className,
      )}
    >
      {pending ? (
        <>
          <LoaderCircle className="size-5 animate-spin" aria-hidden />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
