"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen } from "lucide-react";
import { GithubIcon, Wordmark } from "./logo";
import { ChainPulse } from "./chain-pulse";
import { ThemeToggle } from "./theme-toggle";

const links = [
  { href: "/drive", label: "Drive" },
  { href: "/explore", label: "Explore" },
];

export function Nav({ wide = false }: { wide?: boolean }) {
  const path = usePathname();
  const item = (on: boolean) =>
    `inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors duration-200 ${
      on ? "bg-fill-2 text-label" : "text-label-2 hover:bg-fill hover:text-label"
    }`;
  return (
    <header className="material sticky top-0 z-40 border-b border-sep">
      <div className={`mx-auto grid h-12 grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 ${wide ? "" : "max-w-[1100px]"}`}>
        <Link href="/" className="justify-self-start text-label" aria-label="PotDrive home">
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 rounded-full bg-fill/60 p-1 ring-1 ring-sep sm:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={item(path.startsWith(l.href))} aria-current={path.startsWith(l.href) ? "page" : undefined}>
              {l.label}
            </Link>
          ))}
          <Link href="/docs" className={item(path.startsWith("/docs"))} aria-current={path.startsWith("/docs") ? "page" : undefined}>
            <BookOpen className="size-3.5" />
            Docs
          </Link>
          <a href="https://github.com/Anshv784/potdrive" target="_blank" rel="noreferrer" className={item(false)}>
            <GithubIcon className="size-3.5" />
            GitHub
          </a>
        </nav>
        <span className="sm:hidden" />

        <div className="flex items-center justify-self-end gap-3">
          <span className="hidden xl:inline-flex">
            <ChainPulse />
          </span>
          <span className="hidden md:inline-flex">
            <ThemeToggle />
          </span>
          <a
            href="https://github.com/Anshv784/potdrive"
            target="_blank"
            rel="noreferrer"
            className="grid size-8 place-items-center rounded-full text-label ring-1 ring-sep sm:hidden"
            aria-label="PotDrive on GitHub"
          >
            <GithubIcon className="size-4" />
          </a>
          <Link
            href="/drive"
            className="inline-flex h-8 items-center rounded-full bg-accent px-4 text-[13px] font-medium text-white shadow-[0_4px_14px_-4px_var(--accent)] transition-colors duration-200 hover:bg-accent-hover"
          >
            Open Drive
          </Link>
        </div>
      </div>
      <nav className="flex items-center gap-1 border-t border-sep px-3 py-1.5 sm:hidden">
        {[...links, { href: "/docs", label: "Docs" }].map((l) => (
          <Link key={l.href} href={l.href} className={item(path.startsWith(l.href))}>
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

const columns: { title: string; links: [string, string][] }[] = [
  { title: "Product", links: [["Drive", "/drive"], ["Explore", "/explore"], ["Keep-alive", "/docs/keep-alive"], ["Private files", "/docs/private-files"]] },
  { title: "Developers", links: [["Quickstart", "/docs/quickstart"], ["SDK", "/docs/sdk"], ["CLI", "/docs/cli"], ["Gateway", "/docs/gateway"], ["MCP server", "/docs/mcp"]] },
  {
    title: "Project",
    links: [
      ["GitHub", "https://github.com/Anshv784/potdrive"],
      ["npm", "https://www.npmjs.com/package/@potdrive/sdk"],
      ["Security", "/docs/security"],
      ["Costs and limits", "/docs/limits"],
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-sep bg-bg-2">
      <div className="mx-auto grid max-w-[1024px] gap-10 px-5 pb-10 pt-14 sm:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Link href="/" className="text-label" aria-label="PotDrive home">
            <Wordmark />
          </Link>
          <p className="mt-3 max-w-[17rem] text-[13px] leading-relaxed text-label-2">
            Files stored by Portaldot itself, in V3&apos;s TransactionStorage. Checked by every reader.
          </p>
          <div className="mt-4 inline-flex rounded-full bg-surface px-3 py-1.5 ring-1 ring-sep">
            <ChainPulse />
          </div>
        </div>
        {columns.map((c) => (
          <div key={c.title}>
            <div className="text-[12px] font-semibold text-label">{c.title}</div>
            <ul className="mt-3 space-y-2">
              {c.links.map(([label, href]) => {
                const ext = href.startsWith("http");
                const cls = "text-[13px] text-label-2 transition-colors duration-200 hover:text-accent";
                return (
                  <li key={label}>
                    {ext ? (
                      <a href={href} target="_blank" rel="noreferrer" className={cls}>
                        {label} <span aria-hidden>↗</span>
                      </a>
                    ) : (
                      <Link href={href} className={cls}>
                        {label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-[1024px] px-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-sep py-5 text-[12px] text-label-2">
          <span>© 2026 Ansh Verma · MIT licensed</span>
          <span className="text-label-3">
            Testnet only. Data is kept 100,800 blocks (about 7 days) per payment, then must be renewed.
          </span>
          <span className="sm:ml-auto">
            <ThemeToggle />
          </span>
        </div>
      </div>
      {/* oversized wordmark fading into the page edge */}
      <div
        aria-hidden
        className="pointer-events-none -mb-[0.22em] select-none text-center text-[22vw] font-semibold leading-none tracking-[-0.06em] text-transparent sm:text-[180px] lg:text-[220px]"
        style={{ backgroundImage: "linear-gradient(to bottom, var(--fill-2), transparent 85%)", WebkitBackgroundClip: "text", backgroundClip: "text" }}
      >
        PotDrive
      </div>
    </footer>
  );
}
