// Static architecture diagram. Colors come from the theme tokens.
export function Architecture() {
  const box = "fill-[var(--ink-3)] stroke-[var(--line-2)]";
  const text = "fill-[var(--text)] text-[13px]";
  const sub = "fill-[var(--text-3)] text-[11px] font-mono";
  const arrow = "stroke-[var(--violet-2)]";
  return (
    <figure className="my-8 overflow-x-auto rounded-2xl border border-line bg-ink-2 p-4">
      <svg viewBox="0 0 860 430" className="min-w-[720px]" role="img" aria-label="PotDrive architecture">
        <defs>
          <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 10 5 0 10z" fill="var(--violet-2)" />
          </marker>
        </defs>

        {/* browser */}
        <rect x="20" y="30" width="210" height="150" rx="12" className={box} />
        <text x="40" y="58" className={text} fontWeight={600}>Browser</text>
        <text x="40" y="84" className={sub}>chunk 1 MiB</text>
        <text x="40" y="102" className={sub}>blake2b-256 → CIDs</text>
        <text x="40" y="120" className={sub}>UnixFS dag-pb root</text>
        <text x="40" y="138" className={sub}>AES-256-GCM (private)</text>
        <text x="40" y="160" className={sub}>re-hash on read</text>

        {/* wallet */}
        <rect x="300" y="30" width="200" height="70" rx="12" className={box} />
        <text x="320" y="58" className={text} fontWeight={600}>Your wallet</text>
        <text x="320" y="80" className={sub}>1 signature: batchAll</text>

        {/* upload key */}
        <rect x="300" y="140" width="200" height="70" rx="12" className={box} />
        <text x="320" y="168" className={text} fontWeight={600}>Upload key</text>
        <text x="320" y="190" className={sub}>in-tab, swept after</text>

        {/* registry */}
        <rect x="580" y="30" width="260" height="70" rx="12" className="fill-[var(--violet-soft)] stroke-[var(--violet)]" />
        <text x="600" y="58" className={text} fontWeight={600}>PotDriveRegistry · Revive</text>
        <text x="600" y="80" className={sub}>owner · keep-alive · logs</text>

        {/* node */}
        <rect x="580" y="140" width="260" height="130" rx="12" className="fill-[var(--violet-soft)] stroke-[var(--violet)]" />
        <text x="600" y="168" className={text} fontWeight={600}>Portaldot V3 node</text>
        <text x="600" y="192" className={sub}>TransactionStorage</text>
        <text x="600" y="210" className={sub}>  store · renew · checkProof</text>
        <text x="600" y="228" className={sub}>indexed tx DB (blake2b key)</text>
        <text x="600" y="246" className={sub}>bitswap_v1_get</text>

        {/* readers */}
        <rect x="20" y="300" width="210" height="100" rx="12" className={box} />
        <text x="40" y="328" className={text} fontWeight={600}>Readers</text>
        <text x="40" y="352" className={sub}>/ipfs/&lt;cid&gt; gateway</text>
        <text x="40" y="370" className={sub}>SDK getFile · CLI get</text>
        <text x="40" y="388" className={sub}>file page verifier</text>

        {/* keeper */}
        <rect x="300" y="320" width="200" height="80" rx="12" className={box} />
        <text x="320" y="348" className={text} fontWeight={600}>Keeper</text>
        <text x="320" y="370" className={sub}>daily cron · renew</text>
        <text x="320" y="388" className={sub}>claims renewed()</text>

        {/* arrows */}
        <path d="M230 70 H296" className={arrow} strokeWidth="1.5" markerEnd="url(#ah)" />
        <path d="M500 60 H576" className={arrow} strokeWidth="1.5" markerEnd="url(#ah)" />
        <text x="508" y="52" className={sub}>revive.call</text>
        <path d="M400 100 V136" className={arrow} strokeWidth="1.5" markerEnd="url(#ah)" />
        <text x="408" y="124" className={sub}>fund</text>
        <path d="M500 175 H576" className={arrow} strokeWidth="1.5" markerEnd="url(#ah)" />
        <text x="508" y="167" className={sub}>store × n</text>
        <path d="M580 250 C 420 270, 300 280, 234 330" className={arrow} strokeWidth="1.5" fill="none" markerEnd="url(#ah)" strokeDasharray="4 4" />
        <text x="380" y="276" className={sub}>bitswap</text>
        <path d="M500 350 C 560 340, 600 310, 640 274" className={arrow} strokeWidth="1.5" fill="none" markerEnd="url(#ah)" />
        <text x="560" y="350" className={sub}>renew</text>
        <path d="M500 330 C 700 300, 760 160, 740 104" className={arrow} strokeWidth="1.5" fill="none" markerEnd="url(#ah)" strokeDasharray="2 4" />
        <text x="770" y="300" className={sub}>renewed()</text>
      </svg>
      <figcaption className="mt-2 text-center text-xs text-text-3">Solid arrows write to chain. Dashed arrows read or reimburse.</figcaption>
    </figure>
  );
}
