"use client";

import { useEffect, useState } from "react";
import { THEME_KEY as KEY } from "./theme-boot";

export type ThemeChoice = "system" | "light" | "dark";

export function readChoice(): ThemeChoice {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

export function applyChoice(c: ThemeChoice) {
  const root = document.documentElement;
  if (c === "system") delete root.dataset.theme;
  else root.dataset.theme = c;
  try {
    if (c === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, c);
  } catch {}
  window.dispatchEvent(new Event("potdrive:theme"));
}

// The theme actually on screen, for things CSS can't reach (3D materials).
export function useResolvedTheme(): "light" | "dark" {
  const [t, setT] = useState<"light" | "dark">("light");
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const read = () => {
      const forced = document.documentElement.dataset.theme;
      setT(forced === "light" || forced === "dark" ? forced : mq.matches ? "dark" : "light");
    };
    read();
    mq.addEventListener("change", read);
    window.addEventListener("potdrive:theme", read);
    return () => {
      mq.removeEventListener("change", read);
      window.removeEventListener("potdrive:theme", read);
    };
  }, []);
  return t;
}
