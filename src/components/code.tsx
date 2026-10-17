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
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-text-3 transition-colors duration-150 hover:bg-ink-3 hover:text-text ${className}`}
    >
      {done ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
      <span aria-live="polite">{done ? "Copied" : label}</span>
    </button>
  );
}

export function CodeBlock({ code, lang, title }: { code: string; lang?: string; title?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-ink-2">
      <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
        <span className="font-mono text-[11px] text-text-3">{title ?? lang}</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed text-text-2">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function CodeTabs({ tabs }: { tabs: { label: string; code: string; title?: string }[] }) {
  const [on, setOn] = useState(0);
  return (
    <div>
      <div role="tablist" className="mb-2 flex gap-1">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            role="tab"
            aria-selected={on === i}
            onClick={() => setOn(i)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors duration-150 ${on === i ? "bg-ink-3 text-text" : "text-text-3 hover:text-text"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <CodeBlock code={tabs[on].code} title={tabs[on].title} />
    </div>
  );
}
