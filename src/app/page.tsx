import { Check, Cpu, FileLock2, Gem, GitCompareArrows, Globe, KeyRound, Layers, PlayCircle, RefreshCw, ScanSearch, Send, ShieldCheck, Minus, Zap } from "lucide-react";
import { Footer, Nav } from "@/components/nav";
import { ArchiveDemo } from "@/components/archive-demo";
import { StorageCount } from "@/components/storage-count";
import { CodeTabs } from "@/components/code";
import { ButtonLink, MoreLink } from "@/components/ui";
import { GithubIcon } from "@/components/logo";

const steps = [
  {
    icon: Layers,
    title: "Prepared on your device.",
    body: "FastCDC cuts your file where its content says to, not every N bytes, then hashes each piece with blake2b-256, the hash Portaldot indexes. Blocks the chain already holds are skipped.",
    tech: "FastCDC · blake2b-256 · dag-pb · dedup",
  },
  {
    icon: KeyRound,
    title: "One signature.",
    body: "A single batch funds a temporary upload key and records the file in the PotDrive registry on Revive. Your wallet asks once.",
    tech: "utility.batchAll · revive.call",
  },
  {
    icon: Cpu,
    title: "Stored by the chain.",
    body: "The upload key writes each block with transactionStorage.store, then sends whatever it didn't spend back to you.",
    tech: "transactionStorage.store × n",
  },
  {
    icon: ScanSearch,
    title: "Checked, not trusted.",
    body: "Your browser pulls every block back over bitswap and re-hashes it. A block only counts once its hash matches.",
    tech: "bitswap_v1_get → re-hash",
  },
];

const compare: [string, string | boolean, string | boolean, string | boolean][] = [
  ["Held by the network you already use", true, false, false],
  ["Storage proofs inside the runtime", true, false, false],
  ["Standard IPFS content IDs", true, true, false],
  ["Readers verify every byte themselves", true, false, false],
  ["No extra account or API key", true, false, false],
  ["Who holds the bytes", "Portaldot validators", "A pinning company", "One cloud provider"],
];

const sdk = `import { connect, prepareFile, uploadFile } from "@potdrive/sdk";

const api = await connect();
const file = await prepareFile(bytes, { name: "deck.pdf", mime: "application/pdf" });

const { root } = await uploadFile({
  api, file,
  owner: { address, signer },   // any Polkadot wallet
  registry: REGISTRY,
  onEvent: (e) => console.log(e.type),
});

// https://potdrive.anshverma.tech/ipfs/<root>`;

const cli = `$ bun cli/potdrive.ts put ./deck.pdf --private
  prepared   deck.pdf · 3.40 MiB → 5 blocks · sealed
  estimate   410.7 tPOT at most
  authorized 0x8c1e5f0d… (block #75,112)
  stored     ████████████████████ 5/5 blocks
  verified   root served by bitswap in 412 ms
  link       https://potdrive.anshverma.tech/f/bafykbzace…#k=…`;

const gateway = `# Any stored file, with the right Content-Type
GET https://potdrive.anshverma.tech/ipfs/<cid>

# As a download
GET https://potdrive.anshverma.tech/ipfs/<cid>?download=deck.pdf

# Where every block lives, and when it expires
GET https://potdrive.anshverma.tech/api/file/<cid>`;

function Mark({ v }: { v: string | boolean }) {
  if (v === true) return <Check className="mx-auto size-5 text-accent" strokeWidth={2.5} aria-label="Yes" />;
  if (v === false) return <Minus className="mx-auto size-5 text-label-3" aria-label="No" />;
  return <span className="text-[14px] text-label-2">{v}</span>;
}

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        {/* hero */}
        <section className="overflow-hidden px-5 pb-20 pt-16 text-center sm:pt-24">
          <p className="eyebrow text-accent">New on Portaldot V3</p>
          <h1 className="headline mx-auto mt-3 max-w-4xl text-[44px] sm:text-[64px] lg:text-[80px]">Storage, built into the chain.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-[19px] leading-snug text-label-2 sm:text-[24px]">
            PotDrive puts your files straight into Portaldot&apos;s own TransactionStorage. One signature to store. Every byte
            checked by the browser that reads it.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/drive" size="lg">
              Open Drive
            </ButtonLink>
            <ButtonLink href="/docs" size="lg" variant="gray">
              Read the docs
            </ButtonLink>
            <ButtonLink href="https://github.com/Anshv784/potdrive" size="lg" variant="gray" external>
              <GithubIcon className="size-5" /> GitHub
            </ButtonLink>
          </div>
          <div className="mx-auto mt-16 max-w-4xl">
            <ArchiveDemo />
          </div>
        </section>

        {/* numbers */}
        <section className="bg-bg-2 px-5 py-20">
          <div className="mx-auto grid max-w-[1024px] gap-12 text-center sm:grid-cols-3">
            {[
              ["1", "signature", "Per upload, whatever the size. The rest is signed by a temporary key in your tab."],
              ["7", "days", "Kept and proven by validators per payment, then renewable by anyone."],
              ["0", "servers to trust", "Readers fetch from the chain and verify every block against its hash."],
            ].map(([n, unit, body]) => (
              <div key={unit}>
                <div className="headline text-[64px] leading-none sm:text-[80px]">{n}</div>
                <div className="mt-1 text-[21px] font-semibold">{unit}</div>
                <p className="mx-auto mt-2 max-w-[17rem] text-[15px] text-label-2">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* the gap */}
        <section className="px-5 py-24">
          <div className="mx-auto max-w-[1024px]">
            <div className="grid items-center gap-10 overflow-hidden rounded-[28px] bg-bg-2 p-8 sm:p-14 md:grid-cols-[1.2fr_1fr]">
              <div>
                <p className="eyebrow text-label-2">The unused pallet</p>
                <h2 className="headline mt-2 text-[34px] sm:text-[48px]">It shipped in V3. Nobody had stored a thing.</h2>
                <p className="mt-5 text-[17px] text-label-2">
                  Portaldot V3 runs TransactionStorage, the same pallet behind Polkadot&apos;s Bulletin chain. When we looked on
                  17&nbsp;October 2026 it held zero entries. No SDK, no gateway, no app. Teams on Portaldot were sending their files
                  to outside pinning services instead.
                </p>
              </div>
              <div className="rounded-[22px] bg-surface p-8 text-center shadow-card">
                <div className="text-[13px] font-medium text-label-2">Blocks holding data right now</div>
                <div className="headline mt-2 text-[96px] leading-none text-accent">
                  <StorageCount />
                </div>
                <div className="mt-3 font-mono text-[12px] text-label-3">TransactionStorage.Transactions · live</div>
              </div>
            </div>
          </div>
        </section>

        {/* how */}
        <section className="bg-bg-2 px-5 py-24">
          <div className="mx-auto max-w-[1024px]">
            <h2 className="headline text-center text-[40px] sm:text-[56px]">Four steps. One question.</h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-[19px] text-label-2">From your disk to a validator, and back to anyone with the link.</p>
            <div className="mt-14 grid gap-5 md:grid-cols-2">
              {steps.map((s) => (
                <div key={s.title} className="flex flex-col rounded-[28px] bg-surface p-8 sm:p-10">
                  <s.icon className="size-9 text-accent" strokeWidth={1.6} />
                  <h3 className="mt-6 text-[24px] font-semibold tracking-[-0.02em]">{s.title}</h3>
                  <p className="mt-2 flex-1 text-[17px] text-label-2">{s.body}</p>
                  <code className="mt-6 font-mono text-[12px] text-label-3">{s.tech}</code>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* features */}
        <section className="px-5 py-24">
          <h2 className="headline mx-auto max-w-3xl text-center text-[40px] sm:text-[56px]">Engineered for a chain that charges by the byte.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-[19px] text-label-2">
            Storage on Portaldot costs about 105 tPOT per MiB. So PotDrive never stores the same byte twice.
          </p>
          <div className="mx-auto mt-12 grid max-w-[1024px] gap-5 md:grid-cols-3">
            {[
              [GitCompareArrows, "Versions pay for changes only.", "Content-defined chunking keeps chunk boundaries stable across edits. Insert 1 KiB into a 16 MiB file and FastCDC stores 609 KiB again; fixed chunks would store all 16 MiB."],
              [Globe, "Websites, served from the chain.", "potdrive deploy ./dist stores a UnixFS directory. The gateway resolves paths block by block and runs the site in a sandboxed origin."],
              [PlayCircle, "Streaming with Range.", "The gateway maps a byte range to just the chunks that cover it, so video seeks without downloading what came before."],
              [Zap, "Gasless with MetaTx.", "No tPOT yet? Sign one authorization and a relay pays the fees through Portaldot's MetaTx pallet."],
              [Gem, "NFTs, fully on Portaldot.", "Mint on the native Nfts pallet in one signature. The media is stored by Portaldot itself, not a pinning service."],
              [Send, "Share with a wallet.", "Seal a private file's key to another address with X25519 inbox keys. No link to leak."],
              [FileLock2, "Private by choice.", "AES-256-GCM in your browser before upload. The chain only sees ciphertext. The key lives in the link, after the #."],
              [RefreshCw, "Keep-alive.", "Prepay renewals and a daily keeper renews your file before Portaldot drops it, reimbursed exactly, capped per file."],
              [ShieldCheck, "Verified everywhere.", "The Drive, the gateway, the SDK and the CLI all re-hash every block before they use it."],
            ].map(([Icon, title, body]) => {
              const I = Icon as typeof FileLock2;
              return (
                <div key={title as string} className="rounded-[28px] bg-bg-2 p-8">
                  <I className="size-8 text-accent" strokeWidth={1.6} />
                  <h3 className="mt-5 text-[21px] font-semibold tracking-[-0.02em]">{title as string}</h3>
                  <p className="mt-2 text-[15px] text-label-2">{body as string}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* compare */}
        <section className="bg-bg-2 px-5 py-24">
          <div className="mx-auto max-w-[1024px]">
            <h2 className="headline text-center text-[40px] sm:text-[56px]">Why native.</h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-[19px] text-label-2">Portaldot already pays validators to keep and prove data.</p>
            <div className="mt-12 overflow-x-auto rounded-[28px] bg-surface p-2 sm:p-6">
              <table className="w-full min-w-[620px] text-center">
                <thead>
                  <tr>
                    <th className="w-[40%]" />
                    <th className="pb-6 pt-2 text-[17px] font-semibold">PotDrive</th>
                    <th className="pb-6 pt-2 text-[17px] font-normal text-label-2">Pinning service</th>
                    <th className="pb-6 pt-2 text-[17px] font-normal text-label-2">Cloud bucket</th>
                  </tr>
                </thead>
                <tbody>
                  {compare.map(([k, a, b, c]) => (
                    <tr key={k} className="border-t border-sep">
                      <td className="py-4 pr-4 text-left text-[15px]">{k}</td>
                      <td className="py-4">
                        <Mark v={a} />
                      </td>
                      <td className="py-4">
                        <Mark v={b} />
                      </td>
                      <td className="py-4">
                        <Mark v={c} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* runtime */}
        <section className="px-5 py-24">
          <div className="mx-auto max-w-[1024px]">
            <h2 className="headline text-center text-[40px] sm:text-[56px]">Made of Portaldot.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-[19px] text-label-2">
              No new chain, no new token. Native pallets hold the bytes. Solidity on Revive keeps the index.
            </p>
            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              {[
                ["TransactionStorage", "store · renew · checkProof", "Holds each block for 100,800 blocks. Validators must keep proving they have it."],
                ["Bitswap RPC", "bitswap_v1_get", "Returns any stored block by CID. The read path for every client."],
                ["Revive", "PotDriveRegistry.sol", "Ownership and keep-alive. EVM bytecode, called from a Polkadot wallet."],
                ["Utility + Balances", "batchAll · transferAll", "Turns many transactions into one signature, and returns the change."],
              ].map(([name, calls, what]) => (
                <div key={name} className="rounded-[28px] bg-bg-2 p-8">
                  <div className="text-[21px] font-semibold tracking-[-0.02em]">{name}</div>
                  <div className="mt-1 font-mono text-[12px] text-accent">{calls}</div>
                  <p className="mt-3 text-[15px] text-label-2">{what}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* developers */}
        <section className="bg-bg-2 px-5 py-24">
          <div className="mx-auto max-w-3xl">
            <h2 className="headline text-center text-[40px] sm:text-[56px]">For every other Portaldot app.</h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-[19px] text-label-2">
              An SDK, a CLI and an IPFS-style gateway. Point an image tag at a CID and it loads from Portaldot.
            </p>
            <div className="mt-10">
              <CodeTabs
                tabs={[
                  { label: "SDK", code: sdk, title: "upload.ts" },
                  { label: "CLI", code: cli, title: "Terminal" },
                  { label: "Gateway", code: gateway, title: "HTTP" },
                ]}
              />
            </div>
            <div className="mt-8 text-center">
              <MoreLink href="/docs">Read the docs</MoreLink>
            </div>
          </div>
        </section>

        <section className="px-5 py-28 text-center">
          <h2 className="headline mx-auto max-w-3xl text-[40px] sm:text-[56px]">Put something on Portaldot that isn&apos;t a transfer.</h2>
          <div className="mt-8">
            <ButtonLink href="/drive" size="lg">
              Open Drive
            </ButtonLink>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
