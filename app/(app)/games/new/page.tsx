import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CreateGameForm } from "@/components/game/create-game-form";
import { listFields } from "@/lib/service";
import { getViewer } from "../../viewer";

export const metadata: Metadata = { title: "Post a game" };

export default async function NewGamePage() {
  const [viewer, fields] = await Promise.all([getViewer(), listFields()]);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());

  return (
    <div className="pt-4">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden /> Games
      </Link>
      <p className="mt-6 eyebrow">Organize</p>
      <h1 className="mt-2 font-display text-3xl font-medium tracking-[-0.02em]">Post a game</h1>
      <p className="mt-2 text-[15px] text-ink-2">
        Pick a real NYC Parks field and a rating range. When it fills, you lock it and Bibs balances the teams.
      </p>
      <div className="mt-7">
        <CreateGameForm fields={fields} today={today} rating={viewer.rating} />
      </div>
    </div>
  );
}
