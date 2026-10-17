// Theme-aware SVG diagrams for the docs.

const box = { fill: "var(--surface)", stroke: "var(--sep-2)" };
const T = ({ x, y, children, mono, muted, bold, anchor }: { x: number; y: number; children: React.ReactNode; mono?: boolean; muted?: boolean; bold?: boolean; anchor?: "middle" | "end" }) => (
  <text
    x={x}
    y={y}
    textAnchor={anchor}
    fill={muted ? "var(--label-2)" : "var(--label)"}
    fontSize={mono ? 11 : 13}
    fontWeight={bold ? 600 : 400}
    fontFamily={mono ? "ui-monospace, SF Mono, Menlo, monospace" : "-apple-system, BlinkMacSystemFont, Inter, sans-serif"}
  >
    {children}
  </text>
);

function Frame({ children, label, h }: { children: React.ReactNode; label: string; h: number }) {
  return (
    <figure className="not-prose my-8 overflow-x-auto rounded-2xl bg-bg-2 p-4 sm:p-6">
      <svg viewBox={`0 0 760 ${h}`} className="min-w-[640px]" role="img" aria-label={label}>
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 10 5 0 10z" fill="var(--accent)" />
          </marker>
        </defs>
        {children}
      </svg>
      <figcaption className="mt-3 text-center text-[13px] text-label-2">{label}</figcaption>
    </figure>
  );
}

export function ArchitectureDiagram() {
  const line = { stroke: "var(--accent)", strokeWidth: 1.5, fill: "none", markerEnd: "url(#arr)" };
  return (
    <Frame label="Solid arrows write to Portaldot. Dashed arrows read." h={390}>
      <rect x="10" y="20" width="200" height="140" rx="14" {...box} />
      <T x={28} y={48} bold>Browser · SDK · CLI</T>
      <T x={28} y={74} mono muted>FastCDC chunking</T>
      <T x={28} y={92} mono muted>blake2b-256 CIDs</T>
      <T x={28} y={110} mono muted>UnixFS dag-pb</T>
      <T x={28} y={128} mono muted>AES-256-GCM (private)</T>
      <T x={28} y={146} mono muted>re-hash every read</T>

      <rect x="280" y="20" width="190" height="60" rx="14" {...box} />
      <T x={298} y={46} bold>Your wallet</T>
      <T x={298} y={66} mono muted>1 × utility.batchAll</T>

      <rect x="280" y="120" width="190" height="60" rx="14" {...box} />
      <T x={298} y={146} bold>Upload key</T>
      <T x={298} y={166} mono muted>in-tab · swept after</T>

      <rect x="540" y="20" width="210" height="60" rx="14" fill="var(--accent-soft)" stroke="var(--accent)" />
      <T x={558} y={46} bold>PotDriveRegistry</T>
      <T x={558} y={66} mono muted>Solidity on Revive</T>

      <rect x="540" y="120" width="210" height="140" rx="14" fill="var(--accent-soft)" stroke="var(--accent)" />
      <T x={558} y={148} bold>Portaldot V3 node</T>
      <T x={558} y={172} mono muted>TransactionStorage</T>
      <T x={558} y={190} mono muted>  store · renew · checkProof</T>
      <T x={558} y={208} mono muted>indexed-tx DB (blake2b)</T>
      <T x={558} y={226} mono muted>bitswap_v1_get</T>
      <T x={558} y={244} mono muted>eth-rpc (Revive)</T>

      <rect x="10" y="280" width="200" height="90" rx="14" {...box} />
      <T x={28} y={308} bold>Readers</T>
      <T x={28} y={330} mono muted>/ipfs/&lt;cid&gt;/&lt;path&gt;</T>
      <T x={28} y={348} mono muted>Range · sites · verify</T>

      <rect x="280" y="290" width="190" height="80" rx="14" {...box} />
      <T x={298} y={318} bold>Keeper</T>
      <T x={298} y={340} mono muted>daily · renew</T>
      <T x={298} y={358} mono muted>claims renewed()</T>

      <path d="M210 60 H276" {...line} />
      <path d="M470 50 H536" {...line} />
      <T x={478} y={42} mono muted>revive.call</T>
      <path d="M375 80 V116" {...line} />
      <T x={383} y={102} mono muted>fund</T>
      <path d="M470 150 H536" {...line} />
      <T x={478} y={142} mono muted>store × n</T>
      <path d="M540 250 C 420 270, 300 280, 214 312" {...line} strokeDasharray="4 4" />
      <T x={330} y={270} mono muted>bitswap · verified</T>
      <path d="M470 330 C 520 320, 560 300, 600 264" {...line} />
      <T x={500} y={350} mono muted>renew</T>
      <path d="M470 310 C 700 300, 720 160, 700 84" {...line} strokeDasharray="2 4" />
    </Frame>
  );
}

export function UploadSequence() {
  const lanes = [
    { x: 80, label: "Browser" },
    { x: 260, label: "Wallet" },
    { x: 440, label: "Upload key" },
    { x: 640, label: "Portaldot" },
  ];
  const msgs: [number, number, number, string][] = [
    [0, 0, 70, "prepare: chunk, hash, DAG (no network)"],
    [0, 3, 110, "listStored(): which blocks are already held"],
    [0, 1, 150, "sign batchAll[transferKeepAlive, revive.call]"],
    [1, 3, 190, "1 extrinsic: fund key + register root"],
    [2, 3, 230, "store(block 1) … store(block n), own nonces"],
    [3, 0, 270, "bitswap_v1_get(root) → re-hash"],
    [2, 3, 310, "transferAll(owner): unspent budget back"],
  ];
  return (
    <Frame label="One approval from the wallet; every other transaction is signed by the throwaway upload key." h={340}>
      {lanes.map((l) => (
        <g key={l.label}>
          <rect x={l.x - 60} y={10} width={120} height={32} rx={10} {...box} />
          <T x={l.x} y={31} bold anchor="middle">
            {l.label}
          </T>
          <line x1={l.x} y1={42} x2={l.x} y2={330} stroke="var(--sep-2)" strokeDasharray="3 4" />
        </g>
      ))}
      {msgs.map(([from, to, y, label]) => {
        const x1 = lanes[from].x;
        const x2 = lanes[to].x;
        if (from === to) {
          return (
            <g key={y}>
              <path d={`M${x1} ${y - 8} h40 v16 h-36`} stroke="var(--accent)" strokeWidth={1.5} fill="none" markerEnd="url(#arr)" />
              <T x={x1 + 48} y={y + 4} mono muted>
                {label}
              </T>
            </g>
          );
        }
        return (
          <g key={y}>
            <line x1={x1} y1={y} x2={x2 + (x2 > x1 ? -4 : 4)} y2={y} stroke="var(--accent)" strokeWidth={1.5} markerEnd="url(#arr)" />
            <T x={Math.min(x1, x2) + 8} y={y - 6} mono muted>
              {label}
            </T>
          </g>
        );
      })}
    </Frame>
  );
}

export function DagDiagram() {
  return (
    <Frame label="A file: raw leaves cut by FastCDC, linked in order by a UnixFS dag-pb root. A folder adds directory nodes above file roots." h={250}>
      <rect x="290" y="20" width="180" height="56" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" />
      <T x={380} y={44} bold anchor="middle">root · dag-pb (0x70)</T>
      <T x={380} y={63} mono muted anchor="middle">blockSizes [412K, 538K, …]</T>
      {[0, 1, 2, 3, 4].map((i) => {
        const x = 40 + i * 140;
        return (
          <g key={i}>
            <path d={`M380 76 L${x + 60} 160`} stroke="var(--sep-2)" strokeWidth={1.5} fill="none" />
            <rect x={x} y={160} width={120} height={56} rx={12} {...box} />
            <T x={x + 60} y={184} bold anchor="middle">{i === 4 ? "leaf n" : `leaf ${i + 1}`}</T>
            <T x={x + 60} y={203} mono muted anchor="middle">raw · 0x55</T>
          </g>
        );
      })}
    </Frame>
  );
}
