import Link from "next/link";
import { ChevronLeft, ChevronRight, Info, ShieldAlert, Lightbulb } from "lucide-react";
import type { ReactNode } from "react";
import { neighbours } from "@/lib/docs-nav";

export function DocHeader({ eyebrow, title, summary }: { eyebrow: string; title: string; summary: ReactNode }) {
  return (
    <header className="mb-10 border-b border-sep pb-8">
      <p className="eyebrow text-accent">{eyebrow}</p>
      <h1 className="headline mt-1.5 text-[36px] sm:text-[44px]">{title}</h1>
      <p className="mt-3 text-[19px] leading-snug text-label-2">{summary}</p>
    </header>
  );
}

export function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="group scroll-mt-24">
      <a href={`#${id}`} className="!text-label !no-underline">
        {children}
      </a>
    </h2>
  );
}

export function H3({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3 id={id} className="scroll-mt-24">
      {children}
    </h3>
  );
}

const tones = {
  note: { icon: Info, cls: "bg-accent-soft", iconCls: "text-accent", label: "Note" },
  tip: { icon: Lightbulb, cls: "bg-green-soft", iconCls: "text-green", label: "Tip" },
  important: { icon: ShieldAlert, cls: "bg-orange-soft", iconCls: "text-orange", label: "Important" },
};

export function Callout({ kind = "note", title, children }: { kind?: keyof typeof tones; title?: string; children: ReactNode }) {
  const t = tones[kind];
  return (
    <aside className={`not-prose my-6 flex gap-3 rounded-2xl px-5 py-4 ${t.cls}`}>
      <t.icon className={`mt-0.5 size-5 shrink-0 ${t.iconCls}`} />
      <div className="text-[15px] leading-relaxed text-label">
        <div className="font-semibold">{title ?? t.label}</div>
        <div className="mt-0.5 text-label-2 [&_code]:rounded [&_code]:bg-fill [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.85em]">{children}</div>
      </div>
    </aside>
  );
}

// API reference entry: a signature card with a parameter table.
export function Api({
  id,
  signature,
  children,
  params,
  returns,
}: {
  id: string;
  signature: string;
  children?: ReactNode;
  params?: [string, string, string][];
  returns?: string;
}) {
  return (
    <section id={id} className="not-prose my-8 scroll-mt-24 overflow-hidden rounded-2xl ring-1 ring-sep">
      <div className="bg-bg-2 px-5 py-3.5">
        <code className="block overflow-x-auto whitespace-pre font-mono text-[13px] text-label [letter-spacing:0]">{signature}</code>
      </div>
      <div className="px-5 py-4 text-[15px] leading-relaxed text-label-2">
        {children}
        {params && params.length > 0 && (
          <table className="mt-3 w-full text-left text-[14px]">
            <tbody>
              {params.map(([name, type, desc]) => (
                <tr key={name} className="border-t border-sep align-top">
                  <td className="py-2 pr-3 font-mono text-[12.5px] text-label">{name}</td>
                  <td className="py-2 pr-3 font-mono text-[12px] text-accent">{type}</td>
                  <td className="py-2">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {returns && (
          <p className="mt-3 text-[14px]">
            <span className="font-semibold text-label">Returns</span> <code className="font-mono text-[12.5px] text-accent">{returns}</code>
          </p>
        )}
      </div>
    </section>
  );
}

export function Pager({ href }: { href: string }) {
  const { prev, next } = neighbours(href);
  return (
    <nav className="not-prose mt-16 grid gap-3 border-t border-sep pt-8 sm:grid-cols-2" aria-label="Pagination">
      {prev ? (
        <Link href={prev.href} className="group rounded-2xl bg-bg-2 px-5 py-4 transition-colors duration-200 hover:bg-fill">
          <span className="inline-flex items-center gap-1 text-[13px] text-label-2">
            <ChevronLeft className="size-3.5" /> Previous
          </span>
          <span className="mt-0.5 block text-[17px] font-semibold text-link">{prev.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={next.href} className="group rounded-2xl bg-bg-2 px-5 py-4 text-right transition-colors duration-200 hover:bg-fill">
          <span className="inline-flex items-center gap-1 text-[13px] text-label-2">
            Next <ChevronRight className="size-3.5" />
          </span>
          <span className="mt-0.5 block text-[17px] font-semibold text-link">{next.title}</span>
        </Link>
      )}
    </nav>
  );
}

const SOURCE = "https://github.com/Anshv784/potdrive/blob/main/src/app";

export function Doc({ href, children }: { href: string; children: ReactNode }) {
  return (
    <article className="prose-doc min-w-0">
      {children}
      <p className="not-prose mt-12 text-[13px]">
        <a href={`${SOURCE}${href === "/docs" ? "/docs" : href}/page.tsx`} target="_blank" rel="noreferrer" className="text-link hover:underline">
          Edit this page on GitHub
        </a>
      </p>
      <Pager href={href} />
    </article>
  );
}
