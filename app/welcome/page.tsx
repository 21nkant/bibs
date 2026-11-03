import type { Metadata } from "next";
import Link from "next/link";
import { getUserId } from "@/lib/auth";
import { DemoButtons } from "@/components/auth/demo-buttons";
import { Logo } from "@/components/ui/logo";
import { Reveal } from "@/components/ui/reveal";
import { ShuffleHero } from "@/components/welcome/shuffle-hero";

export const metadata: Metadata = { title: { absolute: "Bibs · Pickup soccer that's actually fair" } };

const FACTS = ["368 NYC fields", "Ratings that move", "No overbooking", "Balanced teams"];

const PILLARS = [
  {
    title: "Real NYC fields",
    body: "Every game sits on an actual NYC Parks field, with lights, surface, and whether anyone holds the permit.",
  },
  {
    title: "Ratings that move",
    body: "Win and you climb, lose and you drop. Teams are split on how people actually play, not who signed up first.",
  },
  {
    title: "Spots that can't be overbooked",
    body: "Fourteen spots means fourteen players. Everyone after gets a waitlist number and moves up the moment someone drops.",
  },
];

export default async function WelcomePage() {
  const signedIn = (await getUserId()) !== null;
  const cta = signedIn ? (
    <Link
      href="/"
      className="inline-flex rounded-[3px] border border-ink bg-ink px-6 py-3.5 text-[15px] font-medium text-paper transition hover:-translate-y-px hover:opacity-90"
    >
      Open your games
    </Link>
  ) : (
    <div className="mx-auto w-full max-w-md">
      <DemoButtons compact />
    </div>
  );

  return (
    <main className="min-h-dvh bg-paper">
      <header className="mx-auto flex h-[70px] max-w-[1100px] items-center justify-between px-5 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-5">
          <Link href={signedIn ? "/" : "/login"} className="text-sm text-ink-2 transition hover:text-ink">
            {signedIn ? "Your games" : "Log in"}
          </Link>
          <a
            href="#try"
            className="rounded-[3px] border border-ink bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:opacity-90"
          >
            Try it
          </a>
        </nav>
      </header>

      <section className="mx-auto max-w-[1100px] px-5 pb-16 pt-12 text-center sm:px-8 sm:pt-20">
        <Reveal>
          <p className="eyebrow-plain">NYC pickup soccer</p>
          <h1 className="mx-auto mt-6 max-w-[14ch] font-display text-[2.9rem] font-medium leading-[1.02] tracking-[-0.03em] text-balance sm:text-[5.2rem]">
            Pickup soccer that&rsquo;s actually <em className="text-accent">fair</em>.
          </h1>
          <p className="mx-auto mt-6 max-w-[46ch] text-[1.05rem] leading-relaxed text-ink-2 sm:text-[1.2rem]">
            Find a game on a real NYC field tonight. When it fills, Bibs splits the teams by rating, so every game is
            fair.
          </p>
          <div id="try" className="mt-9 scroll-mt-24">
            {cta}
          </div>
          {!signedIn ? (
            <p className="mt-5 text-sm text-ink-3">
              New here?{" "}
              <Link href="/signup" className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                Create an account
              </Link>
            </p>
          ) : null}
        </Reveal>

        <Reveal className="mx-auto mt-14 max-w-[760px] text-left sm:mt-20" delay={0.15}>
          <ShuffleHero />
        </Reveal>
      </section>

      <div className="border-y border-line">
        <ul className="mx-auto flex max-w-[1100px] flex-wrap justify-between gap-x-8 gap-y-3 px-5 py-6 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-ink-2 sm:px-8">
          {FACTS.map((f) => (
            <li key={f} className="flex items-center gap-2.5">
              <span className="size-[5px] rounded-full bg-accent" aria-hidden />
              {f}
            </li>
          ))}
        </ul>
      </div>

      <section className="mx-auto max-w-[1100px] px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="max-w-[56ch]">
          <p className="eyebrow">Why it&rsquo;s fair</p>
          <h2 className="mt-5 font-display text-[2.2rem] font-medium leading-[1.06] tracking-[-0.02em] sm:text-[3.4rem]">
            The game is decided on the pitch, <em>not at sign-up</em>.
          </h2>
        </Reveal>
        <div className="mt-14 grid border-t border-line md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <Reveal
              key={p.title}
              delay={i * 0.1}
              className="border-b border-line py-8 md:border-b-0 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0 md:last:pr-0"
            >
              <p className="font-mono text-[0.7rem] tracking-[0.2em] text-accent">0{i + 1}</p>
              <h3 className="mt-4 font-display text-[1.5rem] font-medium leading-tight tracking-[-0.015em]">{p.title}</h3>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-2">{p.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="surface-dark px-5 py-24 text-center sm:py-32">
        <Reveal>
          <p className="eyebrow-plain">Tonight · McCarren Park · 7:00 PM</p>
          <h2 className="mx-auto mt-6 max-w-[16ch] font-display text-[2.4rem] font-medium leading-[1.05] tracking-[-0.02em] sm:text-[4rem]">
            Fourteen players. Two <em className="text-accent">even</em> teams.
          </h2>
          <div className="mt-10">{cta}</div>
        </Reveal>
      </section>

      <footer className="surface-dark border-t border-line">
        <div className="mx-auto flex max-w-[1100px] flex-wrap justify-between gap-3 px-5 py-8 font-mono text-[0.7rem] tracking-[0.08em] text-ink-3 sm:px-8">
          <span>Bibs · NYC</span>
          <span>Pickup soccer that&rsquo;s actually fair</span>
        </div>
      </footer>
    </main>
  );
}
