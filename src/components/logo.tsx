export function Mark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
      <defs>
        <linearGradient id="pd-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5e5ce6" />
          <stop offset="1" stopColor="#0a84ff" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="22" height="22" rx="6" fill="url(#pd-g)" />
      <path d="M6.5 9.5h11v7.5a1.5 1.5 0 0 1-1.5 1.5H8a1.5 1.5 0 0 1-1.5-1.5z" fill="white" opacity="0.95" />
      <path d="M6 7.25c0-.83.67-1.5 1.5-1.5h9c.83 0 1.5.67 1.5 1.5V9.5H6z" fill="white" opacity="0.7" />
      <rect x="10" y="12.25" width="4" height="1.5" rx="0.75" fill="#3b6fe8" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Mark />
      <span className="text-[17px] font-semibold tracking-[-0.02em]">PotDrive</span>
    </span>
  );
}
