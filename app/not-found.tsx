import Link from "next/link";
import { Backdrop } from "@/components/ui/pitch-lines";

export default function NotFound() {
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <Backdrop />
      <p className="font-display text-7xl font-extrabold text-bib tabular">404</p>
      <p className="mt-3 font-display text-xl font-bold">Out of bounds</p>
      <p className="mt-2 text-sm text-muted">That game or page doesn&rsquo;t exist, or it was taken down.</p>
      <Link href="/" className="mt-6 rounded-full bg-chalk px-5 py-2.5 text-sm font-semibold text-night">
        Back to games
      </Link>
    </main>
  );
}
