"use client";

import clsx from "clsx";
import { motion } from "motion/react";
import { useId } from "react";

/** A segmented control backed by real radio inputs, so it submits with the form. */
export function Segmented<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
}: {
  name: string;
  label: string;
  options: { value: T; label: string; sub?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <fieldset>
      <legend className="text-sm font-medium text-chalk/85">{label}</legend>
      <div
        className="mt-1.5 grid gap-1 rounded-xl border border-night-line bg-night-raised p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <label
              key={o.value}
              className={clsx(
                "relative cursor-pointer rounded-lg px-2 py-2.5 text-center transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-bib/60",
                active ? "text-night" : "text-chalk/75 hover:text-chalk",
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={active}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {active && (
                <motion.span
                  layoutId={`${id}-pill`}
                  className="absolute inset-0 rounded-lg bg-chalk"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <span className="relative block text-sm font-semibold">{o.label}</span>
              {o.sub ? (
                <span className={clsx("relative block font-display text-xs tabular", active ? "text-night/60" : "text-muted")}>
                  {o.sub}
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
