"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const QA: [string, ReactNode][] = [
  [
    "Where are my files actually stored?",
    <>
      In Portaldot itself. Each block goes into the runtime&apos;s <code>TransactionStorage</code> pallet, and validators keep it.
      There is no PotDrive server holding a copy, and no outside pinning service.
    </>,
  ],
  [
    "How long does a file stay on chain?",
    <>
      100,800 blocks per store or renew, about 7 days. Anyone can renew a file before it expires. Turn on keep-alive and a daily
      keeper renews it for you from a balance you prepay, capped per file.
    </>,
  ],
  [
    "What does it cost?",
    <>
      About 0.11 tPOT per KiB, or roughly 105 tPOT per MiB, paid to the chain. Blocks Portaldot already holds are linked, not paid
      for again, so a new version of a file only pays for what changed.
    </>,
  ],
  [
    "Are my files public?",
    <>
      By default, yes: anyone with the CID can read them, like IPFS. Mark a file private and it is encrypted with AES-256-GCM in
      your browser first. The chain only sees ciphertext, and the key lives in the share link after the #.
    </>,
  ],
  [
    "Can I delete a file?",
    <>
      Not from the chain. Nobody can remove a stored block early. Stop renewing and Portaldot drops it when its window ends. For
      anything sensitive, store it private.
    </>,
  ],
  [
    "How do I know nobody tampered with it?",
    <>
      The CID is the blake2b-256 hash of the bytes. The Drive, the gateway, the SDK and the CLI re-hash every block before using
      it and refuse anything that doesn&apos;t match. You don&apos;t have to trust the node or us.
    </>,
  ],
  [
    "Which wallets work?",
    <>Any Polkadot extension wallet: Polkadot&#123;.js&#125;, Talisman, SubWallet or Nova. You sign once per upload.</>,
  ],
  [
    "How big can a file be?",
    <>
      The Drive takes up to 64 MiB per file or folder. The CLI has no cap. Files are cut into blocks of 1 MiB or less, well under
      the chain&apos;s 8 MiB limit per store.
    </>,
  ],
  [
    "Can my own app use it?",
    <>
      Yes. Install <code>@potdrive/sdk</code> to upload and read from TypeScript, use the <code>potdrive</code> CLI, or point an{" "}
      <code>&lt;img&gt;</code> tag at the gateway. AI agents can use the MCP server.
    </>,
  ],
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-sep rounded-[28px] bg-surface px-6 sm:px-8">
      {QA.map(([q, a], i) => {
        const on = open === i;
        return (
          <div key={q}>
            <h3>
              <button
                aria-expanded={on}
                aria-controls={`faq-${i}`}
                onClick={() => setOpen(on ? null : i)}
                className="group flex w-full items-center justify-between gap-6 py-5 text-left text-[17px] font-semibold tracking-[-0.01em] sm:py-6 sm:text-[19px]"
              >
                <span className="transition-colors duration-200 group-hover:text-accent">{q}</span>
                <motion.span
                  animate={{ rotate: on ? 45 : 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className={`grid size-8 shrink-0 place-items-center rounded-full transition-colors duration-200 ${on ? "bg-accent text-white" : "bg-fill text-label-2 group-hover:text-label"}`}
                >
                  <Plus className="size-4" />
                </motion.span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {on && (
                <motion.div
                  id={`faq-${i}`}
                  role="region"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{
                    height: "auto",
                    opacity: 1,
                    transition: {
                      height: { duration: 0.4, ease: EASE },
                      opacity: { duration: 0.3, delay: 0.08 },
                    },
                  }}
                  exit={{
                    height: 0,
                    opacity: 0,
                    transition: {
                      height: { duration: 0.3, ease: EASE },
                      opacity: { duration: 0.15 },
                    },
                  }}
                  className="overflow-hidden"
                >
                  <p className="max-w-2xl pb-6 text-[16px] leading-relaxed text-label-2 [&_code]:rounded [&_code]:bg-fill [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px]">
                    {a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
