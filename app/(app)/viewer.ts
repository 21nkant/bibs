import { cache } from "react";
import { requireProfile } from "@/lib/auth";

/** The signed-in player, read once per request however many components ask. */
export const getViewer = cache(requireProfile);
