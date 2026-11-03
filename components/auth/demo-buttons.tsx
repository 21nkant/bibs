"use client";

import clsx from "clsx";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { demoLogIn, type AuthState } from "@/app/auth-actions";

type Who = "alex" | "sam";

async function enter(_: AuthState, form: FormData): Promise<AuthState> {
  const who = form.get("who");
  if (who !== "alex" && who !== "sam") return { error: "Pick a player to try." };
  return demoLogIn(who);
}

/** "Try as Alex" / "Try as Sam": one form, two submit buttons, so we know which one is loading. */
export function DemoButtons({ compact = false }: { compact?: boolean }) {
  const [state, action] = useActionState(enter, undefined);
  return (
    <form action={action} className="flex flex-col gap-2.5">
      <div className={clsx("grid gap-2.5", compact ? "grid-cols-2" : "grid-cols-1")}>
        <TryButton who="alex" primary title="Try as Alex" sub="Organizer · tonight's 7v7 is full" compact={compact} />
        <TryButton who="sam" title="Try as Sam" sub="New player · rated 1010" compact={compact} />
      </div>
      {state?.error ? (
        <p role="alert" className="text-sm text-down">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function TryButton({
  who,
  title,
  sub,
  primary,
  compact,
}: {
  who: Who;
  title: string;
  sub: string;
  primary?: boolean;
  compact?: boolean;
}) {
  const { pending, data } = useFormStatus();
  const mine = pending && data?.get("who") === who;
  return (
    <button
      type="submit"
      name="who"
      value={who}
      disabled={pending}
      className={clsx(
        "group flex items-center justify-between gap-3 rounded-2xl px-5 text-left transition active:scale-[0.99] disabled:cursor-wait",
        compact ? "py-3" : "py-4",
        primary
          ? "bg-bib text-night shadow-[0_10px_40px_-12px_rgba(255,90,31,0.7)] hover:brightness-110"
          : "border border-night-line bg-night-raised text-chalk hover:border-chalk/30",
        pending && !mine && "opacity-50",
      )}
    >
      <span className="min-w-0">
        <span className="block font-display text-base font-bold">{title}</span>
        {!compact && (
          <span className={clsx("block text-sm", primary ? "text-night/70" : "text-muted")}>{sub}</span>
        )}
      </span>
      {mine ? (
        <LoaderCircle className="size-5 shrink-0 animate-spin" aria-label="Signing in" />
      ) : (
        <ArrowRight className="size-5 shrink-0 transition group-hover:translate-x-0.5" aria-hidden />
      )}
    </button>
  );
}
