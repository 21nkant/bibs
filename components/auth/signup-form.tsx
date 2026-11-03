"use client";

import { useActionState, useState } from "react";
import { signUp } from "@/app/auth-actions";
import { PrimaryButton } from "@/components/ui/submit-button";
import { Segmented } from "@/components/ui/segmented";
import { STARTING_RATING, type Level, type Position } from "@/lib/types";
import { Field } from "./auth-shell";

const LEVELS: { value: Level; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, undefined);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState<Position>("outfield");
  const [level, setLevel] = useState<Level>("intermediate");

  return (
    <form action={action} className="space-y-5">
      <Field
        label="Name"
        name="name"
        autoComplete="name"
        required
        minLength={2}
        maxLength={40}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="What teammates call you"
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters."
      />
      <Segmented
        name="position"
        label="Where do you play?"
        value={position}
        onChange={setPosition}
        options={[
          { value: "gk", label: "Goalkeeper" },
          { value: "outfield", label: "Outfield" },
        ]}
      />
      <div>
        <Segmented
          name="level"
          label="Your level"
          value={level}
          onChange={setLevel}
          options={LEVELS.map((l) => ({ ...l, sub: String(STARTING_RATING[l.value]) }))}
        />
        <p className="mt-2 text-xs leading-relaxed text-ink-2">
          You&rsquo;ll start at <span className="font-display font-semibold text-ink tabular">{STARTING_RATING[level]}</span>.
          After that your rating moves with every result, so a modest guess is fine.
        </p>
      </div>
      {state?.error ? (
        <p role="alert" className="rounded-xl border border-down/30 bg-down/10 px-4 py-3 text-sm text-down">
          {state.error}
        </p>
      ) : null}
      <PrimaryButton type="submit" pending={pending} pendingLabel="Creating your account">
        Create account
      </PrimaryButton>
    </form>
  );
}
