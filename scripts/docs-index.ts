#!/usr/bin/env bun
// Builds the full-text search index for /docs from the page sources.
//   bun scripts/docs-index.ts   (run after editing any docs page; the output is committed)
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { DOC_LIST } from "../src/lib/docs-nav";

const ROOT = resolve(import.meta.dir, "..");
const OUT = join(ROOT, "src/lib/docs-index.json");

export interface Section {
  href: string; // page href, plus #anchor for sections
  page: string;
  title: string; // section heading, or the page title for the intro
  text: string;
}

const ENTITIES: Record<string, string> = {
  "&apos;": "'",
  "&quot;": '"',
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
  "&ldquo;": "“",
  "&rdquo;": "”",
  "&rarr;": "→",
  "&times;": "×",
};

function plain(jsx: string): string {
  return jsx
    .replace(/<Code[\s\S]*?\/>/g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\{["'`]([^"'`]*)["'`]\}/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^{}]*\}/g, " ")
    .replace(/\{[^{}]*\}/g, " ")
    .replace(/\{[^{}]*\}/g, " ")
    .replace(/[{}()]+\s*;?/g, " ")
    .replace(/&[a-z]+;/g, (e) => ENTITIES[e] ?? " ")
    .replace(/\s+/g, " ")
    .trim();
}

const sections: Section[] = [];
for (const d of DOC_LIST) {
  const file = join(ROOT, "src/app", d.href === "/docs" ? "docs" : d.href.slice(1), "page.tsx");
  const src = await readFile(file, "utf8");
  const body = src.slice(src.indexOf("return ("), src.lastIndexOf("</Doc>"));
  const heads = [...body.matchAll(/<H([23]) id="([^"]+)">([\s\S]*?)<\/H\1>/g)];
  const firstAt = heads[0]?.index ?? body.length;
  const intro = plain(body.slice(body.indexOf("/>", body.indexOf("<DocHeader")) + 2, firstAt));
  // tables built from arrays above the component: keep their long strings
  const data = [...src.slice(0, src.indexOf("export default")).matchAll(/"([^"\n]{25,})"/g)].map((m) => m[1]).join(" · ");
  sections.push({ href: d.href, page: d.title, title: d.title, text: `${d.summary} ${intro} ${plain(data)}`.slice(0, 1600) });
  heads.forEach((h, i) => {
    const end = heads[i + 1]?.index ?? body.length;
    const text = plain(body.slice(h.index! + h[0].length, end));
    sections.push({ href: `${d.href}#${h[2]}`, page: d.title, title: plain(h[3]), text: text.slice(0, 700) });
  });
}

await writeFile(OUT, JSON.stringify(sections, null, 0) + "\n");
console.log(`${sections.length} sections from ${DOC_LIST.length} pages → src/lib/docs-index.json`);
