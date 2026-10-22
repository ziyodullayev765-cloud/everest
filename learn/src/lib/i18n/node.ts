import type { ReactNode } from "react";
import { tr } from "./tr";

/** Translates plain-string labels passed to shared components; elements and numbers pass through. */
export const trNode = <T extends ReactNode>(x: T): T => (typeof x === "string" ? (tr(x) as T) : x);
