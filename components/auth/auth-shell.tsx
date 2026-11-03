import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";
import { Backdrop } from "@/components/ui/pitch-lines";

export function AuthShell({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <Backdrop />
      <header className="flex items-center justify-between">
        <Link
          href="/welcome"
          aria-label="Back"
          className="-ml-2 grid size-9 place-items-center rounded-full text-ink/80 hover:bg-card hover:text-ink"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <Logo />
        <span className="size-9" />
      </header>
      <h1 className="mt-10 font-display text-3xl font-medium tracking-[-0.02em]">{title}</h1>
      <p className="mt-2 text-ink/70">{sub}</p>
      <div className="mt-8">{children}</div>
    </main>
  );
}

export function Field({
  label,
  hint,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink/85">{label}</span>
      <input
        {...input}
        className="mt-1.5 block w-full rounded-xl border border-line bg-card px-4 py-3 text-base text-ink placeholder:text-ink-2/70 outline-none transition focus:border-accent/70 focus:ring-4 focus:ring-accent/15"
      />
      {hint ? <span className="mt-1.5 block text-xs text-ink-2">{hint}</span> : null}
    </label>
  );
}
