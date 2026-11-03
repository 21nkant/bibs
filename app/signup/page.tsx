import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <AuthShell title="Get a game tonight" sub="Thirty seconds, then you're looking at real fields with open spots.">
      <SignupForm />
      <p className="mt-6 text-center text-sm text-muted">
        Already playing?{" "}
        <Link href="/login" className="font-medium text-chalk underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
