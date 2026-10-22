"use client";
import { useEffect } from "react";
import { Confetti } from "./confetti";
import { play } from "@/lib/sfx";

/** Confetti + sound once per page view, for a passed quiz or a finished session. */
export function Celebrate({ show }: { show: boolean }) {
  useEffect(() => {
    if (show) play("complete");
  }, [show]);
  return show ? <Confetti /> : null;
}
