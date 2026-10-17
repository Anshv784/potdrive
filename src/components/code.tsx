"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ text, className = "", label = "Copy" }: { text: string; className?: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
      aria-label={label}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] text-link transition-colors duration-200 hover:bg-accent-soft ${className}`}
    >
      {done ? <Check className="size-3.5 text-green" strokeWidth={3} /> : <Copy className="size-3.5" />}
      <span aria-live="polite">{done ? "Copied" : label}</span>
    </button>
  );
}

export function CodeBlock({ code, title }: { code: string; title?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-bg-2">
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="text-[12px] font-medium text-label-2">{title}</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto px-4 pb-4 pt-2 font-mono text-[12.5px] leading-relaxed text-label [letter-spacing:0]">
        <code>{code}</code>
      </pre>
    </div>
  );
}
