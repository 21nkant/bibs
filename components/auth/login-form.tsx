"use client";

import { useActionState, useState } from "react";
import { logIn } from "@/app/auth-actions";
import { PrimaryButton } from "@/components/ui/submit-button";
import { Field } from "./auth-shell";

export function LoginForm() {
  const [state, action, pending] = useActionState(logIn, undefined);
  const [email, setEmail] = useState("");
  return (
    <form action={action} className="space-y-4">
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
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      {state?.error ? (
        <p role="alert" className="rounded-xl border border-down/30 bg-down/10 px-4 py-3 text-sm text-down">
          {state.error}
        </p>
      ) : null}
      <PrimaryButton type="submit" pending={pending} pendingLabel="Logging in" className="mt-2">
        Log in
      </PrimaryButton>
    </form>
  );
}
