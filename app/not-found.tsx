import Link from "next/link";
import { Backdrop } from "@/components/ui/pitch-lines";

export default function NotFound() {
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <Backdrop />
      <p className="font-display text-7xl font-medium text-accent tabular">404</p>
      <p className="mt-3 font-display text-xl font-medium">Out of bounds</p>
      <p className="mt-2 text-sm text-ink-2">That game or page doesn&rsquo;t exist, or it was taken down.</p>
      <Link href="/" className="mt-6 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper">
        Back to games
      </Link>
    </main>
  );
}
