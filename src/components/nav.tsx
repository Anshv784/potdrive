"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "./logo";
import { ChainPulse } from "./chain-pulse";

const links = [
  { href: "/drive", label: "Drive" },
  { href: "/explore", label: "Explore" },
  { href: "/docs", label: "Docs" },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="text-text hover:text-white">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((l) => {
            const on = path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors duration-150 ${on ? "bg-ink-3 text-text" : "text-text-2 hover:text-text"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <ChainPulse className="hidden md:inline-flex" />
          <a
            href="https://github.com/Anshv784/potdrive"
            className="hidden text-sm text-text-2 transition-colors duration-150 hover:text-text sm:block"
          >
            GitHub
          </a>
          <Link
            href="/drive"
            className="rounded-md bg-violet px-3.5 py-1.5 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-violet-2 active:scale-[0.98]"
          >
            Open Drive
          </Link>
        </div>
      </div>
      <nav className="flex gap-1 border-t border-line/60 px-4 py-1.5 sm:hidden">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md px-3 py-1 text-sm ${path.startsWith(l.href) ? "bg-ink-3 text-text" : "text-text-2"}`}
          >
            {l.label}
          </Link>
        ))}
        <ChainPulse className="ml-auto" />
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-text-3 sm:flex-row sm:items-center sm:px-6">
        <Wordmark className="text-text-2" />
        <p className="max-w-md">
          Built for Portaldot Hacker House 2026, Modular Cloud &amp; Middleware track. Files live in Portaldot&apos;s own
          TransactionStorage.
        </p>
        <div className="flex gap-5 sm:ml-auto">
          <Link href="/docs" className="hover:text-text">Docs</Link>
          <Link href="/explore" className="hover:text-text">Explore</Link>
          <a href="https://github.com/Anshv784/potdrive" className="hover:text-text">GitHub</a>
        </div>
      </div>
    </footer>
  );
}
