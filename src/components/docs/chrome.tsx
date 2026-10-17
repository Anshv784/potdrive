"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { CornerDownLeft, FileText, Hash, Search, X } from "lucide-react";
import { DOCS, DOC_LIST } from "@/lib/docs-nav";
import INDEX_JSON from "@/lib/docs-index.json";

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
    const hs = [...document.querySelectorAll<HTMLElement>("article h2[id], article h3[id], article section[id]")].filter(
      (h) => h.tagName !== "SECTION" || h.dataset.toc,
    );
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
  const [mac, setMac] = useState(false);
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)), []);
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
        <kbd className="ml-auto rounded-md bg-surface px-1.5 font-sans text-[11px] text-label-3 ring-1 ring-sep">
          {mac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>
      {open && createPortal(<SearchDialog onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

interface Hit {
  href: string;
  page: string;
  title: string;
  snippet: string;
  section: boolean;
}

const INDEX = INDEX_JSON as { href: string; page: string; title: string; text: string }[];

// Ranks sections by how many query words they contain, weighting titles. Every word must match somewhere.
function search(q: string): Hit[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length)
    return DOC_LIST.map((d) => ({ href: d.href, page: d.title, title: d.title, snippet: d.summary, section: false }));
  const keywords = new Map(DOC_LIST.map((d) => [d.href, (d.keywords ?? "").toLowerCase()]));
  return INDEX.map((x) => {
    const title = x.title.toLowerCase();
    const page = x.page.toLowerCase();
    const text = x.text.toLowerCase();
    const kw = x.href.includes("#") ? "" : (keywords.get(x.href) ?? "");
    let score = 0;
    for (const w of words) {
      const s =
        (title.startsWith(w) ? 8 : title.includes(w) ? 5 : 0) +
        (page.includes(w) ? 2 : 0) +
        (kw.includes(w) ? 3 : 0) +
        (text.includes(w) ? 1 : 0);
      if (!s) return null;
      score += s;
    }
    const at = Math.max(0, text.indexOf(words.find((w) => text.includes(w)) ?? ""));
    let from = Math.max(0, at - 50);
    if (from > 0) from = x.text.indexOf(" ", from) + 1 || from;
    const snippet = (from > 0 ? "…" : "") + x.text.slice(from, from + 150) + (x.text.length > from + 150 ? "…" : "");
    return {
      hit: { href: x.href, page: x.page, title: x.title, snippet, section: x.href.includes("#") },
      score: score + (x.href.includes("#") ? 0 : 1),
    };
  })
    .filter((r): r is { hit: Hit; score: number } => !!r)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((r) => r.hit);
}

function Mark({ text, q }: { text: string; q: string }) {
  const words = q
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1);
  if (!words.length) return <>{text}</>;
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 ? (
          <mark key={i} className="rounded-sm bg-accent/15 px-0.5 text-accent">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => {
    input.current?.focus();
    const y = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = y;
    };
  }, []);
  const results = useMemo(() => search(q), [q]);
  useEffect(() => {
    list.current?.querySelector(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);
  const go = (href: string) => {
    onClose();
    router.push(href);
  };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[10vh] backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label="Search documentation"
    >
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="flex max-h-[76vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface shadow-float ring-1 ring-sep"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-sep px-4">
          <Search className="size-5 shrink-0 text-accent" />
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
            placeholder="Search the docs: fees, renew, private, MetaTx…"
            aria-label="Search"
            role="combobox"
            aria-expanded
            aria-controls="docs-results"
            aria-activedescendant={results[sel] ? `docs-hit-${sel}` : undefined}
            className="h-14 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-label-3 focus:outline-none focus-visible:outline-none"
          />
          {q && (
            <button onClick={() => setQ("")} className="rounded-md px-2 py-1 text-[12px] text-label-2 hover:bg-fill">
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-7 place-items-center rounded-full text-label-3 hover:bg-fill hover:text-label"
          >
            <X className="size-4" />
          </button>
        </div>

        <ul ref={list} id="docs-results" role="listbox" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          {!q && <li className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-label-3">All pages</li>}
          {results.length === 0 && (
            <li className="px-3 py-10 text-center text-[14px] text-label-2">
              Nothing matches &ldquo;{q}&rdquo;. Try a shorter word, like <em>fee</em> or <em>renew</em>.
            </li>
          )}
          {results.map((r, i) => (
            <li key={r.href} id={`docs-hit-${i}`} role="option" aria-selected={i === sel} data-i={i}>
              <button
                onMouseMove={() => setSel(i)}
                onClick={() => go(r.href)}
                className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-100 ${i === sel ? "bg-accent-soft" : ""}`}
              >
                <span
                  className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${i === sel ? "bg-accent text-white" : "bg-fill text-label-2"}`}
                >
                  {r.section ? <Hash className="size-3.5" /> : <FileText className="size-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="truncate text-[14px] font-medium">
                      <Mark text={r.title} q={q} />
                    </span>
                    {r.section && <span className="shrink-0 truncate text-[12px] text-label-3">in {r.page}</span>}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-label-2">
                    <Mark text={r.snippet} q={q} />
                  </span>
                </span>
                {i === sel && <CornerDownLeft className="mt-1.5 size-3.5 shrink-0 text-accent" />}
              </button>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-4 border-t border-sep bg-bg-2 px-4 py-2 text-[11px] text-label-3 sm:flex">
          <span className="inline-flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> to move
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd>↵</Kbd> to open
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd>esc</Kbd> to close
          </span>
          <span className="ml-auto">
            {q ? `${results.length} result${results.length === 1 ? "" : "s"}` : `${DOC_LIST.length} pages`}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="grid h-5 min-w-5 place-items-center rounded bg-surface px-1 font-sans text-[11px] text-label-2 ring-1 ring-sep">
      {children}
    </kbd>
  );
}
