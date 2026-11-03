"use client";

import { motion, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";

/** A number that glides to its new value instead of jumping. */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const spring = useSpring(value, { stiffness: 90, damping: 20, mass: 0.8 });
  const rounded = useTransform(spring, (v) => Math.round(v).toString());
  useEffect(() => {
    spring.set(value);
  }, [spring, value]);
  return <motion.span className={className}>{rounded}</motion.span>;
}
