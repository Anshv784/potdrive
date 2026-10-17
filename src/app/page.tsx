import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Footer, Nav } from "@/components/nav";
import { ArchiveDemo } from "@/components/archive-demo";
import { StorageCount } from "@/components/storage-count";
import { CodeTabs } from "@/components/code";

const steps = [
  {
    n: "01",
    title: "Prepared in your browser",
    body: "The file is cut into 1 MiB blocks. Each block is hashed with blake2b-256, the same hash Portaldot indexes, and a UnixFS root links them in order. Private files are sealed with AES-256-GCM first.",
    tech: "chunk → blake2b-256 → dag-pb root",
  },
  {
    n: "02",
    title: "You sign once",
    body: "One batch funds a throwaway upload key and records the file in the PotDrive registry, a Solidity contract running on Revive. Your wallet never sees a second prompt.",
    tech: "utility.batchAll · revive.call",
  },
  {
    n: "03",
    title: "Stored block by block",
    body: "The upload key sends one transactionStorage.store per block. The node indexes the tail of each extrinsic, so blocks can't share a batch. When the last block lands, the key sends what's left back to you.",
    tech: "transactionStorage.store × n",
  },
  {
    n: "04",
    title: "Checked, not trusted",
    body: "Your browser pulls every block back from a Portaldot node over bitswap and re-hashes it against its CID. A block only counts once its hash matches.",
    tech: "bitswap_v1_get → re-hash",
  },
];

const compare = [
  ["Who holds the bytes", "Portaldot validators", "A pinning company's IPFS nodes", "One cloud provider"],
  ["Proof the data still exists", "checkProof, inside the runtime", "None on chain", "None"],
  ["Address", "IPFS CID (blake2b-256)", "IPFS CID", "A URL that can change"],
  ["Who you trust to read it", "Nobody. Your browser re-hashes every block", "Their gateway", "The provider"],
  ["Extra accounts or API keys", "None", "Account + API key", "Account + billing"],
];

const pallets = [
  ["TransactionStorage", "store · renew · checkProof", "Holds the bytes for 100,800 blocks (about a week). Validators must prove they still have them."],
  ["Bitswap RPC", "bitswap_v1_get", "Serves any stored block by CID. This is the read path for the gateway, the SDK and the verifier."],
  ["Revive", "PotDriveRegistry.sol", "Ownership, listing and prepaid keep-alive. Plain EVM bytecode, called from a Polkadot wallet."],
  ["Utility + Balances", "batchAll · transferAll", "Turns a multi-transaction upload into one signature, and returns the unspent upload budget."],
];

const sdk = `import { prepareFile, uploadFile, connect } from "@potdrive/sdk";

const api = await connect();                    // wss://test-node-v3.portaldot.dev
const file = await prepareFile(bytes, { name: "deck.pdf", mime: "application/pdf" });

const { root } = await uploadFile({
  api, file,
  owner: { address, signer },                   // any Polkadot wallet signer
  registry: REGISTRY,                           // optional: record ownership
  onEvent: (e) => console.log(e.type),          // estimate, authorized, block, verified…
});

console.log(\`https://potdrive.anshverma.tech/ipfs/\${root}\`);`;

const cli = `$ bun cli/potdrive.ts put ./deck.pdf --private
  prepared   deck.pdf · 3.4 MiB → 4 chunks + root
  authorized 0x8c1e…09ab (block #75,112)
  stored     ████████████████████ 5/5 blocks
  verified   root served by bitswap in 412 ms
  link       https://potdrive.anshverma.tech/f/bafy2bzace…#k=…

$ bun cli/potdrive.ts get bafy2bzace… -o deck.pdf
  verified   5/5 blocks match their hashes`;

const gateway = `# Any stored file, with the right Content-Type. Works in <img>, <video>, fetch().
GET https://potdrive.anshverma.tech/ipfs/<cid>

# Force a download with a filename
GET https://potdrive.anshverma.tech/ipfs/<cid>?download=deck.pdf

# Metadata: registry record, chunk placements and expiry block
GET https://potdrive.anshverma.tech/api/file/<cid>`;

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        {/* hero */}
        <section className="desk relative overflow-hidden border-b border-line/70">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-20">
            <div className="flex flex-col justify-center">
              <span className="stamp inline-flex w-fit items-center gap-2 rounded-full border border-line-2 bg-ink-2 px-3 py-1 text-[10px] text-text-2">
                <span className="size-1.5 rounded-full bg-violet" />
                Portaldot V3 · TransactionStorage
              </span>
              <h1 className="mt-6 font-serif text-[2.9rem] leading-[1.02] tracking-tight text-text sm:text-6xl lg:text-[4.1rem]">
                Portaldot already had storage built in.{" "}
                <em className="text-violet-2">Now you can use it.</em>
              </h1>
              <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-text-2">
                PotDrive writes your files straight into Portaldot&apos;s own TransactionStorage. Validators keep every byte and
                have to prove they still have it. You get a real IPFS CID, a link that works anywhere, and a browser that
                checks each block for itself.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/drive"
                  className="inline-flex items-center gap-2 rounded-lg bg-violet px-5 py-2.5 font-medium text-white transition-[background-color,transform] duration-150 hover:bg-violet-2 active:scale-[0.98]"
                >
                  Open Drive <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/docs"
                  className="rounded-lg border border-line-2 px-5 py-2.5 text-text-2 transition-colors duration-150 hover:border-text-3 hover:text-text"
                >
                  How it works
                </Link>
              </div>
              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-6">
                {[
                  ["1", "signature per upload"],
                  ["7 days", "kept, then renewable"],
                  ["0", "servers you have to trust"],
                ].map(([v, l]) => (
                  <div key={l}>
                    <dt className="font-serif text-3xl text-text">{v}</dt>
                    <dd className="mt-1 text-xs leading-snug text-text-3">{l}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <ArchiveDemo />
          </div>
        </section>

        {/* the gap */}
        <section className="border-b border-line/70">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <span className="stamp text-[10px] text-violet-2">The unused pallet</span>
              <h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">It shipped in V3. Nothing had ever been stored in it.</h2>
            </div>
            <div className="space-y-5 text-text-2 leading-relaxed">
              <p>
                Portaldot V3 includes <code className="font-mono text-sm text-text">TransactionStorage</code>, the same pallet
                behind Polkadot&apos;s Bulletin chain. Anyone can call it, the node serves its data over IPFS bitswap, and every
                block producer has to prove it is still holding the data.
              </p>
              <p>
                When we checked on 17 October 2026, it held zero entries. There was no SDK, no gateway, no UI and no guide. Teams
                in this very hacker house were sending their files to outside IPFS pinning services instead.
              </p>
              <div className="paper flex items-center justify-between rounded-lg px-5 py-4">
                <div>
                  <div className="stamp text-[10px] text-paper-mute">Blocks holding data right now</div>
                  <div className="mt-1 font-mono text-xs text-paper-mute">TransactionStorage.Transactions, live</div>
                </div>
                <div className="font-serif text-5xl text-paper-ink">
                  <StorageCount />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* pipeline */}
        <section className="border-b border-line/70">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <span className="stamp text-[10px] text-violet-2">From your disk to a validator</span>
            <h2 className="mt-3 max-w-2xl font-serif text-4xl leading-tight sm:text-5xl">Four steps. Only one of them asks you anything.</h2>
            <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2 lg:grid-cols-4">
              {steps.map((s) => (
                <li key={s.n} className="flex flex-col bg-ink-2 p-6">
                  <span className="font-mono text-xs text-violet-2">{s.n}</span>
                  <h3 className="mt-4 text-lg font-medium text-text">{s.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-text-2">{s.body}</p>
                  <code className="mt-6 block border-t border-line pt-3 font-mono text-[11px] text-text-3">{s.tech}</code>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* comparison */}
        <section className="border-b border-line/70">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <span className="stamp text-[10px] text-violet-2">Why native</span>
            <h2 className="mt-3 max-w-2xl font-serif text-4xl leading-tight sm:text-5xl">The chain already pays validators to keep data.</h2>
            <div className="mt-10 overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-ink-2">
                    <th className="px-5 py-3 font-normal text-text-3"></th>
                    <th className="px-5 py-3 font-medium text-text">
                      <span className="inline-flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-violet" />
                        PotDrive
                      </span>
                    </th>
                    <th className="px-5 py-3 font-normal text-text-2">IPFS pinning service</th>
                    <th className="px-5 py-3 font-normal text-text-2">Cloud bucket</th>
                  </tr>
                </thead>
                <tbody>
                  {compare.map(([k, a, b, c]) => (
                    <tr key={k} className="border-b border-line last:border-0">
                      <td className="px-5 py-3.5 text-text-3">{k}</td>
                      <td className="bg-violet-soft/40 px-5 py-3.5 text-text">{a}</td>
                      <td className="px-5 py-3.5 text-text-2">{b}</td>
                      <td className="px-5 py-3.5 text-text-2">{c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* runtime */}
        <section className="border-b border-line/70">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <span className="stamp text-[10px] text-violet-2">Built from the runtime up</span>
              <h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">No new chain, no new token, no sidecar network.</h2>
              <p className="mt-5 text-text-2 leading-relaxed">
                PotDrive is middleware over things Portaldot V3 already runs, on both of its execution sides: native pallets for
                the bytes, and Solidity on Revive for the index.
              </p>
            </div>
            <ul className="divide-y divide-line rounded-2xl border border-line bg-ink-2">
              {pallets.map(([name, calls, what]) => (
                <li key={name} className="grid gap-1 px-5 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
                  <div>
                    <div className="font-medium text-text">{name}</div>
                    <div className="font-mono text-[11px] text-text-3">{calls}</div>
                  </div>
                  <p className="text-sm leading-relaxed text-text-2">{what}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* builders */}
        <section className="border-b border-line/70">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <span className="stamp text-[10px] text-violet-2">For builders</span>
              <h2 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">Storage for every other Portaldot app.</h2>
              <p className="mt-5 text-text-2 leading-relaxed">
                A TypeScript SDK, a CLI and an IPFS-style HTTP gateway. Point an <code className="font-mono text-sm">&lt;img&gt;</code>{" "}
                at a CID and it loads from Portaldot.
              </p>
              <Link href="/docs" className="mt-6 inline-flex items-center gap-2 text-violet-2 hover:text-text">
                Read the docs <ArrowRight className="size-4" />
              </Link>
            </div>
            <CodeTabs
              tabs={[
                { label: "SDK", code: sdk, title: "upload.ts" },
                { label: "CLI", code: cli, title: "terminal" },
                { label: "Gateway", code: gateway, title: "http" },
              ]}
            />
          </div>
        </section>

        <section>
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-24 sm:px-6 md:flex-row md:items-end md:justify-between">
            <h2 className="max-w-xl font-serif text-5xl leading-[1.05]">Put something on Portaldot that isn&apos;t a transfer.</h2>
            <Link
              href="/drive"
              className="inline-flex items-center gap-2 rounded-lg bg-violet px-6 py-3 font-medium text-white transition-[background-color,transform] duration-150 hover:bg-violet-2 active:scale-[0.98]"
            >
              Open Drive <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
