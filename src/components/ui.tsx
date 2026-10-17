"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

type Variant = "filled" | "gray" | "plain";
const variants: Record<Variant, string> = {
  filled: "bg-accent text-white hover:bg-accent-hover",
  gray: "bg-fill text-label hover:bg-fill-2",
  plain: "text-link hover:underline",
};
const sizes = { sm: "h-8 px-3.5 text-[14px]", md: "h-10 px-5 text-[15px]", lg: "h-12 px-7 text-[17px]" };

export function Button({
  variant = "filled",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: keyof typeof sizes }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-normal transition-[background-color,transform,opacity] duration-200 ease-apple active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 ${variants[variant]} ${variant === "plain" ? "" : sizes[size]} ${className}`}
    />
  );
}

export function ButtonLink({
  href,
  variant = "filled",
  size = "md",
  className = "",
  children,
  external,
}: {
  href: string;
  variant?: Variant;
  size?: keyof typeof sizes;
  className?: string;
  children: ReactNode;
  external?: boolean;
}) {
  const cls = `inline-flex items-center justify-center gap-1.5 rounded-full transition-[background-color,transform] duration-200 ease-apple active:scale-[0.97] ${variants[variant]} ${variant === "plain" ? "" : sizes[size]} ${className}`;
  return external ? (
    <a href={href} className={cls} target="_blank" rel="noreferrer">
      {children}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

// Apple's "Learn more >" text link.
export function MoreLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={`group inline-flex items-center gap-0.5 text-link ${className}`}>
      <span className="group-hover:underline">{children}</span>
      <ChevronRight className="size-[1em] translate-y-px" strokeWidth={2.4} />
    </Link>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 ease-apple disabled:opacity-40 ${checked ? "bg-green" : "bg-fill-2"}`}
    >
      <span
        className={`absolute left-[2px] top-[2px] size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_3px_1px_rgb(0_0_0/0.06)] transition-transform duration-200 ease-apple ${checked ? "translate-x-5" : ""}`}
      />
    </button>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-[9px] bg-fill p-[2px]">
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="radio"
          aria-checked={value === o.value}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={`h-7 flex-1 rounded-[7px] text-[13px] transition-[background-color,box-shadow] duration-200 ease-apple disabled:opacity-35 ${
            value === o.value ? "bg-surface font-medium text-label shadow-[0_3px_8px_rgb(0_0_0/0.12),0_3px_1px_rgb(0_0_0/0.04)]" : "text-label"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// iOS inset grouped list.
export function Group({
  title,
  footer,
  children,
  className = "",
  gray = false,
}: {
  title?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  // On white pages use the gray fill; inside a gray sheet use the default white.
  gray?: boolean;
}) {
  return (
    <section className={className}>
      {title && <h3 className="mb-1.5 px-4 text-[13px] uppercase tracking-normal text-label-2">{title}</h3>}
      <div className={`overflow-hidden rounded-xl [&>*+*]:border-t [&>*+*]:border-sep ${gray ? "bg-bg-2" : "bg-surface"}`}>{children}</div>
      {footer && <p className="mt-1.5 px-4 text-[13px] leading-snug text-label-2">{footer}</p>}
    </section>
  );
}

export function Row({ label, detail, children, sub }: { label: ReactNode; detail?: ReactNode; children?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-[15px] text-label">{label}</div>
        {sub && <div className="text-[12px] leading-snug text-label-2">{sub}</div>}
      </div>
      {detail !== undefined && <div className="shrink-0 text-right text-[15px] text-label-2 tabular">{detail}</div>}
      {children}
    </div>
  );
}

export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`spin ${className}`} aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x="11" y="2" width="2" height="6" rx="1" fill="currentColor" opacity={0.15 + (i / 8) * 0.85} transform={`rotate(${i * 45} 12 12)`} />
      ))}
    </svg>
  );
}

export function Ring({ value, size = 36, stroke = 3.5, tone = "var(--accent)" }: { value: number; size?: number; stroke?: number; tone?: string }) {
  const r = size / 2 - stroke / 2 - 0.5;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fill-2)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={tone}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))}
        style={{ transition: "stroke-dashoffset 700ms var(--ease-out)" }}
      />
    </svg>
  );
}

const TYPE_COLORS: Record<string, string> = {
  PDF: "#ff3b30",
  PNG: "#0a84ff",
  JPG: "#0a84ff",
  JPEG: "#0a84ff",
  GIF: "#0a84ff",
  WEBP: "#0a84ff",
  SVG: "#0a84ff",
  MP4: "#af52de",
  MOV: "#af52de",
  WEBM: "#af52de",
  MP3: "#ff2d55",
  WAV: "#ff2d55",
  ZIP: "#8e8e93",
  TXT: "#8e8e93",
  MD: "#8e8e93",
  JSON: "#ff9500",
  CSV: "#34c759",
  LOCK: "#1d1d1f",
};

// A macOS-style document icon with a coloured type label.
export function DocIcon({ type, size = 56 }: { type: string; size?: number }) {
  const t = type.toUpperCase().slice(0, 4);
  const color = TYPE_COLORS[t] ?? "#0071e3";
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 48 60" aria-hidden>
      <path d="M6 2h25l13 13v39a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z" fill="var(--surface)" stroke="var(--sep-2)" strokeWidth="1" />
      <path d="M31 2v9a4 4 0 0 0 4 4h9" fill="var(--bg-2)" stroke="var(--sep-2)" strokeWidth="1" />
      <rect x="6" y="38" width={Math.max(18, t.length * 7 + 8)} height="12" rx="3" fill={color} />
      <text x="10" y="47" fill="white" fontSize="8.5" fontWeight="700" fontFamily="-apple-system, BlinkMacSystemFont, Inter, sans-serif" letterSpacing="0.3">
        {t}
      </text>
      <path d="M10 18h18M10 23h24M10 28h20" stroke="var(--fill-2)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
