"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { useResolvedTheme } from "@/lib/theme";
import type { Palette } from "./scene";

const Scene = dynamic(() => import("./scene"), { ssr: false });

const STAGES = [
  {
    n: "01",
    title: "It starts as one file.",
    body: "A PDF, a photo, a whole website. Nothing has left your device yet.",
    tech: "File · 3.4 MiB",
  },
  {
    n: "02",
    title: "Cut where the content says.",
    body: "FastCDC finds chunk boundaries in the bytes themselves, so an edit only changes the chunks around it.",
    tech: "FastCDC · 256 KiB – 1 MiB",
  },
  {
    n: "03",
    title: "Hashed, then checked against the chain.",
    body: "Each chunk gets a blake2b-256 CID. Two of these are already on Portaldot, so they are linked, not paid for again.",
    tech: "CIDv1 · blake2b-256 · dedup",
  },
  {
    n: "04",
    title: "Stored by Portaldot itself.",
    body: "One signature. An upload key writes each new chunk into TransactionStorage, block after block.",
    tech: "transactionStorage.store × 5",
  },
  {
    n: "05",
    title: "Proven, block after block.",
    body: "Validators must keep proving they hold random pieces of what was stored, or their blocks are rejected.",
    tech: "checkProof · 100,800 blocks",
  },
  {
    n: "06",
    title: "Read anywhere. Verified everywhere.",
    body: "Any reader pulls the chunks back over bitswap and re-hashes every one before the file reassembles.",
    tech: "bitswap_v1_get → re-hash ✓",
  },
];
const CUTS = [0.14, 0.3, 0.46, 0.66, 0.82];

const PALETTES: Record<"light" | "dark", Palette> = {
  light: { paper: "#ffffff", edge: "#c7c7d1", accent: "#4f46e5", green: "#34c759", glass: "#c7d2fe", bg: "#ffffff" },
  dark: { paper: "#2c2c30", edge: "#5b5b66", accent: "#818cf8", green: "#30d158", glass: "#3730a3", bg: "#000000" },
};

export function Journey() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  const [stage, setStage] = useState(0);
  const [active, setActive] = useState(false);
  const [reduced, setReduced] = useState(false);
  const theme = useResolvedTheme();

  useMotionValueEvent(scrollYProgress, "change", (p) => setStage(CUTS.filter((c) => p >= c).length));

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const s = STAGES[stage];
  return (
    <section ref={ref} className="relative h-[560vh] bg-bg-2" aria-label="How a file travels through PotDrive">
      <div className="sticky top-12 flex h-[calc(100dvh-3rem)] flex-col overflow-hidden lg:flex-row">
        {/* caption */}
        <div className="relative z-10 flex shrink-0 flex-col justify-end px-6 pb-6 pt-8 lg:w-[38%] lg:justify-center lg:px-14 lg:pb-0">
          <p className="eyebrow text-accent">The journey of a file</p>
          <AnimatePresence mode="wait">
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mt-4 font-mono text-[13px] text-label-3">{s.n} / 06</div>
              <h2 className="headline mt-2 text-[30px] sm:text-[40px] lg:text-[46px]">{s.title}</h2>
              <p className="mt-4 max-w-md text-[17px] text-label-2">{s.body}</p>
              <code className="mt-5 inline-block rounded-full bg-surface px-3 py-1.5 font-mono text-[12px] text-accent ring-1 ring-sep">{s.tech}</code>
            </motion.div>
          </AnimatePresence>
          {/* progress rail */}
          <ol className="mt-8 flex gap-2" aria-label="Progress">
            {STAGES.map((st, i) => (
              <li key={st.n} className="h-1 flex-1 overflow-hidden rounded-full bg-fill">
                <motion.div className="h-full rounded-full bg-accent" initial={false} animate={{ width: i < stage ? "100%" : i === stage ? "55%" : "0%" }} transition={{ duration: 0.4 }} />
              </li>
            ))}
          </ol>
        </div>

        {/* scene */}
        <div className="relative min-h-0 flex-1">
          {reduced ? (
            <div className="grid h-full place-items-center p-10 text-center text-[15px] text-label-2">
              Motion is reduced on this device. Scroll to read each step.
            </div>
          ) : (
            <Scene progress={progress} palette={PALETTES[theme]} active={active} />
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg-2 to-transparent" />
        </div>
      </div>
    </section>
  );
}
