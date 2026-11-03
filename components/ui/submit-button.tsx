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
        "flex w-full items-center justify-center gap-2 rounded-[3px] border border-ink bg-ink px-5 py-3.5 text-[15px] font-medium text-paper transition hover:-translate-y-px hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0",
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
