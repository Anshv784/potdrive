import {
  Check,
  Cpu,
  FileLock2,
  Gem,
  GitCompareArrows,
  Globe,
  KeyRound,
  Layers,
  PlayCircle,
  RefreshCw,
  ScanSearch,
  Send,
  ShieldCheck,
  Minus,
  Zap,
} from "lucide-react";
import { Footer, Nav } from "@/components/nav";
import { ArchiveDemo } from "@/components/archive-demo";
import { Journey } from "@/components/journey/journey";
import { StorageCount } from "@/components/storage-count";
import { DevShowcase } from "@/components/dev-showcase";
import { ButtonLink, MoreLink } from "@/components/ui";
import { GithubIcon } from "@/components/logo";
import { Faq } from "@/components/faq";
import { HeroBackdrop, TiltIn } from "@/components/hero-fx";
import { CountUp, Reveal, Stagger, TiltCard } from "@/components/motion";

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
        <section className="relative isolate overflow-hidden px-5 pb-20 pt-16 text-center sm:pt-24">
          <HeroBackdrop />
          <p className="rise eyebrow text-accent">New on Portaldot V3</p>
          <h1 className="headline mx-auto mt-3 max-w-4xl text-[44px] sm:text-[64px] lg:text-[80px]">
            <span className="rise inline-block" style={{ "--d": "0.06s" } as React.CSSProperties}>
              Storage,
            </span>{" "}
            <span className="rise inline-block" style={{ "--d": "0.13s" } as React.CSSProperties}>
              built
            </span>{" "}
            <span className="rise inline-block" style={{ "--d": "0.20s" } as React.CSSProperties}>
              into
            </span>{" "}
            <span className="rise inline-block" style={{ "--d": "0.27s" } as React.CSSProperties}>
              the
            </span>{" "}
            <span className="rise inline-block" style={{ "--d": "0.34s" } as React.CSSProperties}>
              chain.
            </span>
          </h1>
          <p
            style={{ "--d": "0.18s" } as React.CSSProperties}
            className="rise mx-auto mt-5 max-w-2xl text-[19px] leading-snug text-label-2 sm:text-[24px]"
          >
            PotDrive puts your files straight into Portaldot&apos;s own TransactionStorage. One signature to store. Every byte
            checked by the browser that reads it.
          </p>
          <div
            style={{ "--d": "0.28s" } as React.CSSProperties}
            className="rise mt-8 flex flex-wrap items-center justify-center gap-3"
          >
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
          <div style={{ "--d": "0.4s" } as React.CSSProperties} className="rise mx-auto mt-16 max-w-4xl">
            <TiltIn>
              <ArchiveDemo />
            </TiltIn>
          </div>
        </section>

        <Journey />

        {/* numbers */}
        <section className="bg-bg-2 px-5 py-20">
          <Stagger className="mx-auto grid max-w-[1024px] gap-12 text-center sm:grid-cols-3" step={0.12}>
            {[
              ["1", "signature", "Per upload, whatever the size. The rest is signed by a temporary key in your tab."],
              ["7", "days", "Kept and proven by validators per payment, then renewable by anyone."],
              ["0", "servers to trust", "Readers fetch from the chain and verify every block against its hash."],
            ].map(([n, unit, body]) => (
              <div key={unit}>
                <CountUp to={Number(n)} className="headline block text-[64px] leading-none sm:text-[80px]" />
                <div className="mt-1 text-[21px] font-semibold">{unit}</div>
                <p className="mx-auto mt-2 max-w-[17rem] text-[15px] text-label-2">{body}</p>
              </div>
            ))}
          </Stagger>
        </section>

        {/* the gap */}
        <section className="px-5 py-24">
          <div className="mx-auto max-w-[1024px]">
            <Reveal>
              <div className="grid items-center gap-10 overflow-hidden rounded-[28px] bg-bg-2 p-8 sm:p-14 md:grid-cols-[1.2fr_1fr]">
                <div>
                  <p className="eyebrow text-label-2">The unused pallet</p>
                  <h2 className="headline mt-2 text-[34px] sm:text-[48px]">It shipped in V3. Nobody had stored a thing.</h2>
                  <p className="mt-5 text-[17px] text-label-2">
                    Portaldot V3 runs TransactionStorage, the same pallet behind Polkadot&apos;s Bulletin chain. When we looked on
                    17&nbsp;October 2026 it held zero entries. No SDK, no gateway, no app. Teams on Portaldot were sending their
                    files to outside pinning services instead.
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
            </Reveal>
          </div>
        </section>

        {/* how */}
        <section className="bg-bg-2 px-5 py-24">
          <div className="mx-auto max-w-[1024px]">
            <Reveal>
              <h2 className="headline text-center text-[40px] sm:text-[56px]">Four steps. One question.</h2>
              <p className="mx-auto mt-4 max-w-xl text-center text-[19px] text-label-2">
                From your disk to a validator, and back to anyone with the link.
              </p>
            </Reveal>
            <Stagger className="mt-14 grid gap-5 md:grid-cols-2">
              {steps.map((s) => (
                <TiltCard key={s.title} className="flex flex-col rounded-[28px] bg-surface p-8 sm:p-10" max={4}>
                  <s.icon className="size-9 text-accent" strokeWidth={1.6} />
                  <h3 className="mt-6 text-[24px] font-semibold tracking-[-0.02em]">{s.title}</h3>
                  <p className="mt-2 flex-1 text-[17px] text-label-2">{s.body}</p>
                  <code className="mt-6 font-mono text-[12px] text-label-3">{s.tech}</code>
                </TiltCard>
              ))}
            </Stagger>
          </div>
        </section>

        {/* features */}
        <section className="px-5 py-24">
          <Reveal>
            <h2 className="headline mx-auto max-w-3xl text-center text-[40px] sm:text-[56px]">
              Engineered for a chain that charges by the byte.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-[19px] text-label-2">
              Storage on Portaldot costs about 105 tPOT per MiB. So PotDrive never stores the same byte twice.
            </p>
          </Reveal>
          <Stagger className="mx-auto mt-12 grid max-w-[1024px] gap-5 md:grid-cols-3" step={0.05}>
            {[
              [
                GitCompareArrows,
                "Versions pay for changes only.",
                "Content-defined chunking keeps chunk boundaries stable across edits. Insert 1 KiB into a 16 MiB file and FastCDC stores 609 KiB again; fixed chunks would store all 16 MiB.",
              ],
              [
                Globe,
                "Websites, served from the chain.",
                "potdrive deploy ./dist stores a UnixFS directory. The gateway resolves paths block by block and runs the site in a sandboxed origin.",
              ],
              [
                PlayCircle,
                "Streaming with Range.",
                "The gateway maps a byte range to just the chunks that cover it, so video seeks without downloading what came before.",
              ],
              [
                Zap,
                "Gasless with MetaTx.",
                "No tPOT yet? Sign one authorization and a relay pays the fees through Portaldot's MetaTx pallet.",
              ],
              [
                Gem,
                "NFTs, fully on Portaldot.",
                "Mint on the native Nfts pallet in one signature. The media is stored by Portaldot itself, not a pinning service.",
              ],
              [
                Send,
                "Share with a wallet.",
                "Seal a private file's key to another address with X25519 inbox keys. No link to leak.",
              ],
              [
                FileLock2,
                "Private by choice.",
                "AES-256-GCM in your browser before upload. The chain only sees ciphertext. The key lives in the link, after the #.",
              ],
              [
                RefreshCw,
                "Keep-alive.",
                "Prepay renewals and a daily keeper renews your file before Portaldot drops it, reimbursed exactly, capped per file.",
              ],
              [
                ShieldCheck,
                "Verified everywhere.",
                "The Drive, the gateway, the SDK and the CLI all re-hash every block before they use it.",
              ],
            ].map(([Icon, title, body]) => {
              const I = Icon as typeof FileLock2;
              return (
                <TiltCard key={title as string} className="group rounded-[28px] bg-bg-2 p-8">
                  <I
                    className="size-8 text-accent transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-110"
                    strokeWidth={1.6}
                  />
                  <h3 className="mt-5 text-[21px] font-semibold tracking-[-0.02em]">{title as string}</h3>
                  <p className="mt-2 text-[15px] text-label-2">{body as string}</p>
                </TiltCard>
              );
            })}
          </Stagger>
        </section>

        {/* compare */}
        <section className="bg-bg-2 px-5 py-24">
          <div className="mx-auto max-w-[1024px]">
            <Reveal>
              <h2 className="headline text-center text-[40px] sm:text-[56px]">Why native.</h2>
              <p className="mx-auto mt-4 max-w-xl text-center text-[19px] text-label-2">
                Portaldot already pays validators to keep and prove data.
              </p>
            </Reveal>
            <Reveal>
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
                      <tr key={k} className="border-t border-sep transition-colors duration-200 hover:bg-fill">
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
            </Reveal>
          </div>
        </section>

        {/* runtime */}
        <section className="px-5 py-24">
          <div className="mx-auto max-w-[1024px]">
            <Reveal>
              <h2 className="headline text-center text-[40px] sm:text-[56px]">Made of Portaldot.</h2>
              <p className="mx-auto mt-4 max-w-2xl text-center text-[19px] text-label-2">
                No new chain, no new token. Native pallets hold the bytes. Solidity on Revive keeps the index.
              </p>
            </Reveal>
            <Stagger className="mt-12 grid gap-5 sm:grid-cols-2" step={0.08}>
              {[
                [
                  "TransactionStorage",
                  "store · renew · checkProof",
                  "Holds each block for 100,800 blocks. Validators must keep proving they have it.",
                ],
                ["Bitswap RPC", "bitswap_v1_get", "Returns any stored block by CID. The read path for every client."],
                ["Revive", "PotDriveRegistry.sol", "Ownership and keep-alive. EVM bytecode, called from a Polkadot wallet."],
                [
                  "Utility + Balances",
                  "batchAll · transferAll",
                  "Turns many transactions into one signature, and returns the change.",
                ],
              ].map(([name, calls, what]) => (
                <TiltCard key={name} className="rounded-[28px] bg-bg-2 p-8" max={4}>
                  <div className="text-[21px] font-semibold tracking-[-0.02em]">{name}</div>
                  <div className="mt-1 font-mono text-[12px] text-accent">{calls}</div>
                  <p className="mt-3 text-[15px] text-label-2">{what}</p>
                </TiltCard>
              ))}
            </Stagger>
          </div>
        </section>

        {/* developers */}
        <section className="bg-bg-2 px-5 py-24">
          <div className="mx-auto max-w-[1100px]">
            <Reveal>
              <p className="eyebrow text-center text-accent">For developers</p>
              <h2 className="headline mt-2 text-center text-[40px] sm:text-[56px]">For every other Portaldot app.</h2>
              <p className="mx-auto mt-4 max-w-xl text-center text-[19px] text-label-2">
                An SDK, React components, a CLI and an IPFS-style gateway. Point an image tag at a CID and it loads from
                Portaldot.
              </p>
            </Reveal>
            <Reveal className="mt-12" delay={0.1}>
              <DevShowcase />
            </Reveal>
            <div className="mt-10 text-center">
              <MoreLink href="/docs">Read the docs</MoreLink>
            </div>
          </div>
        </section>

        {/* faq */}
        <section id="faq" className="px-5 py-24">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <h2 className="headline text-center text-[40px] sm:text-[56px]">Questions, answered.</h2>
              <p className="mx-auto mt-4 max-w-xl text-center text-[19px] text-label-2">
                The things people ask before they store their first file.
              </p>
            </Reveal>
            <Reveal className="mt-12" delay={0.1}>
              <Faq />
            </Reveal>
            <div className="mt-8 text-center">
              <MoreLink href="/docs/limits">More in Costs and limits</MoreLink>
            </div>
          </div>
        </section>

        <section className="relative isolate overflow-hidden bg-bg-2 px-5 py-32 text-center">
          <HeroBackdrop y={45} />
          <Reveal>
            <p className="eyebrow text-accent">Live on the Portaldot V3 testnet</p>
            <h2 className="headline mx-auto mt-3 max-w-3xl text-[40px] sm:text-[56px]">
              Put something on Portaldot that isn&apos;t a transfer.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[19px] text-label-2">
              Drop a file, sign once, and share a link anyone can verify.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href="/drive" size="lg">
                Open Drive
              </ButtonLink>
              <ButtonLink href="/docs/quickstart" size="lg" variant="gray">
                Quickstart
              </ButtonLink>
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  );
}
