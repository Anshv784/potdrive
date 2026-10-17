"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { applyChoice, readChoice, type ThemeChoice } from "@/lib/theme";

const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  useEffect(() => setChoice(readChoice()), []);
  return (
    <div role="radiogroup" aria-label="Theme" className="flex h-7 items-center rounded-full p-0.5 ring-1 ring-sep">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={choice === o.value}
          aria-label={`${o.label} theme`}
          title={`${o.label} theme`}
          onClick={() => {
            setChoice(o.value);
            applyChoice(o.value);
          }}
          className={`grid size-6 place-items-center rounded-full transition-colors duration-200 ${choice === o.value ? "bg-fill-2 text-label" : "text-label-3 hover:text-label"}`}
        >
          <o.icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
