import { ArrowRight, MapPin, ShieldCheck, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getUserId } from "@/lib/auth";
import { DemoButtons } from "@/components/auth/demo-buttons";
import { Logo } from "@/components/ui/logo";
import { Backdrop } from "@/components/ui/pitch-lines";
import { ShuffleHero } from "@/components/welcome/shuffle-hero";

export const metadata: Metadata = { title: { absolute: "Bibs · Pickup soccer that's actually fair" } };

const POINTS = [
  {
    icon: MapPin,
    title: "Real NYC fields",
    body: "Every game sits on an actual NYC Parks field, with lights, surface and whether anyone holds the permit.",
  },
  {
    icon: TrendingUp,
    title: "Ratings that move with results",
    body: "Win and you climb, lose and you drop. Teams are split on how people actually play, not who showed up first.",
  },
  {
    icon: ShieldCheck,
    title: "Spots that can't be overbooked",
    body: "Fourteen spots means fourteen players. Everyone after gets a waitlist number and moves up the moment someone drops.",
  },
];

export default async function WelcomePage() {
  const signedIn = (await getUserId()) !== null;

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-12 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <Backdrop />
      <header className="flex items-center justify-between">
        <Logo />
        {signedIn ? (
          <Link href="/" className="text-sm font-medium text-chalk/80 hover:text-chalk">
            Your games
          </Link>
        ) : (
          <Link href="/login" className="text-sm font-medium text-chalk/80 hover:text-chalk">
            Log in
          </Link>
        )}
      </header>

      <section className="mt-10">
        <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.02] tracking-tight text-balance">
          Pickup soccer that&rsquo;s <span className="text-bib">actually fair.</span>
        </h1>
        <p className="mt-4 text-[1.05rem] leading-relaxed text-chalk/75 text-pretty">
          Find a game on a real NYC field tonight. When it fills, Bibs splits the teams by rating, so nobody gets
          steamrolled.
        </p>
      </section>

      <div className="mt-8">
        <ShuffleHero />
      </div>

      <section className="mt-8">
        {signedIn ? (
          <Link
            href="/"
            className="flex items-center justify-between rounded-2xl bg-bib px-5 py-4 font-display text-base font-bold text-night"
          >
            Open your games <ArrowRight className="size-5" aria-hidden />
          </Link>
        ) : (
          <DemoButtons />
        )}
        <p className="mt-4 text-center text-sm text-muted">
          New here?{" "}
          <Link href="/signup" className="font-medium text-chalk underline-offset-4 hover:underline">
            Sign up
          </Link>{" "}
          <span aria-hidden>·</span>{" "}
          <Link href="/login" className="font-medium text-chalk underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </section>

      <section className="mt-12 space-y-3">
        {POINTS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-4 rounded-2xl border border-night-line bg-night-raised/60 p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-bib/12 text-bib">
              <Icon className="size-[18px]" aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-base font-bold">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
