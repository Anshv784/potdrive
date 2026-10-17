export function Mark({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <rect x="2.75" y="5.75" width="18.5" height="15.5" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.75 11.5h18.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9.5 15.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="17.5" cy="3.5" r="2.5" fill="var(--violet)" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Mark />
      <span className="font-serif text-[1.35rem] leading-none tracking-tight">PotDrive</span>
    </span>
  );
}
