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
          className="-ml-2 grid size-9 place-items-center rounded-full text-chalk/80 hover:bg-night-raised hover:text-chalk"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <Logo />
        <span className="size-9" />
      </header>
      <h1 className="mt-10 font-display text-3xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-2 text-chalk/70">{sub}</p>
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
      <span className="text-sm font-medium text-chalk/85">{label}</span>
      <input
        {...input}
        className="mt-1.5 block w-full rounded-xl border border-night-line bg-night-raised px-4 py-3 text-base text-chalk placeholder:text-muted/70 outline-none transition focus:border-bib/70 focus:ring-4 focus:ring-bib/15"
      />
      {hint ? <span className="mt-1.5 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}
