"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GithubIcon, Wordmark } from "./logo";
import { ChainPulse } from "./chain-pulse";
import { ThemeToggle } from "./theme-toggle";

const links = [
  { href: "/drive", label: "Drive" },
  { href: "/explore", label: "Explore" },
];

export function Nav({ wide = false }: { wide?: boolean }) {
  const path = usePathname();
  return (
    <header className="material sticky top-0 z-40 border-b border-sep">
      <div className={`mx-auto flex h-12 items-center gap-7 px-5 ${wide ? "" : "max-w-[1024px]"}`}>
        <Link href="/" className="text-label" aria-label="PotDrive home">
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-7 sm:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-[12px] transition-opacity duration-200 hover:opacity-100 ${path.startsWith(l.href) ? "text-label opacity-100" : "text-label opacity-80"}`}
            >
              {l.label}
            </Link>
          ))}

        </nav>
        <div className="ml-auto flex items-center gap-4">
          <span className="hidden lg:inline-flex">
            <ChainPulse />
          </span>
          <span className="hidden sm:inline-flex">
            <ThemeToggle />
          </span>
          <Link href="/docs" className="hidden h-7 items-center rounded-full px-3 text-[12px] text-label ring-1 ring-sep transition-colors duration-200 hover:bg-fill sm:inline-flex">
            Docs
          </Link>
          <a
            href="https://github.com/Anshv784/potdrive"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] text-label ring-1 ring-sep transition-colors duration-200 hover:bg-fill"
            aria-label="PotDrive on GitHub"
          >
            <GithubIcon className="size-3.5" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
          <Link href="/drive" className="inline-flex h-7 items-center rounded-full bg-accent px-3 text-[12px] text-white transition-colors duration-200 hover:bg-accent-hover">
            Open Drive
          </Link>
        </div>
      </div>
      <nav className="flex gap-6 border-t border-sep px-5 py-2 sm:hidden">
        {[...links, { href: "/docs", label: "Docs" }].map((l) => (
          <Link key={l.href} href={l.href} className={`text-[13px] ${path.startsWith(l.href) ? "text-label" : "text-label-2"}`}>
            {l.label}
          </Link>
        ))}
        <span className="ml-auto">
          <ThemeToggle />
        </span>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-bg-2">
      <div className="mx-auto max-w-[1024px] px-5 py-6 text-[12px] leading-relaxed text-label-2">
        <p className="border-b border-sep pb-4">
          PotDrive stores files in Portaldot V3&apos;s TransactionStorage on the public testnet. Data is held for 100,800 blocks
          (about 7 days) per payment and must be renewed to be kept longer. Built for Portaldot Hacker House 2026, Modular Cloud
          &amp; Middleware track.
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-4">
          <span>Copyright © 2026 Ansh Verma. MIT licensed.</span>
          <div className="flex gap-5 sm:ml-auto">
            <Link href="/docs" className="hover:underline">Docs</Link>
            <Link href="/explore" className="hover:underline">Explore</Link>
            <a href="https://github.com/Anshv784/potdrive" className="hover:underline">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
