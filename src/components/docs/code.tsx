import { codeToHtml } from "shiki";
import { CopyButton } from "../code";

// Server-rendered syntax highlighting. Both themes are emitted as CSS variables and the
// page picks one with prefers-color-scheme (see globals.css).
export async function Code({ code, lang = "ts", title }: { code: string; lang?: string; title?: string }) {
  const html = await codeToHtml(code.trim(), {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  });
  return (
    <div className="not-prose my-5 overflow-hidden rounded-2xl bg-bg-2">
      <div className="flex items-center justify-between px-4 pt-2.5">
        <span className="text-[12px] font-medium text-label-2">{title ?? lang}</span>
        <CopyButton text={code.trim()} />
      </div>
      <div className="shiki-wrap overflow-x-auto px-4 pb-4 pt-1.5 font-mono text-[12.5px] leading-relaxed [letter-spacing:0]" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
