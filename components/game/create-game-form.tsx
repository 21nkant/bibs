"use client";

import { useActionState, useMemo, useState } from "react";
import { createGameAction } from "@/app/actions";
import { Field } from "@/components/auth/auth-shell";
import { Segmented } from "@/components/ui/segmented";
import { PrimaryButton } from "@/components/ui/submit-button";
import { BOROUGHS, type Borough, type FieldAccess } from "@/lib/types";

type FieldOption = { id: string; park: string; fieldNumber: string | null; borough: string; lit: boolean };

const selectClass =
  "mt-1.5 block w-full rounded-xl border border-line bg-card px-4 py-3 text-base text-ink outline-none transition focus:border-accent/70 focus:ring-4 focus:ring-accent/15";

export function CreateGameForm({ fields, today, rating }: { fields: FieldOption[]; today: string; rating: number }) {
  const [state, action, pending] = useActionState(createGameAction, undefined);
  const [borough, setBorough] = useState<Borough>("Brooklyn");
  const [access, setAccess] = useState<FieldAccess>("open");
  const inBorough = useMemo(() => fields.filter((f) => f.borough === borough), [fields, borough]);
  // Default range: a band around the organizer's own rating.
  const lo = Math.max(600, Math.floor((rating - 200) / 50) * 50);
  const hi = Math.min(2000, Math.ceil((rating + 200) / 50) * 50);

  return (
    <form action={action} className="space-y-5">
      <Field label="Game name" name="title" required minLength={3} maxLength={60} placeholder="Thursday Night 7v7" />

      <label className="block">
        <span className="text-sm font-medium text-ink/85">Borough</span>
        <select className={selectClass} value={borough} onChange={(e) => setBorough(e.target.value as Borough)}>
          {BOROUGHS.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-ink/85">Field</span>
        <select key={borough} name="fieldId" required className={selectClass} defaultValue="">
          <option value="" disabled>
            {inBorough.length} NYC Parks fields in {borough}
          </option>
          {inBorough.map((f) => (
            <option key={f.id} value={f.id}>
              {f.park}
              {f.fieldNumber ? ` · Field ${f.fieldNumber}` : ""}
              {f.lit ? " · lights" : ""}
            </option>
          ))}
        </select>
        <span className="mt-1.5 block text-xs text-ink-2">Unlit fields get dark early in fall and winter.</span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" name="date" type="date" required min={today} defaultValue={today} />
        <Field label="Start (NY time)" name="time" type="time" required defaultValue="19:00" step={900} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-ink/85">Length</span>
          <select name="durationMin" defaultValue="90" className={selectClass}>
            <option value="60">60 min</option>
            <option value="90">90 min</option>
            <option value="120">2 hours</option>
          </select>
        </label>
        <Field label="Players" name="capacity" type="number" required min={4} max={22} defaultValue={14} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Lowest rating" name="minRating" type="number" required min={600} max={2000} step={10} defaultValue={lo} />
        <Field label="Highest rating" name="maxRating" type="number" required min={600} max={2000} step={10} defaultValue={hi} />
      </div>

      <Segmented
        name="access"
        label="The field"
        value={access}
        onChange={setAccess}
        options={[
          { value: "open", label: "Open play" },
          { value: "permit", label: "Permit held" },
          { value: "rented", label: "Rented" },
        ]}
      />
      <Field label="Note for players (optional)" name="note" maxLength={200} placeholder="Bring a dark and a light shirt" />

      {state?.error ? (
        <p role="alert" className="rounded-xl border border-down/30 bg-down/10 px-4 py-3 text-sm text-down">
          {state.error}
        </p>
      ) : null}
      <PrimaryButton type="submit" pending={pending} pendingLabel="Posting your game">
        Post game
      </PrimaryButton>
    </form>
  );
}
