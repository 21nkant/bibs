import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { DemoButtons } from "@/components/auth/demo-buttons";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" sub="Your spot, your rating, right where you left them.">
      <LoginForm />
      <p className="mt-6 text-center text-sm text-muted">
        No account?{" "}
        <Link href="/signup" className="font-medium text-chalk underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
      <div className="mt-10 border-t border-night-line pt-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">Or jump straight in</p>
        <DemoButtons compact />
      </div>
    </AuthShell>
  );
}
