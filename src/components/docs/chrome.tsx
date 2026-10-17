"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { DOCS, DOC_LIST } from "@/lib/docs-nav";

export function Sidebar() {
  const path = usePathname();
  return (
    <nav aria-label="Documentation" className="space-y-6 text-[14px]">
      {DOCS.map((g) => (
        <div key={g.title}>
          <div className="mb-1.5 px-2 text-[12px] font-semibold text-label-2">{g.title}</div>
          <ul>
            {g.items.map((d) => {
              const on = path === d.href;
              return (
                <li key={d.href}>
                  <Link
                    href={d.href}
                    aria-current={on ? "page" : undefined}
                    className={`block rounded-lg px-2 py-1.5 transition-colors duration-200 ${on ? "bg-accent-soft font-medium text-accent" : "text-label hover:bg-bg-2"}`}
                  >
                    {d.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// "On this page", built from the rendered h2/h3s, with the visible section highlighted.
export function Toc() {
  const path = usePathname();
  const [items, setItems] = useState<{ id: string; text: string; level: number }[]>([]);
  const [active, setActive] = useState("");
  useEffect(() => {
    const hs = [...document.querySelectorAll<HTMLElement>("article h2[id], article h3[id], article section[id]")].filter((h) => h.tagName !== "SECTION" || h.dataset.toc);
    setItems(hs.map((h) => ({ id: h.id, text: h.textContent ?? "", level: h.tagName === "H3" ? 3 : 2 })));
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );
    hs.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [path]);
  if (items.length < 2) return null;
  return (
    <nav aria-label="On this page" className="text-[13px]">
      <div className="mb-2 font-semibold">On this page</div>
      <ul className="space-y-1.5 border-l border-sep">
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              className={`-ml-px block border-l py-0.5 transition-colors duration-200 ${i.level === 3 ? "pl-6" : "pl-3"} ${
                active === i.id ? "border-accent text-accent" : "border-transparent text-label-2 hover:text-label"
              }`}
            >
              {i.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SearchButton() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full items-center gap-2 rounded-lg bg-bg-2 px-3 text-[14px] text-label-2 transition-colors duration-200 hover:bg-fill"
      >
        <Search className="size-4" /> Search docs
        <kbd className="ml-auto rounded-md bg-surface px-1.5 font-sans text-[11px] text-label-3 ring-1 ring-sep">⌘K</kbd>
      </button>
      {open && <SearchDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return DOC_LIST;
    return DOC_LIST.map((d) => {
      const hay = `${d.title} ${d.summary} ${d.keywords ?? ""}`.toLowerCase();
      const score = words.reduce((s, w) => s + (d.title.toLowerCase().includes(w) ? 3 : hay.includes(w) ? 1 : -100), 0);
      return { d, score };
    })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.d);
  }, [q]);
  const go = (href: string) => {
    onClose();
    router.push(href);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 pt-[12vh]" onClick={onClose} role="dialog" aria-modal aria-label="Search documentation">
      <div className="material w-full max-w-xl overflow-hidden rounded-2xl shadow-float ring-1 ring-sep" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-sep px-4">
          <Search className="size-5 text-label-2" />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((s) => Math.min(s + 1, results.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((s) => Math.max(s - 1, 0));
              }
              if (e.key === "Enter" && results[sel]) go(results[sel].href);
            }}
            placeholder="Search PotDrive docs"
            aria-label="Search"
            className="h-14 flex-1 bg-transparent text-[17px] outline-none placeholder:text-label-3 focus-visible:outline-none"
          />
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-label-3 hover:bg-fill">
            <X className="size-4" />
          </button>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-6 text-center text-[15px] text-label-2">No results for &ldquo;{q}&rdquo;</li>}
          {results.map((d, i) => (
            <li key={d.href}>
              <button
                onMouseEnter={() => setSel(i)}
                onClick={() => go(d.href)}
                className={`w-full rounded-lg px-3 py-2.5 text-left ${i === sel ? "bg-accent text-white" : ""}`}
              >
                <div className="text-[15px] font-medium">{d.title}</div>
                <div className={`text-[13px] ${i === sel ? "text-white/80" : "text-label-2"}`}>{d.summary}</div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
